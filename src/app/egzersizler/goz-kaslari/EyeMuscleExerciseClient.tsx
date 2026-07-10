"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";

type EmojiOption = {
  label: string;
  value: string;
};

type Position = {
  x: number;
  y: number;
};

const EMOJI_OPTIONS: EmojiOption[] = [
  { label: "Yıldız", value: "⭐" },
  { label: "Kalp", value: "❤️" },
  { label: "Güneş", value: "☀️" },
  { label: "Ay", value: "🌙" },
  { label: "Elma", value: "🍎" },
  { label: "Muz", value: "🍌" },
  { label: "Kedi", value: "🐱" },
  { label: "Köpek", value: "🐶" },
  { label: "Kelebek", value: "🦋" },
  { label: "Balon", value: "🎈" },
  { label: "Futbol Topu", value: "⚽" },
  { label: "Araba", value: "🚗" },
];

const SPEED_OPTIONS = [100, 200, 300, 400, 500];

const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function getLevelArea(level: number) {
  const safeLevel = Math.min(Math.max(level, 1), 6);

  const areas = {
    1: { minX: 28, maxX: 72, minY: 28, maxY: 72 },
    2: { minX: 20, maxX: 80, minY: 20, maxY: 80 },
    3: { minX: 14, maxX: 86, minY: 14, maxY: 86 },
    4: { minX: 10, maxX: 90, minY: 10, maxY: 90 },
    5: { minX: 7, maxX: 93, minY: 7, maxY: 93 },
    6: { minX: 5, maxX: 95, minY: 5, maxY: 95 },
  };

  return areas[safeLevel as keyof typeof areas];
}

function getSymbolSize(level: number): string {
  if (level <= 1) return "text-6xl md:text-7xl";
  if (level === 2) return "text-5xl md:text-6xl";
  if (level === 3) return "text-5xl md:text-6xl";
  if (level === 4) return "text-4xl md:text-5xl";
  if (level === 5) return "text-4xl md:text-5xl";

  return "text-3xl md:text-4xl";
}

function getDistance(first: Position, second: Position): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function createRandomPosition(
  level: number,
  previousPosition: Position,
): Position {
  const area = getLevelArea(level);

  const minimumDistance = level <= 2 ? 24 : level <= 4 ? 30 : 36;

  let candidate: Position = previousPosition;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    candidate = {
      x:
        Math.random() * (area.maxX - area.minX) +
        area.minX,
      y:
        Math.random() * (area.maxY - area.minY) +
        area.minY,
    };

    if (getDistance(candidate, previousPosition) >= minimumDistance) {
      return candidate;
    }
  }

  return candidate;
}

export default function GozCalismasiPage() {
  const flashTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const positionRef = useRef<Position>({ x: 50, y: 50 });

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [selectedEmoji, setSelectedEmoji] = useState("⭐");
  const [level, setLevel] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [round, setRound] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [isVisible, setIsVisible] = useState(false);

  const selectedEmojiLabel = useMemo(() => {
    return (
      EMOJI_OPTIONS.find((item) => item.value === selectedEmoji)?.label ??
      "Simge"
    );
  }, [selectedEmoji]);

  const symbolSizeClass = useMemo(() => getSymbolSize(level), [level]);

  function clearTimers(): void {
    if (flashTimerRef.current !== null) {
      window.clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }

  function moveToNextPosition(): void {
    const nextPosition = createRandomPosition(level, positionRef.current);

    positionRef.current = nextPosition;
    setPosition(nextPosition);
    setRound((previousRound) => previousRound + 1);
  }

  function startExercise(): void {
    clearTimers();

    setIsRunning(true);
    setElapsedSeconds(0);
    setRound(0);

    const startPosition = createRandomPosition(level, {
      x: 50,
      y: 50,
    });

    positionRef.current = startPosition;
    setPosition(startPosition);
    setIsVisible(true);
  }

  function stopExercise(): void {
    clearTimers();
    setIsRunning(false);
    setIsVisible(false);
  }

  function resetExercise(): void {
    clearTimers();

    const centerPosition = { x: 50, y: 50 };

    positionRef.current = centerPosition;

    setIsRunning(false);
    setElapsedSeconds(0);
    setRound(0);
    setPosition(centerPosition);
    setIsVisible(false);
  }

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    clearTimers();

    flashTimerRef.current = window.setInterval(() => {
      setIsVisible((previousVisibility) => {
        if (previousVisibility) {
          return false;
        }

        moveToNextPosition();
        return true;
      });
    }, speed);

    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds((previousSeconds) => previousSeconds + 1);
    }, 1000);

    return () => {
      clearTimers();
    };
  }, [isRunning, speed, level]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  return (
    <main className="min-h-screen bg-white px-3 py-3 text-slate-900 md:px-5 md:py-4">
      <section className="mx-auto flex min-h-[calc(100vh-24px)] w-full max-w-6xl flex-col gap-3">
        <div className="flex justify-end">
          <ExerciseNavigationControls compact />
        </div>
        <header className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                Göz Egzersizleri
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Göz Takip Çalışması
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Seçtiğin simge çalışma alanında sürekli farklı noktalarda yanıp
                söner. Başını sabit tutarak yalnızca gözlerinle takip et.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-slate-500">Süre</p>
                <p className="text-lg font-black text-slate-950">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-slate-500">Tur</p>
                <p className="text-lg font-black text-slate-950">{round}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-slate-500">Seviye</p>
                <p className="text-lg font-black text-red-600">{level}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-slate-500">Hız</p>
                <p className="text-lg font-black text-slate-950">
                  {speed}ms
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_0.75fr_0.75fr_auto] xl:items-end">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">
                Hız Ayarı
              </p>

              <div className="grid grid-cols-5 gap-2">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSpeed(option)}
                    disabled={isRunning}
                    className={`min-h-[42px] rounded-xl border px-2 py-2 text-sm font-black transition ${
                      speed === option
                        ? "border-red-500 bg-red-500 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {option}ms
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Simge Seçimi
              </span>

              <select
                value={selectedEmoji}
                onChange={(event) => setSelectedEmoji(event.target.value)}
                disabled={isRunning}
                className="h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {EMOJI_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value} {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Seviye Seçimi
              </span>

              <select
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
                disabled={isRunning}
                className="h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}. Seviye
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2 xl:min-w-[220px]">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={startExercise}
                  className="min-h-[42px] rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600"
                >
                  Başlat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopExercise}
                  className="min-h-[42px] rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600"
                >
                  Durdur
                </button>
              )}

              <button
                type="button"
                onClick={resetExercise}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </section>

        <section className="relative min-h-[560px] flex-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.05),_rgba(255,255,255,1)_55%,_rgba(248,250,252,1))] shadow-sm md:min-h-[640px]">
          <div className="absolute left-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
            Seçilen simge:{" "}
            <span className="ml-1 text-xl">{selectedEmoji}</span>
            <span className="ml-2 font-black text-slate-900">
              {selectedEmojiLabel}
            </span>
          </div>

          <div className="absolute right-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
            Aktif seviye:{" "}
            <span className="font-black text-red-600">{level}</span>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute left-1/3 top-0 h-full w-px bg-slate-300" />
            <div className="absolute left-2/3 top-0 h-full w-px bg-slate-300" />
            <div className="absolute left-0 top-1/3 h-px w-full bg-slate-300" />
            <div className="absolute left-0 top-2/3 h-px w-full bg-slate-300" />
          </div>

          <div
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            <span
              className={`select-none ${symbolSizeClass} transition-opacity duration-75 ${
                isRunning && isVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!isRunning || !isVisible}
            >
              {selectedEmoji}
            </span>
          </div>

          {!isRunning && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/55 p-6 text-center backdrop-blur-sm">
              <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-5xl shadow-sm">
                  {selectedEmoji}
                </div>

                <h2 className="text-xl font-black text-slate-950">
                  Simgeyi gözlerinle takip et
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Başlat düğmesine bastığında seçilen simge her turda farklı
                  bir noktada görünecek. Seviye yükseldikçe daha geniş alan
                  kullanılacak.
                </p>

                <button
                  type="button"
                  onClick={startExercise}
                  className="mt-5 rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white transition hover:bg-red-600"
                >
                  Çalışmayı Başlat
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
