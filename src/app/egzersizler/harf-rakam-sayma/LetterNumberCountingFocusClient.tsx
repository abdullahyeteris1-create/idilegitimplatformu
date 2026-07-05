"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import {
  calculateNet,
  generateCountingRound,
  getNextLevel,
  getRoundDurationBySpeed,
  shouldLevelUp,
  type CountingDifficulty,
  type CountingMode,
  type CountingRound,
} from "@/lib/exercise-engine/letterNumberCountingFocus";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase = "setup" | "ready" | "running" | "feedback" | "paused" | "completed";
type FeedbackTone = "ok" | "bad" | "info";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

type CountingResult = {
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalRounds: number;
  net: number;
  score: number;
  successRate: number;
  reachedLevel: number;
  levelUpCount: number;
};

const SPEED_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const ANSWER_OPTIONS = Array.from({ length: 30 }, (_, index) => index + 1);
const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function getModeLabel(mode: CountingMode): string {
  if (mode === "letters") {
    return "Harf";
  }

  if (mode === "numbers") {
    return "Rakam";
  }

  return "Harf + Rakam";
}

function getFeedbackClass(tone: FeedbackTone): string {
  if (tone === "ok") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (tone === "info") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

export function LetterNumberCountingFocusClient() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const feedbackRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [mode, setMode] = useState<CountingMode>("letters");
  const [difficulty, setDifficulty] = useState<CountingDifficulty>("normal");
  const [startLevel, setStartLevel] = useState(1);
  const [level, setLevel] = useState(1);
  const [speedSeconds, setSpeedSeconds] = useState(8);
  const [remainingSeconds, setRemainingSeconds] = useState(8);
  const [round, setRound] = useState<CountingRound | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [result, setResult] = useState<CountingResult | null>(null);

  const net = calculateNet(correctCount, wrongCount);
  const safeSpeedSeconds = getRoundDurationBySpeed(speedSeconds);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackRef.current !== null) {
      window.clearTimeout(feedbackRef.current);
      feedbackRef.current = null;
    }
  }, []);

  const createRound = useCallback((nextLevel = level) => {
    setRound(generateCountingRound({ level: nextLevel, difficulty, mode }));
    setRemainingSeconds(safeSpeedSeconds);
  }, [difficulty, level, mode, safeSpeedSeconds]);

  const resetToReady = useCallback((nextStartLevel = startLevel) => {
    clearTimer();
    clearFeedbackTimer();
    hasSavedResultRef.current = false;
    startedAtRef.current = null;
    setLevel(nextStartLevel);
    setCorrectCount(0);
    setWrongCount(0);
    setUnansweredCount(0);
    setTotalRounds(0);
    setLevelUpCount(0);
    setFeedback(null);
    setResult(null);
    setRound(null);
    setRemainingSeconds(safeSpeedSeconds);
    setPhase("ready");
  }, [clearFeedbackTimer, clearTimer, safeSpeedSeconds, startLevel]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const startRound = useCallback((nextLevel = level) => {
    clearTimer();
    clearFeedbackTimer();
    createRound(nextLevel);
    setFeedback(null);
    setPhase("running");
  }, [clearFeedbackTimer, clearTimer, createRound, level]);

  const handleStart = () => {
    hasSavedResultRef.current = false;
    startedAtRef.current = Date.now();
    setCorrectCount(0);
    setWrongCount(0);
    setUnansweredCount(0);
    setTotalRounds(0);
    setLevelUpCount(0);
    setLevel(startLevel);
    setResult(null);
    startRound(startLevel);
  };

  const continueAfterFeedback = useCallback((nextCorrect: number, nextWrong: number, nextLevel: number) => {
    const nextNet = calculateNet(nextCorrect, nextWrong);

    if (shouldLevelUp(nextNet)) {
      const upgradedLevel = getNextLevel(nextLevel);
      const atMaxLevel = nextLevel >= 4;

      setCorrectCount(0);
      setWrongCount(0);
      setLevel(upgradedLevel);
      setLevelUpCount((prev) => prev + (atMaxLevel ? 0 : 1));
      setFeedback({
        tone: "info",
        message: atMaxLevel
          ? "Tebrikler! En yuksek seviyede devam ediyorsun."
          : `Tebrikler! Seviye ${upgradedLevel}'ye gectin.`,
      });

      feedbackRef.current = window.setTimeout(() => {
        startRound(upgradedLevel);
      }, 900);
      return;
    }

    startRound(nextLevel);
  }, [startRound]);

  const submitAnswer = useCallback((answer: number | null, reason: "answer" | "timeout") => {
    if (!round || phase !== "running") {
      return;
    }

    clearTimer();
    clearFeedbackTimer();
    setPhase("feedback");
    setTotalRounds((prev) => prev + 1);

    const isCorrect = answer === round.targetCount;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextWrong = wrongCount + (isCorrect ? 0 : 1);

    if (isCorrect) {
      setCorrectCount(nextCorrect);
      setFeedback({ tone: "ok", message: "Dogru!" });
    } else {
      setWrongCount(nextWrong);
      if (reason === "timeout") {
        setUnansweredCount((prev) => prev + 1);
        setFeedback({ tone: "bad", message: `Sure doldu. Dogru cevap: ${round.targetCount}` });
      } else {
        setFeedback({ tone: "bad", message: `Yanlis. Dogru cevap: ${round.targetCount}` });
      }
    }

    feedbackRef.current = window.setTimeout(() => {
      continueAfterFeedback(nextCorrect, nextWrong, level);
    }, 850);
  }, [clearFeedbackTimer, clearTimer, continueAfterFeedback, correctCount, level, phase, round, wrongCount]);

  useEffect(() => {
    if (phase !== "running") {
      clearTimer();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => submitAnswer(null, "timeout"), 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [clearTimer, phase, submitAnswer]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearFeedbackTimer();
    };
  }, [clearFeedbackTimer, clearTimer]);

  const handlePause = () => {
    if (phase !== "running") {
      return;
    }

    clearTimer();
    setPhase("paused");
  };

  const handleResume = () => {
    if (phase !== "paused") {
      return;
    }

    setPhase("running");
  };

  const finishExercise = () => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearTimer();
    clearFeedbackTimer();

    const finalCorrect = correctCount;
    const finalWrong = wrongCount;
    const finalNet = calculateNet(finalCorrect, finalWrong);
    const answered = finalCorrect + finalWrong;
    const score = Math.max(0, finalCorrect * 10 - finalWrong * 5);
    const successRate = answered === 0 ? 0 : Math.round((finalCorrect / answered) * 100);
    const durationSeconds = Math.max(1, startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 1);
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "letter-number-counting-focus",
      exerciseTitle: "Harf / Rakam Sayma Odak Calismasi",
      durationSeconds,
      correctCount: finalCorrect,
      wrongCount: finalWrong,
      score,
      successRate,
      details: {
        mode,
        startLevel,
        reachedLevel: level,
        difficulty,
        speedSeconds: safeSpeedSeconds,
        totalRounds,
        correctCount: finalCorrect,
        wrongCount: finalWrong,
        net: finalNet,
        unansweredCount,
        levelUpCount,
        scoreRule: "correctCount * 10 - wrongCount * 5",
        maxLevel: 4,
      },
    });

    setResult({
      correctCount: finalCorrect,
      wrongCount: finalWrong,
      unansweredCount,
      totalRounds,
      net: finalNet,
      score,
      successRate,
      reachedLevel: level,
      levelUpCount,
    });
    setPhase("completed");
  };

  const handleSettingChange = (callback: () => void) => {
    callback();
    resetToReady();
  };

  const stats = [
    { label: "Dogru", value: correctCount, tone: "ok" as const },
    { label: "Yanlis", value: wrongCount, tone: "bad" as const },
    { label: "Net", value: net, tone: "brand" as const },
    { label: "Seviye", value: level },
    { label: "Zorluk", value: difficulty === "normal" ? "Normal" : "Zor" },
    { label: "Sure", value: `${safeSpeedSeconds} sn` },
  ];

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-8">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mod</span>
        <select value={mode} onChange={(event) => handleSettingChange(() => setMode(event.target.value as CountingMode))} className={FULLSCREEN_SELECT_CLASS}>
          <option value="letters">Harf</option>
          <option value="numbers">Rakam</option>
          <option value="mixed">Harf + Rakam</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select value={startLevel} onChange={(event) => {
          const nextLevel = Number(event.target.value);
          setStartLevel(nextLevel);
          resetToReady(nextLevel);
        }} className={FULLSCREEN_SELECT_CLASS}>
          {[1, 2, 3, 4].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Zorluk</span>
        <select value={difficulty} onChange={(event) => handleSettingChange(() => setDifficulty(event.target.value as CountingDifficulty))} className={FULLSCREEN_SELECT_CLASS}>
          <option value="normal">Normal</option>
          <option value="hard">Zor</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hiz / Sure</span>
        <select value={speedSeconds} onChange={(event) => handleSettingChange(() => {
          const nextSpeed = Number(event.target.value);
          setSpeedSeconds(nextSpeed);
          setRemainingSeconds(nextSpeed);
        })} className={FULLSCREEN_SELECT_CLASS}>
          {SPEED_OPTIONS.map((item) => (
            <option key={item} value={item}>{item} saniye</option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-3 lg:col-span-4">
        {phase === "ready" ? (
          <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleStart}>
            Baslat
          </button>
        ) : (
          <>
            {phase === "paused" ? (
              <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResume}>
                Devam Et
              </button>
            ) : (
              <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePause} disabled={phase !== "running"}>
                Duraklat
              </button>
            )}
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={() => resetToReady()}>
              Yeniden Baslat
            </button>
            <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
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
        title="Harf / Rakam Sayma Odak Calismasi"
        description="Ekrandaki daginik harf veya rakamlar arasindan hedef karakterin kac tane oldugunu hizlica say."
        buttonLabel="Egitime Basla"
        onStart={handleIntroStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Harf / Rakam Sayma Odak Calismasi"
        subtitle="Hazirlik modu"
        stats={stats}
        stageClassName="fx-slide-up mt-3 flex min-h-[46vh] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-white/92 px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.1)] backdrop-blur md:min-h-[54vh]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
          Mod, seviye, zorluk ve cevap suresini belirle. Baslat dediginde her turda hedef karakteri sayacaksin.
        </p>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "completed" && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Harf / Rakam Sayma Odak Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Calisma sonucu kaydedildi.</p>

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
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Net</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.net}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Seviye</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.reachedLevel}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm font-semibold">
          <p>Mod: <span className="text-slate-900">{getModeLabel(mode)}</span></p>
          <p className="mt-1">Toplam Tur: <span className="text-slate-900">{result.totalRounds}</span></p>
          <p className="mt-1">Dogru: <span className="text-[var(--ok)]">{result.correctCount}</span></p>
          <p className="mt-1">Yanlis: <span className="text-[var(--bad)]">{result.wrongCount}</span></p>
          <p className="mt-1">Cevapsiz: <span className="text-slate-900">{result.unansweredCount}</span></p>
          <p className="mt-1">Seviye Atlama: <span className="text-slate-900">{result.levelUpCount}</span></p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={() => resetToReady()}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() => router.push(`/sonuc?exerciseType=letter-number-counting-focus&correct=${result.correctCount}&wrong=${result.wrongCount}&successRate=${result.successRate}&score=${result.score}`)}
          >
            Ortak Sonuc Ekrani
          </button>
          <Link href="/egzersizler" className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-4 text-base font-bold text-red-800 transition hover:bg-red-50" style={TOUCH_STYLE}>
            Egzersizlere Don
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Harf / Rakam Sayma Odak Calismasi"
      subtitle={round ? `Kac tane ${round.target} var?` : "Sayma turu"}
      stats={[
        ...stats,
        { label: "Kalan", value: `${remainingSeconds} sn`, tone: remainingSeconds <= 3 ? "bad" : "brand" },
      ]}
      finishButton={
        <button type="button" onClick={finishExercise} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up mt-3 flex min-h-[64vh] w-full flex-col rounded-[28px] border border-white/80 bg-white/94 p-3 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[70vh] md:p-5"
      footer={footerControls}
    >
      <div className="flex w-full flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Hedef</p>
            <p className="mt-1 text-2xl font-black text-slate-950">Kac tane <span className="text-red-700">{round?.target ?? "?"}</span> var?</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-2 text-center shadow-sm">
            <p className="text-xs font-bold text-slate-500">Sure</p>
            <p className="text-3xl font-black text-red-700">{remainingSeconds}</p>
          </div>
        </div>

        <div className={`relative min-h-[36vh] flex-1 overflow-hidden rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] shadow-inner md:min-h-[42vh] ${phase === "paused" ? "blur-sm" : ""}`}>
          {round?.characters.map((character) => (
            <span
              key={character.id}
              className="fx-fade-in absolute inline-flex h-10 min-w-10 select-none items-center justify-center rounded-xl border border-red-100 bg-white/92 px-2 font-black text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.10)]"
              style={{
                left: `${character.x}%`,
                top: `${character.y}%`,
                transform: `translate(-50%, -50%) rotate(${character.rotation}deg)`,
                fontSize: `${character.size}px`,
              }}
            >
              {character.value}
            </span>
          ))}
          {phase === "paused" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[26px] bg-white/60 backdrop-blur-[2px]">
              <p className="rounded-2xl border border-red-100 bg-white px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
                Duraklatildi. Devam Et ile sure kaldigi yerden devam eder.
              </p>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${getFeedbackClass(feedback.tone)}`}>
            {feedback.message}
          </div>
        ) : null}

        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {ANSWER_OPTIONS.map((answer) => (
            <button
              key={answer}
              type="button"
              onClick={() => submitAnswer(answer, "answer")}
              disabled={phase !== "running"}
              className="min-h-[40px] rounded-xl border border-red-100 bg-white px-1 text-sm font-black text-slate-900 shadow-sm transition hover:bg-red-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px]"
              style={FULLSCREEN_TOUCH_STYLE}
            >
              {answer}
            </button>
          ))}
        </div>
      </div>
    </FullscreenExerciseShell>
  );
}
