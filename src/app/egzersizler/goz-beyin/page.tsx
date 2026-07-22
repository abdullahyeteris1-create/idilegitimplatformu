"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/eye-brain-theme.module.css";

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
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? "" : styles.darkTheme].join(" ");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1800);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [round, setRound] = useState(0);
  const [targetSymbol, setTargetSymbol] = useState(() => getRandomTargetSymbol());
  const [symbols, setSymbols] = useState<SymbolItem[]>(() => createSymbols());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <div className={themeRootClassName}>
      <FixedExerciseStage
        title="Göz Beyin Çalışması"
        subtitle="Hedef simgeyi gözlerinle bul ve takip et"
        topStats={<><FixedExerciseStat label="Süre" value={formatTime(elapsedSeconds)} /><FixedExerciseStat label="Tur" value={round} /><FixedExerciseStat label="Hız" value={`${speed} ms`} tone="brand" /><FixedExerciseStat label="Hedef" value={targetSymbol} /></>}
        bottomSettings={<div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold"><span>Ekran değişim hızı</span><select value={speed} disabled={isRunning} onChange={(event) => setSpeed(Number(event.target.value))} className={`min-h-11 rounded-xl border border-slate-300 bg-white px-3 ${styles.settingsSelect}`}>{SPEED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.value} ms</option>)}</select></label><button type="button" onClick={changeTargetSymbol} disabled={isRunning} className={`min-h-11 self-end rounded-xl border border-cyan-300 bg-cyan-50 px-4 font-bold text-cyan-900 disabled:opacity-50 ${styles.changeTargetButton}`}>Hedefi Değiştir: {targetSymbol}</button></div>}
        controls={<div className="flex flex-wrap justify-center gap-2">{!isRunning ? <button type="button" onClick={startExercise} className={`min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white ${styles.startButton}`}>Başlat</button> : <button type="button" onClick={stopExercise} className={`min-h-11 rounded-xl bg-rose-600 px-5 font-bold text-white ${styles.stopButton}`}>Durdur</button>}<button type="button" onClick={resetExercise} className={`min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold ${styles.secondaryButton}`}>Sıfırla</button></div>}
        onExit={() => router.push("/egzersizler")}
      >
        <div className={`relative h-full min-h-0 w-full max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.10),_rgba(255,255,255,1)_55%,_rgba(248,250,252,1))] shadow-2xl ${styles.stageBackground}`}>
          <div className={`absolute left-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-600 backdrop-blur ${styles.infoPanel}`}>
            Hedef simgeyi bul:{" "}
            <span className="ml-1 text-lg font-bold">{targetSymbol}</span>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className={`absolute left-1/2 top-0 h-full w-px bg-white/30 ${styles.guideLine}`} />
            <div className={`absolute left-0 top-1/2 h-px w-full bg-white/30 ${styles.guideLine}`} />
            <div className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ${styles.guideDot}`} />
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
            <div className={`absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-6 text-center backdrop-blur-sm ${styles.introOverlay}`}>
              <div className={`max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl ${styles.introCard}`}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400 text-3xl">
                  {targetSymbol}
                </div>

                <h2 className={`text-xl font-bold ${styles.introTitle}`}>Hedef simgeyi bul</h2>

                <p className={`mt-2 text-sm leading-6 text-slate-300 ${styles.introBody}`}>
                  Başlat butonuna bastığında bütün simgeler ekranda görünecek.
                  Her turda yerleri değişecek. Sen sadece{" "}
                  <span className="font-bold text-cyan-300">
                    {targetSymbol}
                  </span>{" "}
                  simgesini gözlerinle bulmaya çalış.
                </p>

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
      </FixedExerciseStage>
    </div>
  );
}
