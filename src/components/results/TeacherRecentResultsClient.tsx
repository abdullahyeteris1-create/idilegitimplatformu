"use client";

import { useEffect, useState } from "react";
import { getExerciseResults } from "@/lib/results/resultStorage";
import { downloadResultsXlsx } from "@/lib/results/resultExport";
import type { ExerciseResult } from "@/lib/results/types";

export function TeacherRecentResultsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [results, setResults] = useState<ExerciseResult[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setResults(getExerciseResults());
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const recentResults = results.slice(0, 20);

  if (!isMounted) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Sonuclar yukleniyor...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Henuz egzersiz sonucu yok.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => downloadResultsXlsx(results, "idil-egzersiz-sonuclari.xlsx")}
          className="min-h-[56px] rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)]"
          style={{ touchAction: "manipulation" }}
        >
          Sonuclari Excel Indir
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {recentResults.map((result) => (
          <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-red-700">{result.studentName}</p>
              <p className="text-xs font-semibold text-slate-500">{new Date(result.date).toLocaleString("tr-TR")}</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{result.exerciseTitle}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
              <p>Puan: <span className="text-[var(--brand)]">{result.score}</span></p>
              <p>Basari: <span className="text-slate-900">{result.successRate}%</span></p>
              <p>Dogru: <span className="text-[var(--ok)]">{result.correctCount}</span></p>
              <p>Yanlis: <span className="text-[var(--bad)]">{result.wrongCount}</span></p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
