"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudentExerciseRecommendation, StudentSkillAnalysis } from "@/lib/recommendations/studentExerciseRecommendations";
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
  route: string | null;
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
type RecommendationsState = { status: "loading" | "ready" | "error"; analysis: StudentSkillAnalysis[]; recommendations: StudentExerciseRecommendation[] };

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

// Buton metni yalniz status'e gore secilir - "completed"/"cancelled"/"locked"
// icin null doner (buton HIC render edilmez, "Tekrar Calis" gibi yaniltici
// bir CTA gosterilmez - tamamlama/tekrar kavrami Faz 3'e kadar tanimsizdir).
function getTaskActionLabel(status: string): string | null {
  if (status === "available") return "Çalışmaya Başla";
  if (status === "in_progress") return "Devam Et";
  return null;
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

  const [recommendations, setRecommendations] = useState<RecommendationsState>({ status: "loading", analysis: [], recommendations: [] });
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/student/recommendations", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { analysis?: StudentSkillAnalysis[]; recommendations?: StudentExerciseRecommendation[] };
        if (!response.ok || !Array.isArray(payload.analysis) || !Array.isArray(payload.recommendations)) throw new Error("recommendations");
        if (!cancelled) setRecommendations({ status: "ready", analysis: payload.analysis, recommendations: payload.recommendations });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) setRecommendations({ status: "error", analysis: [], recommendations: [] });
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const title =
    state.status === "ready" ? `${state.dayNumber}. Gün • Bugünkü Ödevlerim` : "Bugünkü Ödevlerim";
  const subtitle = state.status === "ready" ? `${state.tasks.length} görev` : null;

  return (<>
    <SmartRecommendationsCard state={recommendations} />
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
            {state.tasks.slice(0, 4).map((task) => {
              // Buton yalniz gercekten hazir bir egzersize, katalogdan gelen
              // bir route varsa VE durum uygunsa gosterilir. href, API'nin
              // dondurdugu (katalogdan cozulmus) route'a ?programTaskId=
              // eklenmis halidir (Faz 3) - egzersiz bitince secureResultStorage
              // bu id'yi URL'den okuyup /api/student/assignment-program-tasks/
              // [taskId]/complete'i cagirir, gorevi tamamlar ve gerekirse
              // sonraki gunu acar. Tarayici depolama alanlarina hicbir sey
              // yazilmaz - id yalniz URL uzerinden tasinir.
              const actionLabel = task.isReady && task.route ? getTaskActionLabel(task.status) : null;
              const taskHref = task.route ? `${task.route}?programTaskId=${encodeURIComponent(task.id)}` : null;

              return (
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
                  <div className={styles.todaysProgramItemFoot}>
                    <div className={styles.todaysProgramItemMeta}>
                      <span>
                        Seviye: <b>{task.currentLevel}</b>
                      </span>
                      <span>
                        Süre: <b>{formatDuration(task.durationSeconds)}</b>
                      </span>
                    </div>
                    {actionLabel && taskHref ? (
                      <Link href={taskHref} className={styles.todaysProgramItemAction}>
                        {actionLabel}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/ogrenci/egitim-programim" className={styles.todaysProgramAllLink}>
            Tüm Programımı Gör
          </Link>
        </>
      )}
    </section>
  </>);
}

function SmartRecommendationsCard({ state }: { state: RecommendationsState }) {
  return <section className={styles.smartRecommendations} aria-labelledby="smart-recommendations-title">
    <div className={styles.smartRecommendationsHead}><div><span className={styles.smartEyebrow}>AKILLI ÇALIŞMA V1</span><h2 id="smart-recommendations-title">✨ Sana Özel Çalışma Önerileri</h2><p>Son çalışmalarına göre bugün gelişimini destekleyebilecek alanlar.</p></div><span className={styles.smartTarget}>🎯</span></div>
    {state.status === "loading" ? <p className={styles.smartEmpty}>Önerilerin hazırlanıyor…</p> : state.status === "error" ? <p className={styles.smartEmpty}>Öneriler şu anda yüklenemiyor.</p> : state.recommendations.length === 0 ? <p className={styles.smartEmpty}>Henüz seni tanımaya çalışıyorum. Birkaç çalışma daha tamamladığında sana özel öneriler oluşturacağım.</p> : <div className={styles.smartRecommendationGrid}>{state.recommendations.map((recommendation) => <article className={styles.smartRecommendation} key={`${recommendation.categoryId}-${recommendation.exerciseSlug}`}><div className={styles.smartRecommendationIcon}>✦</div><div className={styles.smartRecommendationBody}><span>{recommendation.categoryTitle}</span><h3>{recommendation.exerciseTitle}</h3><p>{recommendation.reasonText}</p><Link href={`/egzersizler/${recommendation.exerciseSlug}`}>Çalışmaya Başla</Link></div></article>)}</div>}
  </section>;
}
