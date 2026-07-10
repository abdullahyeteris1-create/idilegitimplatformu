"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { getCurrentStudent } from "@/lib/auth/auth";
import {
  calculateNet,
  calculateScore,
  calculateSuccessRate,
  formatDuration,
  generateMazeRound,
  getLevelOptions,
  getMazeConfigByLevel,
  getTimeOptions,
  MAX_ATTENTION_MAZE_LEVEL,
  shouldLevelUp,
  type MazeExit,
  type MazePath,
  type MazeRound,
} from "@/lib/exercise-engine/attentionMaze";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase = "setup" | "ready" | "running" | "feedback" | "paused" | "completed";
type MazeLevel = 1 | 2 | 3 | 4 | 5;
type RoundDuration = 10 | 15 | 20 | 30;
type FeedbackTone = "correct" | "wrong" | "level";

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-violet-900/30 bg-violet-600 px-5 py-4 text-base font-bold text-white shadow-md shadow-violet-200 transition active:scale-[0.98] hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_ACTION_CLASS =
  "relative z-50 w-full min-h-[48px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 shadow-sm shadow-violet-100 transition active:scale-[0.98] hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function pathToD(points: MazePath["points"]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function getExitLabel(round: MazeRound | null, exitId: string | null): string {
  if (!round || !exitId) {
    return "-";
  }

  return round.exits.find((exit) => exit.id === exitId)?.label ?? "-";
}

function getFeedbackClass(tone: FeedbackTone | null): string {
  if (tone === "correct") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (tone === "wrong") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tone === "level") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-white text-slate-600";
}

type MazeSvgProps = {
  round: MazeRound;
  selectedExitId: string | null;
  feedbackTone: FeedbackTone | null;
  canSelect: boolean;
  onSelectExit: (exit: MazeExit) => void;
};

function MazeSvg({ round, selectedExitId, feedbackTone, canSelect, onSelectExit }: MazeSvgProps) {
  const config = getMazeConfigByLevel(round.level);
  const showCorrect = feedbackTone !== null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-inner shadow-violet-100/60">
      <svg viewBox="0 0 100 100" role="img" aria-label="Dikkat Labirenti" className="aspect-[4/3] w-full max-h-[72vh] min-h-[320px]">
        <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
        <g opacity="0.34">
          <path d="M18 18 H82" stroke="#ede9fe" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M18 82 H82" stroke="#ede9fe" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M22 12 V88" stroke="#f5f3ff" strokeWidth="0.7" strokeLinecap="round" />
          <path d="M62 12 V88" stroke="#f5f3ff" strokeWidth="0.7" strokeLinecap="round" />
        </g>

        {round.paths.map((path) => {
          const isCorrectPath = path.isCorrect && showCorrect;
          const isWrongSelectedPath = path.exitId === selectedExitId && !path.isCorrect && showCorrect;

          return (
            <path
              key={path.id}
              d={pathToD(path.points)}
              fill="none"
              stroke={isCorrectPath ? "#16a34a" : isWrongSelectedPath ? "#dc2626" : "#334155"}
              strokeWidth={isCorrectPath ? config.strokeWidth + 0.8 : config.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={showCorrect && !path.isCorrect && !isWrongSelectedPath ? 0.42 : 1}
            />
          );
        })}

        <g>
          <circle cx={round.start.x} cy={round.start.y} r="5.7" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
          <text x={round.start.x} y={round.start.y + 1.2} textAnchor="middle" className="fill-green-700 text-[3.4px] font-black">
            Basla
          </text>
        </g>

        {round.exits.map((exit) => {
          const isCorrect = exit.id === round.correctExitId && showCorrect;
          const isSelectedWrong = exit.id === selectedExitId && exit.id !== round.correctExitId && showCorrect;
          const fill = isCorrect ? "#dcfce7" : isSelectedWrong ? "#fee2e2" : "#ede9fe";
          const stroke = isCorrect ? "#16a34a" : isSelectedWrong ? "#dc2626" : "#7c3aed";
          const text = isCorrect ? "#15803d" : isSelectedWrong ? "#b91c1c" : "#6d28d9";

          return (
            <g
              key={exit.id}
              role="button"
              tabIndex={canSelect ? 0 : -1}
              aria-label={`${exit.label} cikisi`}
              className={canSelect ? "cursor-pointer outline-none" : "cursor-default outline-none"}
              onClick={() => {
                if (canSelect) {
                  onSelectExit(exit);
                }
              }}
              onKeyDown={(event) => {
                if (!canSelect) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectExit(exit);
                }
              }}
            >
              <circle cx={exit.x} cy={exit.y} r="6.8" fill={fill} stroke={stroke} strokeWidth="1.2" />
              <circle cx={exit.x} cy={exit.y} r="9" fill="transparent" />
              <text x={exit.x} y={exit.y + 1.8} textAnchor="middle" fill={text} className="pointer-events-none text-[6px] font-black">
                {exit.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AttentionMazeExerciseClient() {
  const router = useRouter();
  const hasSavedResultRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const answeredForRoundRef = useRef(false);
  const latestLevelRef = useRef<MazeLevel>(1);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [level, setLevel] = useState<MazeLevel>(1);
  const [startLevel, setStartLevel] = useState<MazeLevel>(1);
  const [selectedDuration, setSelectedDuration] = useState<RoundDuration>(20);
  const [remainingSeconds, setRemainingSeconds] = useState(20);
  const [round, setRound] = useState<MazeRound | null>(null);
  const [selectedExitId, setSelectedExitId] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("Yolu gozlerinle takip et. Hazir oldugunda baslat.");

  const [levelCorrect, setLevelCorrect] = useState(0);
  const [levelWrong, setLevelWrong] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reachedLevel, setReachedLevel] = useState<MazeLevel>(1);
  const [levelUpCount, setLevelUpCount] = useState(0);

  const score = calculateScore(totalCorrect, totalWrong);
  const successRate = calculateSuccessRate(totalCorrect, totalWrong);
  const levelNet = calculateNet(levelCorrect, levelWrong);
  const totalNet = calculateNet(totalCorrect, totalWrong);
  const currentConfig = getMazeConfigByLevel(level);

  useEffect(() => {
    latestLevelRef.current = level;
  }, [level]);

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearFeedbackTimer();
    };
  }, []);

  const createNextRound = useCallback((nextLevel?: MazeLevel) => {
    const resolvedLevel = nextLevel ?? latestLevelRef.current;

    answeredForRoundRef.current = false;
    setSelectedExitId(null);
    setFeedbackTone(null);
    setRemainingSeconds(selectedDuration);
    setRound(generateMazeRound(resolvedLevel));
    setTotalRounds((prev) => prev + 1);
    setFeedbackMessage("Yolu gozlerinle takip et ve dogru cikisi sec.");
    setPhase("running");
  }, [selectedDuration]);

  const scheduleNextRound = useCallback((nextLevel?: MazeLevel) => {
    clearFeedbackTimer();
    feedbackTimerRef.current = window.setTimeout(() => {
      createNextRound(nextLevel);
      feedbackTimerRef.current = null;
    }, 950);
  }, [createNextRound]);

  const applyRoundResult = useCallback(
    (isCorrect: boolean, chosenExitId: string | null, isTimeout: boolean) => {
      if (!round) {
        return;
      }

      answeredForRoundRef.current = true;
      setSelectedExitId(chosenExitId);
      setFeedbackTone(isCorrect ? "correct" : "wrong");
      setTotalCorrect((prev) => prev + (isCorrect ? 1 : 0));
      setTotalWrong((prev) => prev + (isCorrect ? 0 : 1));
      setPhase("feedback");

      const nextLevelCorrect = levelCorrect + (isCorrect ? 1 : 0);
      const nextLevelWrong = levelWrong + (isCorrect ? 0 : 1);
      const nextLevelNet = calculateNet(nextLevelCorrect, nextLevelWrong);
      const correctLabel = getExitLabel(round, round.correctExitId);

      if (shouldLevelUp(nextLevelNet)) {
        const isAtMaxLevel = level >= MAX_ATTENTION_MAZE_LEVEL;

        setLevelCorrect(0);
        setLevelWrong(0);
        setLevelUpCount((prev) => prev + 1);
        setFeedbackTone("level");

        if (isAtMaxLevel) {
          setFeedbackMessage("Tebrikler! En yuksek seviyede devam ediyorsun.");
          scheduleNextRound(level);
          return;
        }

        const nextLevel = (level + 1) as MazeLevel;
        latestLevelRef.current = nextLevel;
        setLevel(nextLevel);
        setReachedLevel((prev) => (prev > nextLevel ? prev : nextLevel));
        setFeedbackMessage(`Tebrikler! Seviye ${nextLevel}'ye gectin.`);
        scheduleNextRound(nextLevel);
        return;
      }

      setLevelCorrect(nextLevelCorrect);
      setLevelWrong(nextLevelWrong);

      if (isCorrect) {
        setFeedbackMessage("Dogru! Yolu dikkatli takip ettin.");
      } else if (isTimeout) {
        setFeedbackMessage(`Sure doldu. Dogru cikis: ${correctLabel}`);
      } else {
        setFeedbackMessage(`Yanlis. Dogru cikis: ${correctLabel}`);
      }

      scheduleNextRound(level);
    },
    [level, levelCorrect, levelWrong, round, scheduleNextRound],
  );

  const finishExercise = useCallback(() => {
    if (hasSavedResultRef.current) {
      return;
    }

    clearFeedbackTimer();
    hasSavedResultRef.current = true;
    answeredForRoundRef.current = true;

    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );
    const student = getCurrentStudent();
    const finalScore = calculateScore(totalCorrect, totalWrong);
    const finalSuccessRate = calculateSuccessRate(totalCorrect, totalWrong);

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "attention-maze",
      exerciseTitle: "Dikkat Labirenti",
      durationSeconds,
      correctCount: totalCorrect,
      wrongCount: totalWrong,
      score: finalScore,
      successRate: finalSuccessRate,
      details: {
        startLevel,
        reachedLevel,
        selectedDuration,
        totalRounds,
        correctCount: totalCorrect,
        wrongCount: totalWrong,
        net: calculateNet(totalCorrect, totalWrong),
        levelNet,
        levelUpCount,
        maxLevel: MAX_ATTENTION_MAZE_LEVEL,
        scoreRule: "Dogru +10, yanlis -5",
      },
    });

    setPhase("completed");
  }, [
    elapsedSeconds,
    levelNet,
    levelUpCount,
    reachedLevel,
    selectedDuration,
    startLevel,
    totalCorrect,
    totalRounds,
    totalWrong,
  ]);

  const handleStartSetup = () => {
    clearFeedbackTimer();
    hasSavedResultRef.current = false;
    answeredForRoundRef.current = false;
    startedAtRef.current = null;
    latestLevelRef.current = level;
    setStartLevel(level);
    setReachedLevel(level);
    setRemainingSeconds(selectedDuration);
    setRound(null);
    setSelectedExitId(null);
    setFeedbackTone(null);
    setFeedbackMessage("Yolu gozlerinle takip et. Hazir oldugunda baslat.");
    setLevelCorrect(0);
    setLevelWrong(0);
    setTotalCorrect(0);
    setTotalWrong(0);
    setTotalRounds(0);
    setElapsedSeconds(0);
    setLevelUpCount(0);
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    clearFeedbackTimer();
    hasSavedResultRef.current = false;
    startedAtRef.current = Date.now();
    latestLevelRef.current = level;
    setStartLevel(level);
    setReachedLevel(level);
    setLevelCorrect(0);
    setLevelWrong(0);
    setTotalCorrect(0);
    setTotalWrong(0);
    setTotalRounds(0);
    setElapsedSeconds(0);
    setLevelUpCount(0);
    createNextRound(level);
  };

  const handleRestart = () => {
    handleStartSetup();
  };

  const handlePause = () => {
    if (phase !== "running") {
      return;
    }

    setPhase("paused");
    setFeedbackMessage("Duraklatildi. Devam Et ile kaldigin yerden surdur.");
  };

  const handleResume = () => {
    if (phase !== "paused") {
      return;
    }

    setFeedbackMessage("Yolu gozlerinle takip et ve dogru cikisi sec.");
    setPhase("running");
  };

  const handleExitSelect = useCallback(
    (exit: MazeExit) => {
      if (phase !== "running" || !round || answeredForRoundRef.current) {
        return;
      }

      applyRoundResult(exit.id === round.correctExitId, exit.id, false);
    },
    [applyRoundResult, phase, round],
  );

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || remainingSeconds > 0 || !round || answeredForRoundRef.current) {
      return;
    }

    applyRoundResult(false, null, true);
  }, [applyRoundResult, phase, remainingSeconds, round]);

  const footerControls = (
    <div className="grid gap-3 lg:grid-cols-5">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select
          value={level}
          onChange={(event) => setLevel(Number(event.target.value) as MazeLevel)}
          className={FULLSCREEN_SELECT_CLASS}
          disabled={phase === "running" || phase === "feedback" || phase === "paused"}
        >
          {getLevelOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sure</span>
        <select
          value={selectedDuration}
          onChange={(event) => {
            const nextDuration = Number(event.target.value) as RoundDuration;
            setSelectedDuration(nextDuration);
            setRemainingSeconds(nextDuration);
          }}
          className={FULLSCREEN_SELECT_CLASS}
          disabled={phase === "running" || phase === "feedback" || phase === "paused"}
        >
          {getTimeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
        {phase === "ready" ? (
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleBeginPlay}>
            Baslat
          </button>
        ) : null}
        {phase === "running" || phase === "feedback" ? (
          <>
            <button type="button" className={SECONDARY_ACTION_CLASS} style={TOUCH_STYLE} onClick={handlePause} disabled={phase !== "running"}>
              Duraklat
            </button>
            <button type="button" className={SECONDARY_ACTION_CLASS} style={TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Baslat
            </button>
            <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={finishExercise}>
              Bitir
            </button>
          </>
        ) : null}
        {phase === "paused" ? (
          <>
            <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleResume}>
              Devam Et
            </button>
            <button type="button" className={SECONDARY_ACTION_CLASS} style={TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Baslat
            </button>
            <button type="button" className={SECONDARY_ACTION_CLASS} style={TOUCH_STYLE} onClick={finishExercise}>
              Bitir
            </button>
          </>
        ) : null}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Dikkat Labirenti"
        description="Yolu gozlerinle takip et, dogru cikisi bul ve dikkatini guclendir. Bu calisma satir takibi, goz kaydirma ve gorsel odak becerisini destekler."
        buttonLabel="Egitime Basla"
        onStart={handleStartSetup}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Dikkat Labirenti"
        subtitle="Hazirlik modu"
        stats={[
          { label: "Seviye", value: level, tone: "brand" },
          { label: "Cikis", value: currentConfig.exitCount },
          { label: "Sure", value: `${selectedDuration} sn` },
          { label: "Yol", value: currentConfig.turnCountLabel },
        ]}
        backgroundClassName="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ddd6fe_0%,#f8f7ff_42%,#f8fafc_100%)] text-slate-900"
        stageClassName="fx-slide-up flex min-h-[300px] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-white/90 px-4 py-5 text-center shadow-[0_18px_56px_rgba(109,40,217,0.11)] backdrop-blur md:min-h-[350px]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Hazirlik</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
          Yolu gozlerinle takip et.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
          Hazir oldugunda baslat. Her turda Basla noktasindan cikislara giden yollari izle ve dogru cikisi sec.
        </p>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "completed") {
    return (
      <section className="idil-card mx-auto w-full max-w-5xl p-4 md:p-6">
        <h2 className="text-2xl font-bold">Dikkat Labirenti Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Calisma tamamlandi ve sonuc kaydi olusturuldu.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Tur</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{totalRounds}</p>
          </article>
          <article className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Dogru</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">{totalCorrect}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Yanlis</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">{totalWrong}</p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{successRate}%</p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4 text-sm">
          <p><strong>Skor:</strong> {score}</p>
          <p className="mt-1"><strong>Toplam Net:</strong> {totalNet}</p>
          <p className="mt-1"><strong>Baslangic Seviyesi:</strong> {startLevel}</p>
          <p className="mt-1"><strong>Ulasilan Seviye:</strong> {reachedLevel}</p>
          <p className="mt-1"><strong>Seviye Atlama:</strong> {levelUpCount}</p>
          <p className="mt-1"><strong>Toplam Sure:</strong> {formatDuration(elapsedSeconds)}</p>
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
                `/sonuc?exerciseType=attention-maze&correct=${totalCorrect}&wrong=${totalWrong}&successRate=${successRate}&score=${score}`,
              )
            }
          >
            Sonuc Ekranina Git
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <ExerciseNavigationControls backHref="/egzersizler?category=focus" />
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Dikkat Labirenti"
      subtitle={phase === "paused" ? "Duraklatildi" : phase === "feedback" ? "Geri bildirim" : "Tam ekran calisma modu"}
      backgroundClassName="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ddd6fe_0%,#f8f7ff_42%,#f8fafc_100%)] text-slate-900"
      stats={[
        { label: "Seviye", value: level, tone: "brand" },
        { label: "Dogru", value: levelCorrect, tone: "ok" },
        { label: "Yanlis", value: levelWrong, tone: "bad" },
        { label: "Net", value: levelNet, tone: levelNet >= 0 ? "brand" : "bad" },
        { label: "Skor", value: score, tone: "brand" },
        { label: "Kalan", value: `${remainingSeconds} sn`, tone: remainingSeconds <= 5 ? "bad" : "default" },
      ]}
      finishButton={
        <button
          type="button"
          onClick={finishExercise}
          className="min-h-[44px] rounded-full border border-violet-200 bg-white/95 px-4 text-sm font-bold text-violet-700 shadow-sm shadow-violet-100 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-md"
          style={FULLSCREEN_TOUCH_STYLE}
        >
          Bitir
        </button>
      }
      footer={footerControls}
      stageClassName="fx-slide-up flex min-h-[380px] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-white/90 px-3 py-3 text-center shadow-[0_18px_56px_rgba(109,40,217,0.11)] backdrop-blur md:min-h-[460px] md:px-5 md:py-5"
    >
      <div className="w-full">
        <div className={`mx-auto mb-3 max-w-2xl rounded-2xl border px-4 py-3 text-sm font-bold ${getFeedbackClass(feedbackTone)} ${feedbackTone === "wrong" ? "fx-shake" : ""}`}>
          {feedbackMessage}
        </div>

        {round ? (
          <MazeSvg
            round={round}
            selectedExitId={selectedExitId}
            feedbackTone={feedbackTone}
            canSelect={phase === "running"}
            onSelectExit={handleExitSelect}
          />
        ) : null}
      </div>
    </FullscreenExerciseShell>
  );
}
