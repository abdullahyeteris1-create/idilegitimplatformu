"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/ui/PanelCard";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import {
  getExerciseResultsForCurrentUser,
  getExerciseResultsForCurrentUserWithRemote,
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

const EXERCISE_LABELS: Record<string, string> = {
  tachistoscope: "Takistoskop",
  "similar-words": "Benzer Kelimeler",
  "block-reading": "Blok Okuma",
  "shadow-reading": "Gölgeleme",
  "focused-reading": "Odaklı Okuma",
  "two-side-focus": "Çift Taraflı Odak",
  "attention-maze": "Dikkat Labirenti",
  "memory-game": "Hafıza Geliştirme",
  "word-finding": "Kelime Bulma",
  "eye-muscle": "Göz Kasları",
  "reading-comprehension": "Anlama Testi",
  "letter-number-counting-focus": "Harf / Rakam Sayma",
  "card-matching": "Kart Eşleştirme",
  "visual-puzzle": "Görsel Puzzle",
  "eye-brain": "Göz Beyin Çalışması",
  "word-guess": "Kelime Tahmin",
  "catch-same": "Aynı Olanı Yakala",
  hangman: "Adam Asmaca",
  "grouping-reading": "Gruplama Çalışması",
  "eye-columns": "Göz Egzersizleri Kolonlar",
  "square-vision": "Kare Görme Alanı",
};

const RESTART_HREFS: Record<ExerciseType, string> = {
  "square-vision": "/egzersizler/kare-gorme-alani",
  tachistoscope: "/egzersizler/takistoskop",
  "similar-words": "/egzersizler/benzer-kelimeler",
  "block-reading": "/egzersizler/blok-okuma",
  "shadow-reading": "/egzersizler/golgeleme",
  "focused-reading": "/egzersizler/odakli-okuma",
  "two-side-focus": "/egzersizler/cift-tarafli-odak",
  "attention-maze": "/egzersizler/dikkat-labirenti",
  "memory-game": "/egzersizler/hafiza-gelistirme",
  "word-finding": "/egzersizler/kelime-bulma",
  "eye-muscle": "/egzersizler/goz-kaslari",
  "reading-comprehension": "/egzersizler/anlama-testi",
  "letter-number-counting-focus": "/egzersizler/harf-rakam-sayma",
  "card-matching": "/egzersizler/kart-eslestirme",
  "visual-puzzle": "/egzersizler/gorsel-puzzle",
  "eye-brain": "/egzersizler/goz-beyin",
  "word-guess": "/egzersizler/kelime-tahmin",
  "catch-same": "/egzersizler/ayni-olani-yakala",
  hangman: "/egzersizler/adam-asmaca",
  "grouping-reading": "/egzersizler/gruplama-calismasi",
  "eye-columns": "/egzersizler/goz-egzersizleri-kolonlar",
  "color-match": "/egzersizler/renk-uyumu",
};

/** Mevcut sonuçlardan benzersiz exerciseType'ları çıkarır ve "all" + label'lı liste döndürür */
function buildFilterOptions(results: ExerciseResult[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [{ value: "all", label: "Tüm Çalışmalar" }];

  for (const result of results) {
    const type = result.exerciseType;
    if (seen.has(type)) continue;
    seen.add(type);
    options.push({ value: type, label: EXERCISE_LABELS[type] ?? type });
  }

  return options;
}

/** Bilinmeyen slug'ları okunabilir forma çevirir */
function formatExerciseType(type: string): string {
  return EXERCISE_LABELS[type] ?? type
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // exerciseType URL'den geldiyse (egzersiz tamamlandıktan sonra) üst özet onu göstersin
  const urlExerciseType: ExerciseType | undefined = exerciseType;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const currentStudent = getCurrentStudent();
        const currentUser = getResolvedCurrentUser();

        setStudent(currentStudent);

        if (currentUser?.role === "student") {
          const scopedResults = await getExerciseResultsForCurrentUserWithRemote();
          const nextResults = scopedResults.length > 0 ? scopedResults : getExerciseResultsForCurrentUser();
          const fallbackResults = currentStudent
            ? getResultsByStudent(currentStudent.id, currentStudent.name, currentStudent.username)
            : [];
          const mergedResults = nextResults.length > 0 ? nextResults : fallbackResults;

          setStudentResults(mergedResults);
        } else {
          setStudentResults([]);
        }

        setIsMounted(true);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // --- ÜST ÖZET KARTI ---

  // URL'den gelen değerler varsa onları kullan
  const hasUrlSummary = exerciseType !== undefined && [correct, wrong, score, successRate].every(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  // URL'den gelmediyse, en son tamamlanan sonucu bul
  const latestResult = useMemo<ExerciseResult | null>(() => {
    if (studentResults.length === 0) return null;
    // results zaten tarihe göre descending sıralı (Supabase'den öyle geliyor, localStorage'da da başa ekleniyor)
    return studentResults[0] ?? null;
  }, [studentResults]);

  // Üst özet için gösterilecek egzersiz tipi
  const summaryData = useMemo(() => {
    if (hasUrlSummary) {
      return {
        type: exerciseType!,
        title: formatExerciseType(exerciseType!),
        correct: correct ?? 0,
        wrong: wrong ?? 0,
        score: score ?? 0,
        successRate: successRate ?? 0,
      };
    }

    if (latestResult) {
      return {
        type: latestResult.exerciseType,
        title: latestResult.exerciseTitle || formatExerciseType(latestResult.exerciseType),
        correct: latestResult.correctCount,
        wrong: latestResult.wrongCount,
        score: latestResult.score,
        successRate: latestResult.successRate,
      };
    }

    return null;
  }, [hasUrlSummary, exerciseType, correct, wrong, score, successRate, latestResult]);

  // --- FİLTRE SEÇENEKLERİ ---
  const filterOptions = useMemo(() => buildFilterOptions(studentResults), [studentResults]);

  // --- FİLTRELENMİŞ GEÇMİŞ SONUÇLAR ---
  const filteredHistoryResults = useMemo(() => {
    if (historyFilter === "all") {
      return studentResults;
    }
    return studentResults.filter((result) => result.exerciseType === historyFilter);
  }, [historyFilter, studentResults]);

  // --- ÜST ÖZET KARTI RENDER ---
  const showSummaryCard = summaryData !== null;

  const stats = summaryData
    ? [
        { label: "Dogru", value: summaryData.correct, color: "text-[var(--ok)]" },
        { label: "Yanlis", value: summaryData.wrong, color: "text-[var(--bad)]" },
        { label: "Basari", value: `${summaryData.successRate}%`, color: "text-slate-900" },
        { label: "Puan", value: summaryData.score, color: "text-[var(--brand)]" },
      ]
    : [];

  const summaryRestartHref = summaryData ? RESTART_HREFS[summaryData.type as ExerciseType] ?? "/egzersizler" : "/egzersizler";

  const eyeBrainDetails =
    summaryData?.type === "eye-brain" && latestResult?.details && typeof latestResult.details === "object"
      ? (latestResult.details as Record<string, unknown>)
      : null;

  // --- YÜKLENİYOR ---
  if (!isMounted) {
    return (
      <PanelCard
        title="Sonuçlarım"
        subtitle="Çalışma sonuçlarını görüntüle."
        className="mx-auto w-full max-w-3xl"
      >
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
          Sonuç verileri yükleniyor...
        </p>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Sonuçlarım"
      subtitle="Tüm çalışma sonuçlarını görüntüle ve filtrele."
      className="mx-auto w-full max-w-3xl"
    >
      {/* ----- ÜST ÖZET KARTI ----- */}
      {showSummaryCard ? (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-emerald-800">
              {summaryData!.title} Sonucu
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-emerald-100 bg-white p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-2xl font-extrabold md:text-3xl ${stat.color}`}>{stat.value}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={summaryRestartHref}
                className="flex min-h-[48px] items-center justify-center rounded-2xl bg-emerald-600 px-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Yeniden Baslat
              </Link>
              <Link
                href={student ? "/ogrenci" : "/"}
                className="flex min-h-[48px] items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 text-base font-bold text-emerald-800 transition hover:bg-emerald-50"
              >
                Ogrenci Paneline Don
              </Link>
            </div>
          </div>

          {/* eye-brain özel detayları */}
          {eyeBrainDetails ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-red-700">Calisma Ozeti</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Gecen Sure</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{formatSeconds(summaryData!.score)}</p>
                </article>
                <article className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Hiz</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {typeof eyeBrainDetails.speedMs === "number" ? `${eyeBrainDetails.speedMs} ms` : "-"}
                  </p>
                </article>
                <article className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Simge Sayisi</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {typeof eyeBrainDetails.symbolCount === "number" ? eyeBrainDetails.symbolCount : "-"}
                  </p>
                </article>
                <article className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Kural</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">Sure odakli takip calismasi</p>
                </article>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ----- GEÇMİŞ SONUÇLARIM ----- */}
      <div className={showSummaryCard ? "mt-7" : "mt-0"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold">Gecmis Sonuclarim</h3>
          {filterOptions.length > 1 ? (
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 sm:w-auto"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {!student ? (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Ogrenci secili degil. Sonuclarini gormek icin once giris ekranindan ogrenci secmelisin.
          </p>
        ) : filteredHistoryResults.length === 0 && historyFilter === "all" ? (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Henüz tamamlanmış bir çalışmanız bulunmuyor.
          </p>
        ) : filteredHistoryResults.length === 0 && historyFilter !== "all" ? (
          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            <p>Bu egzersize ait sonuç bulunamadı.</p>
            <button
              type="button"
              onClick={() => setHistoryFilter("all")}
              className="mt-2 rounded-xl border border-red-200 bg-white px-4 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
            >
              Tüm Çalışmalar&apos;a dön
            </button>
          </div>
        ) : student ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filteredHistoryResults.map((result) => (
              <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">
                    {result.exerciseTitle || formatExerciseType(result.exerciseType)}
                  </p>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {new Date(result.date).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(result.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </p>
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
                {result.durationSeconds > 0 ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Süre: {formatSeconds(result.durationSeconds)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
