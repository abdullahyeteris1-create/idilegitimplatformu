"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";

type SymbolItem = {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  delay: number;
};

const SYMBOLS = [
  "🐱",
  "🐶",
  "🐰",
  "🐻",
  "🐼",
  "🦊",
  "🐮",
  "🐴",
  "🐹",
  "🐭",
  "🐨",
  "🐧",
  "🐦",
  "🦉",
  "🦆",
  "🐔",
  "🐢",
  "🐠",
  "🐬",
  "🦋",
  "🐝",
  "🐞",
  "🦄",
  "⛅",
  "🌈",
  "❄️",
  "⚡",
  "🔥",
  "💧",
  "🌿",
  "🍀",
  "🍁",
  "🍂",
  "🌷",
  "🌹",
  "🌻",
  "🌾",
  "🍎",
  "🍌",
  "🍓",
  "🍉",
  "🍒",
  "🍍",
  "🥕",
  "🍄",
];

const SPEED_OPTIONS = [
  { label: "Yavaş", value: 2500 },
  { label: "Orta", value: 1800 },
  { label: "Hızlı", value: 1200 },
  { label: "Çok Hızlı", value: 800 },
];

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * 86) + 7,
    y: Math.floor(Math.random() * 76) + 12,
  };
}

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createSymbols(): SymbolItem[] {
  const shuffledSymbols = shuffleArray(SYMBOLS);

  return shuffledSymbols.map((symbol, index) => {
    const position = getRandomPosition();

    return {
      id: index + 1,
      symbol,
      x: position.x,
      y: position.y,
      size: Math.floor(Math.random() * 12) + 26,
      delay: Math.random() * 0.35,
    };
  });
}

function getRandomTargetSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function EyeBrainExercisePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1800);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [round, setRound] = useState(0);
  const [targetSymbol, setTargetSymbol] = useState(() => getRandomTargetSymbol());
  const [symbols, setSymbols] = useState<SymbolItem[]>(() => createSymbols());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSpeedLabel = useMemo(() => {
    return SPEED_OPTIONS.find((item) => item.value === speed)?.label ?? "Orta";
  }, [speed]);

  const resetIntervals = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const changeTargetSymbol = () => {
    setTargetSymbol(getRandomTargetSymbol());
    setSymbols(createSymbols());
    setRound(0);
    setElapsedSeconds(0);
  };

  const startExercise = () => {
    resetIntervals();
    setElapsedSeconds(0);
    setRound(0);
    setSymbols(createSymbols());
    setIsRunning(true);
  };

  const stopExercise = () => {
    resetIntervals();
    setIsRunning(false);
  };

  const resetExercise = () => {
    resetIntervals();
    setIsRunning(false);
    setElapsedSeconds(0);
    setRound(0);
    setSymbols(createSymbols());
  };

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSymbols(createSymbols());
      setRound((previous) => previous + 1);
    }, speed);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => {
      resetIntervals();
    };
  }, [isRunning, speed]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <div className="mb-3 flex justify-end">
          <ExerciseNavigationControls compact />
        </div>
        <div className="mb-3 rounded-2xl border border-white/10 bg-white px-4 py-3 shadow-xl backdrop-blur">
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs font-bold text-cyan-300">
          Göz Egzersizleri
        </p>

        <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:block" />

        <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
          Göz Beyin Çalışması
        </h1>
      </div>

      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300 md:text-sm">
        Başını hareket ettirmeden hedef simgeyi yalnızca gözlerinle bul ve
        takip et.
      </p>
    </div>

    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2">
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-200">
          Hedef Simge
        </p>

        <button
          type="button"
          onClick={changeTargetSymbol}
          disabled={isRunning}
          className="mt-1 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-2.5 py-1.5 text-[11px] font-bold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Değiştir
        </button>
      </div>

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-4xl shadow-lg">
        {targetSymbol}
      </div>
    </div>
  </div>
</div>

        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/200 bg-white/10 p-3 backdrop-blur md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-50 px-3 py-2 text-center">
            <p className="text-xs text-slate-500">Süre</p>
            <p className="mt-1 text-lg font-bold">{formatTime(elapsedSeconds)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
            <p className="text-xs text-slate-400">Tur</p>
            <p className="mt-1 text-xl font-bold">{round}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
            <p className="text-xs text-slate-400">Hız</p>
            <p className="mt-1 text-xl font-bold">{selectedSpeedLabel}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
            <p className="text-xs text-slate-400">Gösterilen Simge</p>
            <p className="mt-1 text-xl font-bold">{SYMBOLS.length}</p>
          </div>
        </div>

        <div className="mb-3 grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Ekran değişim hızı
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSpeed(option.value)}
                  disabled={isRunning}
                  className={`rounded-2xl border min-h-[42px] px-3 py-2 text-sm font-semibold transition ${
                    speed === option.value
                      ? "border-cyan-300 bg-cyan-400 text-slate-950"
                      : "border-white/10 bg-black/20 text-slate-200 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            {!isRunning ? (
              <button
                type="button"
                onClick={startExercise}
                className="rounded-2xl bg-emerald-500 min-h-[42px] px-5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
              >
                Başlat
              </button>
            ) : (
              <button
                type="button"
                onClick={stopExercise}
                className="rounded-2xl bg-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400"
              >
                Durdur
              </button>
            )}

            <button
              type="button"
              onClick={resetExercise}
              className="rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="relative min-h-[580px] flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.10),_rgba(255,255,255,1)_55%,_rgba(248,250,252,1))] shadow-2xl sm:min-h-[620px] lg:min-h-[680px] xl:min-h-[720px]">
          <div className="absolute left-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-600 backdrop-blur">
            Hedef simgeyi bul:{" "}
            <span className="ml-1 text-lg font-bold">{targetSymbol}</span>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-white/30" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </div>

          {symbols.map((item) => {
            const isTarget = item.symbol === targetSymbol;

            return (
              <div
                key={`${item.id}-${round}-${item.symbol}`}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${
                  isTarget ? "z-10" : "z-0"
                }`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  fontSize: `${isTarget ? item.size + 8 : item.size}px`,
                  animation: `blinkSymbol ${Math.max(
                    0.6,
                    speed / 1000
                  )}s ease-in-out ${item.delay}s infinite`,
                  filter: isTarget
                    ? "drop-shadow(0 0 18px rgba(34,211,238,0.75)) drop-shadow(0 12px 24px rgba(0,0,0,0.45))"
                    : "drop-shadow(0 12px 24px rgba(0,0,0,0.45))",
                }}
              >
                {item.symbol}
              </div>
            );
          })}

          {!isRunning && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-6 text-center backdrop-blur-sm">
              <div className="max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400 text-3xl">
                  {targetSymbol}
                </div>

                <h2 className="text-xl font-bold">Hedef simgeyi bul</h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Başlat butonuna bastığında bütün simgeler ekranda görünecek.
                  Her turda yerleri değişecek. Sen sadece{" "}
                  <span className="font-bold text-cyan-300">
                    {targetSymbol}
                  </span>{" "}
                  simgesini gözlerinle bulmaya çalış.
                </p>

                <button
                  type="button"
                  onClick={startExercise}
                  className="mt-5 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Çalışmayı Başlat
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx global>{`
          @keyframes blinkSymbol {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.45);
            }

            18% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.12);
            }

            45% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }

            75% {
              opacity: 0.3;
              transform: translate(-50%, -50%) scale(0.72);
            }

            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.45);
            }
          }
        `}</style>
      </section>
    </main>
  );
}
