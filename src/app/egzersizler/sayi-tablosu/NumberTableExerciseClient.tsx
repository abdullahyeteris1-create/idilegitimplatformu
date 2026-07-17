"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GameStatus = "idle" | "running" | "finished";

type LevelConfig = {
  level: number;
  maxNumber: number;
  label: string;
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

export default function NumberTableExerciseClient() {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [correctClicks, setCorrectClicks] = useState(0);
  const [wrongClicks, setWrongClicks] = useState(0);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [status, setStatus] = useState<GameStatus>("idle");

  const startedAtRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const activeLevel =
    LEVELS.find((item) => item.level === selectedLevel) ?? LEVELS[0];

  const progressPercent = useMemo(() => {
    return Math.min(
      100,
      Math.max(0, Math.round((correctClicks / activeLevel.maxNumber) * 100)),
    );
  }, [activeLevel.maxNumber, correctClicks]);

  const totalClicks = correctClicks + wrongClicks;

  useEffect(() => {
    if (status !== "running") return;

    const intervalId = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMilliseconds(performance.now() - startedAtRef.current);
      }
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [status]);

  function prepareGame(level = selectedLevel) {
    const levelConfig =
      LEVELS.find((item) => item.level === level) ?? LEVELS[0];

    setNumbers(
      shuffle(
        Array.from({ length: levelConfig.maxNumber }, (_, index) => index + 1),
      ),
    );
    setNextNumber(1);
    setCorrectClicks(0);
    setWrongClicks(0);
    setElapsedMilliseconds(0);
    setStatus("idle");
    startedAtRef.current = null;
    finishedRef.current = false;
  }

  function startGame() {
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
    startedAtRef.current = performance.now();
    finishedRef.current = false;
  }

  function finishGame() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStatus("finished");
  }

  function handleNumberClick(clickedNumber: number) {
    if (status !== "running" || startedAtRef.current === null) return;

    if (clickedNumber !== nextNumber) {
      setWrongClicks((current) => current + 1);
      return;
    }

    setCorrectClicks((current) => current + 1);

    if (clickedNumber === activeLevel.maxNumber) {
      window.setTimeout(() => finishGame(), 0);
      return;
    }

    setNextNumber((current) => current + 1);
  }

  function changeLevel(level: number) {
    if (status === "running") return;
    setSelectedLevel(level);
    prepareGame(level);
  }

  const gridColumns =
    activeLevel.maxNumber <= 25
      ? "grid-cols-5"
      : activeLevel.maxNumber <= 60
        ? "grid-cols-8"
        : "grid-cols-10";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 px-3 py-4 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Sayı Tablosu
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sayıları 1&apos;den başlayarak doğru sırayla bul.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            <StatCard label="Süre" value={`${formatTime(elapsedMilliseconds)} sn`} />
            <StatCard label="Doğru" value={correctClicks} />
            <StatCard label="Yanlış" value={wrongClicks} />
          </div>
        </header>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Seviye seç
            </p>

            <div className="flex flex-wrap gap-2">
              {LEVELS.map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => changeLevel(item.level)}
                  disabled={status === "running"}
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    selectedLevel === item.level
                      ? "border-sky-600 bg-sky-600 text-white shadow"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50",
                    status === "running" ? "cursor-not-allowed opacity-55" : "",
                  ].join(" ")}
                >
                  {item.level}. Seviye · {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {status !== "running" ? (
              <button
                type="button"
                onClick={startGame}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                {status === "finished" ? "Yeniden Başlat" : "Çalışmayı Başlat"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => prepareGame(selectedLevel)}
                className="rounded-xl border border-rose-300 bg-white px-6 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50"
              >
                Çalışmayı İptal Et
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 py-4 sm:px-6">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
              <span>
                {status === "idle" && "Başlamaya hazır"}
                {status === "running" && "Çalışma devam ediyor"}
                {status === "finished" && "Çalışma tamamlandı"}
              </span>
              <span>%{progressPercent} tamamlandı</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div
            className={[
              "grid flex-1 gap-2 rounded-3xl border border-slate-200 bg-slate-100 p-3 sm:gap-3 sm:p-4",
              gridColumns,
            ].join(" ")}
          >
            {numbers.length === 0 ? (
              <div className="col-span-full flex min-h-[360px] items-center justify-center rounded-2xl bg-white p-8 text-center">
                <div>
                  <div className="text-6xl font-black text-sky-600">
                    {activeLevel.label}
                  </div>
                  <p className="mt-4 max-w-md text-slate-500">
                    Seviyeni seç ve çalışmayı başlat. Önce 1&apos;i, sonra
                    2&apos;yi ve sırayla devam eden sayıları bul.
                  </p>
                </div>
              </div>
            ) : (
              numbers.map((number) => {
                const isCompleted = number < nextNumber || status === "finished";

                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => handleNumberClick(number)}
                    disabled={status !== "running" || isCompleted}
                    aria-label={`${number} sayısı`}
                    className={[
                      "flex min-h-12 items-center justify-center rounded-xl border text-base font-black shadow-sm transition sm:min-h-14 sm:text-lg",
                      isCompleted
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50 active:scale-95",
                    ].join(" ")}
                  >
                    {number}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {status === "finished" && (
          <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-center text-xl font-black text-emerald-800">
                Tebrikler, çalışmayı tamamladın!
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <ResultCard
                  label="Tamamlama süresi"
                  value={`${formatTime(elapsedMilliseconds)} sn`}
                />
                <ResultCard label="Doğru tıklama" value={correctClicks} />
                <ResultCard label="Yanlış tıklama" value={wrongClicks} />
                <ResultCard label="Toplam tıklama" value={totalClicks} />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-base font-black text-slate-900">{value}</div>
    </div>
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
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-emerald-700">{value}</div>
    </div>
  );
}
