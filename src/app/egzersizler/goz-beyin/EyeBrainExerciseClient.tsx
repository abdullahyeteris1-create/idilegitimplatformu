"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { FullscreenExerciseIntro, FullscreenExerciseShell, FULLSCREEN_PRIMARY_BUTTON_CLASS, FULLSCREEN_SECONDARY_BUTTON_CLASS, FULLSCREEN_SELECT_CLASS, FULLSCREEN_TOUCH_STYLE } from "@/components/exercises/FullscreenExerciseShell";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { formatDuration, getEyeBrainSymbols, getSpeedOptions, shuffleSymbolPositions, type EyeBrainSymbol, type EyeBrainSymbolPlacement } from "@/lib/exercise-engine/eyeBrain";

type ExercisePhase = "intro" | "ready" | "running" | "paused" | "completed";
type SpeedMs = 1000 | 1250 | 1500 | 1750 | 2000 | 2250 | 2500;

const DEFAULT_SPEED: SpeedMs = 1500;
const DESKTOP_SYMBOL_COUNT = 12;
const MOBILE_SYMBOL_COUNT = 8;

const STAGE_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function shuffleSymbols(symbols: EyeBrainSymbol[]): EyeBrainSymbol[] {
  return [...symbols].sort(() => Math.random() - 0.5);
}

function createSessionSymbols(count: number): EyeBrainSymbol[] {
  const pool = shuffleSymbols(getEyeBrainSymbols());

  if (pool.length >= count) {
    return pool.slice(0, count);
  }

  const repeated: EyeBrainSymbol[] = [];

  while (repeated.length < count) {
    repeated.push(...pool);
  }

  return repeated.slice(0, count);
}

export function EyeBrainExerciseClient() {
  const router = useRouter();
  const elapsedTimerRef = useRef<number | null>(null);
  const symbolTimerRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);

  const [phase, setPhase] = useState<ExercisePhase>("intro");
  const [speedMs, setSpeedMs] = useState<SpeedMs>(DEFAULT_SPEED);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [symbolCount, setSymbolCount] = useState(DESKTOP_SYMBOL_COUNT);
  const [sessionSymbols, setSessionSymbols] = useState<EyeBrainSymbol[]>([]);
  const [placements, setPlacements] = useState<EyeBrainSymbolPlacement[]>([]);

  const speedOptions = useMemo(() => getSpeedOptions() as SpeedMs[], []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSymbolCount(window.innerWidth < 768 ? MOBILE_SYMBOL_COUNT : DESKTOP_SYMBOL_COUNT);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (elapsedTimerRef.current !== null) {
        window.clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || sessionSymbols.length === 0) {
      return;
    }

    symbolTimerRef.current = window.setInterval(() => {
      setPlacements(shuffleSymbolPositions(sessionSymbols));
    }, speedMs);

    return () => {
      if (symbolTimerRef.current !== null) {
        window.clearInterval(symbolTimerRef.current);
        symbolTimerRef.current = null;
      }
    };
  }, [phase, sessionSymbols, speedMs]);

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current !== null) {
        window.clearInterval(elapsedTimerRef.current);
      }

      if (symbolTimerRef.current !== null) {
        window.clearInterval(symbolTimerRef.current);
      }
    };
  }, []);

  function clearTimers(): void {
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    if (symbolTimerRef.current !== null) {
      window.clearInterval(symbolTimerRef.current);
      symbolTimerRef.current = null;
    }
  }

  function prepareReady(): void {
    clearTimers();
    hasSavedResultRef.current = false;
    setElapsedSeconds(0);
    setSessionSymbols([]);
    setPlacements([]);
    setPhase("ready");
  }

  function startExercise(): void {
    clearTimers();
    hasSavedResultRef.current = false;
    const nextSymbols = createSessionSymbols(symbolCount);

    setElapsedSeconds(0);
    setSessionSymbols(nextSymbols);
    setPlacements(shuffleSymbolPositions(nextSymbols));
    setPhase("running");
  }

  function pauseExercise(): void {
    setPhase("paused");
  }

  function resumeExercise(): void {
    setPhase("running");
  }

  function restartExercise(): void {
    clearTimers();
    hasSavedResultRef.current = false;
    setElapsedSeconds(0);
    setSessionSymbols([]);
    setPlacements([]);
    setPhase("ready");
  }

  function finishExercise(): void {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearTimers();
    setPhase("completed");

    const student = getCurrentStudent();
    const completedAt = new Date().toISOString();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "eye-brain",
      exerciseTitle: "Göz Beyin Çalışması",
      durationSeconds: elapsedSeconds,
      correctCount: 0,
      wrongCount: 0,
      score: elapsedSeconds,
      successRate: 100,
      details: {
        speedMs,
        elapsedSeconds,
        symbolCount,
        completedAt,
        scoreRule: "Sure odakli takip calismasi",
      },
    });

    router.push(`/sonuc?exerciseType=eye-brain&correct=0&wrong=0&successRate=100&score=${elapsedSeconds}`);
  }

  const headerStats = [
    { label: "Gecen Sure", value: formatDuration(elapsedSeconds) },
    { label: "Hiz", value: `${speedMs} ms` },
    { label: "Simge", value: String(symbolCount) },
  ];

  const footerControls =
    phase === "ready" ? (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 md:max-w-[240px]">
          Hiz
          <select value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)} className={FULLSCREEN_SELECT_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            {speedOptions.map((option) => (
              <option key={option} value={option}>
                {option} ms
              </option>
            ))}
          </select>
        </label>

          <button type="button" onClick={startExercise} className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
          Başlat
        </button>
      </div>
    ) : phase === "running" ? (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 md:max-w-[240px]">
          Hiz
          <select value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)} className={FULLSCREEN_SELECT_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            {speedOptions.map((option) => (
              <option key={option} value={option}>
                {option} ms
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
          <button type="button" onClick={pauseExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Duraklat
          </button>
          <button type="button" onClick={restartExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Yeniden Başlat
          </button>
          <button type="button" onClick={finishExercise} className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Bitir
          </button>
        </div>
      </div>
    ) : phase === "paused" ? (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 md:max-w-[240px]">
          Hiz
          <select value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)} className={FULLSCREEN_SELECT_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            {speedOptions.map((option) => (
              <option key={option} value={option}>
                {option} ms
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
          <button type="button" onClick={resumeExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Devam Et
          </button>
          <button type="button" onClick={restartExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Yeniden Başlat
          </button>
          <button type="button" onClick={finishExercise} className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Bitir
          </button>
        </div>
      </div>
    ) : null;

  if (phase === "intro") {
    return (
      <FullscreenExerciseIntro
        title="Göz Beyin Çalışması"
        description="Ekrandaki simgeleri gözlerinle takip et, dikkatini koru ve göz-beyin koordinasyonunu geliştir."
        buttonLabel="Eğitime Başla"
        onStart={prepareReady}
      />
    );
  }

  return (
    <FullscreenExerciseShell
      title="Göz Beyin Çalışması"
      subtitle="Simgeleri takip et, hız ayarını seç ve çalışmayı başlat."
      stats={headerStats}
      footer={footerControls}
      backgroundClassName="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#fff0b8_0%,#fff9ec_38%,#f8f0ea_100%)] text-slate-900"
      stageClassName="relative min-h-[430px] w-full overflow-hidden rounded-3xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,252,244,0.96)_100%)] px-3 py-4 shadow-[0_14px_42px_rgba(185,28,28,0.10)] md:min-h-[500px] md:px-5 md:py-5 lg:min-h-[540px]"
      mainClassName="flex flex-1 items-start justify-center px-3 py-4 md:px-5 md:py-5"
    >
      {phase === "ready" ? (
        <div className="flex min-h-[320px] w-full items-center justify-center md:min-h-[380px]">
          <div className="max-w-2xl rounded-[28px] border border-red-100 bg-white/95 px-4 py-6 text-center shadow-[0_18px_48px_rgba(185,28,28,0.08)] md:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">Hazır</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Ayarını seç, hazır olduğunda başlat.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Bu çalışmada doğru ya da yanlış yok. Simgeler belirlediğin hızda yer değiştirir, sen de bakış takibini sürdürürsün.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative h-[56vh] w-full overflow-hidden rounded-[24px] border border-red-100/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fffdf8_55%,#fff5ef_100%)] md:h-[60vh]">
          <div className="absolute inset-x-3 top-3 flex justify-center">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                phase === "paused" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {phase === "paused" ? "Duraklatıldı" : "Takip ediyor"}
            </span>
          </div>

          {placements.map((placement) => (
            <div
              key={placement.id}
              className="absolute select-none"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                transform: `translate(-50%, -50%) rotate(${placement.rotate}deg) scale(${placement.scale})`,
                transition: "left 300ms ease, top 300ms ease, transform 300ms ease",
                ...STAGE_STYLE,
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/80 bg-white/95 shadow-[0_10px_28px_rgba(185,28,28,0.12)] md:h-16 md:w-16">
                {placement.file ? (
                  <Image src={placement.file} alt={placement.label} width={48} height={48} className="h-9 w-9 object-contain md:h-10 md:w-10" />
                ) : (
                  <span className="text-2xl md:text-3xl">{placement.emoji}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FullscreenExerciseShell>
  );
}
