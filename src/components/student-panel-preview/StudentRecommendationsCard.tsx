"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecommendationArea, StudentCoachMessage, StudentExerciseRecommendation, StudentSkillAnalysis } from "@/lib/recommendations/studentExerciseRecommendations";
import styles from "./student-panel-preview.module.css";

type RecommendationState = { status: "loading" | "ready" | "error"; analysis: StudentSkillAnalysis[]; recommendations: StudentExerciseRecommendation[]; developmentAreas: RecommendationArea[]; strongestArea: RecommendationArea | null; coachMessage: StudentCoachMessage | null };
const EMPTY_STATE: RecommendationState = { status: "loading", analysis: [], recommendations: [], developmentAreas: [], strongestArea: null, coachMessage: null };

function areaLabel(area: RecommendationArea): string {
  return `${area.categoryTitle} %${Math.round(area.score)}`;
}

function MiniRecommendation({ recommendation }: { recommendation: StudentExerciseRecommendation }) {
  return <article className={styles.smartRecommendation}>
    <div className={styles.smartRecommendationIcon} aria-hidden="true">✦</div>
    <div className={styles.smartRecommendationBody}>
      <span>{recommendation.categoryTitle}</span>
      <h3>{recommendation.exerciseTitle}</h3>
      <p>{recommendation.reasonText}</p>
      <Link href={`/egzersizler/${recommendation.exerciseSlug}`}>Başla</Link>
    </div>
  </article>;
}

export function StudentRecommendationsCard() {
  const [recommendationState, setRecommendationState] = useState<RecommendationState>(EMPTY_STATE);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/student/recommendations", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const payload = await response.json() as Partial<RecommendationState>;
        if (!response.ok || !Array.isArray(payload.analysis) || !Array.isArray(payload.recommendations) || !Array.isArray(payload.developmentAreas)) throw new Error("recommendations");
        setRecommendationState({ status: "ready", analysis: payload.analysis, recommendations: payload.recommendations, developmentAreas: payload.developmentAreas, strongestArea: payload.strongestArea ?? null, coachMessage: payload.coachMessage ?? null });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setRecommendationState({ ...EMPTY_STATE, status: "error" });
      }
    })();
    return () => controller.abort();
  }, []);

  const { status, recommendations, developmentAreas, strongestArea, coachMessage: coach } = recommendationState;
  const priorityArea = coach?.highlightedCategory
    ? developmentAreas.find((area) => area.categoryTitle === coach.highlightedCategory)
      ?? recommendationState.analysis.find((area) => area.categoryTitle === coach.highlightedCategory)
    : developmentAreas[0] ?? null;

  return <section className={styles.smartRecommendations} aria-labelledby="smart-recommendations-title">
    <div className={styles.smartRecommendationsHead}><div><span className={styles.smartEyebrow}>AKILLI ÇALIŞMA</span><h2 id="smart-recommendations-title">🎯 Sana Özel Çalışma Önerileri</h2><p>Son çalışmalarına göre geliştirebileceğin alanlar.</p></div><span className={styles.smartTarget} aria-hidden="true">🧠</span></div>
    {status === "loading" ? <p className={styles.smartEmpty}>Önerilerin hazırlanıyor…</p> : null}
    {status === "error" ? <p className={styles.smartEmpty}>Öneriler şu anda yüklenemiyor.</p> : null}
    {status === "ready" ? <>
      {priorityArea ? <aside className={styles.coachMessageCard} data-coach-tone={coach?.tone ?? "focus"}><div className={styles.coachMessageContent}><span className={styles.coachMessageEyebrow}>🧠 ÖNCELİKLİ ALAN</span><h3>{priorityArea.categoryTitle}</h3><p>{coach?.message ?? "Son sonuçlarına göre bu alanda biraz daha çalışman faydalı olabilir."}</p></div>{recommendationState.recommendations[0] ? <Link className={styles.coachMessageAction} href={`/egzersizler/${recommendationState.recommendations[0].exerciseSlug}`}>Önerilen çalışmayı başlat</Link> : null}</aside> : null}
      {recommendations.length > 0 ? <div className={styles.smartRecommendationGrid}>{recommendations.slice(0, 3).map((recommendation) => <MiniRecommendation key={`${recommendation.categoryId}-${recommendation.exerciseSlug}`} recommendation={recommendation} />)}</div> : <p className={styles.smartEmpty}>Sana özel öneriler oluşturabilmemiz için birkaç çalışma daha tamamla.</p>}
      {strongestArea ? <p className={styles.coachSummary}>💪 Güçlü alanın: {areaLabel(strongestArea)}</p> : null}
    </> : null}
  </section>;
}
