"use client";

import { useState } from "react";
import type {
  StudentAnalysis,
  StudentAnalysisResponse,
} from "@/lib/ai/studentAnalysisTypes";

type StudentAnalysisCardProps = {
  studentId: string;
};

function AnalysisList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--idil-muted)]">Belirgin bir bulgu bulunmuyor.</p>;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-[var(--idil-text)]">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--idil-accent)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function StudentAnalysisCard({ studentId }: StudentAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function createAnalysis() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/student-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const payload = (await response.json().catch(() => null)) as StudentAnalysisResponse | null;

      if (!response.ok || !payload?.ok) {
        setError(payload && !payload.ok ? payload.error : "Analiz hazırlanırken bir sorun oluştu.");
        return;
      }

      setAnalysis(payload.analysis);
    } catch {
      setError("AI hizmetine ulaşılamadı. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-4 text-[var(--idil-text)] shadow-sm md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--idil-accent)]">Öğretmen Asistanı</p>
          <h3 className="mt-1 text-xl font-bold">AI Gelişim Analizi</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--idil-muted)]">
            Öğrencinin son egzersiz sonuçlarını yapay zekâ ile değerlendir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createAnalysis()}
          disabled={isLoading}
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--idil-accent)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isLoading ? (
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {isLoading ? "Analiz hazırlanıyor..." : "AI Gelişim Analizi Oluştur"}
        </button>
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {error}
        </p>
      ) : null}

      {analysis ? (
        <div className="mt-5 grid min-w-0 gap-3">
          <p className="rounded-xl border border-[var(--idil-border)] bg-[var(--idil-accent-soft)] px-4 py-3 text-sm leading-6">
            Bu analiz öğretmene destek amacıyla hazırlanmıştır. Nihai değerlendirme öğretmene aittir.
          </p>

          <article className="min-w-0 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-4">
            <h4 className="font-bold">Genel Değerlendirme</h4>
            <p className="mt-2 break-words text-sm leading-6 text-[var(--idil-muted)]">{analysis.generalAssessment}</p>
          </article>

          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <article className="min-w-0 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-4">
              <h4 className="mb-3 font-bold">Güçlü Yönler</h4>
              <AnalysisList items={analysis.strengths} />
            </article>
            <article className="min-w-0 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-4">
              <h4 className="mb-3 font-bold">Geliştirilmesi Gereken Alanlar</h4>
              <AnalysisList items={analysis.improvementAreas} />
            </article>
          </div>

          <article className="min-w-0 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] p-4">
            <h4 className="font-bold">Önerilen Sonraki Çalışmalar</h4>
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
              {analysis.recommendedExercises.map((exercise, index) => (
                <div key={`${exercise.exerciseType}-${index}`} className="min-w-0 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] p-3">
                  <p className="break-words font-bold text-[var(--idil-accent)]">{exercise.title}</p>
                  <p className="mt-2 break-words text-sm leading-6 text-[var(--idil-muted)]">{exercise.reason}</p>
                  <p className="mt-2 break-words text-xs font-semibold leading-5 text-[var(--idil-text)]">
                    Önerilen ayar: {exercise.suggestedSettings}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

