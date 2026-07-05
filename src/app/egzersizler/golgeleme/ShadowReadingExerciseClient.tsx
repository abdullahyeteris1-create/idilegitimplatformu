"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  BLOCK_READING_CATEGORIES,
  BLOCK_READING_TEXTS,
  type BlockReadingCategory,
} from "@/lib/data/blockReadingTexts";
import {
  calculateCharacterCount,
  calculateIntervalMs,
  calculateReadingDuration,
  createWordBlocks,
  formatDuration,
  getActiveBlockRange,
  splitTextIntoWords,
  type ShadowReadingSpeedMode,
} from "@/lib/exercise-engine/shadowReading";
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

type ExercisePhase = "setup" | "ready" | "running" | "result";
type BlockSize = 1 | 2 | 3 | 4 | 5;
type JumpSpeedMs = number;
type WordsPerMinute = number;
type FontSizePx = 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28;
type ShadowReadingResult = {
  completed: boolean;
  completedBlocks: number;
  totalBlocks: number;
  totalWords: number;
  totalCharacters: number;
  durationSeconds: number;
  estimatedDurationSeconds: number;
  score: number;
  successRate: number;
  intervalMs: number;
};

const BLOCK_SIZE_OPTIONS: BlockSize[] = [1, 2, 3, 4, 5];
const JUMP_SPEED_OPTIONS: JumpSpeedMs[] = Array.from({ length: 20 }, (_, index) => (index + 1) * 50);
const FONT_SIZE_OPTIONS: FontSizePx[] = [12, 14, 16, 18, 20, 22, 24, 26, 28];

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function normalizeWordsPerMinute(value: number): number {
  if (!Number.isFinite(value)) {
    return 150;
  }

  return Math.min(1000, Math.max(50, Math.round(value)));
}

export function ShadowReadingExerciseClient() {
  const router = useRouter();
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [category, setCategory] = useState<BlockReadingCategory>("Genel");
  const [textId, setTextId] = useState<string>("");
  const [blockSize, setBlockSize] = useState<BlockSize>(2);
  const [speedMode, setSpeedMode] = useState<ShadowReadingSpeedMode>("interval");
  const [intervalInputMs, setIntervalInputMs] = useState<JumpSpeedMs>(500);
  const [wordsPerMinute, setWordsPerMinute] = useState<WordsPerMinute>(150);
  const [fontSize, setFontSize] = useState<FontSizePx>(20);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<ShadowReadingResult | null>(null);

  const textsByCategory = useMemo(() => {
    return BLOCK_READING_TEXTS.filter((item) => item.category === category);
  }, [category]);

  const resolvedTextId = useMemo(() => {
    if (textsByCategory.length === 0) {
      return "";
    }

    const exists = textsByCategory.some((item) => item.id === textId);
    return exists ? textId : textsByCategory[0].id;
  }, [textId, textsByCategory]);

  const selectedText = useMemo(() => {
    return BLOCK_READING_TEXTS.find((item) => item.id === resolvedTextId) ?? null;
  }, [resolvedTextId]);

  const words = useMemo(() => {
    if (!selectedText) {
      return [];
    }

    return splitTextIntoWords(selectedText.text);
  }, [selectedText]);

  const blocks = useMemo(() => {
    return createWordBlocks(words, blockSize);
  }, [blockSize, words]);

  const totalBlocks = blocks.length;
  const totalWords = words.length;
  const totalCharacters = selectedText ? calculateCharacterCount(selectedText.text) : 0;
  const safeWordsPerMinute = normalizeWordsPerMinute(wordsPerMinute);

  const intervalMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [blockSize, intervalInputMs, safeWordsPerMinute, speedMode]);

  const estimatedDurationSeconds = useMemo(() => {
    return calculateReadingDuration({
      mode: speedMode,
      blockSize,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
      totalWords,
    });
  }, [blockSize, intervalInputMs, safeWordsPerMinute, speedMode, totalWords]);

  const speedLabel =
    speedMode === "interval"
      ? `Atlama hizi: ${intervalMs} ms`
      : `Okuma hizi: ${safeWordsPerMinute} kelime/dk`;

  const activeRange = useMemo(() => {
    return getActiveBlockRange(currentBlockIndex, blockSize);
  }, [blockSize, currentBlockIndex]);

  const completedBlocks = phase === "running" ? Math.min(currentBlockIndex + 1, totalBlocks) : 0;
  const progressPercent = totalBlocks === 0 ? 0 : Math.round((completedBlocks / totalBlocks) * 100);

  const finalizeExercise = useCallback((completed: boolean) => {
    if (!selectedText || totalBlocks === 0 || saveLockRef.current) {
      return;
    }

    saveLockRef.current = true;
    const safeCompletedBlocks = completed ? totalBlocks : Math.min(currentBlockIndex + 1, totalBlocks);
    const completedPercent = Math.round((safeCompletedBlocks / totalBlocks) * 100);
    const score = completedPercent;
    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );

    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "shadow-reading",
      exerciseTitle: "Golgeleme",
      durationSeconds,
      correctCount: 0,
      wrongCount: 0,
      score,
      successRate: completedPercent,
      details: {
        category: selectedText.category,
        textTitle: selectedText.title,
        totalWords,
        totalCharacters,
        blockSize,
        speedMode,
        intervalMs,
        wordsPerMinute: speedMode === "wpm" ? safeWordsPerMinute : undefined,
        fontSize,
        completedBlocks: safeCompletedBlocks,
        totalBlocks,
        progressPercent: completedPercent,
        completedPercent,
        estimatedDurationSeconds,
        actualDurationSeconds: durationSeconds,
      },
    });

    setResult({
      completed,
      completedBlocks: safeCompletedBlocks,
      totalBlocks,
      totalWords,
      totalCharacters,
      durationSeconds,
      estimatedDurationSeconds,
      score,
      successRate: completedPercent,
      intervalMs,
    });
    setPhase("result");
    setIsPaused(false);
  }, [
    blockSize,
    currentBlockIndex,
    elapsedSeconds,
    estimatedDurationSeconds,
    fontSize,
    intervalMs,
    selectedText,
    safeWordsPerMinute,
    speedMode,
    totalCharacters,
    totalBlocks,
    totalWords,
  ]);

  const handleStart = () => {
    saveLockRef.current = false;
    startedAtRef.current = null;
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    if (!selectedText || totalBlocks === 0) {
      return;
    }

    saveLockRef.current = false;
    startedAtRef.current = Date.now();
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("running");
  };

  const resetFlowToReady = () => {
    saveLockRef.current = true;
    startedAtRef.current = null;
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
  };

  const handleRestart = () => {
    resetFlowToReady();
  };

  const handleFinishEarly = () => {
    finalizeExercise(false);
  };

  useEffect(() => {
    if (phase !== "running" || isPaused || totalBlocks === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentBlockIndex((prev) => {
        if (prev >= totalBlocks - 1) {
          finalizeExercise(true);
          return prev;
        }

        return prev + 1;
      });
    }, intervalMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentBlockIndex, finalizeExercise, intervalMs, isPaused, phase, totalBlocks]);

  useEffect(() => {
    if (phase !== "running" || isPaused) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPaused, phase]);

  const textInfo = (
    <div className="grid w-full gap-2 text-xs font-bold text-slate-700 sm:grid-cols-3">
      <span className="rounded-xl border border-red-100 bg-white/90 px-3 py-2 shadow-sm shadow-red-100/60">
        Kelime Sayisi: {totalWords}
      </span>
      <span className="rounded-xl border border-red-100 bg-white/90 px-3 py-2 shadow-sm shadow-red-100/60">
        Karakter Sayisi: {totalCharacters}
      </span>
      <span className="rounded-xl border border-red-100 bg-red-50/90 px-3 py-2 text-red-700 shadow-sm shadow-red-100/60">
        Okuma Suresi: {formatDuration(estimatedDurationSeconds)}
      </span>
    </div>
  );

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-8">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kategori</span>
        <select value={category} onChange={(event) => {
          setCategory(event.target.value as BlockReadingCategory);
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {BLOCK_READING_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Metin</span>
        <select value={resolvedTextId} onChange={(event) => {
          setTextId(event.target.value);
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {textsByCategory.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kelime Sayısı</span>
        <select value={blockSize} onChange={(event) => {
          setBlockSize(Number(event.target.value) as BlockSize);
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {BLOCK_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hız Modu</span>
        <select value={speedMode} onChange={(event) => {
          setSpeedMode(event.target.value as ShadowReadingSpeedMode);
          if (isPaused) {
            resetFlowToReady();
          }
        }} className={FULLSCREEN_SELECT_CLASS}>
          <option value="interval">Atlama Hızı</option>
          <option value="wpm">Kelime / Dakika</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hız</span>
        {speedMode === "interval" ? (
          <select value={intervalInputMs} onChange={(event) => {
            setIntervalInputMs(Number(event.target.value) as JumpSpeedMs);
            if (isPaused) {
              resetFlowToReady();
            }
          }} className={FULLSCREEN_SELECT_CLASS}>
            {JUMP_SPEED_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} ms
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min={50}
            max={1000}
            step={1}
            inputMode="numeric"
            value={Number.isFinite(wordsPerMinute) ? wordsPerMinute : ""}
            onChange={(event) => {
              setWordsPerMinute(event.target.value === "" ? Number.NaN : Number(event.target.value));
              if (isPaused) {
                resetFlowToReady();
              }
            }}
            onBlur={() => setWordsPerMinute(safeWordsPerMinute)}
            className={FULLSCREEN_SELECT_CLASS}
          />
        )}
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Font</span>
        <select value={fontSize} onChange={(event) => {
          setFontSize(Number(event.target.value) as FontSizePx);
          if (isPaused) {
            resetFlowToReady();
          }
        }} className={FULLSCREEN_SELECT_CLASS}>
          {FONT_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-3 lg:col-span-2">
        {phase === "ready" ? (
          <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleBeginPlay} disabled={!selectedText || totalBlocks === 0}>
            Başlat
          </button>
        ) : (
          <>
            <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={() => setIsPaused((prev) => !prev)}>
              {isPaused ? "Devam Et" : "Duraklat"}
            </button>
            <div className="flex gap-2">
              <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart}>
                Yeniden Başlat
              </button>
              <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleFinishEarly}>
                Bitir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Gölgeleme"
        description="Metni takip ederken aktif kelime gruplarını vurgu ile izle. Eğitime başla ile tam ekran çalışma moduna geçersin."
        buttonLabel="Eğitime Başla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Gölgeleme"
        subtitle="Hazırlık modu"
        stats={[
          { label: "Hız", value: speedLabel, tone: "brand" },
          { label: "Kelime", value: totalWords },
          { label: "Blok", value: totalBlocks },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName="fx-slide-up mt-3 flex min-h-[42vh] w-full flex-col items-center justify-center gap-5 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[50vh]"
        footer={footerControls}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazırlık</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Ayarlarını seç, hazır olduğunda başlat.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
            Alt bardan kategori, metin, blok sayısı, hız ve font ayarlarını seç. Başlat dediğinde vurgu ritmi tam ekran sahnede ilerler.
          </p>
        </div>
        <div className="w-full max-w-3xl">{textInfo}</div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result" && selectedText && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Golgeleme Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {result.completed ? "Metin tamamlandi." : "Egzersiz erken bitirildi."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.successRate}%</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Blok</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.completedBlocks}/{result.totalBlocks}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatDuration(result.durationSeconds)}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm">
          <p><strong>Metin:</strong> {selectedText.title}</p>
          <p className="mt-1"><strong>Kategori:</strong> {selectedText.category}</p>
          <p className="mt-1"><strong>Toplam Kelime:</strong> {result.totalWords}</p>
          <p className="mt-1"><strong>Karakter Sayisi:</strong> {result.totalCharacters}</p>
          <p className="mt-1"><strong>Blok Sayisi:</strong> {result.totalBlocks}</p>
          <p className="mt-1"><strong>Kelime / Blok:</strong> {blockSize}</p>
          <p className="mt-1"><strong>Hiz Modu:</strong> {speedMode === "interval" ? "Atlama Hizi" : "Okuma Hizi"}</p>
          <p className="mt-1"><strong>Aralik:</strong> {result.intervalMs} ms</p>
          {speedMode === "wpm" ? <p className="mt-1"><strong>Kelime / Dakika:</strong> {safeWordsPerMinute}</p> : null}
          <p className="mt-1"><strong>Tahmini Sure:</strong> {formatDuration(result.estimatedDurationSeconds)}</p>
          <p className="mt-1"><strong>Font Boyutu:</strong> {fontSize}px</p>
          <p className="mt-1"><strong>Tamamlandi:</strong> {result.completed ? "Evet" : "Hayir"}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleRestart}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() =>
              router.push(
                `/sonuc?exerciseType=shadow-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`,
              )
            }
          >
            Ortak Sonuc Ekrani
          </button>
        </div>

        <div className="mt-3">
          <Link
            href="/egzersizler"
            className="relative z-50 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-4 text-base font-bold text-red-800 transition hover:bg-red-50"
            style={TOUCH_STYLE}
          >
            Egzersizlere Don
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Gölgeleme"
      subtitle={selectedText?.title ?? "Tam ekran çalışma modu"}
      stats={[
        { label: "Blok", value: `${completedBlocks}/${totalBlocks}` },
        { label: "Süre", value: formatDuration(elapsedSeconds) },
        { label: "Hız", value: speedLabel, tone: "brand" },
        { label: "Okuma", value: formatDuration(estimatedDurationSeconds) },
      ]}
      finishButton={
        <button type="button" onClick={handleFinishEarly} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up mt-3 flex min-h-[54vh] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-3 py-4 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[62vh] md:px-6 md:py-6"
      footer={footerControls}
    >
      <div className="fx-fade-in flex w-full max-w-6xl flex-col gap-4 text-left">
        <div className="w-full max-w-3xl self-center">{textInfo}</div>

        <div className="flex min-h-[46vh] w-full flex-col rounded-[26px] border border-red-100 bg-white px-4 py-4 shadow-[0_22px_60px_rgba(185,28,28,0.12)] md:min-h-[52vh] md:px-7 md:py-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gölgeleme metni</p>
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden whitespace-normal break-words text-slate-900 [overflow-wrap:anywhere] [word-break:break-word]"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
          >
            {words.map((word, index) => {
              const isActive = index >= activeRange.startIndex && index <= activeRange.endIndex;

              return (
                <span
                  key={`${word}-${index}`}
                  className={`mr-1.5 inline rounded-md px-1 py-0.5 transition duration-200 md:mr-2 ${
                    isActive
                      ? "fx-pulse-soft bg-red-200/95 text-red-900 shadow-[0_0_0_1px_rgba(220,38,38,0.24)]"
                      : "bg-transparent text-slate-800"
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
              <span>{progressPercent}% tamamlandi</span>
              <span>{completedBlocks}/{totalBlocks}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200/90 shadow-inner">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#dc2626_55%,#991b1b_100%)] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {isPaused ? (
          <p className="text-center text-sm font-semibold text-red-700">Duraklatildi. Devam Et ile kaldigin yerden surdur.</p>
        ) : null}
      </div>
    </FullscreenExerciseShell>
  );
}
