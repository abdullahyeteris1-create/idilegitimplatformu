"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/eye-muscle-theme.module.css";

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
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? "" : styles.darkTheme].join(" ");
  const flashTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const positionRef = useRef<Position>({ x: 50, y: 50 });

    const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [selectedEmoji, setSelectedEmoji] = useState("⭐");
  const [baseLevel, setBaseLevel] = useState(1);
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
    const startLevel = baseLevel;
    setLevel(startLevel);
    setElapsedSeconds(0);
    setRound(0);

    const startPosition = createRandomPosition(startLevel, {
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
    setLevel(baseLevel);
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
      setElapsedSeconds((previousSeconds) => {
        const newSeconds = previousSeconds + 1;
        const newAutoLevel = Math.min(baseLevel + Math.floor(newSeconds / 60), 6);
        setLevel((currentLevel) => {
          if (newAutoLevel !== currentLevel) {
            return newAutoLevel;
          }
          return currentLevel;
        });
        return newSeconds;
      });
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
    <div className={themeRootClassName}>
      <ExerciseStage
        title="Göz Kasları"
        subtitle={isRunning ? "Çalışma sürüyor" : "Hazırlık"}
        status={<><span className={`compact-stat-chip ${styles.statChipOverride}`}>Seviye: {level}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Tur: {round}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Süre: {formatTime(elapsedSeconds)}</span></>}
        onExit={() => router.push("/egzersizler")}
        settings={(
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold"><span>Hız</span><select value={speed} disabled={isRunning} onChange={(event) => setSpeed(Number(event.target.value))} className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}>{SPEED_OPTIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold"><span>Seviye</span><select value={baseLevel} disabled={isRunning} onChange={(event) => { const value = Number(event.target.value); setBaseLevel(value); setLevel(value); }} className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}>{LEVEL_OPTIONS.map((value) => <option key={value} value={value}>{value}. seviye</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold"><span>Simge</span><select value={selectedEmoji} disabled={isRunning} onChange={(event) => setSelectedEmoji(event.target.value)} className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}>{EMOJI_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}</select></label>
          </div>
        )}
        footer={<div className="flex flex-wrap justify-center gap-2">{!isRunning ? <button type="button" onClick={startExercise} className={`min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white ${styles.startButton}`}>Başlat</button> : <button type="button" onClick={stopExercise} className={`min-h-11 rounded-xl bg-red-600 px-5 font-bold text-white ${styles.stopButton}`}>Durdur</button>}<button type="button" onClick={resetExercise} className={`min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold ${styles.secondaryButton}`}>Sıfırla</button></div>}
      >
      <main className="h-full min-h-0 min-w-0 w-full max-w-full overflow-hidden bg-white text-slate-900">
        <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
          <section className={`relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.05),_rgba(255,255,255,1)_55%,_rgba(248,250,252,1))] shadow-sm ${styles.stageBackground}`}>
            <div className={`absolute left-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur ${styles.infoPanel}`}>
              Seçilen simge:{" "}
              <span className="ml-1 text-xl">{selectedEmoji}</span>
              <span className={`ml-2 font-black text-slate-900 ${styles.infoPanelValue}`}>
                {selectedEmojiLabel}
              </span>
            </div>

            <div className={`absolute right-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur ${styles.infoPanel}`}>
              Aktif seviye:{" "}
              <span className={`font-black text-red-600 ${styles.infoPanelAccent}`}>{level}</span>
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className={`absolute left-1/3 top-0 h-full w-px bg-slate-300 ${styles.gridLine}`} />
              <div className={`absolute left-2/3 top-0 h-full w-px bg-slate-300 ${styles.gridLine}`} />
              <div className={`absolute left-0 top-1/3 h-px w-full bg-slate-300 ${styles.gridLine}`} />
              <div className={`absolute left-0 top-2/3 h-px w-full bg-slate-300 ${styles.gridLine}`} />
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
              <div className={`absolute inset-0 z-30 flex items-center justify-center bg-white/55 p-6 text-center backdrop-blur-sm ${styles.introOverlay}`}>
                <div className={`max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ${styles.introCard}`}>
                  <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-5xl shadow-sm ${styles.introBadge}`}>
                    {selectedEmoji}
                  </div>

                  <h2 className={`text-xl font-black text-slate-950 ${styles.introTitle}`}>
                    Simgeyi gözlerinle takip et
                  </h2>

                  <p className={`mt-2 text-sm leading-6 text-slate-600 ${styles.introBody}`}>
                    Başlat düğmesine bastığında seçilen simge her turda farklı
                    bir noktada görünecek. Seviye yükseldikçe daha geniş alan
                    kullanılacak.
                  </p>

                </div>
              </div>
            )}
          </section>
        </section>
      </main>
      </ExerciseStage>
    </div>
  );
}
