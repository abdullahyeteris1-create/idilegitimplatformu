"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type Phase = "setup" | "ready" | "running" | "paused" | "result";
type DurationMinutes = 1 | 2 | 3 | 4 | 5;
type ColumnCount = 3 | 4 | 5 | 6 | 7;
type JumpSpeed = 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500 | 600 | 800 | 1000 | 1200| 1400 | 1600 | 1800;
type FlowDirection = "column" | "row";

type ExerciseResult = {
  durationSeconds: number;
  completedSteps: number;
  totalSteps: number;
  score: number;
  successRate: number;
};

const DURATION_OPTIONS: DurationMinutes[] = [1, 2, 3, 4, 5];
const COLUMN_OPTIONS: ColumnCount[] = [3, 4, 5, 6, 7];
const JUMP_SPEED_OPTIONS: JumpSpeed[] = [
  50,
  100,
  150,
  200,
  250,
  300,
  400,
  500,
  600,
  800,
  1000,
  1200,
  1400,
  1600,
  1800,
];

const WORD_POOL = [
  "ada", "adım", "ağaç", "akıl", "akşam", "alan", "alev", "anahtar", "anlam", "arı",
  "armağan", "ayna", "bahar", "balık", "barış", "başarı", "bayrak", "beden", "beyin", "bilgi",
  "bitki", "bulut", "burç", "buzul", "cadde", "ceviz", "çiçek", "çizgi", "çocuk", "dağ",
  "dalga", "damla", "dans", "davet", "deniz", "denge", "dere", "destek", "dikkat", "doğa",
  "dost", "dünya", "duygu", "düşünce", "ekran", "elma", "enerji", "esinti", "evren", "fener",
  "fidan", "fikir", "gemi", "genç", "gezi", "göl", "gölge", "görev", "gözlem", "güneş",
  "haber", "hafıza", "harita", "hayal", "hedef", "heyecan", "hız", "ışık", "ırmak", "içerik",
  "ilgi", "ilham", "insan", "ipucu", "istek", "iz", "kalem", "kalp", "kanat", "kapı",
  "karar", "kavram", "kaynak", "kıyı", "kitap", "kolon", "konu", "köprü", "kural", "kuş",
  "kutu", "lamba", "liman", "masa", "mavi", "merak", "metin", "meyve", "müzik", "nehir",
  "nesne", "not", "odak", "okul", "orman", "oyun", "öğrenci", "öykü", "pencere", "renk",
  "ritim", "rüzgar", "saat", "sabır", "sayfa", "ses", "sıra", "soru", "süre", "şehir",
  "şekil", "takip", "taş", "tempo", "toprak", "ufuk", "uyum", "uzay", "vadi", "varlık",
  "yaprak", "yaşam", "yazı", "yıldız", "yol", "yön", "zaman", "zeka", "zihin", "zirve",
  "açı", "ağ", "anı", "araç", "artı", "başlangıç", "beceri", "çaba", "çatı", "çember",
  "çözüm", "değer", "düş", "eğitim", "etki", "fırsat", "gece", "gelişim", "güç", "hareket",
  "hazine", "hikaye", "iletişim", "işaret", "kare", "kelime", "kırmızı", "kök", "merkez", "nokta",
  "okuma", "örnek", "plan", "sabah", "satır", "seçim", "sistem", "sonuç", "sütun", "tablo",
  "tasarım", "tekrar", "uygulama", "yakın", "yapı", "yöntem", "yumuşak", "zengin", "zorluk", "çevre",
  "bölüm", "birikim", "bağlantı", "cesaret", "çalışma", "dakika", "deneyim", "düzen", "fark", "görüş",
  "güven", "hatıra", "huzur", "inceleme", "karşılık", "kazanım", "lider", "macera", "miktar", "özgür",
  "parça", "sakin", "sevinç", "sınır", "sürpriz", "takım", "üretim", "veri", "yaklaşım", "yarın",
  "yetenek", "yolculuk", "zincir", "adalet", "akış", "antrenman", "bağ", "çözümleme", "detay", "doğruluk",
  "etkinlik", "görüntü", "hızlanma", "konsantrasyon", "mantık", "odaklanma", "performans", "seviye", "alışkanlık", "algılama",
];

function shuffleUniqueWords(): string[] {
  const copy = [...new Set(WORD_POOL)];

  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getNextIndex(
  currentIndex: number,
  direction: FlowDirection,
  rowCount: number,
  columnCount: number,
): number {
  const totalCount = rowCount * columnCount;

  if (totalCount <= 1) {
    return 0;
  }

  if (direction === "row") {
    return (currentIndex + 1) % totalCount;
  }

  const currentRow = Math.floor(currentIndex / columnCount);
  const currentColumn = currentIndex % columnCount;
  const nextRow = currentRow + 1;

  if (nextRow < rowCount) {
    return nextRow * columnCount + currentColumn;
  }

  const nextColumn = (currentColumn + 1) % columnCount;
  return nextColumn;
}

export function ColumnEyeExerciseClient() {
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(1);
  const [jumpSpeed, setJumpSpeed] = useState<JumpSpeed>(500);
  const [columnCount, setColumnCount] = useState<ColumnCount>(5);
  const [flowDirection, setFlowDirection] = useState<FlowDirection>("column");
  const [words, setWords] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [result, setResult] = useState<ExerciseResult | null>(null);

  const intervalMs = jumpSpeed;
  const totalDurationSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  const rowsPerColumn = useMemo(() => {
    const preferredRows = 10;
    return Math.max(7, Math.min(preferredRows, Math.floor(words.length / columnCount)));
  }, [columnCount, words.length]);

  const visibleWordCount = rowsPerColumn * columnCount;

  const visibleWords = useMemo(() => {
    const selected = words.slice(0, visibleWordCount);

    if (selected.length === visibleWordCount) {
      return selected;
    }

    const extra = shuffleUniqueWords().filter((word) => !selected.includes(word));
    return [...selected, ...extra].slice(0, visibleWordCount);
  }, [visibleWordCount, words]);

  const totalSteps = Math.max(
    1,
    Math.floor((totalDurationSeconds * 1000) / intervalMs),
  );

  const progress = Math.min(
    100,
    Math.round((elapsedSeconds / totalDurationSeconds) * 100),
  );

  const resetExercise = useCallback(() => {
    setWords(shuffleUniqueWords());
    setActiveIndex(0);
    setElapsedSeconds(0);
    setCompletedSteps(0);
    setResult(null);
    setPhase("ready");
    startedAtRef.current = null;
    savedRef.current = false;
  }, []);

  const finishExercise = useCallback(() => {
    if (savedRef.current) {
      return;
    }

    savedRef.current = true;

    const durationSeconds = Math.max(
      1,
      startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : elapsedSeconds,
    );

    const successRate = Math.min(
      100,
      Math.round((completedSteps / totalSteps) * 100),
    );

    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "eye-columns",
      exerciseTitle: "Göz Egzersizleri: Kolonlar",
      durationSeconds,
      correctCount: 0,
      wrongCount: 0,
      score: successRate,
      successRate,
      details: {
        durationMinutes,
        jumpSpeed,
        intervalMs,
        columnCount,
        flowDirection,
        completedSteps,
        totalSteps,
        visibleWordCount,
        allWordsUnique: true,
      },
    });

    setResult({
      durationSeconds,
      completedSteps,
      totalSteps,
      score: successRate,
      successRate,
    });
    setPhase("result");
  }, [
    columnCount,
    completedSteps,
    durationMinutes,
    elapsedSeconds,
    flowDirection,
    intervalMs,
    jumpSpeed,
    totalSteps,
    visibleWordCount,
  ]);

  useEffect(() => {
    if (phase !== "running" || visibleWordCount <= 0) {
      return;
    }

    const movementId = window.setInterval(() => {
      setActiveIndex((current) =>
        getNextIndex(current, flowDirection, rowsPerColumn, columnCount),
      );
      setCompletedSteps((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(movementId);
  }, [columnCount, flowDirection, intervalMs, phase, rowsPerColumn, visibleWordCount]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;

        if (next >= totalDurationSeconds) {
          window.setTimeout(finishExercise, 0);
          return totalDurationSeconds;
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [finishExercise, phase, totalDurationSeconds]);

  const beginExercise = () => {
    setWords(shuffleUniqueWords());
    setActiveIndex(0);
    setElapsedSeconds(0);
    setCompletedSteps(0);
    setResult(null);
    savedRef.current = false;
    startedAtRef.current = Date.now();
    setPhase("running");
  };

  const controls = (
    <div className="grid gap-3 md:grid-cols-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Çalışma Süresi
        </span>
        <select
          value={durationMinutes}
          onChange={(event) => {
            setDurationMinutes(Number(event.target.value) as DurationMinutes);
            resetExercise();
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {DURATION_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}:00
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Atlama Hızı
        </span>
        <select
          value={jumpSpeed}
          onChange={(event) => {
            setJumpSpeed(Number(event.target.value) as JumpSpeed);
            resetExercise();
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {JUMP_SPEED_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} ms
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Akış Yönü
        </span>
        <select
          value={flowDirection}
          onChange={(event) => {
            setFlowDirection(event.target.value as FlowDirection);
            resetExercise();
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          <option value="column">Sütun Şeklinde</option>
          <option value="row">Satır Şeklinde</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Kolon Sayısı
        </span>
        <select
          value={columnCount}
          onChange={(event) => {
            setColumnCount(Number(event.target.value) as ColumnCount);
            resetExercise();
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {COLUMN_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} Kolon
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        {phase === "ready" ? (
          <button
            type="button"
            onClick={beginExercise}
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
          >
            Egzersizi Başlat
          </button>
        ) : phase === "running" ? (
          <button
            type="button"
            onClick={() => setPhase("paused")}
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
          >
            Duraklat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              startedAtRef.current = Date.now() - elapsedSeconds * 1000;
              setPhase("running");
            }}
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
          >
            Devam Et
          </button>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Göz Egzersizleri: Kolonlar"
        description="Farklı kelimeler arasında satır veya sütun yönünde ritmik göz hareketi yaparak odak geçişini geliştir."
        buttonLabel="Eğitime Başla"
        onStart={resetExercise}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h1 className="text-2xl font-black text-slate-950">
          Göz Egzersizleri: Kolonlar Sonucu
        </h1>
        <p className="mt-2 text-sm text-slate-500">Çalışma tamamlandı.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Başarı</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              %{result.successRate}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Süre</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {formatTime(result.durationSeconds)}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Geçiş</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {result.completedSteps}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Atlama Hızı</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {intervalMs} ms
            </p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-red-100 bg-white p-4 text-sm text-slate-700">
          <p>
            <strong>Akış:</strong>{" "}
            {flowDirection === "column" ? "Sütun şeklinde" : "Satır şeklinde"}
          </p>
          <p className="mt-1">
            <strong>Kolon:</strong> {columnCount}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={resetExercise}
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
          >
            Tekrar Çalış
          </button>
          <Link
            href="/egzersizler"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-800"
          >
            Egzersizlere Dön
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Göz Egzersizleri: Kolonlar"
      subtitle={
        flowDirection === "column"
          ? "Sütun şeklinde takip"
          : "Satır şeklinde takip"
      }
      stats={[
        { label: "Süre", value: formatTime(remainingSeconds) },
        { label: "Atlama Hızı", value: `${intervalMs} ms`, tone: "brand" },
        {
          label: "Akış",
          value: flowDirection === "column" ? "Sütun" : "Satır",
        },
        { label: "Kolon", value: columnCount },
      ]}
      finishButton={
        phase === "running" || phase === "paused" ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                if (phase === "running") {
                  setPhase("paused");
                } else {
                  startedAtRef.current = Date.now() - elapsedSeconds * 1000;
                  setPhase("running");
                }
              }}
              className={FULLSCREEN_SECONDARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
            >
              {phase === "running" ? "Duraklat" : "Devam"}
            </button>
            <button type="button" onClick={finishExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
              Bitir
            </button>
          </div>
        ) : null
      }
      stageClassName="exercise-stage-fit flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-red-100 bg-white p-2 shadow-[0_18px_56px_rgba(185,28,28,0.10)] md:rounded-[28px] md:p-4"
      footer={phase === "ready" ? controls : undefined}
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {phase === "ready" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
              Hazırlık
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 md:text-3xl">
              Kelimelerin tamamı birbirinden farklıdır.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-500">
              Akış yönünü seç. Vurgulanan kelimeyi yalnızca gözlerinle takip et
              ve başını mümkün olduğunca sabit tut.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-700">
                Aktif kelimeyi takip et
              </p>
              <p className="text-sm font-black text-red-700">
                {formatTime(remainingSeconds)}
              </p>
            </div>

            <div
              className="grid min-h-0 flex-1 gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1.5 md:gap-2 md:p-3"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rowsPerColumn}, minmax(0, 1fr))`,
              }}
            >
              {visibleWords.map((word, wordIndex) => {
                const isActive = wordIndex === activeIndex;

                return (
                  <div
                    key={`${word}-${wordIndex}`}
                    className={`flex min-h-0 items-center justify-center overflow-hidden rounded-lg border px-1 py-0.5 text-center text-[clamp(0.65rem,2.5vw,1rem)] font-bold leading-tight transition-all duration-150 ${
                      isActive
                        ? "border-red-500 bg-red-50 text-red-800 shadow-[0_0_0_3px_rgba(239,68,68,0.16)]"
                        : "border-white bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {word}
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-600">
                <span>{progress}% tamamlandı</span>
                <span>{completedSteps} geçiş</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-red-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {phase === "paused" ? (
              <p className="mt-3 text-center text-sm font-bold text-red-700">
                Egzersiz duraklatıldı.
              </p>
            ) : null}
          </>
        )}
      </div>
    </FullscreenExerciseShell>
  );
}
