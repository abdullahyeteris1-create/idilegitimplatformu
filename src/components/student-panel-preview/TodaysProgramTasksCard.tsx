"use client";

import { useEffect, useState } from "react";
import styles from "./student-panel-preview.module.css";

type TodayProgramTask = {
  id: string;
  taskOrder: number;
  exerciseSlug: string;
  title: string;
  category: string | null;
  currentLevel: number;
  durationSeconds: number;
  status: string;
  isReady: boolean;
};

type TodayProgramResponse = {
  ok?: boolean;
  message?: string;
  program?: { id: string; status: string; totalDays: number; completedDays: number } | null;
  todayDay?: { id: string; dayNumber: number; status: string } | null;
  tasks?: TodayProgramTask[];
  dayCompleted?: boolean;
  programCompleted?: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "no-program" }
  | { status: "program-completed" }
  | { status: "ready"; dayNumber: number; tasks: TodayProgramTask[]; dayCompleted: boolean };

const STATUS_LABELS: Record<string, string> = {
  locked: "Kilitli",
  available: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

function formatDuration(durationSeconds: number): string {
  if (durationSeconds <= 0) return "-";
  const minutes = Math.round(durationSeconds / 60);
  return minutes > 0 ? `${minutes} dakika` : `${durationSeconds} saniye`;
}

/**
 * Ogretmenin atadigi 20 gunluk kilitli programdan "bugunku" (ilerleme bazli
 * belirlenen) gunun gorevlerini SALT-OKUNUR gosterir. Bu bilesen; gorev
 * baslatma, tamamlama veya program ilerletme ICERMEZ - yalniz bilgi
 * gosterir. Eski "Bugunku Gorevin" (daily_assignments) bolumunden tamamen
 * bagimsizdir, ona hicbir sekilde dokunmaz.
 *
 * StudentPanelPreview'in ana icerik sutununda (mainColumn), diger kartlarla
 * (statsGrid/RecentResults/categoriesSection) ayni gorsel dile (border-
 * radius, bosluk, tipografi - bkz. student-panel-preview.module.css
 * ".todaysProgram*" kurallari) uyumlu sekilde render edilmek uzere
 * tasarlanmistir.
 */
export function TodaysProgramTasksCard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/student/assignment-program/today", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await response.json()) as TodayProgramResponse;

        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setState({ status: "error", message: data.message ?? "Program bilgisi alınamadı." });
          return;
        }

        if (!data.program) {
          setState({ status: "no-program" });
          return;
        }

        if (data.programCompleted || !data.todayDay) {
          setState({ status: "program-completed" });
          return;
        }

        setState({
          status: "ready",
          dayNumber: data.todayDay.dayNumber,
          tasks: data.tasks ?? [],
          dayCompleted: data.dayCompleted === true,
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Program bilgisi alınamadı. Lütfen tekrar deneyin." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const title =
    state.status === "ready" ? `${state.dayNumber}. Gün • Bugünkü Ödevlerim` : "Bugünkü Ödevlerim";
  const subtitle = state.status === "ready" ? `${state.tasks.length} görev` : null;

  return (
    <section className={styles.todaysProgramSection} aria-labelledby="todays-program-tasks-title" data-todays-program-state={state.status}>
      <div className={styles.todaysProgramHead}>
        <h2 id="todays-program-tasks-title">{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {state.status === "loading" ? (
        <p aria-busy="true" className={styles.todaysProgramMessage}>
          Ödevlerin yükleniyor...
        </p>
      ) : state.status === "error" ? (
        <p className={styles.todaysProgramMessage} data-tone="error">
          {state.message}
        </p>
      ) : state.status === "no-program" ? (
        <p className={styles.todaysProgramMessage}>
          Şu anda aktif bir ödev programın yok. Öğretmenin seni bir programa atadığında burada görünecek.
        </p>
      ) : state.status === "program-completed" ? (
        <p className={styles.todaysProgramMessage} data-tone="success">
          20 günlük programını tamamladın 🎉
        </p>
      ) : state.tasks.length === 0 ? (
        <p className={styles.todaysProgramMessage}>Bugün için görev bulunamadı.</p>
      ) : (
        <>
          {state.dayCompleted ? (
            <p className={styles.todaysProgramMessage} data-tone="success">
              Bugünün ödevleri tamamlandı
            </p>
          ) : null}
          <ul className={styles.todaysProgramList}>
            {state.tasks.map((task) => (
              <li key={task.id} className={styles.todaysProgramItem}>
                <div className={styles.todaysProgramItemHead}>
                  <div className={styles.todaysProgramItemLead}>
                    <span className={styles.todaysProgramItemOrder} aria-hidden="true">
                      {task.taskOrder}
                    </span>
                    <span className={styles.todaysProgramItemTitle}>
                      {task.isReady ? task.title : `${task.title} (Yakında)`}
                    </span>
                  </div>
                  <span className={styles.todaysProgramStatus} data-status={task.status}>
                    {STATUS_LABELS[task.status] ?? task.status}
                  </span>
                </div>
                <div className={styles.todaysProgramItemMeta}>
                  <span>
                    Seviye: <b>{task.currentLevel}</b>
                  </span>
                  <span>
                    Süre: <b>{formatDuration(task.durationSeconds)}</b>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
