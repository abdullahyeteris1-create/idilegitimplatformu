"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  resolveEmojiFontSizePx,
  resolveEmojiPickerPlacement,
  resolveEmojiPickerWidth,
  resolveEmojiSizePx,
  resolveSafeTargetPosition,
  type EmojiPickerPlacement,
} from "@/lib/exercise-engine/thirteenPointEmojiLayout";
import styles from "@/components/exercises/thirteen-point-emoji-theme.module.css";

const RESULT_EXERCISE_TYPE = "thirteen-point-emoji-tracking";
const DEFAULT_SPEED = 1500;
const DEFAULT_DURATION_SECONDS = 60;
const DEFAULT_EMOJI = "⭐";
const DEFAULT_PATTERN: MovementPattern = "sequential";
const EMOJI_PICKER_ID = "thirteen-point-emoji-picker";
const SETTINGS_FIELD_CLASS = "min-w-0";
const SETTINGS_LABEL_CLASS = "mb-1 block truncate text-[11px] font-bold text-[var(--idil-muted)]";
const SETTINGS_CONTROL_CLASS =
  "min-h-11 w-full rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] pl-2 pr-7 text-sm disabled:opacity-60";

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
  const playAreaRef = useRef<HTMLDivElement | null>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [pickerPlacement, setPickerPlacement] = useState<EmojiPickerPlacement | null>(null);
  const [pickerWidth, setPickerWidth] = useState(0);
  // Calisma alaninin GERCEK olculeri - guvenli koordinat eslemesi ve
  // responsive emoji boyutu bu olculere dayanir (bkz. thirteenPointEmojiLayout).
  const [playAreaSize, setPlayAreaSize] = useState({ width: 0, height: 0 });

  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const currentPosition = THIRTEEN_POINT_POSITIONS.find((position) => position.id === currentPositionId) ?? THIRTEEN_POINT_POSITIONS[0];
  const patternSequence = useMemo(() => getPatternSequence(movementPattern), [movementPattern]);
  const remainingLabel = formatTimer(remainingSeconds);
  const isEmojiPickerDisabled = isLocked || emojiMode === "random";

  const playAreaWidth = playAreaSize.width;
  const playAreaHeight = playAreaSize.height;
  const isPlayAreaMeasured = playAreaWidth > 0 && playAreaHeight > 0;
  const emojiSizePx = resolveEmojiSizePx(playAreaWidth, playAreaHeight);
  const emojiFontSizePx = resolveEmojiFontSizePx(emojiSizePx);
  // 13 noktanin yuzde geometrisi DEGISMEZ; yalniz container'in guvenli
  // alt-dikdortgenine eslenir. Noktalar ve emoji AYNI eslemeyi kullanir ki
  // emoji her zaman isaretin tam uzerine otursun.
  const safePositions = useMemo(
    () =>
      THIRTEEN_POINT_POSITIONS.map((point) => ({
        id: point.id,
        ...resolveSafeTargetPosition({
          xPercent: point.x,
          yPercent: point.y,
          containerWidth: playAreaWidth,
          containerHeight: playAreaHeight,
          emojiSize: emojiSizePx,
        }),
      })),
    [emojiSizePx, playAreaHeight, playAreaWidth],
  );
  const currentSafePosition =
    safePositions.find((position) => position.id === currentPositionId) ?? safePositions[0];

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

  // Calisma alani olculerini olcer (ilk boyama oncesi + her yeniden boyutlanmada).
  useLayoutEffect(() => {
    const element = playAreaRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setPlayAreaSize((previous) =>
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Egzersiz basladiginda emoji secim paneli acik kalmasin.
  useEffect(() => {
    if (status === "running") setIsEmojiPickerOpen(false);
  }, [status]);

  // Rastgele moda gecilirse secim paneli anlamsizlasir - kapatilir.
  useEffect(() => {
    if (isEmojiPickerDisabled) setIsEmojiPickerOpen(false);
  }, [isEmojiPickerDisabled]);

  // Panel konumu: position: fixed ile hesaplanir. Ayar cubugunun
  // overflow-y-auto'su ve sahnenin overflow-hidden'i normal akistaki bir
  // absolute paneli kirpardi; fixed + viewport'a kirpilmis koordinat bunu
  // tamamen onler ve panel calisma alanini asagi itmez.
  useLayoutEffect(() => {
    if (!isEmojiPickerOpen) {
      setPickerPlacement(null);
      return;
    }

    const updatePlacement = () => {
      const trigger = emojiTriggerRef.current;
      const panel = emojiPickerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const width = resolveEmojiPickerWidth(window.innerWidth);
      const height = panel?.getBoundingClientRect().height ?? 0;

      setPickerWidth(width);
      setPickerPlacement(
        resolveEmojiPickerPlacement({
          triggerRect,
          popoverWidth: width,
          popoverHeight: height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      );
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isEmojiPickerOpen]);

  // Dis tiklama ve Escape ile kapanma. Efekt yalniz panel acikken baglanir,
  // cleanup her durumda listener'i kaldirir - Strict Mode'da cift kayit olmaz.
  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiTriggerRef.current?.contains(target)) return;
      setIsEmojiPickerOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsEmojiPickerOpen(false);
      emojiTriggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEmojiPickerOpen]);

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
    setIsEmojiPickerOpen(false);
  };

  const handleEmojiSelect = (value: string) => {
    setSelectedEmoji(clampEmoji(value));
    setEmojiMode("fixed");
    setIsEmojiPickerOpen(false);
    emojiTriggerRef.current?.focus();
  };

  const handleEmojiModeChange = (value: string) => {
    const nextMode = clampEmojiMode(value);
    setEmojiMode(nextMode);
    if (nextMode === "random") setIsEmojiPickerOpen(false);
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-[1.15fr_0.85fr_1.1fr_0.9fr_1fr_0.6fr_0.7fr] xl:items-end xl:gap-3">
            <div className={SETTINGS_FIELD_CLASS}>
              <label htmlFor="thirteen-point-speed" className={SETTINGS_LABEL_CLASS}>Hız</label>
              <select id="thirteen-point-speed" disabled={isLocked} value={speed} onChange={(event) => setSpeed(clampSpeed(Number(event.target.value)))} className={SETTINGS_CONTROL_CLASS}><option value={5000}>Çok Yavaş — 5000 ms</option><option value={3000}>Yavaş — 3000 ms</option><option value={2000}>Orta Yavaş — 2000 ms</option><option value={1500}>Normal — 1500 ms</option><option value={1000}>Orta Hızlı — 1000 ms</option><option value={700}>Hızlı — 700 ms</option><option value={450}>Çok Hızlı — 450 ms</option><option value={300}>Uzman — 300 ms</option></select>
            </div>

            <div className={SETTINGS_FIELD_CLASS}>
              <label htmlFor="thirteen-point-duration" className={SETTINGS_LABEL_CLASS}>Süre</label>
              <select id="thirteen-point-duration" disabled={isLocked} value={durationSeconds} onChange={(event) => handleDurationChange(Number(event.target.value))} className={SETTINGS_CONTROL_CLASS}>{DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value} sn</option>)}</select>
            </div>

            <div className={SETTINGS_FIELD_CLASS}>
              <label htmlFor="thirteen-point-pattern" className={SETTINGS_LABEL_CLASS}>Hareket</label>
              <select id="thirteen-point-pattern" disabled={isLocked} value={movementPattern} onChange={(event) => setMovementPattern(clampPattern(event.target.value))} className={SETTINGS_CONTROL_CLASS} title="Hareket düzeni">{MOVEMENT_PATTERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>

            <div className={SETTINGS_FIELD_CLASS}>
              <label htmlFor="thirteen-point-emoji-mode" className={SETTINGS_LABEL_CLASS}>Emoji Modu</label>
              <select id="thirteen-point-emoji-mode" disabled={isLocked} value={emojiMode} onChange={(event) => handleEmojiModeChange(event.target.value)} className={SETTINGS_CONTROL_CLASS}><option value="fixed">Sabit</option><option value="random">Rastgele</option></select>
            </div>

            {/* Emoji secenekleri artik surekli gorunur bir buton dizisi degil;
                tek tetikleyici + viewport'a kirpilan fixed popover. */}
            <div className={SETTINGS_FIELD_CLASS}>
              <label htmlFor="thirteen-point-emoji-trigger" className={SETTINGS_LABEL_CLASS}>Emoji</label>
              <button
                id="thirteen-point-emoji-trigger"
                ref={emojiTriggerRef}
                type="button"
                disabled={isEmojiPickerDisabled}
                aria-haspopup="dialog"
                aria-expanded={isEmojiPickerOpen}
                aria-controls={EMOJI_PICKER_ID}
                title={emojiMode === "random" ? "Rastgele emoji modu etkin" : "Emoji seç"}
                onClick={() => setIsEmojiPickerOpen((open) => !open)}
                className="flex min-h-11 w-full items-center gap-1.5 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--idil-primary)] disabled:opacity-60"
              >
                <span aria-hidden="true" className="text-[20px] leading-none md:text-[24px]">{emojiMode === "random" ? "🎲" : selectedEmoji}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{emojiMode === "random" ? "Rastgele" : "Emoji Seç"}</span>
                <span aria-hidden="true" className="shrink-0 text-[9px] opacity-70">▼</span>
              </button>
              {isEmojiPickerOpen ? (
                <div
                  id={EMOJI_PICKER_ID}
                  ref={emojiPickerRef}
                  role="dialog"
                  aria-label="Emoji seç"
                  style={{
                    position: "fixed",
                    left: pickerPlacement?.left ?? 0,
                    top: pickerPlacement?.top ?? 0,
                    width: pickerWidth || undefined,
                    maxWidth: "calc(100vw - 2rem)",
                    visibility: pickerPlacement ? "visible" : "hidden",
                  }}
                  className="z-50 max-h-64 overflow-y-auto rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface)] p-2 shadow-xl"
                >
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {EMOJI_OPTIONS.map((option) => {
                      const isSelected = emojiMode === "fixed" && selectedEmoji === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-label={option.label}
                          aria-pressed={isSelected}
                          title={option.label}
                          onClick={() => handleEmojiSelect(option.value)}
                          className={`grid aspect-square min-h-11 min-w-11 place-items-center rounded-xl border text-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--idil-primary)] ${isSelected ? "border-[var(--idil-primary)] bg-[var(--idil-accent-soft)] ring-2 ring-[var(--idil-primary)]" : "border-[var(--idil-border)] hover:bg-[var(--idil-accent-soft)]"}`}
                        >
                          {option.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={SETTINGS_FIELD_CLASS}>
              <span className={SETTINGS_LABEL_CLASS}>Ses</span>
              <label htmlFor="thirteen-point-sound" className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2">
                <input id="thirteen-point-sound" type="checkbox" disabled={isLocked} checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} className="h-5 w-5 accent-[var(--idil-primary)] disabled:opacity-60" />
              </label>
            </div>

            <div className={SETTINGS_FIELD_CLASS}>
              <span className={SETTINGS_LABEL_CLASS}>Noktalar</span>
              <label htmlFor="thirteen-point-show-points" className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-2" title="Noktaları göster">
                <input id="thirteen-point-show-points" type="checkbox" checked={showPoints} onChange={(event) => setShowPoints(event.target.checked)} className="h-5 w-5 accent-[var(--idil-primary)]" />
              </label>
            </div>
          </div>
        )}
        footer={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={handlePrimaryAction} className={`${styles.primaryButton} min-h-11 min-w-32 rounded-xl px-4 text-sm font-black`}>{status === "running" ? "Duraklat" : status === "paused" ? "Devam Et" : status === "completed" ? "Tekrar Başlat" : "Başlat"}</button><button type="button" onClick={handleReset} className="min-h-11 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-4 text-sm font-bold">Sıfırla</button></div>}
      >
        <div ref={workspaceRef} className={`${styles.stageBackground} relative flex h-full min-h-[clamp(18rem,48dvh,32rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl p-2 md:p-4`}>
          <div className="mb-1 shrink-0 text-center text-[11px] font-semibold text-[var(--idil-muted)]">Hedefi başınızı oynatmadan gözlerinizle takip edin. Gözleriniz yorulursa duraklatıp mola verin.</div>
          <div ref={playAreaRef} className="relative min-h-0 min-w-0 flex-1" aria-label="13 noktalı çalışma alanı">
            {/* Noktalar ve emoji AYNI guvenli eslemeyi kullanir; olcum
                tamamlanana kadar (SSR/ilk kare) yuzde konumlandirmaya duser. */}
            {showPoints
              ? safePositions.map((point) => (
                  <span
                    key={point.id}
                    aria-hidden="true"
                    className={styles.pointMarker}
                    style={
                      isPlayAreaMeasured
                        ? { left: `${point.left}px`, top: `${point.top}px`, transform: "translate(-50%, -50%)" }
                        : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", opacity: 0 }
                    }
                  />
                ))
              : null}
            <span
              className={`${styles.target} ${status === "running" ? styles.targetVisible : ""} absolute`}
              style={{
                width: `${emojiSizePx}px`,
                height: `${emojiSizePx}px`,
                fontSize: `${emojiFontSizePx}px`,
                left: isPlayAreaMeasured ? `${currentSafePosition.left}px` : `${currentPosition.x}%`,
                top: isPlayAreaMeasured ? `${currentSafePosition.top}px` : `${currentPosition.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              aria-label={`${emojiMode === "random" ? "Rastgele emoji" : "Sabit emoji"}, ${statusLabel}`}
            >
              {currentEmoji}
            </span>
          </div>
          {saveStatus === "error" ? <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-2 text-center text-xs text-red-800"><p>{saveMessage}</p><button type="button" className="mt-1 rounded-lg bg-red-700 px-3 py-1 text-white" onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}>Yeniden Dene</button></div> : null}
          {completionStatus.state === "error" ? <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-center text-xs text-amber-900"><p>{completionStatus.message}</p>{completionStatus.canRetry ? <button type="button" onClick={() => void retryTaskCompletion()} className="mt-1 rounded-lg bg-amber-700 px-3 py-1 text-white">Program ilerlemesini yeniden dene</button> : null}</div> : null}
        </div>
      </ExerciseFullscreenShell>
    </div>
  );
}
