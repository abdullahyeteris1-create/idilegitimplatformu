"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { useExerciseTimer } from "@/hooks/useExerciseTimer";
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
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import { normalizeReadingSpeed } from "@/lib/exercises/timing";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { getTextCategories, loadActiveTextLibraryItems, type TextLibraryLoadResult } from "@/lib/settings/textLibraryStorage";
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
type ReadableText = {
  id: string;
  title: string;
  category: string;
  text: string;
};
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
const JUMP_SPEED_OPTIONS: JumpSpeedMs[] = [
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
  1100,
  2000,
  5000,
];
const FONT_SIZE_OPTIONS: FontSizePx[] = [12, 14, 16, 18, 20, 22, 24, 26, 28];

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";
const ALL_CATEGORIES = "all";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function normalizeWordsPerMinute(value: number): number {
  return normalizeReadingSpeed(value, 150, 50, 1000);
}

export function ShadowReadingExerciseClient() {
  const router = useRouter();
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const readingAreaRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadableText[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [textId, setTextId] = useState<string>("");
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [textDiagnostics, setTextDiagnostics] = useState<TextLibraryLoadResult["diagnostics"] | null>(null);
  const [blockSize, setBlockSize] = useState<BlockSize>(2);
  const [speedMode, setSpeedMode] = useState<ShadowReadingSpeedMode>("interval");
  const [intervalInputMs, setIntervalInputMs] = useState<JumpSpeedMs>(500);
  const [wordsPerMinute, setWordsPerMinute] = useState<WordsPerMinute>(150);
  const [fontSize, setFontSize] = useState<FontSizePx>(20);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<ShadowReadingResult | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsTeacher(getResolvedCurrentUser()?.role === "teacher");
        setIsLoadingTexts(true);
        setTextLoadError(null);

        const result = await loadActiveTextLibraryItems();
        const activeTexts = result.items.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          text: item.content,
        }));

        setLibraryTexts(activeTexts);
        setTextLoadError(result.error);
        setTextDiagnostics(result.diagnostics ?? null);
        setTextId(activeTexts[0]?.id ?? "");
        setCategory(ALL_CATEGORIES);
        setIsLoadingTexts(false);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const availableTexts = useMemo<ReadableText[]>(() => {
    return libraryTexts;
  }, [libraryTexts]);

  const hasActiveTexts = availableTexts.length > 0;

  const availableCategories = useMemo<string[]>(() => {
    return [ALL_CATEGORIES, ...getTextCategories()];
  }, []);

  const resolvedCategory = useMemo(() => {
    return availableCategories.includes(category) ? category : ALL_CATEGORIES;
  }, [availableCategories, category]);

  const textsByCategory = useMemo(() => {
    if (resolvedCategory === ALL_CATEGORIES) {
      return availableTexts;
    }

    return availableTexts.filter((item) => item.category === resolvedCategory);
  }, [availableTexts, resolvedCategory]);

  const resolvedTextId = useMemo(() => {
    if (textsByCategory.length === 0) {
      return "";
    }

    const exists = textsByCategory.some((item) => item.id === textId);
    return exists ? textId : textsByCategory[0].id;
  }, [textId, textsByCategory]);

  const selectedText = useMemo(() => {
    return availableTexts.find((item) => item.id === resolvedTextId) ?? null;
  }, [availableTexts, resolvedTextId]);

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
  const currentBlockWordCount = blocks[currentBlockIndex]
    ? blocks[currentBlockIndex].split(/\s+/).filter(Boolean).length
    : blockSize;

  const intervalMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [blockSize, intervalInputMs, safeWordsPerMinute, speedMode]);

  const timerDelayMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize: currentBlockWordCount,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [currentBlockWordCount, intervalInputMs, safeWordsPerMinute, speedMode]);

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

  const scrollReadingAreaToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    readingAreaRef.current?.scrollTo({
      top: 0,
      behavior,
    });
  }, []);

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
    scrollReadingAreaToTop();
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
    scrollReadingAreaToTop();
  };

  const resetFlowToReady = () => {
    saveLockRef.current = true;
    startedAtRef.current = null;
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
    scrollReadingAreaToTop();
  };

  const handleRestart = () => {
    resetFlowToReady();
  };

  const handleFinishEarly = () => {
    finalizeExercise(false);
  };

  const advanceBlock = useCallback(() => {
    if (currentBlockIndex >= totalBlocks - 1) {
      finalizeExercise(true);
      return;
    }

    setCurrentBlockIndex((current) => Math.min(current + 1, totalBlocks - 1));
  }, [currentBlockIndex, finalizeExercise, totalBlocks]);

  useExerciseTimer({
    running: phase === "running" && totalBlocks > 0,
    paused: isPaused,
    delayMs: totalBlocks > 0 ? timerDelayMs : null,
    onTick: advanceBlock,
  });

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

  useEffect(() => {
    if (phase !== "running" || isPaused || !activeWordRef.current || !readingAreaRef.current) {
      return;
    }

    activeWordRef.current.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "nearest",
    });
  }, [currentBlockIndex, isPaused, phase]);

  useEffect(() => {
    if (phase === "running") {
      return;
    }

    scrollReadingAreaToTop();
  }, [resolvedTextId, blockSize, phase, scrollReadingAreaToTop]);

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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[1.1fr_1.4fr_0.75fr_0.85fr_0.8fr_0.7fr_1.6fr] lg:items-end [&_button]:min-h-10 [&_input]:h-10 [&_select]:h-10">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kategori</span>
        <select value={resolvedCategory} onChange={(event) => {
          setCategory(event.target.value);
          setTextId("");
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {availableCategories.map((item) => (
            <option key={item} value={item}>
              {item === ALL_CATEGORIES ? "Tümü" : item}
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
          const nextBlockSize = Number(event.target.value);
          if (!Number.isFinite(nextBlockSize)) return;
          setBlockSize(nextBlockSize as BlockSize);
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
        }} className={FULLSCREEN_SELECT_CLASS}>
          <option value="interval">Atlama Hızı</option>
          <option value="wpm">Kelime / Dakika</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hız</span>
        {speedMode === "interval" ? (
          <select value={intervalInputMs} onChange={(event) => {
            const nextSpeed = Number(event.target.value);
            if (!Number.isFinite(nextSpeed)) return;
            setIntervalInputMs(nextSpeed as JumpSpeedMs);
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
              if (event.target.value === "") {
                setWordsPerMinute(Number.NaN);
                return;
              }
              const nextSpeed = Number(event.target.value);
              if (!Number.isFinite(nextSpeed)) return;
              setWordsPerMinute(nextSpeed);
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
      <div className="col-span-2 grid gap-2 sm:col-span-3 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
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
        backgroundClassName="flex min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] text-slate-900 [&>div]:min-h-0 [&>div]:flex-1 [&>div>footer]:shrink-0 [&>div>header]:shrink-0"
        mainClassName="flex flex-1 min-h-0 overflow-hidden items-stretch justify-center px-2 py-2 md:px-4 md:py-3 [&>div]:min-h-0 [&>div]:flex-1"
        stats={[
          { label: "Hız", value: speedLabel, tone: "brand" },
          { label: "Kelime", value: totalWords },
          { label: "Blok", value: totalBlocks },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName="fx-slide-up flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 overflow-y-auto rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-4 py-4 text-center shadow-[0_14px_42px_rgba(185,28,28,0.10)] backdrop-blur"
        footer={footerControls}
      >
        {isLoadingTexts ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-bold text-slate-900">Metinler yükleniyor...</p>
          </div>
        ) : textLoadError ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-red-900">{textLoadError}</p>
          </div>
        ) : hasActiveTexts && totalBlocks === 0 ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 font-bold text-amber-900">
            Çalıştırılacak içerik bulunamadı.
          </p>
        ) : hasActiveTexts ? (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazırlık</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Ayarlarını seç, hazır olduğunda başlat.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Alt bardan kategori, metin, blok sayısı, hız ve font ayarlarını seç. Başlat dediğinde vurgu ritmi tam ekran sahnede ilerler.
              </p>
            </div>
            <div className="w-full max-w-3xl">{textInfo}</div>
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-amber-900">Metin Kütüphanesinde aktif metin bulunamadı.</p>
            {process.env.NODE_ENV !== "production" && textDiagnostics ? (
              <p className="text-xs text-amber-800">
                Teşhis: Supabase {textDiagnostics.supabaseCount}, localStorage {textDiagnostics.localStorageCount}, filtre {textDiagnostics.activeFilter}, kaynak {textDiagnostics.source}
                {textDiagnostics.error ? `, hata: ${textDiagnostics.error}` : ""}
              </p>
            ) : null}
            <p className="text-sm text-amber-800">
              {isTeacher
                ? "Blok Okuma, Golgeleme, Odakli Okuma ve Anlama Testi icin metin ekleyin."
                : "Bu çalışma için henüz öğretmeniniz tarafından metin eklenmemiş."}
            </p>
            {isTeacher ? (
              <Link
                href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-900/25 bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Metin Ekle
              </Link>
            ) : null}
          </div>
        )}
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result" && selectedText && result) {
    return (
      <section className="idil-card mx-auto w-full max-w-5xl p-4 md:p-6">
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

        <div className="mt-4 flex justify-end">
          <ExerciseNavigationControls />
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
      backgroundClassName="flex min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] text-slate-900 [&>div]:min-h-0 [&>div]:flex-1 [&>div>footer]:shrink-0 [&>div>header]:shrink-0"
      mainClassName="flex flex-1 min-h-0 overflow-hidden items-stretch justify-center px-2 py-2 md:px-4 md:py-3 [&>div]:min-h-0 [&>div]:flex-1"
      stageClassName="fx-slide-up flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-3 py-3 text-center shadow-[0_14px_42px_rgba(185,28,28,0.10)] backdrop-blur md:px-5"
      footer={footerControls}
    >
      <div className="fx-fade-in flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 text-left">
        <div className="w-full max-w-3xl shrink-0 self-center">{textInfo}</div>

        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[26px] border border-red-100 bg-white px-4 py-3 shadow-[0_18px_48px_rgba(185,28,28,0.10)] md:px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gölgeleme metni</p>
          <div
            ref={readingAreaRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth whitespace-normal break-words text-slate-900 [overflow-wrap:anywhere] [word-break:break-word]"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
          >
            {words.map((word, index) => {
              const isActive = index >= activeRange.startIndex && index <= activeRange.endIndex;
              const isActiveStart = index === activeRange.startIndex;

              return (
                <span
                  key={`${word}-${index}`}
                  ref={isActiveStart ? activeWordRef : null}
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

          <div className="mt-3 shrink-0">
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
