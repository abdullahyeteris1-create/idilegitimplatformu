"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import {
  calculateIntervalMs,
  createWordBlocks,
  splitTextIntoWords,
  type BlockReadingSpeedMode,
} from "@/lib/exercise-engine/blockReading";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
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
type FontSizePx = 24 | 32 | 40 | 48 | 56;
type ReadableText = {
  id: string;
  title: string;
  category: string;
  text: string;
};
type BlockReadingResult = {
  completed: boolean;
  completedBlocks: number;
  totalBlocks: number;
  totalWords: number;
  durationSeconds: number;
  score: number;
  successRate: number;
  intervalMs: number;
};

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";
const ALL_CATEGORIES = "all";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getFontLabel(fontSize: FontSizePx): string {
  if (fontSize === 24) {
    return "Kucuk";
  }

  if (fontSize === 32) {
    return "Orta";
  }

  if (fontSize === 40) {
    return "Buyuk";
  }

  return "Cok Buyuk";
}

export function BlockReadingExerciseClient() {
  const router = useRouter();
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadableText[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [textId, setTextId] = useState<string>("");
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [textDiagnostics, setTextDiagnostics] = useState<TextLibraryLoadResult["diagnostics"] | null>(null);
  const [blockSize, setBlockSize] = useState<BlockSize>(3);
  const [speedMode, setSpeedMode] = useState<BlockReadingSpeedMode>("interval");
  const [intervalInputMs, setIntervalInputMs] = useState(750);
  const [wordsPerMinute, setWordsPerMinute] = useState(150);
  const [fontSize, setFontSize] = useState<FontSizePx>(40);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<BlockReadingResult | null>(null);

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

  const intervalMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize,
      intervalMs: intervalInputMs,
      wordsPerMinute,
    });
  }, [blockSize, intervalInputMs, speedMode, wordsPerMinute]);

  const speedLabel =
    speedMode === "interval"
      ? `Atlama hizi: ${intervalMs} ms`
      : `Hiz: ${wordsPerMinute} kelime/dk (${intervalMs} ms)`;

  const currentBlock = blocks[currentBlockIndex] ?? "";

  const finalizeExercise = useCallback((completed: boolean) => {
    if (!selectedText || totalBlocks === 0 || saveLockRef.current) {
      return;
    }

    saveLockRef.current = true;
    const completedBlocks = completed ? totalBlocks : Math.min(currentBlockIndex + 1, totalBlocks);
    const successRate = Math.round((completedBlocks / totalBlocks) * 100);
    const score = completed ? 100 : successRate;
    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );

    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "block-reading",
      exerciseTitle: "Blok Okuma",
      durationSeconds,
      correctCount: 0,
      wrongCount: 0,
      score,
      successRate,
      details: {
        category: selectedText.category,
        textTitle: selectedText.title,
        totalWords,
        totalBlocks,
        blockSize,
        speedMode,
        intervalMs,
        wordsPerMinute: speedMode === "wpm" ? wordsPerMinute : undefined,
        fontSize,
      },
    });

    setResult({
      completed,
      completedBlocks,
      totalBlocks,
      totalWords,
      durationSeconds,
      score,
      successRate,
      intervalMs,
    });
    setPhase("result");
    setIsPaused(false);
  }, [
    blockSize,
    currentBlockIndex,
    elapsedSeconds,
    fontSize,
    intervalMs,
    selectedText,
    speedMode,
    totalBlocks,
    totalWords,
    wordsPerMinute,
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

  const completedBlocks = phase === "running" ? Math.min(currentBlockIndex + 1, totalBlocks) : 0;
  const progressPercent = totalBlocks === 0 ? 0 : Math.round((completedBlocks / totalBlocks) * 100);

  const footerControls = (
    <div className="grid gap-3 lg:grid-cols-7">
      <label className="flex min-w-0 flex-col gap-1 lg:col-span-1">
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
      <label className="flex min-w-0 flex-col gap-1 lg:col-span-1">
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
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hız Modu</span>
        <select value={speedMode} onChange={(event) => {
          setSpeedMode(event.target.value as BlockReadingSpeedMode);
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
          <input type="number" min={100} step={50} value={intervalInputMs} onChange={(event) => {
            setIntervalInputMs(Number(event.target.value) || 1000);
            if (isPaused) {
              resetFlowToReady();
            }
          }} className={FULLSCREEN_SELECT_CLASS} />
        ) : (
          <input type="number" min={60} step={10} value={wordsPerMinute} onChange={(event) => {
            setWordsPerMinute(Number(event.target.value) || 100);
            if (isPaused) {
              resetFlowToReady();
            }
          }} className={FULLSCREEN_SELECT_CLASS} />
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
          {[24, 32, 40, 48, 56].map((value) => (
            <option key={value} value={value}>
              {getFontLabel(value as FontSizePx)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
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
        title="Blok Okuma"
        description="Kelimeleri gruplar halinde görerek okuma alanını genişlet. Eğitime başla ile tam ekran çalışma moduna geçersin."
        buttonLabel="Eğitime Başla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Blok Okuma"
        subtitle="Hazırlık modu"
        stats={[
          { label: "Hız", value: speedLabel, tone: "brand" },
          { label: "Kelime", value: totalWords },
          { label: "Blok", value: totalBlocks },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName="fx-slide-up flex min-h-[300px] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-4 py-5 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[350px]"
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
        ) : hasActiveTexts ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazırlık</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Ayarlarını seç, hazır olduğunda başlat.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Kategori, metin, blok boyutu, hız ve font ayarlarını alt bardan yap. Başlat dediğinde bloklar tam ekran sahnede akmaya başlar.
            </p>
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
        <h2 className="text-2xl font-bold">Blok Okuma Sonucu</h2>
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
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {result.completedBlocks}/{result.totalBlocks}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatElapsed(result.durationSeconds)}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm">
          <p><strong>Metin:</strong> {selectedText.title}</p>
          <p className="mt-1"><strong>Kategori:</strong> {selectedText.category}</p>
          <p className="mt-1"><strong>Toplam Kelime:</strong> {result.totalWords}</p>
          <p className="mt-1"><strong>Blok Sayisi:</strong> {result.totalBlocks}</p>
          <p className="mt-1"><strong>Kelime / Blok:</strong> {blockSize}</p>
          <p className="mt-1"><strong>Hiz Modu:</strong> {speedMode === "interval" ? "Atlama Hizi" : "Dakikadaki Kelime Hizi"}</p>
          <p className="mt-1"><strong>Atlama Hizi:</strong> {result.intervalMs} ms</p>
          {speedMode === "wpm" ? <p className="mt-1"><strong>Kelime / Dakika:</strong> {wordsPerMinute}</p> : null}
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
                `/sonuc?exerciseType=block-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`,
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
      title="Blok Okuma"
      subtitle={selectedText?.title ?? "Tam ekran çalışma modu"}
      stats={[
        { label: "Blok", value: `${currentBlockIndex + 1}/${totalBlocks}` },
        { label: "Süre", value: formatElapsed(elapsedSeconds) },
        { label: "Hız", value: speedLabel, tone: "brand" },
        { label: "Kelime", value: blockSize },
      ]}
      finishButton={
        <button type="button" onClick={handleFinishEarly} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      footer={footerControls}
    >
      <div className="fx-fade-in flex w-full flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kelime Bloğu</p>
        <p key={`block-${currentBlockIndex}`} className="fx-slide-up mt-4 font-extrabold leading-tight text-slate-900 transition-all duration-300" style={{ fontSize: `${fontSize}px`, textShadow: "0 12px 32px rgba(185, 28, 28, 0.12)" }}>
          {currentBlock}
        </p>
        <p className="mt-4 text-sm font-semibold text-slate-500">İlerleme: %{progressPercent}</p>
      </div>
    </FullscreenExerciseShell>
  );
}
