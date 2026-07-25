"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  useAssignmentV2,
  type AssignmentTaskConfig,
} from "@/components/assignments/AssignmentTaskProvider";
import { PROGRAM_TASK_COMPLETED_EVENT } from "@/lib/results/programTaskEvents";

const STUDENT_PANEL_ROUTE = "/ogrenci";

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function StatusDialog({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="assignment-task-status-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h2 id="assignment-task-status-title" className="text-xl font-black text-slate-900">
          {title}
        </h2>
        {children}
        {actions}
      </div>
    </div>
  );
}

/**
 * Feature flag kapalıyken kullanılan mevcut assignment sayacı. Bu dal eski
 * boş-body completion route'unu, result event'ini ve yerel deadline
 * davranışını aynen korur; V2 state makinesi bu kodu çalıştırmaz.
 */
function LegacyAssignmentTaskTimer({ task }: { task: AssignmentTaskConfig }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [completionFailed, setCompletionFailed] = useState(false);
  const deadlineRef = useRef<number | null>(null);

  const alreadyCompleted = task.taskStatus === "completed";
  const shouldRun = !alreadyCompleted && task.durationSeconds > 0;

  const completeByExpiry = useCallback(async (taskId: string) => {
    setCompletionFailed(false);
    try {
      const response = await fetch(
        `/api/student/assignment-program-tasks/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      setCompletionFailed(!response.ok || payload?.ok !== true);
    } catch {
      setCompletionFailed(true);
    }
  }, []);

  useEffect(() => {
    const handleCompleted = () => {
      setCompletionFailed(false);
      setFinished(true);
    };
    window.addEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
    return () => window.removeEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
  }, []);

  useEffect(() => {
    if (!shouldRun) return;

    deadlineRef.current = Date.now() + task.durationSeconds * 1000;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        window.clearInterval(intervalId);
        setFinished(true);
        void completeByExpiry(task.taskId);
      }
    };

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [shouldRun, task, completeByExpiry]);

  if (finished) {
    return (
      <StatusDialog
        title="Tebrikler, bu çalışmayı tamamladınız!"
        actions={
          <>
            {completionFailed ? (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-bold text-amber-800">
                  Çalışman kaydedilemedi, bağlantını kontrol edip tekrar dene.
                </p>
                <button
                  type="button"
                  onClick={() => void completeByExpiry(task.taskId)}
                  className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : null}
            <Link
              href={STUDENT_PANEL_ROUTE}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 text-base font-bold text-white shadow-md"
            >
              Ödevlerime Dön
            </Link>
          </>
        }
      >
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Sonraki çalışmaya geçebilirsiniz.
        </p>
      </StatusDialog>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full bg-emerald-600/95 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
        Bu çalışmayı tamamladınız
      </div>
    );
  }
  if (!shouldRun) return null;

  const displaySeconds = remainingSeconds ?? task.durationSeconds;
  const isLow = displaySeconds <= 30;
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Kalan süre ${formatClock(displaySeconds)}`}
      className={`pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full px-4 py-1.5 text-base font-black tabular-nums shadow-lg ${
        isLow ? "bg-red-600 text-white" : "bg-slate-900/90 text-white"
      }`}
    >
      {formatClock(displaySeconds)}
    </div>
  );
}

export function AssignmentTaskTimer() {
  const assignment = useAssignmentV2();

  if (!assignment.assignmentMode) return null;

  if (assignment.assignmentState === "config-loading") {
    return <StatusDialog title="Görev hazırlanıyor..." />;
  }

  if (assignment.assignmentState === "error") {
    const isConfigError = assignment.taskConfig === null || !assignment.taskConfig.canStart;
    const isTerminalConfigError = [
      "TASK_ALREADY_COMPLETED",
      "TASK_CANCELLED",
      "TASK_LOCKED",
      "DAY_LOCKED",
      "DAY_ALREADY_COMPLETED",
      "NOT_CURRENT_DAY",
      "PROGRAM_NOT_ACTIVE",
      "EXERCISE_ROUTE_MISMATCH",
    ].includes(assignment.error?.code ?? "");
    const canRetryOperation =
      assignment.error?.code !== "V2_ADAPTER_NOT_READY" && !isTerminalConfigError;
    return (
      <StatusDialog
        title={isConfigError ? "Görev bilgileri alınamadı." : "Kaydetme sırasında bir sorun oluştu."}
        actions={
          canRetryOperation ? (
            <button
              type="button"
              onClick={() => {
                if (isConfigError) {
                  void assignment.retryConfig();
                } else if (assignment.startedAt) {
                  void assignment.retryCompletion();
                } else {
                  void assignment.startAssignment();
                }
              }}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 text-base font-bold text-white"
            >
              Tekrar Dene
            </button>
          ) : null
        }
      >
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {assignment.error?.message ?? "İşlem tamamlanamadı. Lütfen tekrar deneyin."}
        </p>
      </StatusDialog>
    );
  }

  if (!assignment.assignmentV2Enabled) {
    return assignment.taskConfig ? <LegacyAssignmentTaskTimer task={assignment.taskConfig} /> : null;
  }

  if (assignment.assignmentState === "config-ready") {
    if (!assignment.adapterReady) {
      return (
        <StatusDialog title="V2 adapter hazır değil.">
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Bu egzersiz henüz güvenli Ödev V2 akışına bağlanmadığı için çalışma başlatılmadı.
          </p>
        </StatusDialog>
      );
    }
    return (
      <div className="pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
        Egzersizin Başlat düğmesi bekleniyor
      </div>
    );
  }

  if (assignment.assignmentState === "start-pending") {
    return <StatusDialog title="Çalışma başlatılıyor..." />;
  }

  if (assignment.assignmentState === "running") {
    const displaySeconds =
      assignment.remainingSeconds ?? assignment.taskConfig?.durationSeconds ?? 0;
    return (
      <div
        role="timer"
        aria-live="off"
        aria-label={`Kalan süre ${formatClock(displaySeconds)}`}
        className={`pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full px-4 py-1.5 text-base font-black tabular-nums shadow-lg transition-colors ${
          assignment.isLastThirtySeconds
            ? "bg-red-600 text-white ring-4 ring-red-200"
            : "bg-slate-900/90 text-white"
        }`}
      >
        {formatClock(displaySeconds)}
      </div>
    );
  }

  if (assignment.assignmentState === "result-preparing") {
    return <StatusDialog title="Sonuç hazırlanıyor..." />;
  }

  if (assignment.assignmentState === "completion-pending") {
    return <StatusDialog title="Kaydediliyor..." />;
  }

  if (assignment.assignmentState === "completed" && assignment.completionResult) {
    return (
      <StatusDialog
        title="Tebrikler, bu çalışmayı tamamladınız! Sonraki çalışmaya geçebilirsiniz."
        actions={
          <Link
            href={STUDENT_PANEL_ROUTE}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 text-base font-bold text-white shadow-md"
          >
            Ödevlerime Dön
          </Link>
        }
      />
    );
  }

  if (assignment.assignmentState === "stale-attempt") {
    return (
      <StatusDialog
        title="Bu çalışma oturumu artık geçerli değil. Lütfen çalışmayı yeniden başlatın."
        actions={
          <button
            type="button"
            onClick={assignment.resetAfterStaleAttempt}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 text-base font-bold text-white"
          >
            Yeniden Başlat
          </button>
        }
      />
    );
  }

  return null;
}
