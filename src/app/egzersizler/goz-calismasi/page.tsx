"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";

type ExercisePhase = "idle" | "countdown" | "running" | "paused" | "finished";
type SymbolId = "target" | "star" | "heart" | "diamond" | "ring" | "eye";

type Point = {
  x: number;
  y: number;
};

type MovementPattern = {
  name: string;
  description: string;
  points: Point[];
};

type SymbolOption = {
  id: SymbolId;
  label: string;
  color: string;
  softColor: string;
};

const SYMBOLS: SymbolOption[] = [
  { id: "target", label: "Hedef", color: "#e11d48", softColor: "#fff1f2" },
  { id: "star", label: "Yıldız", color: "#f59e0b", softColor: "#fffbeb" },
  { id: "heart", label: "Kalp", color: "#ec4899", softColor: "#fdf2f8" },
  { id: "diamond", label: "Elmas", color: "#2563eb", softColor: "#eff6ff" },
  { id: "ring", label: "Halka", color: "#7c3aed", softColor: "#f5f3ff" },
  { id: "eye", label: "Göz", color: "#0f766e", softColor: "#f0fdfa" },
];

const BASE_PATTERNS: MovementPattern[] = [
  {
    name: "Merkez odağı",
    description: "Bakış alanının merkez çevresini çalıştırır.",
    points: [
      { x: 50, y: 50 },
      { x: 39, y: 39 },
      { x: 61, y: 39 },
      { x: 61, y: 61 },
      { x: 39, y: 61 },
      { x: 50, y: 50 },
    ],
  },
  {
    name: "Yatay tarama",
    description: "Sol ve sağ görüş alanlarını sırayla kapsar.",
    points: [
      { x: 12, y: 50 },
      { x: 31, y: 50 },
      { x: 50, y: 50 },
      { x: 69, y: 50 },
      { x: 88, y: 50 },
      { x: 69, y: 50 },
      { x: 50, y: 50 },
      { x: 31, y: 50 },
    ],
  },
  {
    name: "Dikey tarama",
    description: "Üst ve alt görüş alanları arasında ilerler.",
    points: [
      { x: 50, y: 12 },
      { x: 50, y: 31 },
      { x: 50, y: 50 },
      { x: 50, y: 69 },
      { x: 50, y: 88 },
      { x: 50, y: 69 },
      { x: 50, y: 50 },
      { x: 50, y: 31 },
    ],
  },
  {
    name: "Dört köşe",
    description: "Görüş alanının dört dış köşesini çalıştırır.",
    points: [
      { x: 13, y: 15 },
      { x: 87, y: 15 },
      { x: 87, y: 85 },
      { x: 13, y: 85 },
      { x: 50, y: 50 },
    ],
  },
  {
    name: "Çapraz geçiş",
    description: "İki çapraz eksen ve merkezi birlikte kullanır.",
    points: [
      { x: 14, y: 16 },
      { x: 50, y: 50 },
      { x: 86, y: 84 },
      { x: 50, y: 50 },
      { x: 86, y: 16 },
      { x: 50, y: 50 },
      { x: 14, y: 84 },
      { x: 50, y: 50 },
    ],
  },
  {
    name: "Tam alan",
    description: "Kenarları, köşeleri ve merkezi karışık sırayla kapsar.",
    points: [
      { x: 12, y: 14 },
      { x: 50, y: 12 },
      { x: 88, y: 14 },
      { x: 88, y: 50 },
      { x: 86, y: 86 },
      { x: 50, y: 88 },
      { x: 14, y: 86 },
      { x: 12, y: 50 },
      { x: 50, y: 50 },
    ],
  },
];

const STATUS_LABELS: Record<ExercisePhase, string> = {
  idle: "Hazır",
  countdown: "Hazırlan",
  running: "Çalışıyor",
  paused: "Duraklatıldı",
  finished: "Tamamlandı",
};

function getPatternForLevel(level: number): MovementPattern {
  const baseIndex = (level - 1) % BASE_PATTERNS.length;
  const cycle = Math.floor((level - 1) / BASE_PATTERNS.length);
  const base = BASE_PATTERNS[baseIndex];

  if (cycle === 0) {
    return base;
  }

  const transformed = base.points.map((point, index) => {
    const mirroredX = cycle % 2 === 1 ? 100 - point.x : point.x;
    const mirroredY = cycle % 3 === 2 ? 100 - point.y : point.y;
    const horizontalVariation = ((level * 17 + index * 11) % 13) - 6;
    const verticalVariation = ((level * 23 + index * 7) % 13) - 6;

    return {
      x: Math.max(10, Math.min(90, mirroredX + horizontalVariation)),
      y: Math.max(10, Math.min(90, mirroredY + verticalVariation)),
    };
  });
  const offset = (level * 3) % transformed.length;

  return {
    ...base,
    name: `${base.name} · Gelişmiş`,
    points: [...transformed.slice(offset), ...transformed.slice(0, offset)],
  };
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function SymbolGlyph({ id, className = "h-full w-full" }: { id: SymbolId; className?: string }) {
  if (id === "target") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="currentColor" opacity="0.18" />
        <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="6" />
        <circle cx="32" cy="32" r="7" fill="currentColor" />
      </svg>
    );
  }

  if (id === "star") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path
          d="m32 5.5 7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.3l-15.2 8 2.9-16.9-12.3-12 17-2.5L32 5.5Z"
          fill="currentColor"
          stroke="rgba(120,53,15,.22)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "heart") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path
          d="M32 54S8 40.1 8 22.6C8 13.3 19.2 8.2 26.4 15L32 20.3l5.6-5.3C44.8 8.2 56 13.3 56 22.6 56 40.1 32 54 32 54Z"
          fill="currentColor"
          stroke="rgba(131,24,67,.2)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "diamond") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M32 5 58 32 32 59 6 32 32 5Z" fill="currentColor" />
        <path d="m32 12 17 20-17 20-17-20 17-20Z" fill="white" opacity="0.24" />
      </svg>
    );
  }

  if (id === "ring") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="23" fill="none" stroke="currentColor" strokeWidth="10" />
        <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.24" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M5 32s10.3-17 27-17 27 17 27 17-10.3 17-27 17S5 32 5 32Z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="32" cy="32" r="11" fill="currentColor" />
      <circle cx="35" cy="28" r="3.5" fill="white" opacity="0.9" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M7.5 5.8a1.5 1.5 0 0 1 2.3-1.26l10 6.2a1.5 1.5 0 0 1 0 2.52l-10 6.2a1.5 1.5 0 0 1-2.3-1.26V5.8Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      {active ? (
        <path d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4H4v4m12-4h4v4M8 20H4v-4m12 4h4v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function EyeMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
      <path d="M4.5 24S12 12.5 24 12.5 43.5 24 43.5 24 36 35.5 24 35.5 4.5 24 4.5 24Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="6.5" fill="currentColor" />
      <circle cx="26" cy="21.5" r="2" fill="white" />
    </svg>
  );
}

export default function EyeTrackingExercisePage() {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const accumulatedMsRef = useRef(0);
  const activeStartedAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("idle");
  const [speedMs, setSpeedMs] = useState(300);
  const [selectedSymbolId, setSelectedSymbolId] = useState<SymbolId>("target");
  const [isSymbolPickerOpen, setIsSymbolPickerOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [movementStep, setMovementStep] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [wasAutoPaused, setWasAutoPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const level = Math.floor(elapsedMs / 60_000) + 1;
  const pattern = getPatternForLevel(level);
  const nextPattern = getPatternForLevel(level + 1);
  const currentPoint = pattern.points[movementStep % pattern.points.length];
  const selectedSymbol = SYMBOLS.find((symbol) => symbol.id === selectedSymbolId) ?? SYMBOLS[0];
  const levelProgress = (elapsedMs % 60_000) / 600;
  const secondsToNextLevel = 60 - Math.floor((elapsedMs % 60_000) / 1000);
  const transitionDuration = Math.max(70, Math.min(220, Math.round(speedMs * 0.65)));

  const freezeClock = useCallback(() => {
    const startedAt = activeStartedAtRef.current;
    const frozenElapsed =
      startedAt === null
        ? accumulatedMsRef.current
        : accumulatedMsRef.current + (performance.now() - startedAt);

    accumulatedMsRef.current = frozenElapsed;
    activeStartedAtRef.current = null;
    setElapsedMs(frozenElapsed);

    return frozenElapsed;
  }, []);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (countdown <= 1) {
        if (document.hidden) {
          setWasAutoPaused(true);
          setPhase("paused");
          return;
        }

        activeStartedAtRef.current = performance.now();
        setPhase("running");
        return;
      }

      setCountdown((value) => value - 1);
    }, 850);

    return () => window.clearTimeout(timeoutId);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const clockId = window.setInterval(() => {
      const startedAt = activeStartedAtRef.current;

      if (startedAt !== null) {
        setElapsedMs(accumulatedMsRef.current + (performance.now() - startedAt));
      }
    }, 100);

    return () => window.clearInterval(clockId);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const movementId = window.setInterval(() => {
      setMovementStep((step) => step + 1);
    }, speedMs);

    return () => window.clearInterval(movementId);
  }, [level, phase, speedMs]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (phase === "running" || phase === "countdown")) {
        if (phase === "running") {
          freezeClock();
        }

        setWasAutoPaused(true);
        setPhase("paused");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [freezeClock, phase]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const startExercise = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    accumulatedMsRef.current = 0;
    activeStartedAtRef.current = null;
    setElapsedMs(0);
    setMovementStep(0);
    setWasAutoPaused(false);
    setIsSymbolPickerOpen(false);
    setCountdown(3);
    setPhase("countdown");
  };

  const pauseExercise = () => {
    if (phase !== "running") {
      return;
    }

    freezeClock();
    setWasAutoPaused(false);
    setPhase("paused");
  };

  const resumeExercise = () => {
    if (phase !== "paused") {
      return;
    }

    activeStartedAtRef.current = performance.now();
    setWasAutoPaused(false);
    setPhase("running");
  };

  const finishExercise = () => {
    if (phase === "running") {
      freezeClock();
    }

    setWasAutoPaused(false);
    setIsSymbolPickerOpen(false);
    setPhase("finished");
  };

  const resetExercise = () => {
    accumulatedMsRef.current = 0;
    activeStartedAtRef.current = null;
    setElapsedMs(0);
    setMovementStep(0);
    setWasAutoPaused(false);
    setIsSymbolPickerOpen(false);
    setCountdown(3);
    setPhase("idle");
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await workspaceRef.current?.requestFullscreen();
      }
    } catch {
      // Bazı gömülü tarayıcılar tam ekran isteğini desteklemeyebilir.
    }
  };

  const targetStyle: CSSProperties = {
    left: `${currentPoint.x}%`,
    top: `${currentPoint.y}%`,
    color: selectedSymbol.color,
    transitionDuration: `${transitionDuration}ms`,
    animationDuration: `${Math.max(700, speedMs * 2)}ms`,
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8f7] text-slate-900">
      <style>{`
        @keyframes eye-tracking-pulse {
          0%, 100% { opacity: .58; transform: translate(-50%, -50%) scale(.9); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes eye-countdown-pop {
          0% { opacity: 0; transform: scale(.72); }
          35% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .eye-target-pulse {
          animation-name: eye-tracking-pulse;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          will-change: left, top, opacity, transform;
        }
        .eye-countdown-pop { animation: eye-countdown-pop 420ms ease-out both; }
        input.eye-speed-range[type="range"] {
          appearance: none;
          -webkit-appearance: none;
          min-height: 6px;
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #0f766e, #5eead4);
          box-shadow: none;
        }
        input.eye-speed-range[type="range"]:focus {
          border: 0;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, .14);
          outline: none;
        }
        input.eye-speed-range[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0f766e, #5eead4);
        }
        input.eye-speed-range[type="range"]::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          margin-top: -7px;
          border: 3px solid white;
          border-radius: 999px;
          background: #0f766e;
          box-shadow: 0 2px 7px rgba(15, 23, 42, .24);
        }
        input.eye-speed-range[type="range"]::-moz-range-track {
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #0f766e, #5eead4);
        }
        input.eye-speed-range[type="range"]::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border: 3px solid white;
          border-radius: 999px;
          background: #0f766e;
          box-shadow: 0 2px 7px rgba(15, 23, 42, .24);
        }
        .eye-workspace:fullscreen {
          width: 100vw;
          height: 100vh;
          padding: 16px;
          background: #f6f8f7;
          display: flex;
          flex-direction: column;
        }
        .eye-workspace:fullscreen .eye-stage { flex: 1; min-height: 0; }
        @media (max-height: 500px) {
          .eye-workspace:fullscreen .eye-target-pulse { width: 42px; height: 42px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eye-target-pulse { animation: none; opacity: 1; transition-duration: 0ms !important; }
          .eye-countdown-pop { animation: none; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 -top-32 h-96 w-96 rounded-full bg-emerald-100/55 blur-3xl" />
        <div className="absolute -right-36 top-24 h-[30rem] w-[30rem] rounded-full bg-sky-100/55 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-amber-50 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1540px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
              <EyeMark />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Görsel takip</p>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <p className="text-[11px] font-semibold text-slate-400">Odak egzersizi</p>
              </div>
              <h1 className="truncate text-xl font-extrabold tracking-[-0.025em] text-slate-950 sm:text-2xl">
                Göz Takip Çalışması
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isFullscreen ? <ExerciseNavigationControls compact /> : null}
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold shadow-sm ${
                phase === "running"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : phase === "paused"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  phase === "running" ? "animate-pulse bg-emerald-500" : phase === "paused" ? "bg-amber-500" : "bg-slate-400"
                }`}
              />
              {STATUS_LABELS[phase]}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
              Seviye {level}
            </span>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-5 lg:sticky lg:top-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-teal-700">Kontrol paneli</p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">Çalışma ayarları</h2>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h2m4 0h10M9 4v6m0 4v6m6-9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="space-y-3.5">
              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label htmlFor="speed" className="text-sm font-bold text-slate-800">
                    Geçiş hızı
                  </label>
                  <output htmlFor="speed" className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold tabular-nums text-white">
                    {speedMs} ms
                  </output>
                </div>
                <input
                  id="speed"
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={speedMs}
                  onChange={(event) => setSpeedMs(Number(event.target.value))}
                  disabled={phase === "countdown"}
                  aria-describedby="speed-help"
                  className="eye-speed-range w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span>100 ms · Hızlı</span>
                  <span>500 ms · Yavaş</span>
                </div>
                <p id="speed-help" className="mt-3 text-xs leading-5 text-slate-500">
                  Simgenin yeni konuma geçme aralığını belirler. Çalışırken de değiştirebilirsin.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Takip simgesi</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1 seçili</span>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl p-2"
                    style={{ color: selectedSymbol.color, backgroundColor: selectedSymbol.softColor }}
                  >
                    <SymbolGlyph id={selectedSymbol.id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">{selectedSymbol.label}</p>
                    <p className="text-xs text-slate-500">Ekranda bunu takip et</p>
                  </div>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600" aria-label="Seçili">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSymbolPickerOpen((open) => !open)}
                  disabled={phase === "running" || phase === "countdown"}
                  aria-expanded={isSymbolPickerOpen}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
                    <path d="M4 20h4l11-11a2.83 2.83 0 0 0-4-4L4 16v4Zm9-13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Simgeyi değiştir
                </button>

                {isSymbolPickerOpen && (
                  <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Simge seçenekleri">
                    {SYMBOLS.map((symbol) => {
                      const isSelected = symbol.id === selectedSymbolId;

                      return (
                        <button
                          key={symbol.id}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${symbol.label} simgesini seç`}
                          onClick={() => {
                            setSelectedSymbolId(symbol.id);
                            setIsSymbolPickerOpen(false);
                          }}
                          className={`relative flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-[11px] font-bold transition hover:-translate-y-0.5 ${
                            isSelected
                              ? "border-teal-500 bg-teal-50 text-teal-800 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                          }`}
                        >
                          <span className="h-8 w-8" style={{ color: symbol.color }}>
                            <SymbolGlyph id={symbol.id} />
                          </span>
                          {symbol.label}
                          {isSelected && (
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-500" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-teal-950">Otomatik seviye sistemi</p>
                    <p className="mt-1 text-xs leading-5 text-teal-800/75">
                      Her 1 dakikada seviye artar ve simge yeni bir ekran rotasına geçer.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                  {BASE_PATTERNS.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${index < Math.min(level, BASE_PATTERNS.length) ? "bg-teal-600" : "bg-teal-200"}`}
                    />
                  ))}
                </div>
              </section>
            </div>

            {phase === "idle" || phase === "finished" ? (
              <button
                type="button"
                onClick={startExercise}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-5 text-base font-extrabold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-teal-900/20 active:translate-y-0"
              >
                <PlayIcon />
                {phase === "finished" ? "Yeniden başlat" : "Çalışmayı başlat"}
              </button>
            ) : phase === "paused" ? (
              <button
                type="button"
                onClick={resumeExercise}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-700 px-5 text-base font-extrabold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800 active:translate-y-0"
              >
                <PlayIcon />
                Devam et
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseExercise}
                disabled={phase === "countdown"}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-amber-500 px-5 text-base font-extrabold text-white shadow-lg shadow-amber-700/15 transition hover:-translate-y-0.5 hover:bg-amber-600 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
              >
                <PauseIcon />
                Duraklat
              </button>
            )}

            <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
              Başını sabit tut, yalnızca gözlerinle simgeyi takip et.
            </p>
          </aside>

          <section
            ref={workspaceRef}
            className="eye-workspace min-w-0 rounded-[30px] border border-white/80 bg-white/92 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 sm:mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Süre</p>
                  <p className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-slate-900">{formatTime(elapsedMs)}</p>
                </div>
                <div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-teal-600">Aktif seviye</p>
                  <p className="mt-0.5 text-base font-extrabold text-teal-950">{level}</p>
                </div>
                <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:block">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Desen</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-800">{pattern.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isFullscreen ? <ExerciseNavigationControls compact /> : null}
                {(phase === "running" || phase === "paused") && (
                  <>
                    <button
                      type="button"
                      onClick={phase === "running" ? pauseExercise : resumeExercise}
                      aria-label={phase === "running" ? "Çalışmayı duraklat" : "Çalışmaya devam et"}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50"
                    >
                      {phase === "running" ? <PauseIcon /> : <PlayIcon />}
                      <span className="hidden sm:inline">{phase === "running" ? "Duraklat" : "Devam"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={finishExercise}
                      aria-label="Çalışmayı bitir"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      <StopIcon />
                      <span className="hidden sm:inline">Bitir</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Tam ekrandan çık" : "Tam ekran aç"}
                  title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                >
                  <FullscreenIcon active={isFullscreen} />
                </button>
              </div>
            </div>

            <div
              className="eye-stage relative min-h-[500px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-[#fbfdfc] lg:min-h-[clamp(560px,70vh,760px)]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(13,148,136,.055), transparent 34%), linear-gradient(rgba(15,118,110,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,.045) 1px, transparent 1px)",
                backgroundSize: "auto, 54px 54px, 54px 54px",
              }}
            >
              <div className="pointer-events-none absolute inset-5 rounded-[18px] border border-dashed border-teal-200/55" aria-hidden="true" />
              <div className="pointer-events-none absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-teal-400/55" aria-hidden="true" />
              <div className="pointer-events-none absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-teal-400/55" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-teal-400/55" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-teal-400/55" aria-hidden="true" />

              <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 sm:top-5" aria-live="polite">
                <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/90 px-3.5 py-2 text-[11px] font-bold text-slate-600 shadow-md shadow-slate-900/5 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Seviye {level} · {pattern.name}
                </div>
              </div>

              {phase === "running" && (
                <div
                  className="eye-target-pulse pointer-events-none absolute z-20 h-[clamp(58px,7vw,88px)] w-[clamp(58px,7vw,88px)] -translate-x-1/2 -translate-y-1/2 transition-[left,top] ease-out"
                  style={targetStyle}
                  aria-hidden="true"
                >
                  <div
                    className="grid h-full w-full place-items-center rounded-[28%] border-4 border-white bg-white/92 p-[14%] shadow-[0_14px_36px_rgba(15,23,42,0.18)]"
                    style={{ boxShadow: `0 14px 38px ${selectedSymbol.color}32` }}
                  >
                    <SymbolGlyph id={selectedSymbol.id} />
                  </div>
                </div>
              )}

              {phase === "idle" && (
                <div className="absolute inset-0 z-20 grid place-items-center px-6 py-16">
                  <div className="max-w-md text-center">
                    <div
                      className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] border-4 border-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
                      style={{ color: selectedSymbol.color, backgroundColor: selectedSymbol.softColor }}
                    >
                      <SymbolGlyph id={selectedSymbol.id} />
                    </div>
                    <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Takibe hazır</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">Gözlerin simgede olsun</h2>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                      Çalışma başladığında simge ekranın farklı bölgelerine geçecek. Başını oynatmadan yalnızca gözlerinle takip et.
                    </p>
                    <button
                      type="button"
                      onClick={startExercise}
                      className="mx-auto mt-6 flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-7 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-teal-800 active:translate-y-0"
                    >
                      <PlayIcon />
                      Başlat
                    </button>
                  </div>
                </div>
              )}

              {phase === "countdown" && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-white/72 px-6 backdrop-blur-[3px]">
                  <div className="text-center">
                    <div
                      key={countdown}
                      role="status"
                      aria-live="assertive"
                      aria-atomic="true"
                      className="eye-countdown-pop text-8xl font-black tabular-nums tracking-[-0.06em] text-slate-950 sm:text-9xl"
                    >
                      {countdown}
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-500">Bakışını simgeye hazırla</p>
                  </div>
                </div>
              )}

              {phase === "paused" && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/28 px-5 py-16 backdrop-blur-[4px]">
                  <div className="w-full max-w-sm rounded-[26px] border border-white/80 bg-white/95 p-6 text-center shadow-2xl shadow-slate-900/20">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                      <PauseIcon />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">Çalışma duraklatıldı</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {wasAutoPaused
                        ? "Sekmeden ayrıldığın için süre otomatik olarak durduruldu."
                        : "Hazır olduğunda aynı seviyeden devam edebilirsin."}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={finishExercise}
                        className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Çalışmayı bitir
                      </button>
                      <button
                        type="button"
                        onClick={resumeExercise}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white transition hover:bg-teal-800"
                      >
                        <PlayIcon /> Devam et
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {phase === "finished" && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-white/78 px-5 py-16 backdrop-blur-[4px]">
                  <div className="w-full max-w-lg rounded-[28px] border border-white bg-white/95 p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:p-8">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
                        <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Çalışma tamamlandı</p>
                    <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">Harika takip!</h2>

                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-2 py-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Süre</p>
                        <p className="mt-1 font-mono text-lg font-black tabular-nums text-slate-900">{formatTime(elapsedMs)}</p>
                      </div>
                      <div className="rounded-2xl bg-teal-50 px-2 py-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600">Ulaşılan</p>
                        <p className="mt-1 text-lg font-black text-teal-950">Seviye {level}</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-2 py-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Hız</p>
                        <p className="mt-1 text-lg font-black text-amber-950">{speedMs} ms</p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={resetExercise}
                        className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Ayarlara dön
                      </button>
                      <button
                        type="button"
                        onClick={startExercise}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-teal-800"
                      >
                        <PlayIcon /> Tekrar başlat
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/85 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span>Sonraki: {nextPattern.name.replace(" · Gelişmiş", "")}</span>
                    <span className="text-slate-300">•</span>
                    <span className="tabular-nums text-teal-700">{secondsToNextLevel} sn</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-400">{pattern.description}</p>
                </div>
                <div className="w-full sm:w-52">
                  <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>Seviye {level}</span>
                    <span>{Math.floor(levelProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 transition-[width] duration-300"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
