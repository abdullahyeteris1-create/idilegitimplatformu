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
type GridSize = 7 | 9 | 11 | 13 | 15;
type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Answer = "same" | "different";

type Round = {
  letters: string[];
  firstIndex: number;
  secondIndex: number;
  firstLetter: string;
  secondLetter: string;
  correctAnswer: Answer;
};

type ExerciseResult = {
  durationSeconds: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  successRate: number;
  score: number;
};

const DURATION_OPTIONS: DurationMinutes[] = [1, 2, 3, 4, 5];
const GRID_OPTIONS: GridSize[] = [7, 9, 11, 13, 15];
const LEVEL_OPTIONS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LETTERS = "ABCDEFGHJKLMNPRSTUVYZ".split("");

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getPairDistance(level: Level, gridSize: GridSize): number {
  const center = Math.floor(gridSize / 2);
  const normalized = Math.ceil((level / 9) * center);
  return Math.max(1, Math.min(center, normalized));
}

function createRound(gridSize: GridSize, level: Level): Round {
  const cellCount = gridSize * gridSize;
  const center = Math.floor(gridSize / 2);
  const distance = getPairDistance(level, gridSize);

  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 },
  ];

  const direction = randomItem(directions);
  const firstRow = center - direction.row * distance;
  const firstCol = center - direction.col * distance;
  const secondRow = center + direction.row * distance;
  const secondCol = center + direction.col * distance;

  const firstIndex = firstRow * gridSize + firstCol;
  const secondIndex = secondRow * gridSize + secondCol;
  const firstLetter = randomItem(LETTERS);
  const isSame = Math.random() >= 0.5;

  let secondLetter = firstLetter;
  if (!isSame) {
    const alternatives = LETTERS.filter((letter) => letter !== firstLetter);
    secondLetter = randomItem(alternatives);
  }

  const letters = Array.from(
    { length: cellCount },
    () => randomItem(LETTERS),
  );

  letters[firstIndex] = firstLetter;
  letters[secondIndex] = secondLetter;

  return {
    letters,
    firstIndex,
    secondIndex,
    firstLetter,
    secondLetter,
    correctAnswer: isSame ? "same" : "different",
  };
}

export function SquareVisionExerciseClient() {
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(1);
  const [gridSize, setGridSize] = useState<GridSize>(13);
  const [level, setLevel] = useState<Level>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [round, setRound] = useState<Round>(() => createRound(13, 1));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<"correct" | "wrong" | null>(null);
  const [result, setResult] = useState<ExerciseResult | null>(null);

  const totalDurationSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
  const successRate =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const score = Math.max(0, correctCount * 10 - wrongCount * 3);

  const cellFontSize = useMemo(() => {
    if (gridSize >= 15) return "text-[9px] sm:text-xs md:text-sm";
    if (gridSize >= 13) return "text-[10px] sm:text-sm md:text-base";
    if (gridSize >= 11) return "text-xs sm:text-base md:text-lg";
    return "text-sm sm:text-lg md:text-xl";
  }, [gridSize]);

  const playFeedback = useCallback(
    (isCorrect: boolean) => {
      if (!soundEnabled || typeof window === "undefined") {
        return;
      }

      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = isCorrect ? 660 : 220;
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.12,
      );

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);

      window.setTimeout(() => {
        void context.close();
      }, 180);
    },
    [soundEnabled],
  );

  const prepareRound = useCallback(() => {
    setRound(createRound(gridSize, level));
    setLastFeedback(null);
  }, [gridSize, level]);

  const resetExercise = useCallback(() => {
    setRound(createRound(gridSize, level));
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnsweredCount(0);
    setLastFeedback(null);
    setResult(null);
    setPhase("ready");
    startedAtRef.current = null;
    savedRef.current = false;
  }, [gridSize, level]);

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

    const finalSuccessRate =
      answeredCount > 0
        ? Math.round((correctCount / answeredCount) * 100)
        : 0;
    const finalScore = Math.max(0, correctCount * 10 - wrongCount * 3);
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "square-vision",
      exerciseTitle: "KAREL: Kare Görme Alanı",
      durationSeconds,
      correctCount,
      wrongCount,
      score: finalScore,
      successRate: finalSuccessRate,
      details: {
        durationMinutes,
        gridSize,
        level,
        soundEnabled,
        answeredCount,
      },
    });

    setResult({
      durationSeconds,
      correctCount,
      wrongCount,
      answeredCount,
      successRate: finalSuccessRate,
      score: finalScore,
    });
    setPhase("result");
  }, [
    answeredCount,
    correctCount,
    durationMinutes,
    elapsedSeconds,
    gridSize,
    level,
    soundEnabled,
    wrongCount,
  ]);

  const answerRound = useCallback(
    (answer: Answer) => {
      if (phase !== "running") {
        return;
      }

      const isCorrect = answer === round.correctAnswer;
      setAnsweredCount((current) => current + 1);

      if (isCorrect) {
        setCorrectCount((current) => current + 1);
        setLastFeedback("correct");
      } else {
        setWrongCount((current) => current + 1);
        setLastFeedback("wrong");
      }

      playFeedback(isCorrect);

      window.setTimeout(() => {
        setRound(createRound(gridSize, level));
        setLastFeedback(null);
      }, 160);
    },
    [gridSize, level, phase, playFeedback, round.correctAnswer],
  );

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== "running") {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        answerRound("same");
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        answerRound("different");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answerRound, phase]);

  const beginExercise = () => {
    setRound(createRound(gridSize, level));
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnsweredCount(0);
    setLastFeedback(null);
    setResult(null);
    savedRef.current = false;
    startedAtRef.current = Date.now();
    setPhase("running");
  };

  const controls = (
    <div className="grid gap-3 md:grid-cols-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Egzersiz Süresi
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
          Kare Boyutu
        </span>
        <select
          value={gridSize}
          onChange={(event) => {
            const nextSize = Number(event.target.value) as GridSize;
            setGridSize(nextSize);
            setRound(createRound(nextSize, level));
            setPhase("ready");
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {GRID_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} x {value}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Seviye
        </span>
        <select
          value={level}
          onChange={(event) => {
            const nextLevel = Number(event.target.value) as Level;
            setLevel(nextLevel);
            setRound(createRound(gridSize, nextLevel));
            setPhase("ready");
          }}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {LEVEL_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}. Seviye
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Sesler
        </span>
        <select
          value={soundEnabled ? "on" : "off"}
          onChange={(event) => setSoundEnabled(event.target.value === "on")}
          className={FULLSCREEN_SELECT_CLASS}
        >
          <option value="on">Açık</option>
          <option value="off">Kapalı</option>
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
        title="KAREL: Kare Görme Alanı"
        description="Merkezdeki odak noktasına bakarken çevrede işaretlenen iki harfi başını oynatmadan algıla ve aynı mı farklı mı olduğuna karar ver."
        buttonLabel="Eğitime Başla"
        onStart={resetExercise}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h1 className="text-2xl font-black text-slate-950">
          KAREL: Kare Görme Alanı Sonucu
        </h1>
        <p className="mt-2 text-sm text-slate-500">Egzersiz tamamlandı.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Doğru</p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {result.correctCount}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Yanlış</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {result.wrongCount}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Başarı</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              %{result.successRate}
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
            <p className="text-xs uppercase text-slate-500">Puan</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {result.score}
            </p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-red-100 bg-white p-4 text-sm text-slate-700">
          <p><strong>Süre:</strong> {formatTime(result.durationSeconds)}</p>
          <p className="mt-1"><strong>Cevap:</strong> {result.answeredCount}</p>
          <p className="mt-1"><strong>Kare:</strong> {gridSize} x {gridSize}</p>
          <p className="mt-1"><strong>Seviye:</strong> {level}</p>
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
      title="KAREL: Kare Görme Alanı"
      subtitle="Merkez noktaya odaklan"
      stats={[
        { label: "Süre", value: formatTime(remainingSeconds) },
        { label: "Seviye", value: level, tone: "brand" },
        { label: "Kare", value: `${gridSize}x${gridSize}` },
        { label: "Doğru", value: correctCount },
        { label: "Yanlış", value: wrongCount },
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
      settings={controls}
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {phase === "ready" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
              Hazırlık
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 md:text-3xl">
              Merkez noktadan bakışını ayırma.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-500">
              İşaretlenen iki harfi başını hareket ettirmeden görmeye çalış.
              Aynıysa sağdaki, farklıysa soldaki butona bas.
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="shrink-0">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <p className="text-sm font-bold text-slate-700">
                  Sol ok: Farklı · Sağ ok: Aynı
                </p>
                <p className="text-sm font-black text-red-700">
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <div
                className={`relative grid aspect-square max-h-full max-w-full overflow-hidden rounded-2xl border-2 bg-slate-50 p-1 shadow-inner transition ${
                  lastFeedback === "correct"
                    ? "border-green-400"
                    : lastFeedback === "wrong"
                      ? "border-red-500"
                      : "border-slate-300"
                }`}
                style={{
                  width: "min(100%, 100%)",
                  height: "min(100%, 100%)",
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                }}
              >
                {round.letters.map((letter, index) => {
                  const isMarked =
                    index === round.firstIndex || index === round.secondIndex;
                  const centerIndex =
                    Math.floor(gridSize / 2) * gridSize +
                    Math.floor(gridSize / 2);
                  const isCenter = index === centerIndex;

                  return (
                    <div
                      key={`${index}-${letter}`}
                      className={`relative flex min-h-0 min-w-0 items-center justify-center border border-slate-200/70 font-bold leading-none ${
                        isMarked
                          ? "z-10 bg-amber-100 text-red-800 ring-2 ring-inset ring-red-500"
                          : "bg-white text-slate-600"
                      } ${cellFontSize}`}
                    >
                      {letter}
                      {isCenter ? (
                        <span
                          aria-label="Odak noktası"
                          className="absolute left-1/2 top-1/2 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0">
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => answerRound("different")}
                  disabled={phase !== "running"}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-slate-900 px-2 py-2 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-50 md:text-base"
                  style={FULLSCREEN_TOUCH_STYLE}
                >
                  Farklı Harfler ←
                </button>
                <button
                  type="button"
                  onClick={() => answerRound("same")}
                  disabled={phase !== "running"}
                  className="min-h-[44px] rounded-xl border border-red-700 bg-red-600 px-2 py-2 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-50 md:text-base"
                  style={FULLSCREEN_TOUCH_STYLE}
                >
                  Aynı Harfler →
                </button>
              </div>

              {phase === "paused" ? (
                <p className="mt-3 text-center text-sm font-bold text-red-700">
                  Egzersiz duraklatıldı.
                </p>
              ) : null}

              <div className="mt-1 text-center text-xs font-bold text-slate-600">
                Puan: {score} · Başarı: %{successRate}
              </div>
            </div>
          </div>
        )}
      </div>
    </FullscreenExerciseShell>
  );
}
