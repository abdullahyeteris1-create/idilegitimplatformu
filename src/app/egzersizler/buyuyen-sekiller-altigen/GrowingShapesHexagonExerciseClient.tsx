"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useAssignedDurationSeconds, useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { pickEducationProgramSettingOption } from "@/lib/education-programs/exerciseSettingsSchemas";
import { advanceGrowingShapesMotor, createGrowingShapesMotor, getGrowingShapesResponsiveMetrics, type GrowingShapesMotorState } from "@/lib/exercise-engine/growingShapes";
import { FULLSCREEN_PRIMARY_BUTTON_CLASS, FULLSCREEN_SECONDARY_BUTTON_CLASS } from "@/components/exercises/FullscreenExerciseShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";

type Phase = "setup" | "running" | "paused" | "result";
type SpeedMode = "fixed" | "variable";
type ClearMode = "without-clearing" | "with-clearing";
type DurationSeconds = 60 | 120 | 180 | 240 | 300;
type SaveStatus = "idle" | "saving" | "success" | "error";

const EXERCISE_TYPE = "growing-shapes-hexagon";
const DURATIONS: DurationSeconds[] = [60, 120, 180, 240, 300];
const SPEED_MODES: SpeedMode[] = ["fixed", "variable"];
const CLEAR_MODES: ClearMode[] = ["without-clearing", "with-clearing"];
const JUMP_DURATIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const JUMP_END_DURATIONS = [50, 100, 150, 200, 250, 300];
const SETTINGS_LABEL_CLASS = "mb-2 block min-w-0 whitespace-nowrap text-xs font-semibold leading-normal text-[var(--idil-text)]";
const SETTINGS_SELECT_CLASS = "h-11 w-full min-w-0 whitespace-nowrap rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-3 pr-10 text-sm leading-normal text-[var(--idil-text)] outline-none transition focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60";
const CONTROL_BUTTON_BASE_CLASS = "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-semibold leading-normal";

function setting<T extends number | string | boolean>(settings: Record<string, unknown> | undefined, key: string, fallback: T): T {
  const value = settings?.[key];
  if (typeof fallback === "boolean") {
    if (typeof value === "boolean") return value as T;
    if (value === "true" || value === "false") return (value === "true") as T;
    return fallback;
  }
  return value === undefined ? fallback : value as T;
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function drawHexagon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, stroke: string, lineWidth: number) {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function GrowingShapesHexagonExerciseClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps } = {}) {
  const { theme } = useIdilTheme();
  const assignmentTask = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const settings = educationProgramLaunch?.settings ?? assignmentTask?.settings;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("setup");
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const activeTimeRef = useRef(0);
  const motorRef = useRef<GrowingShapesMotorState | null>(null);
  const finishRef = useRef<(reason: "natural" | "manual") => Promise<void>>(async () => undefined);
  const savedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [durationSeconds, setDurationSeconds] = useState<DurationSeconds>(pickEducationProgramSettingOption(settings, "durationSeconds", DURATIONS, 60));
  const [speedMode, setSpeedMode] = useState<SpeedMode>(setting(settings, "speedMode", "fixed"));
  const [jumpDurationMs, setJumpDurationMs] = useState<number>(setting(settings, "jumpDurationMs", 500));
  const [jumpEndDurationMs, setJumpEndDurationMs] = useState<number>(setting(settings, "jumpEndDurationMs", 100));
  const [clearMode, setClearMode] = useState<ClearMode>(setting(settings, "clearMode", "without-clearing"));
  const [showMetronome, setShowMetronome] = useState<boolean>(setting(settings, "showMetronome", false));
  const [showFocusPoint, setShowFocusPoint] = useState<boolean>(setting(settings, "showFocusPoint", true));
  const [showCorners, setShowCorners] = useState<boolean>(setting(settings, "showCorners", false));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shapesDisplayed, setShapesDisplayed] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [averageJumpDurationMs, setAverageJumpDurationMs] = useState(jumpDurationMs);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const assignedDurationSeconds = useAssignedDurationSeconds(durationSeconds);
  const finalDurationSeconds = assignmentMode ? assignedDurationSeconds : educationProgramLaunch?.durationSeconds ?? durationSeconds;
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(educationProgramLaunch?.taskId, EXERCISE_TYPE);

  const closeAudio = useCallback(() => {
    const context = audioRef.current;
    audioRef.current = null;
    if (context) void context.close();
  }, []);

  const tick = useCallback(() => {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = audioRef.current ?? new AudioContextConstructor();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.04);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.04);
  }, []);

  const finish = useCallback(async (reason: "natural" | "manual") => {
    if (savedRef.current || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    const motor = motorRef.current;
    const completedSeconds = Math.min(finalDurationSeconds, Math.floor(activeTimeRef.current / 1000));
    const result: SecureExerciseResultInput = {
      exerciseType: EXERCISE_TYPE,
      exerciseTitle: "Büyüyen Şekiller",
      durationSeconds: completedSeconds,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      successRate: 0,
      details: { durationSeconds: completedSeconds, speedMode, jumpDurationMs, jumpEndDurationMs, clearMode, showMetronome, showFocusPoint, showCorners, shapesDisplayed: motor?.shapesDisplayed ?? 0, completedCycles: motor?.cycleIndex ?? 0, averageJumpDurationMs, reason },
    };
    try {
      await saveExerciseResultSecure(result);
      savedRef.current = true;
      setSaveStatus("success");
      await completeTaskAfterResultSave();
      phaseRef.current = "result";
      setPhase("result");
    } catch (error) {
      console.error("Growing Shapes result save failed", error);
      setSaveStatus("error");
      setSaveError("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
      saveInFlightRef.current = false;
    }
  }, [averageJumpDurationMs, clearMode, completeTaskAfterResultSave, finalDurationSeconds, jumpDurationMs, jumpEndDurationMs, showCorners, showFocusPoint, showMetronome, speedMode]);
  useEffect(() => { finishRef.current = finish; }, [finish]);

  const reset = useCallback(() => {
    phaseRef.current = "setup";
    startedAtRef.current = null;
    activeTimeRef.current = 0;
    motorRef.current = null;
    savedRef.current = false;
    saveInFlightRef.current = false;
    setElapsedSeconds(0);
    setShapesDisplayed(0);
    setCompletedCycles(0);
    setAverageJumpDurationMs(jumpDurationMs);
    setSaveStatus("idle");
    setSaveError("");
    closeAudio();
    setPhase("setup");
  }, [closeAudio, jumpDurationMs]);

  const start = useCallback(() => {
    if (phaseRef.current === "setup" || phaseRef.current === "result") {
      activeTimeRef.current = 0;
      motorRef.current = null;
      savedRef.current = false;
      saveInFlightRef.current = false;
      setElapsedSeconds(0);
      setShapesDisplayed(0);
      setCompletedCycles(0);
      setAverageJumpDurationMs(jumpDurationMs);
      setSaveStatus("idle");
      setSaveError("");
    }
    startedAtRef.current = performance.now();
    phaseRef.current = "running";
    setPhase("running");
  }, [jumpDurationMs]);

  const pause = useCallback(() => {
    if (startedAtRef.current !== null) {
      activeTimeRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    phaseRef.current = "paused";
    setPhase("paused");
  }, []);

  useEffect(() => {
    if (phase !== "running" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    };
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas.parentElement ?? canvas);
    window.addEventListener("resize", resize);
    const animate = (timestamp: number) => {
      if (phaseRef.current !== "running") return;
      const activeTimeMs = activeTimeRef.current + Math.max(0, timestamp - (startedAtRef.current ?? timestamp));
      const metrics = getGrowingShapesResponsiveMetrics(canvas.width, canvas.height);
      const options = { ...metrics, speedMode, jumpDurationMs, jumpEndDurationMs };
      const motor = motorRef.current ?? createGrowingShapesMotor(options);
      const advanced = advanceGrowingShapesMotor(motor, activeTimeMs, finalDurationSeconds * 1000, options);
      motorRef.current = advanced.state;
      if (advanced.stepsCreated > 0) {
        setShapesDisplayed(advanced.state.shapesDisplayed);
        setCompletedCycles(advanced.state.cycleIndex);
        setAverageJumpDurationMs(advanced.state.currentJumpDurationMs);
        if (showMetronome) for (let index = 0; index < advanced.stepsCreated; index += 1) tick();
      }
      const foreground = getComputedStyle(document.documentElement).getPropertyValue("--idil-text").trim() || (theme === "dark" ? "#dbeafe" : "#334155");
      const background = getComputedStyle(document.documentElement).getPropertyValue("--idil-bg").trim() || (theme === "dark" ? "#111827" : "#ffffff");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const layers = clearMode === "with-clearing" ? [advanced.state.currentRadius] : advanced.state.layers;
      const lineWidth = Math.max(1.25, Math.min(2, canvas.width / 700));
      for (const radius of layers) drawHexagon(ctx, centerX, centerY, radius, foreground, lineWidth);
      if (showCorners) {
        ctx.fillStyle = foreground;
        for (let index = 0; index < 6; index += 1) {
          const angle = (index * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(centerX + advanced.state.currentRadius * Math.cos(angle), centerY + advanced.state.currentRadius * Math.sin(angle), Math.max(2, canvas.width / 350), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (showFocusPoint) {
        ctx.fillStyle = foreground;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(3, canvas.width / 250), 0, Math.PI * 2);
        ctx.fill();
      }
      setElapsedSeconds(Math.min(finalDurationSeconds, Math.floor(activeTimeMs / 1000)));
      if (activeTimeMs >= finalDurationSeconds * 1000) {
        activeTimeRef.current = finalDurationSeconds * 1000;
        startedAtRef.current = null;
        phaseRef.current = "paused";
        setPhase("paused");
        void finishRef.current("natural");
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      closeAudio();
    };
  }, [clearMode, closeAudio, finalDurationSeconds, jumpDurationMs, jumpEndDurationMs, phase, showCorners, showFocusPoint, showMetronome, speedMode, theme, tick]);
  useEffect(() => () => closeAudio(), [closeAudio]);

  const settingsLocked = Boolean(educationProgramLaunch || assignmentTask || phase !== "setup");
  const settingControls = <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-4 py-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-[1.1fr_1fr_1fr_1.1fr_1fr_0.8fr_0.9fr_0.75fr] xl:items-end xl:gap-3 sm:px-5">
    <div className="min-w-0"><label htmlFor="growing-shapes-duration" className={SETTINGS_LABEL_CLASS}>Egzersiz Süresi</label><select id="growing-shapes-duration" className={SETTINGS_SELECT_CLASS} disabled={settingsLocked} value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as DurationSeconds)}>{DURATIONS.map((value) => <option key={value} value={value}>{formatTime(value)}</option>)}</select></div>
    <div className="min-w-0"><label htmlFor="growing-shapes-speed-mode" className={SETTINGS_LABEL_CLASS}>Hız Modu</label><select id="growing-shapes-speed-mode" className={SETTINGS_SELECT_CLASS} disabled={settingsLocked} value={speedMode} onChange={(event) => setSpeedMode(event.target.value as SpeedMode)}>{SPEED_MODES.map((value) => <option key={value} value={value}>{value === "fixed" ? "Sabit Hız" : "Değişken Hız"}</option>)}</select></div>
    <div className="min-w-0"><label htmlFor="growing-shapes-jump-duration" className={SETTINGS_LABEL_CLASS}>Sıçrama Süresi</label><select id="growing-shapes-jump-duration" className={SETTINGS_SELECT_CLASS} disabled={settingsLocked} value={jumpDurationMs} onChange={(event) => setJumpDurationMs(Number(event.target.value))}>{JUMP_DURATIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select></div>
    <div className="min-w-0"><label htmlFor="growing-shapes-jump-end" className={SETTINGS_LABEL_CLASS}>Sıçrama Bitişi</label><select id="growing-shapes-jump-end" title="Yalnız değişken hız modunda kullanılır." className={SETTINGS_SELECT_CLASS} disabled={settingsLocked || speedMode === "fixed"} value={jumpEndDurationMs} onChange={(event) => setJumpEndDurationMs(Number(event.target.value))}>{JUMP_END_DURATIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select></div>
    <div className="min-w-0"><label htmlFor="growing-shapes-clear-mode" className={SETTINGS_LABEL_CLASS}>Silme Modu</label><select id="growing-shapes-clear-mode" className={SETTINGS_SELECT_CLASS} disabled={settingsLocked} value={clearMode} onChange={(event) => setClearMode(event.target.value as ClearMode)}>{CLEAR_MODES.map((value) => <option key={value} value={value}>{value === "with-clearing" ? "Silerek" : "Silmeden"}</option>)}</select></div>
    <div className="min-w-0"><span className={SETTINGS_LABEL_CLASS}>Metronom</span><label htmlFor="growing-shapes-metronome" className="flex h-11 min-w-0 items-center"><input id="growing-shapes-metronome" type="checkbox" aria-label="Metronom seslerini aç" disabled={settingsLocked} checked={showMetronome} onChange={(event) => setShowMetronome(event.target.checked)} className="h-5 w-5" /></label></div>
    <div className="min-w-0"><span className={SETTINGS_LABEL_CLASS}>Odak Noktası</span><label htmlFor="growing-shapes-focus-point" className="flex h-11 min-w-0 items-center"><input id="growing-shapes-focus-point" type="checkbox" aria-label="Odak noktasını göster" disabled={settingsLocked} checked={showFocusPoint} onChange={(event) => setShowFocusPoint(event.target.checked)} className="h-5 w-5" /></label></div>
    <div className="min-w-0"><span className={SETTINGS_LABEL_CLASS}>Köşeler</span><label htmlFor="growing-shapes-corners" className="flex h-11 min-w-0 items-center"><input id="growing-shapes-corners" type="checkbox" aria-label="Köşeleri işaretle" disabled={settingsLocked} checked={showCorners} onChange={(event) => setShowCorners(event.target.checked)} className="h-5 w-5" /></label></div>
  </div>;

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10"><div className="mb-5"><h1 className="text-2xl font-bold text-[var(--idil-text)]">Büyüyen Şekiller</h1><p className="mt-1 text-sm text-[var(--idil-muted)]">Merkezden dışa doğru büyüyen altıgen katmanlarını gözlerinizle takip edin.</p></div><section className="overflow-hidden rounded-3xl border border-[var(--idil-border)] bg-[var(--idil-surface)] shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--idil-border)] p-4"><div><p className="text-sm font-semibold text-[var(--idil-text)]">Çalışma alanı</p><p className="text-xs text-[var(--idil-muted)]">Kalan süre: {formatTime(Math.max(0, finalDurationSeconds - elapsedSeconds))} · Katman: {shapesDisplayed}</p></div>{phase === "result" && <span className="text-sm font-semibold text-emerald-600">Tamamlandı</span>}</div><div className="mx-auto w-full max-w-[960px] p-3 sm:p-5"><div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-bg)] sm:aspect-video"><canvas ref={canvasRef} className="block h-full w-full" /></div><div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,220px)]">{phase === "setup" && <button onClick={start} className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full sm:w-auto`}>Başlat</button>}{phase === "running" && <><button onClick={pause} className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full sm:w-auto`}>Duraklat</button><button onClick={reset} className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full min-w-[150px]`}>Sıfırla</button></>}{phase === "paused" && <><button onClick={start} className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full sm:w-auto`}>Devam Et</button><button onClick={() => void finish("manual")} className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full min-w-[150px]`}>Bitir</button><button onClick={reset} className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full min-w-[150px]`}>Sıfırla</button></>}{phase === "result" && <button onClick={start} className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${CONTROL_BUTTON_BASE_CLASS} w-full sm:w-auto`}>Tekrar Başlat</button>}</div>{phase === "result" && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--idil-border)] p-4 text-center text-sm text-[var(--idil-text)]"><p>{formatTime(elapsedSeconds)}<br /><span className="text-xs text-[var(--idil-muted)]">tamamlanan süre</span></p><p>{shapesDisplayed}<br /><span className="text-xs text-[var(--idil-muted)]">gösterilen katman</span></p><p>{completedCycles}<br /><span className="text-xs text-[var(--idil-muted)]">tamamlanan döngü</span></p><p>{averageJumpDurationMs} ms<br /><span className="text-xs text-[var(--idil-muted)]">ortalama aralık</span></p>{saveStatus === "saving" && <p className="col-span-2">Kaydediliyor…</p>}{saveStatus === "success" && <p className="col-span-2 text-emerald-600">Başarıyla kaydedildi.</p>}{saveError && <p className="col-span-2 text-red-600">{saveError}</p>}</div>}</div>{settingControls}</section></main>;
}
