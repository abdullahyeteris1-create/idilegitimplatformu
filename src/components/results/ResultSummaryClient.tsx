"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/ui/PanelCard";
import { getCurrentStudent } from "@/lib/auth/auth";
import {
  getLatestResultByStudentAndExercise,
  getResultsByStudent,
} from "@/lib/results/resultStorage";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";

type ResultSummaryClientProps = {
  correct?: number;
  wrong?: number;
  successRate?: number;
  score?: number;
  exerciseType?: ExerciseType;
};

const RESULT_TITLES: Record<ExerciseType, string> = {
  tachistoscope: "Takistoskop Sonuclari",
  "similar-words": "Benzer Kelimeler Sonuclari",
  "block-reading": "Blok Okuma Sonuclari",
  "shadow-reading": "Golgeleme Sonuclari",
  "focused-reading": "Odaklı Okuma Çalışması Sonuclari",
  "two-side-focus": "Cift Tarafli Odak Sonuclari",
  "memory-game": "Hafiza Gelistirme Sonuclari",
  "word-finding": "Kelime Bulma Calismasi Sonuclari",
  "eye-muscle": "Goz Kaslarini Gelistirme Sonuclari",
  "reading-comprehension": "Anlama Testi Sonuclari",
  "letter-number-counting-focus": "Harf / Rakam Sayma Odak Sonuclari",
};

const RESTART_HREFS: Record<ExerciseType, string> = {
  tachistoscope: "/egzersizler/takistoskop",
  "similar-words": "/egzersizler/benzer-kelimeler",
  "block-reading": "/egzersizler/blok-okuma",
  "shadow-reading": "/egzersizler/golgeleme",
  "focused-reading": "/egzersizler/odakli-okuma",
  "two-side-focus": "/egzersizler/cift-tarafli-odak",
  "memory-game": "/egzersizler/hafiza-gelistirme",
  "word-finding": "/egzersizler/kelime-bulma",
  "eye-muscle": "/egzersizler/goz-kaslari",
  "reading-comprehension": "/egzersizler/anlama-testi",
  "letter-number-counting-focus": "/egzersizler/harf-rakam-sayma",
};

export function ResultSummaryClient({
  correct,
  wrong,
  successRate,
  score,
  exerciseType,
}: ResultSummaryClientProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<ExerciseResult[]>([]);
  const [latestRelevantResult, setLatestRelevantResult] = useState<ExerciseResult | null>(null);

  const resolvedExerciseType: ExerciseType = exerciseType ?? "tachistoscope";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentStudent = getCurrentStudent();
      setStudent(currentStudent);

      if (currentStudent) {
        setStudentResults(getResultsByStudent(currentStudent.id));
        setLatestRelevantResult(
          getLatestResultByStudentAndExercise(currentStudent.id, resolvedExerciseType),
        );
      } else {
        setStudentResults([]);
        setLatestRelevantResult(null);
      }

      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resolvedExerciseType]);

  const hasUrlSummary = [correct, wrong, score, successRate].every(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  const summary = useMemo(() => {
    if (hasUrlSummary) {
      return {
        correct: correct ?? 0,
        wrong: wrong ?? 0,
        score: score ?? 0,
        successRate: successRate ?? 0,
      };
    }

    if (latestRelevantResult) {
      return {
        correct: latestRelevantResult.correctCount,
        wrong: latestRelevantResult.wrongCount,
        score: latestRelevantResult.score,
        successRate: latestRelevantResult.successRate,
      };
    }

    return {
      correct: 0,
      wrong: 0,
      score: 0,
      successRate: 0,
    };
  }, [correct, hasUrlSummary, latestRelevantResult, score, successRate, wrong]);

  const summaryTitle = RESULT_TITLES[resolvedExerciseType];
  const restartHref = RESTART_HREFS[resolvedExerciseType];

  const filteredStudentResults = useMemo(() => {
    return studentResults.filter((result) => result.exerciseType === resolvedExerciseType);
  }, [resolvedExerciseType, studentResults]);

  const stats = [
    { label: "Dogru", value: summary.correct, color: "text-[var(--ok)]" },
    { label: "Yanlis", value: summary.wrong, color: "text-[var(--bad)]" },
    { label: "Basari", value: `${summary.successRate}%`, color: "text-slate-900" },
    { label: "Puan", value: summary.score, color: "text-[var(--brand)]" },
  ];

  if (!isMounted) {
    return (
      <PanelCard
        title={summaryTitle}
        subtitle="Calisma tamamlandi. Sonuclarini asagida gorebilirsin."
        className="mx-auto w-full max-w-3xl"
      >
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">Sonuc verileri yukleniyor...</p>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title={summaryTitle}
      subtitle="Calisma tamamlandi. Sonuclarini asagida gorebilirsin."
      className="mx-auto w-full max-w-3xl"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-2xl font-extrabold md:text-3xl ${stat.color}`}>{stat.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={restartHref}
          className="w-full min-h-[56px] rounded-2xl border border-red-900/30 bg-[var(--brand)] px-4 py-4 text-center text-base font-bold text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)]"
        >
          Yeniden Baslat
        </Link>
        <Link
          href="/ogrenci"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Ogrenci Paneline Don
        </Link>
      </div>

      <div className="mt-7">
        <h3 className="text-lg font-bold">Gecmis Sonuclarim</h3>
        {!student ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Ogrenci secili degil. Sonuclarini gormek icin once giris ekranindan ogrenci secmelisin.
          </p>
        ) : null}
        {student && filteredStudentResults.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Henuz sonuc yok.
          </p>
        ) : student ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filteredStudentResults.map((result) => (
              <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">{result.exerciseTitle}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{new Date(result.date).toLocaleString("tr-TR")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <p>
                    Puan: <span className="text-[var(--brand)]">{result.score}</span>
                  </p>
                  <p>
                    Basari: <span className="text-slate-900">{result.successRate}%</span>
                  </p>
                  <p>
                    Dogru: <span className="text-[var(--ok)]">{result.correctCount}</span>
                  </p>
                  <p>
                    Yanlis: <span className="text-[var(--bad)]">{result.wrongCount}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}
