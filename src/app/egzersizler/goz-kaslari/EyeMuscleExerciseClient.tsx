"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import {
  EYE_MUSCLE_LEVEL_OPTIONS,
  EYE_MUSCLE_SPEED_OPTIONS,
  calculateSymbolPosition,
  formatDuration,
  getMovementPatternByLevel,
  getMovementPatternLabel,
  getMovementPointsByLevel,
  getRandomSymbol,
  getSymbolById,
  getSymbolOptions,
  type EyeMuscleLevel,
  type EyeMuscleSpeedMs,
  type EyeSymbolOption,
} from "@/lib/exercise-engine/eyeMuscle";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase = "setup" | "ready" | "running" | "result";

type EyeMuscleResult = {
  completedSeconds: number;
  startLevel: EyeMuscleLevel;
  reachedLevel: EyeMuscleLevel;
  speedMs: EyeMuscleSpeedMs;
  selectedSymbol: EyeSymbolOption;
  displayedSymbol: EyeSymbolOption;
  randomSymbolMode: boolean;
  movementPattern: string;
  score: number;
  successRate: number;
};

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const COMPACT_BUTTON_CLASS =
  "relative z-50 min-h-[42px] cursor-pointer select-none touch-manipulation rounded-xl border border-red-200 bg-white/95 px-3 py-2 text-xs font-bold text-red-700 shadow-sm shadow-red-100/70 transition active:scale-[0.98] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const DEFAULT_SYMBOL_ID = "red-circle";

function calculateScore(completedSeconds: number): number {
  return Math.min(100, Math.floor(completedSeconds / 60) * 20);
}

export function EyeMuscleExerciseClient() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const pointRef = useRef<number | null>(null);
  const symbolRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);
  const maxReachedLevelRef = useRef<EyeMuscleLevel>(1);
  const automaticLevelChangesRef = useRef(0);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [selectedSymbolId, setSelectedSymbolId] = useState(DEFAULT_SYMBOL_ID);
  const [displaySymbolId, setDisplaySymbolId] = useState(DEFAULT_SYMBOL_ID);
  const [isSymbolPickerOpen, setIsSymbolPickerOpen] = useState(false);
  const [randomSymbolMode, setRandomSymbolMode] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EyeMuscleLevel>(1);
  const [sessionStartLevel, setSessionStartLevel] = useState<EyeMuscleLevel>(1);
  const [levelAnchorSeconds, setLevelAnchorSeconds] = useState(0);
  const [speedMs, setSpeedMs] = useState<EyeMuscleSpeedMs>(250);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [blinkKey, setBlinkKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<EyeMuscleResult | null>(null);

  const selectedSymbol = getSymbolById(selectedSymbolId);
  const displaySymbol = getSymbolById(displaySymbolId);
  const currentLevel = Math.min(5, selectedLevel + Math.floor(Math.max(0, elapsedSeconds - levelAnchorSeconds) / 60)) as EyeMuscleLevel;
  const movementPattern = getMovementPatternByLevel(currentLevel);
  const movementPatternLabel = getMovementPatternLabel(movementPattern);
  const symbolPosition = calculateSymbolPosition({
    level: currentLevel,
    pointIndex: currentPointIndex,
  });

  const clearRunTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (pointRef.current !== null) {
      window.clearInterval(pointRef.current);
      pointRef.current = null;
    }
  }, []);

  const clearSymbolTimer = useCallback(() => {
    if (symbolRef.current !== null) {
      window.clearInterval(symbolRef.current);
      symbolRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearRunTimers();
    clearSymbolTimer();
  }, [clearRunTimers, clearSymbolTimer]);

  useEffect(() => {
    if (phase !== "running" || isPaused) {
      clearRunTimers();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextElapsed = prev + 1;
        const nextLevel = Math.min(5, selectedLevel + Math.floor(Math.max(0, nextElapsed - levelAnchorSeconds) / 60)) as EyeMuscleLevel;
        const previousLevel = Math.min(5, selectedLevel + Math.floor(Math.max(0, prev - levelAnchorSeconds) / 60)) as EyeMuscleLevel;

        if (nextLevel > previousLevel) {
          automaticLevelChangesRef.current += nextLevel - previousLevel;
          maxReachedLevelRef.current = Math.max(maxReachedLevelRef.current, nextLevel) as EyeMuscleLevel;
          setCurrentPointIndex(0);
          setBlinkKey((key) => key + 1);
        }

        return nextElapsed;
      });
    }, 1000);

    pointRef.current = window.setInterval(() => {
      setCurrentPointIndex((prev) => {
        const points = getMovementPointsByLevel(currentLevel);

        return (prev + 1) % points.length;
      });
      setBlinkKey((prev) => prev + 1);
    }, speedMs);

    return () => clearRunTimers();
  }, [clearRunTimers, currentLevel, isPaused, levelAnchorSeconds, phase, selectedLevel, speedMs]);

  useEffect(() => {
    if (phase !== "running" || isPaused || !randomSymbolMode) {
      clearSymbolTimer();
      return;
    }

    symbolRef.current = window.setInterval(() => {
      setDisplaySymbolId((prev) => getRandomSymbol(prev).id);
    }, 2200);

    return () => {
      clearSymbolTimer();
    };
  }, [clearSymbolTimer, isPaused, phase, randomSymbolMode]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const resetToReady = useCallback(() => {
    clearTimers();
    hasSavedResultRef.current = false;
    setElapsedSeconds(0);
    setCurrentPointIndex(0);
    setBlinkKey((prev) => prev + 1);
    setLevelAnchorSeconds(0);
    maxReachedLevelRef.current = selectedLevel;
    automaticLevelChangesRef.current = 0;
    setDisplaySymbolId(selectedSymbolId);
    setIsPaused(false);
    setResult(null);
    setIsSymbolPickerOpen(false);
    setPhase("ready");
  }, [clearTimers, selectedLevel, selectedSymbolId]);

  const finalizeExercise = useCallback(() => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearTimers();

    const completedSeconds = Math.max(0, elapsedSeconds);
    const reachedLevel = Math.max(maxReachedLevelRef.current, currentLevel) as EyeMuscleLevel;
    const finalMovementPattern = getMovementPatternByLevel(reachedLevel);
    const score = calculateScore(completedSeconds);
    const successRate = completedSeconds > 0 ? 100 : 0;
    const student = getCurrentStudent();
    const finalSelectedSymbol = getSymbolById(selectedSymbolId);
    const finalDisplaySymbol = getSymbolById(displaySymbolId);

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "eye-muscle",
      exerciseTitle: "Goz Kaslarini Gelistirme Calismasi",
      durationSeconds: completedSeconds,
      correctCount: 0,
      wrongCount: 0,
      score,
      successRate,
      details: {
        selectedSymbol: finalSelectedSymbol,
        displayedSymbol: finalDisplaySymbol,
        startLevel: sessionStartLevel,
        randomSymbolMode,
        speedMs,
        completedSeconds,
        reachedLevel,
        movementPattern: finalMovementPattern,
        levelChanges: automaticLevelChangesRef.current,
        scoreRule: "Her tamamlanan dakika icin 20 puan, en fazla 100 puan.",
      },
    });

    setResult({
      completedSeconds,
      startLevel: sessionStartLevel,
      reachedLevel,
      speedMs,
      selectedSymbol: finalSelectedSymbol,
      displayedSymbol: finalDisplaySymbol,
      randomSymbolMode,
      movementPattern: getMovementPatternLabel(finalMovementPattern),
      score,
      successRate,
    });
    setIsPaused(false);
    setPhase("result");
  }, [clearTimers, currentLevel, displaySymbolId, elapsedSeconds, randomSymbolMode, selectedSymbolId, sessionStartLevel, speedMs]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const handleBeginPlay = () => {
    hasSavedResultRef.current = false;
    clearTimers();
    setElapsedSeconds(0);
    setCurrentPointIndex(0);
    setBlinkKey((prev) => prev + 1);
    setSessionStartLevel(selectedLevel);
    setLevelAnchorSeconds(0);
    maxReachedLevelRef.current = selectedLevel;
    automaticLevelChangesRef.current = 0;
    setDisplaySymbolId(randomSymbolMode ? getRandomSymbol(selectedSymbolId).id : selectedSymbolId);
    setIsPaused(false);
    setResult(null);
    setIsSymbolPickerOpen(false);
    setPhase("running");
  };

  const handleRestart = () => {
    resetToReady();
  };

  const handlePause = () => {
    if (phase === "running") {
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (phase === "running") {
      setIsPaused(false);
    }
  };

  const handleSymbolSelect = (symbolId: string) => {
    setSelectedSymbolId(symbolId);
    setDisplaySymbolId(symbolId);
    setIsSymbolPickerOpen(false);
  };

  const handleLevelChange = (level: EyeMuscleLevel) => {
    setSelectedLevel(level);
    setCurrentPointIndex(0);
    setBlinkKey((prev) => prev + 1);

    if (phase === "running") {
      setLevelAnchorSeconds(elapsedSeconds);
      maxReachedLevelRef.current = Math.max(maxReachedLevelRef.current, level) as EyeMuscleLevel;
    }
  };

  const stats = useMemo(
    () => [
      { label: "Gecen Sure", value: formatDuration(elapsedSeconds), tone: "brand" as const },
      { label: "Seviye", value: currentLevel },
      { label: "Hiz", value: `${speedMs} ms` },
      { label: "Simge modu", value: randomSymbolMode ? "Surekli degissin" : "Sabit" },
    ],
    [currentLevel, elapsedSeconds, randomSymbolMode, speedMs],
  );

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-[minmax(210px,1.25fr)_minmax(145px,0.75fr)_minmax(92px,0.55fr)_minmax(112px,0.6fr)_minmax(330px,1.6fr)]">
      <div className="relative min-w-0">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Simge</span>
        <button
          type="button"
          onClick={() => setIsSymbolPickerOpen((prev) => !prev)}
          className="flex h-12 w-full items-center gap-3 rounded-xl border border-red-100 bg-white/95 px-3 text-left shadow-sm shadow-red-100/55 transition hover:border-red-300"
          style={FULLSCREEN_TOUCH_STYLE}
          aria-expanded={isSymbolPickerOpen}
        >
          <Image src={selectedSymbol.file} alt="" width={32} height={32} className="h-8 w-8 shrink-0" draggable={false} />
          <span className="min-w-0 truncate text-sm font-bold text-slate-800">{selectedSymbol.label}</span>
        </button>

        {isSymbolPickerOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 grid w-[min(92vw,420px)] grid-cols-5 gap-2 rounded-2xl border border-red-100 bg-white p-3 shadow-2xl shadow-red-200/55">
            {getSymbolOptions().map((symbol) => (
              <button
                key={symbol.id}
                type="button"
                onClick={() => handleSymbolSelect(symbol.id)}
                className={`flex aspect-square items-center justify-center rounded-xl border bg-white p-2 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 ${
                  symbol.id === selectedSymbolId ? "border-red-400 ring-2 ring-red-200" : "border-slate-200"
                }`}
                style={FULLSCREEN_TOUCH_STYLE}
                title={symbol.label}
                aria-label={symbol.label}
              >
                <Image src={symbol.file} alt="" width={48} height={48} className="h-full w-full object-contain" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="flex min-w-0 items-center gap-2 rounded-xl border border-red-100 bg-white/80 px-3 py-2 shadow-sm shadow-red-100/50">
        <input
          type="checkbox"
          checked={randomSymbolMode}
          onChange={(event) => {
            setRandomSymbolMode(event.target.checked);
            if (event.target.checked && phase === "running") {
              setDisplaySymbolId(getRandomSymbol(displaySymbolId).id);
            } else if (!event.target.checked) {
              setDisplaySymbolId(selectedSymbolId);
            }
          }}
          className="h-4 w-4 accent-red-600"
        />
        <span className="text-xs font-bold text-slate-700">Surekli degissin</span>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select
          value={selectedLevel}
          onChange={(event) => handleLevelChange(Number(event.target.value) as EyeMuscleLevel)}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {EYE_MUSCLE_LEVEL_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hiz</span>
        <select
          value={speedMs}
          onChange={(event) => setSpeedMs(Number(event.target.value) as EyeMuscleSpeedMs)}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {EYE_MUSCLE_SPEED_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} ms
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-5">
        <button
          type="button"
          className={phase === "ready" ? FULLSCREEN_PRIMARY_BUTTON_CLASS : COMPACT_BUTTON_CLASS}
          style={FULLSCREEN_TOUCH_STYLE}
          onClick={handleBeginPlay}
          disabled={phase !== "ready"}
        >
          Baslat
        </button>
        <button type="button" className={COMPACT_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePause} disabled={phase !== "running" || isPaused}>
          Duraklat
        </button>
        <button type="button" className={COMPACT_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResume} disabled={phase !== "running" || !isPaused}>
          Devam Et
        </button>
        <button type="button" className={COMPACT_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart} disabled={phase === "setup"}>
          Yeniden Baslat
        </button>
        <button type="button" className={COMPACT_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finalizeExercise} disabled={phase !== "running"}>
          Bitir
        </button>
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Goz Kaslarini Gelistirme Calismasi"
        description="Hareket eden simgeyi gozlerinle takip ederek goz kaslarini ve odaklanmani gelistir."
        buttonLabel="Egitime Basla"
        onStart={handleIntroStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Goz Kaslarini Gelistirme Calismasi"
        subtitle="Hazirlik modu"
        stats={stats}
        stageClassName="fx-slide-up mt-3 flex min-h-[52vh] w-full flex-col items-center justify-center gap-5 border border-white/80 bg-white/92 px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[58vh]"
        footer={footerControls}
      >
        <div className="flex flex-col items-center">
          <Image src={selectedSymbol.file} alt="" width={96} height={96} className="h-20 w-20 object-contain drop-shadow-xl md:h-24 md:w-24" draggable={false} />
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
        </div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Goz Kaslarini Gelistirme Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Calisma kaydedildi.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Gecen Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatDuration(result.completedSeconds)}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Seviye</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.reachedLevel}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Hiz</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{result.speedMs} ms</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.successRate}%</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm">
          <div className="flex items-center gap-3">
            <Image src={result.displayedSymbol.file} alt="" width={40} height={40} className="h-10 w-10 object-contain" draggable={false} />
            <p><strong>Simge:</strong> {result.selectedSymbol.label}</p>
          </div>
          <p className="mt-2"><strong>Baslangic Seviyesi:</strong> {result.startLevel}</p>
          <p className="mt-2"><strong>Simge Modu:</strong> {result.randomSymbolMode ? "Surekli degisken" : "Sabit"}</p>
          <p className="mt-1"><strong>Hareket:</strong> {result.movementPattern}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleRestart}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() => router.push(`/sonuc?exerciseType=eye-muscle&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`)}
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
      title="Goz Kaslarini Gelistirme Calismasi"
      subtitle={`Seviye ${currentLevel} - ${movementPatternLabel}`}
      stats={stats}
      finishButton={
        <button type="button" onClick={finalizeExercise} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:bg-red-50" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up mt-3 flex min-h-[62vh] w-full flex-col items-center justify-center border border-white/80 bg-white/94 px-2 py-3 text-center shadow-[0_18px_56px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[68vh] md:px-4"
      footer={footerControls}
    >
      <div className="relative h-[58vh] w-full max-w-5xl overflow-hidden border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_100%)] shadow-inner shadow-red-100/70 md:h-[62vh]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-red-100/50" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-red-100/50" />
        <div className="pointer-events-none absolute inset-4 border border-red-100/70" />
        <div
          key={`${currentLevel}-${currentPointIndex}-${blinkKey}`}
          className="eye-symbol-pulse absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/85 p-2 shadow-[0_14px_38px_rgba(185,28,28,0.18)] md:h-20 md:w-20"
          style={{
            left: `${symbolPosition.xPercent}%`,
            top: `${symbolPosition.yPercent}%`,
            animationDuration: `${Math.max(120, Math.min(speedMs, 500))}ms`,
          }}
        >
          <Image src={displaySymbol.file} alt={displaySymbol.label} width={80} height={80} className="h-full w-full object-contain" draggable={false} />
        </div>

        {isPaused ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
            <p className="rounded-2xl border border-red-100 bg-white/90 px-5 py-3 text-sm font-bold text-red-700 shadow-sm">
              Duraklatildi
            </p>
          </div>
        ) : null}
      </div>
    </FullscreenExerciseShell>
  );
}
