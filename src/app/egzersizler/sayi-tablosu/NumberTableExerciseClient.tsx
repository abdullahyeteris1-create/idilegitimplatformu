"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FixedExerciseStage,
  FixedExerciseStat,
} from "@/components/exercises/FixedExerciseStage";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";

type GameStatus = "idle" | "running" | "finished";

type LevelConfig = {
  level: number;
  maxNumber: number;
  label: string;
};

type AssignmentItemResponse = {
  ok?: boolean;
  exerciseSlug?: string;
  settingsJson?: Record<string, unknown>;
};

const LEVELS: LevelConfig[] = [
  { level: 1, maxNumber: 25, label: "1–25" },
  { level: 2, maxNumber: 40, label: "1–40" },
  { level: 3, maxNumber: 50, label: "1–50" },
  { level: 4, maxNumber: 60, label: "1–60" },
  { level: 5, maxNumber: 75, label: "1–75" },
  { level: 6, maxNumber: 100, label: "1–100" },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function formatTime(milliseconds: number): string {
  return (Math.max(0, milliseconds) / 1000).toFixed(2);
}

function isSupportedLevel(value: unknown): value is number {
  return typeof value === "number" && LEVELS.some((item) => item.level === value);
}

function getScore(correct: number, wrong: number): number {
  return Math.max(0, correct * 10 - wrong * 5);
}

function getSuccessRate(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export default function NumberTableExerciseClient() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [assignmentLevel, setAssignmentLevel] = useState<number | null>(null);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [correctClicks, setCorrectClicks] = useState(0);
  const [wrongClicks, setWrongClicks] = useState(0);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [status, setStatus] = useState<GameStatus>("idle");

  const startedAtRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const resultSavedRef = useRef(false);

  const activeLevel =
    LEVELS.find((item) => item.level === selectedLevel) ?? LEVELS[0];
  const totalClicks = correctClicks + wrongClicks;
  const successRate = getSuccessRate(correctClicks, wrongClicks);
  const progressPercent = useMemo(
    () =>
      Math.min(
        100,
        Math.max(0, Math.round((correctClicks / activeLevel.maxNumber) * 100)),
      ),
    [activeLevel.maxNumber, correctClicks],
  );
  const gridColumnCount =
    activeLevel.maxNumber <= 25 ? 5 : activeLevel.maxNumber <= 60 ? 8 : 10;

  useEffect(() => {
    const assignmentItemId = new URLSearchParams(window.location.search)
      .get("assignmentItemId")
      ?.trim();

    if (!assignmentItemId) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/student/assignment-items/${encodeURIComponent(assignmentItemId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as AssignmentItemResponse;
        const configuredLevel = data.settingsJson?.level;

        if (
          response.ok &&
          data.ok &&
          data.exerciseSlug === "sayi-tablosu" &&
          isSupportedLevel(configuredLevel)
        ) {
          setAssignmentLevel(configuredLevel);

          if (startedAtRef.current === null) {
            setSelectedLevel(configuredLevel);
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Sayı Tablosu ödev ayarları yüklenemedi.");
        }
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMilliseconds(performance.now() - startedAtRef.current);
      }
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "finished" || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;
    const durationSeconds = Math.max(1, Math.round(elapsedMilliseconds / 1000));
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "number-table",
      exerciseTitle: "Sayı Tablosu",
      durationSeconds,
      correctCount: correctClicks,
      wrongCount: wrongClicks,
      score: getScore(correctClicks, wrongClicks),
      successRate,
      details: {
        level: selectedLevel,
        maxNumber: activeLevel.maxNumber,
        totalClicks,
        wrongClicks,
        completionSeconds: durationSeconds,
        progress: 100,
        gridColumns: gridColumnCount,
        gridLabel: `${gridColumnCount} sütun`,
      },
    });
  }, [
    activeLevel.maxNumber,
    correctClicks,
    elapsedMilliseconds,
    gridColumnCount,
    selectedLevel,
    status,
    successRate,
    totalClicks,
    wrongClicks,
  ]);

  function resetGame() {
    setNumbers([]);
    setNextNumber(1);
    setCorrectClicks(0);
    setWrongClicks(0);
    setElapsedMilliseconds(0);
    setStatus("idle");
    startedAtRef.current = null;
    finishedRef.current = false;
    resultSavedRef.current = false;
  }

  function startGame(startedAt: number) {
    setNumbers(
      shuffle(
        Array.from({ length: activeLevel.maxNumber }, (_, index) => index + 1),
      ),
    );
    setNextNumber(1);
    setCorrectClicks(0);
    setWrongClicks(0);
    setElapsedMilliseconds(0);
    setStatus("running");
    startedAtRef.current = startedAt;
    finishedRef.current = false;
    resultSavedRef.current = false;
  }

  function finishGame(finishedAt: number) {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    const finalElapsed =
      startedAtRef.current === null
        ? elapsedMilliseconds
        : finishedAt - startedAtRef.current;

    setElapsedMilliseconds(Math.max(0, finalElapsed));
    setStatus("finished");
    startedAtRef.current = null;
  }

  function handleNumberClick(clickedNumber: number, clickedAt: number) {
    if (status !== "running" || startedAtRef.current === null) {
      return;
    }

    if (clickedNumber !== nextNumber) {
      setWrongClicks((current) => current + 1);
      return;
    }

    setCorrectClicks((current) => current + 1);

    if (clickedNumber === activeLevel.maxNumber) {
      finishGame(clickedAt);
      return;
    }

    setNextNumber((current) => current + 1);
  }

  function changeLevel(level: number) {
    if (status === "running" || assignmentLevel !== null) {
      return;
    }

    setSelectedLevel(level);
    resetGame();
  }

  function openDetailedResults() {
    const params = new URLSearchParams({
      exerciseType: "number-table",
      correct: String(correctClicks),
      wrong: String(wrongClicks),
      successRate: String(successRate),
      score: String(getScore(correctClicks, wrongClicks)),
    });

    router.push(`/sonuc?${params.toString()}`);
  }

  const levelSettings = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Seviye
      </span>
      {LEVELS.map((item) => (
        <button
          key={item.level}
          type="button"
          onClick={() => changeLevel(item.level)}
          disabled={status === "running" || assignmentLevel !== null}
          className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
            selectedLevel === item.level
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          }`}
        >
          {item.level}. Seviye · {item.label}
        </button>
      ))}
      {assignmentLevel !== null ? (
        <span className="text-xs font-semibold text-violet-700">
          Ödev seviyesi uygulandı
        </span>
      ) : null}
    </div>
  );

  const controls = (
    <div className="flex flex-wrap justify-center gap-2">
      {status === "running" ? (
        <button
          type="button"
          onClick={resetGame}
          className="min-h-11 rounded-xl border border-rose-300 bg-white px-6 py-2 text-sm font-black text-rose-700 hover:bg-rose-50"
        >
          Çalışmayı İptal Et
        </button>
      ) : (
        <button
          type="button"
          onClick={(event) => startGame(event.timeStamp)}
          className="min-h-11 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-black text-white shadow hover:bg-emerald-700"
        >
          {status === "finished" ? "Yeniden Başlat" : "Çalışmayı Başlat"}
        </button>
      )}
      {status === "finished" ? (
        <button
          type="button"
          onClick={openDetailedResults}
          className="min-h-11 rounded-xl bg-sky-600 px-6 py-2 text-sm font-black text-white shadow hover:bg-sky-700"
        >
          Ayrıntılı Sonuçlar
        </button>
      ) : null}
    </div>
  );

  return (
    <FixedExerciseStage
      title="Sayı Tablosu"
      subtitle={
        status === "running"
          ? "Sayıları doğru sırayla bul"
          : status === "finished"
            ? "Çalışma tamamlandı"
            : "Seviyeni seç ve çalışmayı başlat"
      }
      topStats={
        <>
          <FixedExerciseStat label="Süre" value={`${formatTime(elapsedMilliseconds)} sn`} tone="brand" />
          <FixedExerciseStat label="Doğru" value={correctClicks} tone="ok" />
          <FixedExerciseStat label="Yanlış" value={wrongClicks} tone="bad" />
          <FixedExerciseStat label="Toplam" value={totalClicks} />
        </>
      }
      bottomSettings={levelSettings}
      controls={controls}
      onExit={() => router.push("/egzersizler")}
    >
      <main className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
        <div className="mb-2 shrink-0">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-slate-600 sm:text-sm">
            <span>
              {status === "idle"
                ? "Başlamaya hazır"
                : status === "running"
                  ? "Çalışma devam ediyor"
                  : "Çalışma tamamlandı"}
            </span>
            <span>%{progressPercent} tamamlandı</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {status === "idle" ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-white p-6 text-center">
            <div>
              <div className="text-5xl font-black text-sky-600">{activeLevel.label}</div>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 sm:text-base">
                Sayıları 1&apos;den başlayarak doğru sırayla bul. Tablo her başlangıçta yeniden karışır.
              </p>
            </div>
          </div>
        ) : status === "finished" ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto rounded-2xl bg-emerald-50 p-3 sm:p-5">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-xl font-black text-emerald-800 sm:text-2xl">
                Tebrikler, çalışmayı tamamladın!
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ResultCard label="Süre" value={`${formatTime(elapsedMilliseconds)} sn`} />
                <ResultCard label="Doğru" value={correctClicks} />
                <ResultCard label="Yanlış" value={wrongClicks} />
                <ResultCard label="Toplam" value={totalClicks} />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-slate-100 p-1.5 sm:p-3">
            <div
              className="mx-auto grid w-full max-w-3xl content-center gap-1 sm:gap-2"
              style={{
                gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))`,
              }}
            >
              {numbers.map((number) => {
                const isCompleted = number < nextNumber;

                return (
                  <button
                    key={number}
                    type="button"
                    onClick={(event) => handleNumberClick(number, event.timeStamp)}
                    disabled={isCompleted}
                    aria-label={`${number} sayısı`}
                    className={`aspect-square min-w-0 touch-manipulation rounded-lg border font-black shadow-sm transition active:scale-95 sm:rounded-xl ${
                      activeLevel.maxNumber >= 75
                        ? "text-[clamp(0.65rem,2.7vw,1rem)]"
                        : "text-[clamp(0.75rem,3.4vw,1.125rem)]"
                    } ${
                      isCompleted
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50"
                    }`}
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </FixedExerciseStage>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-3 text-center shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-emerald-700 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}
