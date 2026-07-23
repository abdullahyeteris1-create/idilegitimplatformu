"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import {
  getExerciseResultsForCurrentUser,
  getExerciseResultsForCurrentUserWithRemote,
  getResultsByStudent,
} from "@/lib/results/resultStorage";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "./result-summary-theme.module.css";

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
  "square-vision": "Kare Görme Çalışması",
  "reading-speed-test": "Okuma Hızı Testi",
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
  "reading-speed-test": "/egzersizler/okuma-hizi-testi",
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

function getDetailNumber(result: ExerciseResult, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = result.details?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function getDetailString(result: ExerciseResult, key: string): string | null {
  const value = result.details?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getReadingSpeedMetrics(result: ExerciseResult | null) {
  if (!result || result.exerciseType !== "reading-speed-test") return null;

  return {
    readingSpeedWpm: getDetailNumber(result, "readingSpeedWpm"),
    durationSeconds: result.durationSeconds,
    wordCount: getDetailNumber(result, "wordCount", "totalWords"),
    textTitle: getDetailString(result, "textTitle"),
  };
}

export function ResultSummaryClient({
  correct,
  wrong,
  successRate,
  score,
  exerciseType,
}: ResultSummaryClientProps) {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const pageClassName = `${styles.page} ${isLight ? styles.lightTheme : ""}`;
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<ExerciseResult[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");

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
    return exerciseType
      ? studentResults.find((result) => result.exerciseType === exerciseType) ?? null
      : studentResults[0] ?? null;
  }, [exerciseType, studentResults]);

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
        result: latestResult,
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
        result: latestResult,
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

  const readingSpeedSummary = getReadingSpeedMetrics(summaryData?.result ?? null);
  const stats = summaryData
    ? readingSpeedSummary
      ? [
          { label: "Okuma Hızı", value: readingSpeedSummary.readingSpeedWpm !== null ? `${readingSpeedSummary.readingSpeedWpm} kelime/dk` : "-", tone: styles.statBrand },
          { label: "Süre", value: readingSpeedSummary.durationSeconds > 0 ? formatSeconds(readingSpeedSummary.durationSeconds) : "-", tone: styles.statNeutral },
          { label: "Kelime Sayısı", value: readingSpeedSummary.wordCount ?? "-", tone: styles.statOk },
          { label: "Metin Başlığı", value: readingSpeedSummary.textTitle ?? "-", tone: styles.statNeutral },
        ]
      : [
        { label: "Dogru", value: summaryData.correct, tone: styles.statOk },
        { label: "Yanlis", value: summaryData.wrong, tone: styles.statBad },
        { label: "Basari", value: `${summaryData.successRate}%`, tone: styles.statNeutral },
        { label: "Puan", value: summaryData.score, tone: styles.statBrand },
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
      <div className={pageClassName}>
        <div className={styles.shell}>
          <div className={styles.card}>
            <div className={styles.cardAccent} aria-hidden="true" />
            <h2 className={styles.cardTitle}>Sonuçlarım</h2>
            <p className={styles.cardSubtitle}>Çalışma sonuçlarını görüntüle.</p>
            <p className={styles.loadingNotice}>Sonuç verileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClassName}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/egzersizler" className={styles.backLink}>
            ← Egzersizlere Dön
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.cardAccent} aria-hidden="true" />
          <h2 className={styles.cardTitle}>Sonuçlarım</h2>
          <p className={styles.cardSubtitle}>Tüm çalışma sonuçlarını görüntüle ve filtrele.</p>

          {/* ----- ÜST ÖZET KARTI ----- */}
          {showSummaryCard ? (
            <>
              <div className={styles.summaryCard}>
                <p className={styles.summaryEyebrow}>{summaryData!.title} Sonucu</p>
                <div className={styles.statGrid}>
                  {stats.map((stat) => (
                    <article key={stat.label} className={`${styles.statTile} ${stat.tone}`}>
                      <p>{stat.label}</p>
                      <p>{stat.value}</p>
                    </article>
                  ))}
                </div>
                <div className={styles.actionRow}>
                  <Link href={summaryRestartHref} className={styles.actionPrimary}>
                    Tekrar Çalış
                  </Link>
                  <Link href="/egzersizler" className={styles.actionSecondary}>
                    Egzersizlere Dön
                  </Link>
                  <Link href={student ? "/ogrenci" : "/"} className={styles.actionSecondary}>
                    Öğrenci Paneline Dön
                  </Link>
                </div>
              </div>

              {/* eye-brain özel detayları */}
              {eyeBrainDetails ? (
                <div className={styles.detailCard}>
                  <p className={styles.detailTitle}>Çalışma Özeti</p>
                  <div className={styles.detailGrid}>
                    <article className={styles.detailTile}>
                      <p>Gecen Sure</p>
                      <p>{formatSeconds(summaryData!.score)}</p>
                    </article>
                    <article className={styles.detailTile}>
                      <p>Hiz</p>
                      <p>{typeof eyeBrainDetails.speedMs === "number" ? `${eyeBrainDetails.speedMs} ms` : "-"}</p>
                    </article>
                    <article className={styles.detailTile}>
                      <p>Simge Sayisi</p>
                      <p>{typeof eyeBrainDetails.symbolCount === "number" ? eyeBrainDetails.symbolCount : "-"}</p>
                    </article>
                    <article className={styles.detailTile}>
                      <p>Kural</p>
                      <p>Sure odakli takip calismasi</p>
                    </article>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {/* ----- GEÇMİŞ SONUÇLARIM ----- */}
          <div className={styles.historySection}>
            <div className={styles.historyHeader}>
              <h3>Geçmiş Sonuçlarım</h3>
              {filterOptions.length > 1 ? (
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className={styles.historySelect}
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
              <p className={styles.emptyState}>
                Öğrenci seçili değil. Sonuçlarını görmek için önce giriş ekranından öğrenci seçmelisin.
              </p>
            ) : filteredHistoryResults.length === 0 && historyFilter === "all" ? (
              <p className={styles.emptyState}>Henüz tamamlanmış bir çalışmanız bulunmuyor.</p>
            ) : filteredHistoryResults.length === 0 && historyFilter !== "all" ? (
              <div className={styles.emptyState}>
                <p>Bu egzersize ait sonuç bulunamadı.</p>
                <button type="button" onClick={() => setHistoryFilter("all")} className={styles.retryButton}>
                  Tüm Çalışmalar&apos;a dön
                </button>
              </div>
            ) : student ? (
              <div className={styles.historyGrid}>
                {filteredHistoryResults.map((result) => {
                  const readingSpeedMetrics = getReadingSpeedMetrics(result);

                  return (
                    <article key={result.id} className={styles.historyCard}>
                    <div className={styles.historyCardHead}>
                      <p className={styles.historyCardTitle}>
                        {result.exerciseTitle || formatExerciseType(result.exerciseType)}
                      </p>
                      <span className={styles.historyCardDate}>
                        {new Date(result.date).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <p className={styles.historyCardTime}>
                      {new Date(result.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                      {readingSpeedMetrics ? (
                        <div className={styles.historyMetrics}>
                          <p>Okuma Hızı: <b>{readingSpeedMetrics.readingSpeedWpm !== null ? `${readingSpeedMetrics.readingSpeedWpm} kelime/dk` : "-"}</b></p>
                          <p>Süre: <b>{readingSpeedMetrics.durationSeconds > 0 ? formatSeconds(readingSpeedMetrics.durationSeconds) : "-"}</b></p>
                          <p>Kelime Sayısı: <b>{readingSpeedMetrics.wordCount ?? "-"}</b></p>
                          <p>Metin Başlığı: <b>{readingSpeedMetrics.textTitle ?? "-"}</b></p>
                        </div>
                      ) : (
                        <>
                          <div className={styles.historyMetrics}>
                            <p>Puan: <b>{result.score}</b></p>
                            <p>Basari: <b>{result.successRate}%</b></p>
                            <p>Dogru: <b>{result.correctCount}</b></p>
                            <p>Yanlis: <b>{result.wrongCount}</b></p>
                          </div>
                          {result.durationSeconds > 0 ? (
                            <p className={styles.historyDuration}>Süre: {formatSeconds(result.durationSeconds)}</p>
                          ) : null}
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
