"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useAssignedDurationSeconds, useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { pickEducationProgramSettingOption } from "@/lib/education-programs/exerciseSettingsSchemas";
import { getGrowingShapesCount, getGrowingShapesProgress } from "@/lib/exercise-engine/growingShapes";
import { FullscreenExerciseShell, FULLSCREEN_PRIMARY_BUTTON_CLASS, FULLSCREEN_SECONDARY_BUTTON_CLASS, FULLSCREEN_SELECT_CLASS } from "@/components/exercises/FullscreenExerciseShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";

type Phase = "setup" | "running" | "paused" | "result";
type SpeedMode = "fixed" | "variable";
type ClearMode = "without-clearing" | "with-clearing";
type SaveStatus = "idle" | "saving" | "success" | "error";
type DurationSeconds = 60 | 120 | 180 | 240 | 300;

const DURATION_OPTIONS: DurationSeconds[] = [60, 120, 180, 240, 300];
const SPEED_MODE_OPTIONS: SpeedMode[] = ["fixed", "variable"];
const CLEAR_MODE_OPTIONS: ClearMode[] = ["without-clearing", "with-clearing"];
const JUMP_DURATION_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const JUMP_END_DURATION_OPTIONS = [50, 100, 150, 200, 250, 300];
const EXERCISE_TYPE = "growing-shapes-hexagon";

function setting<T extends number | string | boolean>(settings: Record<string, unknown> | undefined, key: string, fallback: T): T {
  const value = settings?.[key];
  if (typeof fallback === "boolean") {
    if (typeof value === "boolean") return value as T;
    if (value === "true" || value === "false") return (value === "true") as T;
    return fallback;
  }
  return value === undefined ? fallback : (value as T);
}

function formatTime(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke: string) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i * Math.PI) / 3;
    const pointX = x + radius * Math.cos(angle);
    const pointY = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(pointX, pointY); else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function GrowingShapesHexagonExerciseClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps } = {}) {
  const { theme } = useIdilTheme();
  const assignmentTask = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("setup");
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const metronomeRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const effectiveSettings = educationProgramLaunch?.settings ?? assignmentTask?.settings;
  const [durationSeconds, setDurationSeconds] = useState<DurationSeconds>(pickEducationProgramSettingOption(effectiveSettings, "durationSeconds", DURATION_OPTIONS, 60));
  const launchSettings = effectiveSettings;
  const [speedMode, setSpeedMode] = useState<SpeedMode>(setting(launchSettings, "speedMode", "fixed"));
  const [jumpDurationMs, setJumpDurationMs] = useState<number>(setting(launchSettings, "jumpDurationMs", 500));
  const [jumpEndDurationMs, setJumpEndDurationMs] = useState<number>(setting(launchSettings, "jumpEndDurationMs", 100));
  const [clearMode, setClearMode] = useState<ClearMode>(setting(launchSettings, "clearMode", "without-clearing"));
  const [showMetronome, setShowMetronome] = useState(setting(launchSettings, "showMetronome", false));
  const [showFocusPoint, setShowFocusPoint] = useState(setting(launchSettings, "showFocusPoint", true));
  const [showCorners, setShowCorners] = useState(setting(launchSettings, "showCorners", false));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shapesDisplayed, setShapesDisplayed] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const assignedDurationSeconds = useAssignedDurationSeconds(durationSeconds);
  const finalDurationSeconds = assignmentMode ? assignedDurationSeconds : educationProgramLaunch?.durationSeconds ?? durationSeconds;
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(educationProgramLaunch?.taskId, EXERCISE_TYPE);

  const stopAudio = useCallback(() => {
    const context = metronomeRef.current;
    metronomeRef.current = null;
    if (context) void context.close();
  }, []);

  const finish = useCallback(async (reason: "natural" | "manual") => {
    if (savedRef.current || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    const seconds = Math.min(finalDurationSeconds, elapsedRef.current);
    const count = getGrowingShapesCount(seconds * 1000, jumpDurationMs, jumpEndDurationMs);
    const result: SecureExerciseResultInput = {
      exerciseType: EXERCISE_TYPE,
      exerciseTitle: "Büyüyen Şekiller",
      durationSeconds: seconds,
      score: Math.min(100, Math.round((seconds / Math.max(1, finalDurationSeconds)) * 100)),
      correctCount: count,
      wrongCount: 0,
      successRate: 100,
      details: { durationSeconds: seconds, speedMode, jumpDurationMs, jumpEndDurationMs, clearMode, showMetronome, showFocusPoint, showCorners, shapesDisplayed: count, reason },
    };
    try {
      await saveExerciseResultSecure(result);
      savedRef.current = true;
      setShapesDisplayed(count);
      setElapsedSeconds(seconds);
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
  }, [clearMode, completeTaskAfterResultSave, finalDurationSeconds, jumpDurationMs, jumpEndDurationMs, showCorners, showFocusPoint, showMetronome, speedMode]);

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; }, [finish]);

  const pause = useCallback(() => { phaseRef.current = "paused"; setPhase("paused"); }, []);
  const start = useCallback(() => {
    if (phaseRef.current === "result" || phaseRef.current === "setup") { elapsedRef.current = 0; setElapsedSeconds(0); setShapesDisplayed(0); savedRef.current = false; saveInFlightRef.current = false; setSaveStatus("idle"); }
    phaseRef.current = "running";
    startedAtRef.current = performance.now() - elapsedRef.current * 1000;
    setPhase("running");
  }, []);
  const reset = useCallback(() => { phaseRef.current = "setup"; elapsedRef.current = 0; startedAtRef.current = null; setElapsedSeconds(0); setShapesDisplayed(0); setSaveStatus("idle"); setSaveError(""); stopAudio(); setPhase("setup"); }, [stopAudio]);

  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const next = Math.min(finalDurationSeconds, Math.floor((performance.now() - (startedAtRef.current ?? performance.now())) / 1000));
      elapsedRef.current = next;
      setElapsedSeconds(next);
      if (next >= finalDurationSeconds) { phaseRef.current = "paused"; setPhase("paused"); void finishRef.current("natural"); }
    };
    timerRef.current = setInterval(tick, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [finalDurationSeconds, phase]);

  useEffect(() => {
    if (phase !== "running" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { const ratio = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio)); canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio)); };
    resize();
    window.addEventListener("resize", resize);
    const animate = (timestamp: number) => {
      const elapsedMs = elapsedRef.current * 1000 + (timestamp % 1000) / 1000;
      const progress = getGrowingShapesProgress(elapsedMs, finalDurationSeconds * 1000, speedMode, jumpDurationMs, jumpEndDurationMs);
      const background = getComputedStyle(document.documentElement).getPropertyValue("--idil-bg").trim() || (theme === "dark" ? "#111827" : "#ffffff");
      const foreground = getComputedStyle(document.documentElement).getPropertyValue("--idil-text").trim() || (theme === "dark" ? "#f9fafb" : "#111827");
      if (clearMode === "with-clearing" || elapsedRef.current === 0) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      const x = canvas.width / 2; const y = canvas.height / 2; const radius = Math.max(5, progress * Math.min(canvas.width, canvas.height) / 3);
      if (showFocusPoint) { ctx.fillStyle = foreground; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      drawHexagon(ctx, x, y, radius, theme === "dark" ? "#2563eb" : "#3b82f6", foreground);
      if (showCorners) { ctx.fillStyle = foreground; for (let i = 0; i < 6; i += 1) { const angle = (i * Math.PI) / 3; ctx.beginPath(); ctx.arc(x + radius * Math.cos(angle), y + radius * Math.sin(angle), 3, 0, Math.PI * 2); ctx.fill(); } }
      ctx.fillStyle = foreground; ctx.font = `${Math.max(18, Math.floor(canvas.width / 45))}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(formatTime(Math.max(0, finalDurationSeconds - elapsedRef.current)), x, 32);
      if (showMetronome && timestamp - lastTickRef.current >= Math.max(100, jumpDurationMs)) { lastTickRef.current = timestamp; const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (AudioContextCtor) { const audio = metronomeRef.current ?? new AudioContextCtor(); metronomeRef.current = audio; const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.frequency.value = 660; gain.gain.value = 0.035; oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.04); } }
      if (phaseRef.current === "running") rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener("resize", resize); if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); rafRef.current = null; stopAudio(); };
  }, [clearMode, finalDurationSeconds, jumpDurationMs, jumpEndDurationMs, phase, showCorners, showFocusPoint, showMetronome, speedMode, stopAudio, theme]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  if (phase === "running") return <div className="flex min-h-screen flex-col bg-[var(--idil-bg)]"><canvas ref={canvasRef} className="min-h-0 flex-1 w-full" /><div className="flex flex-wrap justify-center gap-3 border-t border-[var(--idil-border)] bg-[var(--idil-surface)] p-4"><button onClick={pause} className={FULLSCREEN_PRIMARY_BUTTON_CLASS}>Duraklat</button><button onClick={reset} className={FULLSCREEN_SECONDARY_BUTTON_CLASS}>İptal Et</button></div></div>;
  if (phase === "paused") return <FullscreenExerciseShell title="Büyüyen Şekiller — Duraklatıldı" subtitle="Devam etmek veya egzersizi bitirmek için bir seçenek belirleyin."><div className="space-y-4"><p className="text-center text-2xl font-bold">{formatTime(elapsedSeconds)}</p><div className="flex flex-wrap justify-center gap-3"><button onClick={start} className={FULLSCREEN_PRIMARY_BUTTON_CLASS}>Devam Et</button><button onClick={() => void finish("manual")} className={FULLSCREEN_SECONDARY_BUTTON_CLASS}>Bitir</button><button onClick={reset} className={FULLSCREEN_SECONDARY_BUTTON_CLASS}>İptal Et</button></div></div></FullscreenExerciseShell>;
  if (phase === "result") return <FullscreenExerciseShell title="Büyüyen Şekiller" subtitle="Egzersiz sonucu"><div className="space-y-5 text-center"><p className="text-4xl font-bold">{Math.min(100, Math.round((elapsedSeconds / Math.max(1, finalDurationSeconds)) * 100))}%</p><p>{shapesDisplayed} şekil gösterildi.</p>{saveStatus === "saving" && <p>Kaydediliyor…</p>}{saveStatus === "success" && <p>Başarıyla kaydedildi.</p>}{saveError && <p className="text-red-600">{saveError}</p>}<button onClick={reset} className={FULLSCREEN_PRIMARY_BUTTON_CLASS}>Tekrar Başlat</button></div></FullscreenExerciseShell>;

  const locked = Boolean(educationProgramLaunch || assignmentTask);
  return <FullscreenExerciseShell title="Büyüyen Şekiller" subtitle="Büyüyen altıgeni gözlerinizi hareket ettirerek takip edin."><div className="grid max-w-xl gap-5 sm:grid-cols-2">
    <label className={FULLSCREEN_SELECT_CLASS}><span>Egzersiz Süresi</span><select disabled={locked} value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as DurationSeconds)}>{DURATION_OPTIONS.map((value) => <option key={value} value={value}>{formatTime(value)}</option>)}</select></label>
    <label className={FULLSCREEN_SELECT_CLASS}><span>Hız Modu</span><select disabled={locked} value={speedMode} onChange={(event) => setSpeedMode(event.target.value as SpeedMode)}>{SPEED_MODE_OPTIONS.map((value) => <option key={value} value={value}>{value === "fixed" ? "Sabit Hız" : "Değişken Hız"}</option>)}</select></label>
    <label className={FULLSCREEN_SELECT_CLASS}><span>Sıçrama Süresi (ms)</span><select disabled={locked} value={jumpDurationMs} onChange={(event) => setJumpDurationMs(Number(event.target.value))}>{JUMP_DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select></label>
    <label className={FULLSCREEN_SELECT_CLASS}><span>Bitiş Süresi (ms)</span><select disabled={locked} value={jumpEndDurationMs} onChange={(event) => setJumpEndDurationMs(Number(event.target.value))}>{JUMP_END_DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select></label>
    <label className={FULLSCREEN_SELECT_CLASS}><span>Silme Modu</span><select disabled={locked} value={clearMode} onChange={(event) => setClearMode(event.target.value as ClearMode)}>{CLEAR_MODE_OPTIONS.map((value) => <option key={value} value={value}>{value === "with-clearing" ? "Silerek" : "Silmeden"}</option>)}</select></label>
    <div className="space-y-3 sm:col-span-2">{[[showMetronome, setShowMetronome, "Metronom Sesleri"], [showFocusPoint, setShowFocusPoint, "Odak Noktasını Göster"], [showCorners, setShowCorners, "Köşeleri İşaretle"]].map(([checked, setter, label]) => <label key={String(label)} className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={locked} checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-5 w-5" /><span>{label as string}</span></label>)}</div>
    <button onClick={start} className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} min-h-11 sm:col-span-2`}>Başlat</button>
  </div></FullscreenExerciseShell>;
}
