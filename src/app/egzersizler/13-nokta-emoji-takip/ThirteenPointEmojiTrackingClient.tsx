"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExerciseFullscreenShell } from "@/components/exercises/ExerciseFullscreenShell";
import { useAssignmentTask } from "@/components/assignments/AssignmentTaskProvider";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import {
  chooseEmoji,
  DURATION_OPTIONS,
  EMOJI_OPTIONS,
  formatTimer,
  getNextPositionIndex,
  getPatternSequence,
  MOVEMENT_PATTERN_OPTIONS,
  SPEED_OPTIONS,
  THIRTEEN_POINT_POSITIONS,
  type MovementPattern,
} from "@/lib/exercise-engine/thirteenPointEmojiTracking";
import styles from "@/components/exercises/thirteen-point-emoji-theme.module.css";

const RESULT_EXERCISE_TYPE = "thirteen-point-emoji-tracking";
const DEFAULT_SPEED = 1500;
const DEFAULT_DURATION_SECONDS = 60;
const DEFAULT_EMOJI = "⭐";
const DEFAULT_PATTERN: MovementPattern = "sequential";

type EmojiMode = "fixed" | "random";
type ExerciseStatus = "idle" | "running" | "paused" | "completed";

type Props = {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
};

function readSetting<T extends string | number | boolean>(
  settings: Record<string, string | number | boolean> | undefined,
  key: string,
  fallback: T,
): T {
  const value = settings?.[key];
  return typeof value === typeof fallback ? (value as T) : fallback;
}

function readBooleanSetting(settings: Record<string, string | number | boolean> | undefined, key: string, fallback: boolean): boolean {
  const value = settings?.[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function clampSpeed(value: number): number {
  return SPEED_OPTIONS.includes(value as (typeof SPEED_OPTIONS)[number]) ? value : DEFAULT_SPEED;
}

function clampDuration(value: number): number {
  return DURATION_OPTIONS.includes(value as (typeof DURATION_OPTIONS)[number]) ? value : DEFAULT_DURATION_SECONDS;
}

function clampPattern(value: string): MovementPattern {
  return MOVEMENT_PATTERN_OPTIONS.some((option) => option.value === value) ? (value as MovementPattern) : DEFAULT_PATTERN;
}

function clampEmoji(value: string): string {
  return EMOJI_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_EMOJI;
}

function clampEmojiMode(value: string): EmojiMode {
  return value === "random" ? "random" : "fixed";
}

export default function ThirteenPointEmojiTrackingClient({ educationProgramLaunch }: Props) {
  const { theme } = useIdilTheme();
  const assignmentTask = useAssignmentTask();
  const isEducationProgramMode = Boolean(educationProgramLaunch);
  const isAssignmentMode = !isEducationProgramMode && Boolean(assignmentTask);
  const isLocked = isEducationProgramMode || isAssignmentMode;
  const settings = isEducationProgramMode ? educationProgramLaunch?.settings : assignmentTask?.settings;
  const educationProgramTaskId = educationProgramLaunch?.taskId;
  const { completionStatus, completeTaskAfterResultSave, retryTaskCompletion } =
    useEducationProgramTaskCompletion(educationProgramTaskId, RESULT_EXERCISE_TYPE);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const jumpTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentIndexRef = useRef(0);
  const previousEmojiRef = useRef<string | null>(null);
  const jumpCountRef = useRef(0);
  const finalizedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<SecureExerciseResultInput | null>(null);

  const initialSpeed = clampSpeed(readSetting(settings, "speed", DEFAULT_SPEED));
  const initialDuration = clampDuration(
    isEducationProgramMode
      ? educationProgramLaunch?.durationSeconds ?? DEFAULT_DURATION_SECONDS
      : assignmentTask?.durationSeconds ?? DEFAULT_DURATION_SECONDS,
  );
  const [speed, setSpeed] = useState(initialSpeed);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration);
  const [selectedEmoji, setSelectedEmoji] = useState(clampEmoji(readSetting(settings, "emoji", DEFAULT_EMOJI)));
  const [emojiMode, setEmojiMode] = useState<EmojiMode>(clampEmojiMode(readSetting(settings, "emojiMode", "fixed")));
  const [movementPattern, setMovementPattern] = useState<MovementPattern>(
    clampPattern(readSetting(settings, "movementPattern", DEFAULT_PATTERN)),
  );
  const [soundEnabled, setSoundEnabled] = useState(readBooleanSetting(settings, "soundEnabled", false));
  const [showPoints, setShowPoints] = useState(true);
  const [status, setStatus] = useState<ExerciseStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const [currentPositionId, setCurrentPositionId] = useState(THIRTEEN_POINT_POSITIONS[0].id);
  const [currentEmoji, setCurrentEmoji] = useState(DEFAULT_EMOJI);
  const [jumpCount, setJumpCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const currentPosition = THIRTEEN_POINT_POSITIONS.find((position) => position.id === currentPositionId) ?? THIRTEEN_POINT_POSITIONS[0];
  const patternSequence = useMemo(() => getPatternSequence(movementPattern), [movementPattern]);
  const remainingLabel = formatTimer(remainingSeconds);

  const clearTimers = useCallback(() => {
    if (jumpTimeoutRef.current !== null) window.clearTimeout(jumpTimeoutRef.current);
    if (countdownIntervalRef.current !== null) window.clearInterval(countdownIntervalRef.current);
    jumpTimeoutRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const closeAudio = useCallback(() => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) void context.close();
  }, []);

  const playTick = useCallback(async () => {
    if (!soundEnabled || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === "suspended") await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 720;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  }, [soundEnabled]);

  const persistResult = useCallback(async (payload: SecureExerciseResultInput) => {
    if (saveInFlightRef.current || saveCompletedRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    try {
      const saved = await saveExerciseResultSecure(payload);
      saveCompletedRef.current = true;
      setSaveStatus("success");
      setSaveMessage(saved.assignmentCompletionStatus === "failed" ? "Sonuç kaydedildi ancak görev tamamlanamadı." : "Sonuç başarıyla kaydedildi.");
      await completeTaskAfterResultSave();
    } catch {
      setSaveStatus("error");
      setSaveMessage("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [completeTaskAfterResultSave]);

  const finishExercise = useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    clearTimers();
    setStatus("completed");
    setRemainingSeconds(0);
    closeAudio();
    const payload = {
      exerciseType: RESULT_EXERCISE_TYPE,
      exerciseTitle: "13 Nokta Emoji Takip Egzersizi",
      durationSeconds,
      correctCount: jumpCountRef.current,
      wrongCount: 0,
      score: jumpCountRef.current,
      successRate: jumpCountRef.current > 0 ? 100 : 0,
      details: {
        durationSeconds,
        speed,
        jumpCount: jumpCountRef.current,
        emojiMode,
        emoji: selectedEmoji,
        movementPattern,
        soundEnabled,
      },
    } satisfies SecureExerciseResultInput;
    pendingResultRef.current = payload;
    void persistResult(payload);
  }, [clearTimers, closeAudio, durationSeconds, emojiMode, movementPattern, persistResult, selectedEmoji, soundEnabled, speed]);

  const advanceTarget = useCallback(() => {
    const nextIndex = getNextPositionIndex(movementPattern, currentIndexRef.current);
    currentIndexRef.current = nextIndex;
    const nextPosition = patternSequence[nextIndex] ?? patternSequence[0];
    setCurrentPositionId(nextPosition.id);
    const nextEmoji = chooseEmoji(emojiMode, selectedEmoji, previousEmojiRef.current);
    previousEmojiRef.current = nextEmoji;
    setCurrentEmoji(nextEmoji);
    jumpCountRef.current += 1;
    setJumpCount(jumpCountRef.current);
    void playTick();
  }, [emojiMode, movementPattern, patternSequence, playTick, selectedEmoji]);

  useEffect(() => {
    if (status !== "running") {
      clearTimers();
      return;
    }

    jumpTimeoutRef.current = window.setTimeout(function scheduleNextTarget() {
      if (status !== "running") return;
      advanceTarget();
      jumpTimeoutRef.current = window.setTimeout(scheduleNextTarget, speed);
    }, speed);

    countdownIntervalRef.current = window.setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return clearTimers;
  }, [advanceTarget, clearTimers, speed, status]);

  useEffect(() => {
    if (status === "running" && remainingSeconds <= 0) finishExercise();
  }, [finishExercise, remainingSeconds, status]);

  useEffect(() => () => {
    clearTimers();
    closeAudio();
  }, [clearTimers, closeAudio]);

  const handleStartPause = () => {
    if (status === "completed") return;
    if (status === "running") {
      clearTimers();
      closeAudio();
      setStatus("paused");
      return;
    }
    if (remainingSeconds <= 0) return;
    setStatus("running");
  };

  const handleReset = () => {
    clearTimers();
    closeAudio();
    finalizedRef.current = false;
    saveInFlightRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    currentIndexRef.current = 0;
    previousEmojiRef.current = null;
    jumpCountRef.current = 0;
    setStatus("idle");
    setRemainingSeconds(durationSeconds);
    setCurrentPositionId(THIRTEEN_POINT_POSITIONS[0].id);
    setCurrentEmoji(selectedEmoji);
    setJumpCount(0);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  const handlePrimaryAction = () => {
    if (status === "completed") {
      handleReset();
      return;
    }

    handleStartPause();
  };

  const handleDurationChange = (value: number) => {
    const nextDuration = clampDuration(value);
    setDurationSeconds(nextDuration);
    if (status !== "running") setRemainingSeconds(nextDuration);
  };

  const statusLabel = status === "running" ? "Çalışıyor" : status === "paused" ? "Duraklatıldı" : status === "completed" ? "Tamamlandı" : "Hazır";

  return (
    <div className={themeRootClassName}>
      <ExerciseFullscreenShell
        title="13 Nokta Emoji Takip Egzersizi"
        description="Başınızı hareket ettirmeden yalnızca gözlerinizle ekrandaki emoji veya simgeyi takip edin."
        backHref="/egzersizler"
        status={<><span className="compact-stat-chip">{statusLabel}</span><span className="compact-stat-chip">Süre: {remainingLabel}</span><span className="compact-stat-chip">Sıçrama: {jumpCount}</span></>}
        settings={(
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold"><span>Hız</span><select disabled={isLocked} value={speed} onChange={(event) => setSpeed(clampSpeed(Number(event.target.value)))} className="min-h-10 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2 text-sm"><option value={5000}>Çok Yavaş — 5000 ms</option><option value={3000}>Yavaş — 3000 ms</option><option value={2000}>Orta Yavaş — 2000 ms</option><option value={1500}>Normal — 1500 ms</option><option value={1000}>Orta Hızlı — 1000 ms</option><option value={700}>Hızlı — 700 ms</option><option value={450}>Çok Hızlı — 450 ms</option><option value={300}>Uzman — 300 ms</option></select></label>
            <label className="grid gap-1 text-xs font-bold"><span>Süre</span><select disabled={isLocked} value={durationSeconds} onChange={(event) => handleDurationChange(Number(event.target.value))} className="min-h-10 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2 text-sm">{DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value} saniye</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold"><span>Hareket düzeni</span><select disabled={isLocked} value={movementPattern} onChange={(event) => setMovementPattern(clampPattern(event.target.value))} className="min-h-10 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2 text-sm">{MOVEMENT_PATTERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <div className="grid gap-1 text-xs font-bold sm:col-span-2 lg:col-span-3"><span>Emoji</span><div className="flex flex-wrap gap-1.5" role="group" aria-label="Emoji seçimi">{EMOJI_OPTIONS.map((option) => <button key={option.value} type="button" disabled={isLocked} aria-label={option.label} aria-pressed={emojiMode === "fixed" && selectedEmoji === option.value} onClick={() => { setSelectedEmoji(option.value); setEmojiMode("fixed"); }} className={`grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] text-2xl ${emojiMode === "fixed" && selectedEmoji === option.value ? "ring-2 ring-[var(--idil-primary)]" : ""}`}>{option.value}</button>)}<button type="button" disabled={isLocked} aria-label="Rastgele Değiştir" aria-pressed={emojiMode === "random"} onClick={() => setEmojiMode("random")} className={`min-h-11 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-3 text-xs ${emojiMode === "random" ? "ring-2 ring-[var(--idil-primary)]" : ""}`}>🎲 Rastgele</button></div></div>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} /> Ses</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={showPoints} onChange={(event) => setShowPoints(event.target.checked)} /> Noktaları göster</label>
          </div>
        )}
        footer={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={handlePrimaryAction} className={`${styles.primaryButton} min-h-11 min-w-32 rounded-xl px-4 text-sm font-black`}>{status === "running" ? "Duraklat" : status === "paused" ? "Devam Et" : status === "completed" ? "Tekrar Başlat" : "Başlat"}</button><button type="button" onClick={handleReset} className="min-h-11 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-4 text-sm font-bold">Sıfırla</button></div>}
      >
        <div ref={workspaceRef} className={`${styles.stageBackground} relative flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-2xl p-2 sm:min-h-[28rem] md:p-4`}>
          <div className="mb-2 text-center text-xs font-semibold text-[var(--idil-muted)]">Gözleriniz yorulursa egzersizi duraklatıp kısa bir mola verin.</div>
          <div className="relative min-h-0 flex-1" aria-label="13 noktalı çalışma alanı">
            {showPoints ? THIRTEEN_POINT_POSITIONS.map((point) => <span key={point.id} aria-hidden="true" className={styles.pointMarker} style={{ left: `${point.x}%`, top: `${point.y}%`, transform: "translate(-50%, -50%)" }} />) : null}
            <span className={`${styles.target} ${status === "running" ? styles.targetVisible : ""} absolute`} style={{ left: `${currentPosition.x}%`, top: `${currentPosition.y}%`, transform: "translate(-50%, -50%)" }} aria-label={`${emojiMode === "random" ? "Rastgele emoji" : "Sabit emoji"}, ${statusLabel}`}>{currentEmoji}</span>
          </div>
          <p className="pt-2 text-center text-xs text-[var(--idil-muted)]">Hedefi başınızı oynatmadan gözlerinizle takip edin.</p>
          {saveStatus === "error" ? <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-2 text-center text-xs text-red-800"><p>{saveMessage}</p><button type="button" className="mt-1 rounded-lg bg-red-700 px-3 py-1 text-white" onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}>Yeniden Dene</button></div> : null}
          {completionStatus.state === "error" ? <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-center text-xs text-amber-900"><p>{completionStatus.message}</p>{completionStatus.canRetry ? <button type="button" onClick={() => void retryTaskCompletion()} className="mt-1 rounded-lg bg-amber-700 px-3 py-1 text-white">Program ilerlemesini yeniden dene</button> : null}</div> : null}
        </div>
      </ExerciseFullscreenShell>
    </div>
  );
}
