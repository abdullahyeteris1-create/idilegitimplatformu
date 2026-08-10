"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { formatRemainingTime } from "@/lib/exercises/timing";
import {
  PROGRAM_TASK_COMPLETED_EVENT,
} from "@/lib/results/programTaskEvents";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";

const EDUCATION_PROGRAM_ROUTE = "/ogrenci/egitim-programim";

type EducationProgramExerciseChromeProps = {
  launch: EducationProgramExerciseLaunchProps | null | undefined;
  showCountdown?: boolean;
  children: ReactNode;
};

function getStorageKey(taskId: string): string {
  return `idil:education-task-started-at:${taskId}`;
}

function readOrCreateTaskStartedAt(taskId: string): number {
  const storageKey = getStorageKey(taskId);
  try {
    const stored = Number(window.sessionStorage.getItem(storageKey));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const startedAt = Date.now();
    window.sessionStorage.setItem(storageKey, String(startedAt));
    return startedAt;
  } catch {
    return Date.now();
  }
}

function EducationProgramCountdown({
  launch,
}: {
  launch: EducationProgramExerciseLaunchProps;
}) {
  const [startedAt] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readOrCreateTaskStartedAt(launch.taskId),
  );
  const [remainingSeconds, setRemainingSeconds] = useState(launch.durationSeconds);

  useEffect(() => {
    if (startedAt === null) return;

    const update = () => {
      const next = Math.max(
        0,
        Math.ceil((startedAt + launch.durationSeconds * 1000 - Date.now()) / 1000),
      );
      setRemainingSeconds(next);
    };

    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [launch.durationSeconds, startedAt]);

  const warning = remainingSeconds <= 60;
  const critical = remainingSeconds <= 10;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Kalan süre ${formatRemainingTime(remainingSeconds)}`}
      className={`fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full border px-4 py-1.5 text-sm font-black tabular-nums shadow-lg ${
        critical
          ? "border-red-500 bg-red-600 text-white"
          : warning
            ? "border-amber-400 bg-amber-100 text-amber-900"
            : "border-slate-700 bg-slate-900/95 text-white"
      }`}
    >
      <span className="mr-1.5 text-[10px] uppercase tracking-wider opacity-80">Kalan Süre</span>
      {formatRemainingTime(remainingSeconds)}
    </div>
  );
}

function EducationProgramContinueButton() {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center px-4">
      <Link
        href={EDUCATION_PROGRAM_ROUTE}
        className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 py-3 text-center text-base font-extrabold text-white shadow-xl shadow-red-300/40 transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        Eğitim Programıma Devam Et
      </Link>
    </div>
  );
}

export function EducationProgramExerciseChrome({
  launch,
  showCountdown = true,
  children,
}: EducationProgramExerciseChromeProps) {
  const [completed, setCompleted] = useState(false);
  const hasCountdown = showCountdown && Boolean(
    launch && Number.isFinite(launch.durationSeconds) && launch.durationSeconds > 0,
  );
  const countdownLaunch = launch && hasCountdown ? launch : null;

  useEffect(() => {
    if (!launch) return;
    const handleCompleted = () => setCompleted(true);
    window.addEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
    return () => window.removeEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
  }, [launch]);

  return (
    <>
      {children}
      {countdownLaunch ? (
        <EducationProgramCountdown launch={countdownLaunch} />
      ) : null}
      {completed && launch ? <EducationProgramContinueButton /> : null}
    </>
  );
}
