"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  createMemoryGameSession,
  generateRoundTargets,
  type MemoryGameSession,
  type MemoryGridLayout,
  type MemoryLevel,
} from "@/lib/exercise-engine/memoryGame";
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

type ExercisePhase = "setup" | "ready" | "play" | "result";
type RoundPhase = "prepare" | "show" | "select" | "feedback";
type DisplayMs = 500 | 750 | 1000 | 1500 | 2000;
type TotalRounds = 5 | 10 | 15 | 20;
type FontSizePx = 12 | 16 | 20 | 24;
type FeedbackType = "correct" | "wrong";

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function getFontLabel(value: FontSizePx): string {
  if (value === 12) {
    return "Kucuk";
  }

  if (value === 16) {
    return "Orta";
  }

  if (value === 20) {
    return "Buyuk";
  }

  return "Cok Buyuk";
}

function getBoxSizeClass(cols: number): string {
  if (cols <= 5) {
    return "min-h-[56px]";
  }

  if (cols <= 10) {
    return "min-h-[40px]";
  }

  return "min-h-[30px]";
}

export function MemoryGameExerciseClient() {
  const router = useRouter();
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const prepareTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("prepare");

  const [gridLayout, setGridLayout] = useState<MemoryGridLayout>("5x5");
  const [level, setLevel] = useState<MemoryLevel>(2);
  const [displayMs, setDisplayMs] = useState<DisplayMs>(1000);
  const [totalRounds, setTotalRounds] = useState<TotalRounds>(10);
  const [fontSize, setFontSize] = useState<FontSizePx>(16);

  const [session, setSession] = useState<MemoryGameSession | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [activeTargets, setActiveTargets] = useState<Set<number>>(new Set());
  const [selectedCorrect, setSelectedCorrect] = useState<Set<number>>(new Set());
  const [selectedWrong, setSelectedWrong] = useState<number | null>(null);

  const score = correctCount * 10 - wrongCount * 5;
  const successRate = Math.round((correctCount / (session?.config.totalRounds ?? 1)) * 100);

  useEffect(() => {
    if (phase !== "play") {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (prepareTimerRef.current) {
        window.clearTimeout(prepareTimerRef.current);
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const clearRoundTimers = () => {
    if (prepareTimerRef.current) {
      window.clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const beginRound = useCallback((roundNumber: number, activeSession: MemoryGameSession) => {
    clearRoundTimers();
    const targets = generateRoundTargets(activeSession.grid.totalBoxes, activeSession.targetCountPerRound);

    setCurrentRound(roundNumber);
    setRoundPhase("prepare");
    setFeedbackType(null);
    setFeedbackMessage("");
    setActiveTargets(targets);
    setSelectedCorrect(new Set());
    setSelectedWrong(null);

    // Short prepare beat so the player sees round state before highlighted boxes appear.
    prepareTimerRef.current = window.setTimeout(() => {
      setRoundPhase("show");

      hideTimerRef.current = window.setTimeout(() => {
        setRoundPhase("select");
      }, activeSession.config.displayMs);
    }, 250);
  }, []);

  const finishExercise = useCallback(() => {
    if (!session || saveLockRef.current) {
      return;
    }

    clearRoundTimers();
    saveLockRef.current = true;

    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );

    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "memory-game",
      exerciseTitle: "Hafıza Geliştirme",
      durationSeconds,
      correctCount,
      wrongCount,
      score,
      successRate,
      details: {
        gridRows: session.grid.rows,
        gridCols: session.grid.cols,
        totalBoxes: session.grid.totalBoxes,
        gridLabel: session.grid.gridLabel,
        level: session.config.level,
        targetCountPerRound: session.targetCountPerRound,
        displayMs: session.config.displayMs,
        totalRounds: session.config.totalRounds,
      },
    });

    setPhase("result");
  }, [correctCount, elapsedSeconds, score, session, successRate, wrongCount]);

  const handleStart = () => {
    clearRoundTimers();
    saveLockRef.current = false;
    startedAtRef.current = null;
    setSession(null);
    setCurrentRound(1);
    setCorrectCount(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setFeedbackType(null);
    setFeedbackMessage("");
    setActiveTargets(new Set());
    setSelectedCorrect(new Set());
    setSelectedWrong(null);
    setRoundPhase("prepare");
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    const nextSession = createMemoryGameSession({
      gridLayout,
      level,
      displayMs,
      totalRounds,
    });

    saveLockRef.current = false;
    startedAtRef.current = Date.now();

    setSession(nextSession);
    setCorrectCount(0);
    setWrongCount(0);
    setElapsedSeconds(0);
    setPhase("play");

    beginRound(1, nextSession);
  };

  const handleRestart = () => {
    handleStart();
  };

  const handleContinue = () => {
    if (!session) {
      return;
    }

    if (currentRound >= session.config.totalRounds) {
      finishExercise();
      return;
    }

    beginRound(currentRound + 1, session);
  };

  const handleSelectBox = (boxIndex: number) => {
    if (phase !== "play" || roundPhase !== "select") {
      return;
    }

    if (selectedCorrect.has(boxIndex) || selectedWrong === boxIndex) {
      return;
    }

    if (!activeTargets.has(boxIndex)) {
      setSelectedWrong(boxIndex);
      setWrongCount((prev) => prev + 1);
      setFeedbackType("wrong");
      setFeedbackMessage("Yanlis secim yaptin.");
      setRoundPhase("feedback");
      return;
    }

    const nextCorrect = new Set(selectedCorrect);
    nextCorrect.add(boxIndex);
    setSelectedCorrect(nextCorrect);

    if (nextCorrect.size >= activeTargets.size) {
      setCorrectCount((prev) => prev + 1);
      setFeedbackType("correct");
      setFeedbackMessage("Dogru! Tum hedef kutulari buldun.");
      setRoundPhase("feedback");
    }
  };

  const boxCount = session?.grid.totalBoxes ?? 25;
  const cols = session?.grid.cols ?? 5;
  const boxSizeClass = getBoxSizeClass(cols);

  const footerControls = (
    <div className="grid gap-3 xl:grid-cols-7">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kutu Düzeni</span>
        <select value={gridLayout} onChange={(event) => setGridLayout(event.target.value as MemoryGridLayout)} className={FULLSCREEN_SELECT_CLASS}>
          <option value="5x5">5 x 5</option>
          <option value="5x10">5 x 10</option>
          <option value="10x10">10 x 10</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select value={level} onChange={(event) => setLevel(Number(event.target.value) as MemoryLevel)} className={FULLSCREEN_SELECT_CLASS}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Gösterim</span>
        <select value={displayMs} onChange={(event) => setDisplayMs(Number(event.target.value) as DisplayMs)} className={FULLSCREEN_SELECT_CLASS}>
          {[500, 750, 1000, 1500, 2000].map((value) => (
            <option key={value} value={value}>
              {value} ms
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tur Sayısı</span>
        <select value={totalRounds} onChange={(event) => setTotalRounds(Number(event.target.value) as TotalRounds)} className={FULLSCREEN_SELECT_CLASS}>
          {[5, 10, 15, 20].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Görünüm</span>
        <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)} className={FULLSCREEN_SELECT_CLASS}>
          {[12, 16, 20, 24].map((value) => (
            <option key={value} value={value}>
              {getFontLabel(value as FontSizePx)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
        {phase === "ready" ? (
          <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleBeginPlay}>
            Başlat
          </button>
        ) : (
          <>
            <button
              type="button"
              className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleContinue}
              disabled={roundPhase !== "feedback"}
            >
              {currentRound >= (session?.config.totalRounds ?? totalRounds) ? "Tamam" : "Devam Et"}
            </button>
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Başlat
            </button>
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
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
        title="Hafıza Geliştirme"
        description="Kısa süre yanan kutuları aklında tut ve doğru kutuları seç. Eğitime başla ile tam ekran çalışma moduna geçersin."
        buttonLabel="Eğitime Başla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Hafıza Geliştirme"
        subtitle="Hazırlık modu"
        stats={[
          { label: "Düzen", value: gridLayout },
          { label: "Seviye", value: level },
          { label: "Gösterim", value: `${displayMs} ms`, tone: "brand" },
          { label: "Tur", value: totalRounds },
        ]}
        stageClassName="fx-slide-up mt-3 flex min-h-[32vh] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[38vh]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazırlık</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Ayarlarını seç, hazır olduğunda başlat.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
          Kutu düzeni, seviye, gösterim süresi ve tur sayısını alt bardan belirle. Başlat dediğinde ilk tur başlar.
        </p>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result" && session) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Hafıza Geliştirme Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Tur bazli calisma tamamlandi.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Dogru Tur</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">{correctCount}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Yanlis Tur</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">{wrongCount}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Skor</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{score}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{successRate}%</p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-red-100 bg-white p-4 text-sm">
          <p><strong>Düzen:</strong> {session.grid.gridLabel}</p>
          <p className="mt-1"><strong>Seviye:</strong> {session.config.level}</p>
          <p className="mt-1"><strong>Tur Sayisi:</strong> {session.config.totalRounds}</p>
          <p className="mt-1"><strong>Gosterim:</strong> {session.config.displayMs} ms</p>
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
                `/sonuc?exerciseType=memory-game&correct=${correctCount}&wrong=${wrongCount}&successRate=${successRate}&score=${score}`,
              )
            }
          >
            Sonuc Ekranina Git
          </button>
        </div>

        <div className="mt-3">
          <Link
            href="/egzersizler"
            className="relative z-50 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-5 py-4 text-base font-bold text-red-800 transition hover:bg-red-50"
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
      title="Hafıza Geliştirme"
      subtitle="Tam ekran çalışma modu"
      stats={[
        { label: "Tur", value: `${currentRound}/${session?.config.totalRounds ?? totalRounds}` },
        { label: "Seviye", value: session?.config.level ?? level },
        { label: "Doğru Tur", value: correctCount, tone: "ok" },
        { label: "Yanlış Tur", value: wrongCount, tone: "bad" },
        { label: "Skor", value: score, tone: "brand" },
      ]}
      finishButton={
        <button type="button" onClick={finishExercise} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      footer={footerControls}
    >
      <div className="fx-fade-in w-full">
        {feedbackType ? (
          <div
            className={`mx-auto mb-4 max-w-2xl rounded-2xl border p-3 text-sm font-bold ${
              feedbackType === "correct"
                ? "fx-glow-green border-green-200 bg-green-50 text-green-700"
                : "fx-shake border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedbackMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-red-100/85 bg-red-50/40 p-2 md:p-3">
          <div
            className="grid gap-1.5 md:gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: boxCount }, (_, index) => {
              const isShowingTarget = roundPhase === "show" && activeTargets.has(index);
              const isSelectedCorrect = selectedCorrect.has(index);
              const isSelectedWrong = selectedWrong === index;

              let boxClass = "border-red-200 bg-white";

              if (isShowingTarget) {
                boxClass = "fx-pulse-soft border-red-500 bg-red-500 shadow-[0_0_0_1px_rgba(220,38,38,0.35)]";
              } else if (isSelectedCorrect) {
                boxClass = "fx-glow-green border-green-400 bg-green-400";
              } else if (isSelectedWrong) {
                boxClass = "fx-blink-red fx-shake border-red-400 bg-red-300";
              }

              return (
                <button
                  key={`memory-cell-${index + 1}`}
                  type="button"
                  className={`relative z-50 w-full ${boxSizeClass} cursor-pointer select-none touch-manipulation pointer-events-auto rounded-lg border transition active:scale-[0.98] ${boxClass}`}
                  style={{
                    ...TOUCH_STYLE,
                    fontSize: `${fontSize}px`,
                  }}
                  onClick={() => handleSelectBox(index)}
                  disabled={roundPhase !== "select"}
                >
                  <span className="sr-only">Kutu {index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-600 text-center">Tur Durumu: {roundPhase}</p>
      </div>
    </FullscreenExerciseShell>
  );
}
