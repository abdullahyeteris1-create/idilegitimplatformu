"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  calculateCharacterCount,
  calculateIntervalMs,
  calculateReadingDuration,
  createWordGroups,
  formatDuration,
  splitTextIntoWords,
  type FocusedReadingSpeedMode,
} from "@/lib/exercise-engine/focusedReading";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { DEFAULT_TEXT_CATEGORY, TEXT_LIBRARY_CATEGORIES, getActiveTextLibraryItems } from "@/lib/settings/textLibraryStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase = "setup" | "ready" | "running" | "result";
type GroupSize = 1 | 2 | 3 | 4 | 5;
type JumpSpeedMs = number;
type WordsPerMinute = number;
type FontSizePx = 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28;
type ReadableText = {
  id: string;
  title: string;
  category: string;
  text: string;
};

type FocusedReadingResult = {
  completed: boolean;
  completedGroups: number;
  totalGroups: number;
  totalWords: number;
  totalCharacters: number;
  durationSeconds: number;
  estimatedDurationSeconds: number;
  score: number;
  successRate: number;
  intervalMs: number;
};

const GROUP_SIZE_OPTIONS: GroupSize[] = [1, 2, 3, 4, 5];
const JUMP_SPEED_OPTIONS: JumpSpeedMs[] = Array.from({ length: 20 }, (_, index) => (index + 1) * 50);
const FONT_SIZE_OPTIONS: FontSizePx[] = [12, 14, 16, 18, 20, 22, 24, 26, 28];

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function getSpeedLabel(speedMode: FocusedReadingSpeedMode, intervalMs: number, wordsPerMinute: WordsPerMinute): string {
  if (speedMode === "interval") {
    return `Atlama hizi: ${intervalMs} ms`;
  }

  return `Okuma hizi: ${wordsPerMinute} kelime/dk`;
}

function normalizeWordsPerMinute(value: number): number {
  if (!Number.isFinite(value)) {
    return 200;
  }

  return Math.min(1000, Math.max(50, Math.round(value)));
}

export function FocusedReadingExerciseClient() {
  const router = useRouter();
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadableText[]>([]);
  const [category, setCategory] = useState(DEFAULT_TEXT_CATEGORY);
  const [textId, setTextId] = useState("");
  const [groupSize, setGroupSize] = useState<GroupSize>(2);
  const [speedMode, setSpeedMode] = useState<FocusedReadingSpeedMode>("interval");
  const [jumpSpeedMs, setJumpSpeedMs] = useState<JumpSpeedMs>(500);
  const [wordsPerMinute, setWordsPerMinute] = useState<WordsPerMinute>(200);
  const [fontSize, setFontSize] = useState<FontSizePx>(20);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<FocusedReadingResult | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTeacher(getResolvedCurrentUser()?.role === "teacher");

      const activeTexts = getActiveTextLibraryItems().map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        text: item.content,
      }));

      setLibraryTexts(activeTexts);
      if (activeTexts.length > 0) {
        setCategory(activeTexts[0].category);
        setTextId(activeTexts[0].id);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const availableTexts = useMemo<ReadableText[]>(() => {
    return libraryTexts;
  }, [libraryTexts]);

  const hasActiveTexts = availableTexts.length > 0;

  const availableCategories = useMemo<string[]>(() => {
    return [...TEXT_LIBRARY_CATEGORIES];
  }, []);

  const resolvedCategory = useMemo(() => {
    return availableCategories.includes(category) ? category : availableCategories[0] ?? "";
  }, [availableCategories, category]);

  const textsByCategory = useMemo(() => {
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
    return selectedText ? splitTextIntoWords(selectedText.text) : [];
  }, [selectedText]);

  const wordGroups = useMemo(() => {
    return createWordGroups(words, groupSize);
  }, [groupSize, words]);

  const totalWords = words.length;
  const totalGroups = wordGroups.length;
  const totalCharacters = selectedText ? calculateCharacterCount(selectedText.text) : 0;
  const safeWordsPerMinute = normalizeWordsPerMinute(wordsPerMinute);

  const intervalMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      groupSize,
      intervalMs: jumpSpeedMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [groupSize, jumpSpeedMs, safeWordsPerMinute, speedMode]);

  const estimatedDurationSeconds = useMemo(() => {
    return calculateReadingDuration({
      mode: speedMode,
      groupSize,
      intervalMs: jumpSpeedMs,
      wordsPerMinute: safeWordsPerMinute,
      totalWords,
    });
  }, [groupSize, jumpSpeedMs, safeWordsPerMinute, speedMode, totalWords]);

  const speedLabel = getSpeedLabel(speedMode, intervalMs, safeWordsPerMinute);
  const currentGroup = wordGroups[currentGroupIndex] ?? "";
  const completedGroups = phase === "running" ? Math.min(currentGroupIndex + 1, totalGroups) : 0;
  const progressPercent = totalGroups === 0 ? 0 : Math.round((completedGroups / totalGroups) * 100);

  const finalizeExercise = useCallback((completed: boolean) => {
    if (!selectedText || totalGroups === 0 || saveLockRef.current) {
      return;
    }

    saveLockRef.current = true;
    const safeCompletedGroups = completed ? totalGroups : Math.min(currentGroupIndex + 1, totalGroups);
    const completedPercent = Math.round((safeCompletedGroups / totalGroups) * 100);
    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "focused-reading",
      exerciseTitle: "Odaklı Okuma Çalışması",
      durationSeconds,
      correctCount: 0,
      wrongCount: 0,
      score: completedPercent,
      successRate: completedPercent,
      details: {
        category: selectedText.category,
        textTitle: selectedText.title,
        totalWords,
        totalCharacters,
        groupSize,
        speedMode,
        intervalMs,
        wordsPerMinute: speedMode === "wpm" ? safeWordsPerMinute : undefined,
        fontSize,
        completedGroups: safeCompletedGroups,
        totalGroups,
        progressPercent: completedPercent,
        completedPercent,
        estimatedDurationSeconds,
        actualDurationSeconds: durationSeconds,
      },
    });

    setResult({
      completed,
      completedGroups: safeCompletedGroups,
      totalGroups,
      totalWords,
      totalCharacters,
      durationSeconds,
      estimatedDurationSeconds,
      score: completedPercent,
      successRate: completedPercent,
      intervalMs,
    });
    setIsPaused(false);
    setPhase("result");
  }, [
    currentGroupIndex,
    elapsedSeconds,
    estimatedDurationSeconds,
    fontSize,
    groupSize,
    intervalMs,
    safeWordsPerMinute,
    selectedText,
    speedMode,
    totalCharacters,
    totalGroups,
    totalWords,
  ]);

  const handleStart = () => {
    saveLockRef.current = false;
    startedAtRef.current = null;
    setCurrentGroupIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    if (!selectedText || totalGroups === 0) {
      return;
    }

    saveLockRef.current = false;
    startedAtRef.current = Date.now();
    setCurrentGroupIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("running");
  };

  const resetFlowToReady = () => {
    saveLockRef.current = true;
    startedAtRef.current = null;
    setCurrentGroupIndex(0);
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
    if (phase !== "running" || isPaused || totalGroups === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentGroupIndex((prev) => {
        if (prev >= totalGroups - 1) {
          finalizeExercise(true);
          return prev;
        }

        return prev + 1;
      });
    }, intervalMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentGroupIndex, finalizeExercise, intervalMs, isPaused, phase, totalGroups]);

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
        <select value={resolvedCategory} onChange={(event) => {
          setCategory(event.target.value);
          setTextId("");
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {availableCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Makale</span>
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kelime</span>
        <select value={groupSize} onChange={(event) => {
          setGroupSize(Number(event.target.value) as GroupSize);
          resetFlowToReady();
        }} className={FULLSCREEN_SELECT_CLASS}>
          {GROUP_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select value={speedMode} onChange={(event) => {
          setSpeedMode(event.target.value as FocusedReadingSpeedMode);
          if (isPaused) {
            resetFlowToReady();
          }
        }} className={FULLSCREEN_SELECT_CLASS}>
          <option value="interval">Atlama Hizi</option>
          <option value="wpm">Okuma Hizi</option>
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {speedMode === "interval" ? "Atlama" : "Kelime/Dk"}
        </span>
        {speedMode === "interval" ? (
          <select value={jumpSpeedMs} onChange={(event) => {
            setJumpSpeedMs(Number(event.target.value) as JumpSpeedMs);
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
          <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleBeginPlay} disabled={!selectedText || totalGroups === 0}>
            Baslat
          </button>
        ) : (
          <>
            <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={() => setIsPaused((prev) => !prev)}>
              {isPaused ? "Devam Et" : "Duraklat"}
            </button>
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Baslat
            </button>
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleFinishEarly}>
              Bitir
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Odaklı Okuma Çalışması"
        description="Seçilen metni odak alanında kelime grupları halinde takip ederek oku."
        buttonLabel="Eğitime Başla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Odaklı Okuma Çalışması"
        subtitle="Hazirlik modu"
        stats={[
          { label: "Hiz", value: speedLabel, tone: "brand" },
          { label: "Kelime", value: totalWords },
          { label: "Grup", value: totalGroups },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName="fx-slide-up mt-3 flex min-h-[38vh] w-full flex-col items-center justify-center gap-5 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[44vh]"
        footer={footerControls}
      >
        {hasActiveTexts ? (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Alt bardan kategori, makale, kelime sayisi, hiz ve font ayarlarini sec.
              </p>
            </div>
            <div className="w-full max-w-3xl">{textInfo}</div>
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-amber-900">Bu çalışma için henüz aktif metin bulunmuyor.</p>
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
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Odaklı Okuma Sonucu</h2>
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
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Grup</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.completedGroups}/{result.totalGroups}</p>
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
          <p className="mt-1"><strong>Kelime / Grup:</strong> {groupSize}</p>
          <p className="mt-1"><strong>Hiz Modu:</strong> {speedMode === "interval" ? "Atlama Hizi" : "Okuma Hizi"}</p>
          <p className="mt-1"><strong>Aralik:</strong> {result.intervalMs} ms</p>
          {speedMode === "wpm" ? <p className="mt-1"><strong>Kelime / Dakika:</strong> {safeWordsPerMinute}</p> : null}
          <p className="mt-1"><strong>Tahmini Sure:</strong> {formatDuration(result.estimatedDurationSeconds)}</p>
          <p className="mt-1"><strong>Font Boyutu:</strong> {fontSize}px</p>
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
                `/sonuc?exerciseType=focused-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`,
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
      title="Odaklı Okuma Çalışması"
      subtitle={selectedText?.title ?? "Tam ekran calisma modu"}
      stats={[
        { label: "Grup", value: `${completedGroups}/${totalGroups}` },
        { label: "Sure", value: formatDuration(elapsedSeconds) },
        { label: "Hiz", value: speedLabel, tone: "brand" },
        { label: "Okuma", value: formatDuration(estimatedDurationSeconds) },
      ]}
      finishButton={
        <button type="button" onClick={handleFinishEarly} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up mt-3 flex min-h-[48vh] w-full flex-col items-center justify-center gap-6 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-4 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[56vh] md:px-6"
      footer={footerControls}
    >
      <div className="w-full max-w-3xl">{textInfo}</div>

      <div className="w-full max-w-5xl">
        <div className="relative mx-auto w-full overflow-hidden rounded-[28px] border border-red-100 bg-white px-3 py-8 shadow-[0_22px_60px_rgba(185,28,28,0.12)] md:px-8 md:py-10">
          <div className="relative mx-auto h-[118px] w-full max-w-4xl overflow-hidden rounded-full border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] shadow-inner shadow-red-100/90 md:h-[138px]">
            <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-red-100/80" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-20 bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.96)_45%,rgba(255,255,255,0)_100%)] sm:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-20 bg-[linear-gradient(270deg,#ffffff_0%,rgba(255,255,255,0.96)_45%,rgba(255,255,255,0)_100%)] sm:w-32" />
            <div className="absolute inset-y-3 left-1/2 z-10 w-[78%] -translate-x-1/2 rounded-full border border-red-200/80 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_52%,#b91c1c_100%)] shadow-[0_18px_44px_rgba(185,28,28,0.24)] sm:w-[58%] md:w-[48%]" />
            <div className="pointer-events-none absolute inset-y-6 left-1/2 z-20 w-[70%] -translate-x-1/2 rounded-full border border-white/55 sm:w-[50%] md:w-[42%]" />

            <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden px-5 whitespace-nowrap">
              <span
                key={`focused-flow-${currentGroupIndex}`}
                className="fx-flow-through block max-w-[72%] truncate px-3 text-center font-extrabold leading-tight text-white transition duration-300 sm:max-w-[54%] md:max-w-[44%]"
                style={{
                  fontSize: `${fontSize}px`,
                  textShadow: "0 10px 28px rgba(127, 29, 29, 0.34)",
                }}
              >
                {currentGroup}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
            <span>{progressPercent}% tamamlandi</span>
            <span>{completedGroups}/{totalGroups}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200/90 shadow-inner">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#dc2626_55%,#991b1b_100%)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isPaused ? (
          <p className="mt-4 text-sm font-semibold text-red-700">Duraklatildi. Devam Et ile kaldigin yerden surdur.</p>
        ) : null}
      </div>
    </FullscreenExerciseShell>
  );
}
