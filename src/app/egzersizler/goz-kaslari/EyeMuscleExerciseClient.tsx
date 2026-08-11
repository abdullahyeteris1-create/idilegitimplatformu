"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { useAssignmentTask } from "@/components/assignments/AssignmentTaskProvider";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import styles from "@/components/exercises/eye-muscle-theme.module.css";

type Position = {
  x: number;
  y: number;
};

type Pattern = {
  id: string;
  name: string;
  icon: string;
  desc: string;
};

type PatternGroup = {
  level: number;
  patterns: Pattern[];
};

type ExerciseStatus = "idle" | "running" | "paused" | "result";

const SYMBOL_OPTIONS = [
  { label: "Yıldız", value: "⭐" },
  { label: "Çember", value: "🔵" },
  { label: "Mor Çember", value: "🟣" },
  { label: "Arı", value: "🐝" },
  { label: "Yüz", value: "😊" },
];

const PATTERNS: Pattern[] = [
  { id: "center", name: "Merkez", icon: "🎯", desc: "Simge merkez bölgede yanıp söner." },
  { id: "middle", name: "Orta Alan", icon: "◉", desc: "Merkezin çevresindeki geniş alanda çalışır." },
  { id: "corners", name: "Dört Köşe", icon: "⬚", desc: "Dört köşede sıralı yanıp söner." },
  { id: "edges", name: "Kenarlar", icon: "✥", desc: "Üst, sağ, alt ve sol kenarlarda çalışır." },
  { id: "clockwise", name: "Köşeler Sıralı", icon: "↻", desc: "Köşeleri saat yönünde takip eder." },
  { id: "cornerRandom", name: "Köşeler Rastgele", icon: "✣", desc: "Dört köşe arasında rastgele geçiş yapar." },
  { id: "diagZigzag", name: "Çapraz Zigzag", icon: "↘", desc: "Sol üstten sağ alta çapraz zigzag." },
  { id: "columnZigzag", name: "Sütun Zigzag", icon: "↕", desc: "Yukarı-aşağı, soldan sağa ilerler." },
  { id: "rowZigzag", name: "Satır Zigzag", icon: "↔", desc: "Soldan sağa, sonra sağdan sola ilerler." },
  { id: "frame", name: "Çerçeve", icon: "□", desc: "Ekranın dış çerçevesini dolaşır." },
  { id: "x", name: "X Deseni", icon: "✕", desc: "İki çapraz çizgi üzerinde ilerler." },
  { id: "spiral", name: "Spiral", icon: "🌀", desc: "Dıştan içe spiral yapar." },
  { id: "circle", name: "Daire", icon: "◯", desc: "Dairesel rota üzerinde yanıp söner." },
  { id: "random", name: "Rastgele", icon: "✦", desc: "Tüm ekranda rastgele konumlar seçer." },
];

const PATTERN_GROUPS: PatternGroup[] = [
  { level: 1, patterns: [PATTERNS[0], PATTERNS[1]] },
  { level: 2, patterns: [PATTERNS[2], PATTERNS[3]] },
  { level: 3, patterns: [PATTERNS[4], PATTERNS[5], PATTERNS[6]] },
  { level: 4, patterns: [PATTERNS[7], PATTERNS[8], PATTERNS[9]] },
  { level: 5, patterns: [PATTERNS[10], PATTERNS[11], PATTERNS[12], PATTERNS[13]] },
];

const LEVEL_DEFAULTS: Record<number, { flashMs: number; gapMs: number }> = {
  1: { flashMs: 450, gapMs: 500 },
  2: { flashMs: 300, gapMs: 350 },
  3: { flashMs: 200, gapMs: 250 },
  4: { flashMs: 120, gapMs: 160 },
  5: { flashMs: 80, gapMs: 100 },
};

const DURATION_OPTIONS = [1, 2, 3, 4, 5] as const;
const DEFAULT_DURATION_MINUTES = 3;
const EXPECTED_RESULT_EXERCISE_TYPE = "eye-muscle";

function clampLevel(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }

  return Math.max(1, Math.min(5, Math.round(value)));
}

function clampDurationMinutes(value: number | null | undefined): 1 | 2 | 3 | 4 | 5 {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_DURATION_MINUTES;
  }

  return Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number): string {
  return formatTime(totalSeconds);
}

function generatePatternPositions(patternId: string, count: number): Position[] {
  const positions: Position[] = [];

  if (patternId === "center") {
    for (let i = 0; i < count; i += 1) positions.push({ x: 50, y: 50 });
  } else if (patternId === "middle") {
    const radius = [30, 40, 50];
    for (let i = 0; i < count; i += 1) {
      const angle = (i % 8) * (360 / 8);
      const r = radius[Math.floor(Math.random() * radius.length)];
      const rad = (angle * Math.PI) / 180;
      positions.push({ x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) });
    }
  } else if (patternId === "corners") {
    const corners = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];
    for (let i = 0; i < count; i += 1) positions.push(corners[i % corners.length]);
  } else if (patternId === "edges") {
    const edges = [
      { x: 50, y: 15 },
      { x: 85, y: 50 },
      { x: 50, y: 85 },
      { x: 15, y: 50 },
    ];
    for (let i = 0; i < count; i += 1) positions.push(edges[i % edges.length]);
  } else if (patternId === "clockwise") {
    const corners = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];
    for (let i = 0; i < count; i += 1) positions.push(corners[i % corners.length]);
  } else if (patternId === "cornerRandom") {
    const corners = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];
    for (let i = 0; i < count; i += 1) {
      positions.push(corners[Math.floor(Math.random() * corners.length)]);
    }
  } else if (patternId === "diagZigzag") {
    for (let i = 0; i < count; i += 1) {
      const t = (i / count) % 1;
      positions.push({ x: 20 + t * 60, y: 20 + t * 60 });
    }
  } else if (patternId === "columnZigzag") {
    const colCount = Math.max(2, Math.ceil(Math.sqrt(count)));
    for (let i = 0; i < count; i += 1) {
      const col = Math.floor((i / Math.ceil(count / colCount)) % colCount);
      const x = 20 + (col / (colCount - 1 || 1)) * 60;
      const goingDown = col % 2 === 0;
      const rowIdx = Math.floor(i / colCount);
      const y = goingDown
        ? 20 + (rowIdx / Math.ceil(count / colCount)) * 60
        : 80 - (rowIdx / Math.ceil(count / colCount)) * 60;
      positions.push({ x, y });
    }
  } else if (patternId === "rowZigzag") {
    const rowCount = Math.max(2, Math.ceil(Math.sqrt(count)));
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor((i / Math.ceil(count / rowCount)) % rowCount);
      const y = 20 + (row / (rowCount - 1 || 1)) * 60;
      const goingRight = row % 2 === 0;
      const colIdx = Math.floor(i / rowCount);
      const x = goingRight
        ? 20 + (colIdx / Math.ceil(count / rowCount)) * 60
        : 80 - (colIdx / Math.ceil(count / rowCount)) * 60;
      positions.push({ x, y });
    }
  } else if (patternId === "frame") {
    const framePoints: Position[] = [];
    for (let i = 0; i <= 20; i += 1) framePoints.push({ x: 15 + (i * 70) / 20, y: 15 });
    for (let i = 1; i <= 20; i += 1) framePoints.push({ x: 85, y: 15 + (i * 70) / 20 });
    for (let i = 19; i >= 0; i -= 1) framePoints.push({ x: 85 - (i * 70) / 20, y: 85 });
    for (let i = 19; i >= 1; i -= 1) framePoints.push({ x: 15, y: 85 - (i * 70) / 20 });
    for (let i = 0; i < count; i += 1) positions.push(framePoints[i % framePoints.length]);
  } else if (patternId === "x") {
    for (let i = 0; i < count; i += 1) {
      const t = (i / count) % 1;
      const angle = i % 2 === 0 ? 45 : 135;
      const rad = (angle * Math.PI) / 180;
      positions.push({ x: 50 + (t * 40 - 20) * Math.cos(rad), y: 50 + (t * 40 - 20) * Math.sin(rad) });
    }
  } else if (patternId === "spiral") {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * 8 * Math.PI;
      const r = 40 * (1 - i / count);
      positions.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
    }
  } else if (patternId === "circle") {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * 2 * Math.PI;
      positions.push({ x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) });
    }
  } else if (patternId === "random") {
    for (let i = 0; i < count; i += 1) {
      positions.push({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 });
    }
  }

  return positions.slice(0, count);
}

interface EyeMuscleExerciseClientProps {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
}

export default function EyeMuscleExerciseClient({ educationProgramLaunch }: EyeMuscleExerciseClientProps) {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");

  const assignmentTask = useAssignmentTask();
  const isEducationProgramMode = Boolean(educationProgramLaunch);
  const isAssignmentMode = !isEducationProgramMode && assignmentTask !== null;
  const educationProgramTaskId = isEducationProgramMode ? educationProgramLaunch?.taskId : undefined;
  const { completionStatus, completeTaskAfterResultSave, retryTaskCompletion } =
    useEducationProgramTaskCompletion(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const clockIntervalRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const positionIndexRef = useRef(0);
  const patternPositionsRef = useRef<Position[]>([]);
  const phaseRef = useRef<ExerciseStatus>("idle");
  const hasFinalizedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<SecureExerciseResultInput | null>(null);
  const totalFlashesRef = useRef(0);

  const [status, setStatus] = useState<ExerciseStatus>("idle");
  useEducationProgramExerciseRunning(isEducationProgramMode && status === "running");
  const [selectedLevel, setSelectedLevel] = useState(() =>
    clampLevel(educationProgramLaunch?.initialLevel ?? assignmentTask?.currentLevel ?? 1),
  );
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<1 | 2 | 3 | 4 | 5>(() =>
    clampDurationMinutes(
      Math.round(
        (educationProgramLaunch?.durationSeconds ?? assignmentTask?.durationSeconds ?? DEFAULT_DURATION_MINUTES * 60) / 60,
      ),
    ),
  );
  const [selectedPatternId, setSelectedPatternId] = useState("center");
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOL_OPTIONS[0].value);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [isVisible, setIsVisible] = useState(false);
  const [totalFlashes, setTotalFlashes] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    phaseRef.current = status;
  }, [status]);

  const resolvedLevel = isAssignmentMode
    ? clampLevel(assignmentTask?.currentLevel ?? 1)
    : isEducationProgramMode
      ? clampLevel(educationProgramLaunch?.initialLevel ?? 1)
      : selectedLevel;

  const resolvedDurationSeconds = isAssignmentMode
    ? Math.max(1, Math.round(assignmentTask?.durationSeconds ?? selectedDurationMinutes * 60))
    : isEducationProgramMode
      ? Math.max(1, Math.round(educationProgramLaunch?.durationSeconds ?? selectedDurationMinutes * 60))
      : selectedDurationMinutes * 60;

  const availablePatternsForLevel = useMemo(() => {
    const group = PATTERN_GROUPS.find((item) => item.level === resolvedLevel);
    return group?.patterns ?? [];
  }, [resolvedLevel]);

  const selectedPattern = useMemo(() => {
    return availablePatternsForLevel.find((pattern) => pattern.id === selectedPatternId) ?? availablePatternsForLevel[0] ?? PATTERNS[0];
  }, [availablePatternsForLevel, selectedPatternId]);

  const levelTiming = useMemo(() => LEVEL_DEFAULTS[resolvedLevel] || LEVEL_DEFAULTS[1], [resolvedLevel]);

  const symbolLabel = useMemo(() => {
    return SYMBOL_OPTIONS.find((symbol) => symbol.value === selectedSymbol)?.label ?? "Simge";
  }, [selectedSymbol]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const clearTimers = useCallback(() => {
    if (clockIntervalRef.current !== null) {
      window.clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }

    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const resetSaveState = useCallback(() => {
    hasFinalizedRef.current = false;
    saveInFlightRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    setSaveStatus("idle");
    setSaveMessage("");
  }, []);

  const playFlashTone = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);

    window.setTimeout(() => {
      void context.close();
    }, 180);
  }, [soundEnabled]);

  const persistResult = useCallback(
    async (payload: SecureExerciseResultInput) => {
      if (saveInFlightRef.current || saveCompletedRef.current) {
        return;
      }

      saveInFlightRef.current = true;
      setSaveStatus("saving");
      setSaveMessage("Sonuç kaydediliyor...");

      try {
        const saved = await saveExerciseResultSecure(payload);
        saveCompletedRef.current = true;
        setSaveStatus("success");
        setSaveMessage(
          saved.assignmentCompletionStatus === "failed"
            ? "Sonuç kaydedildi ancak görev tamamlanamadı."
            : "Sonuç başarıyla kaydedildi.",
        );
        await completeTaskAfterResultSave();
      } catch {
        setSaveStatus("error");
        setSaveMessage("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [completeTaskAfterResultSave],
  );

  const finishExercise = useCallback(
    (reason: "natural" | "manual" = "natural") => {
      if (hasFinalizedRef.current) {
        return;
      }

      hasFinalizedRef.current = true;
      clearTimers();
      setIsVisible(false);
      setStatus("result");
      setElapsedSeconds(resolvedDurationSeconds);

      const flashes = totalFlashesRef.current;
      const payload = {
        exerciseType: "eye-muscle",
        exerciseTitle: "Göz Kaslarını Geliştirme Çalışması",
        durationSeconds: resolvedDurationSeconds,
        correctCount: flashes,
        wrongCount: 0,
        score: flashes,
        successRate: flashes > 0 ? 100 : 0,
        details: {
          reason,
          mode: isEducationProgramMode ? "education-program" : isAssignmentMode ? "assignment" : "free",
          level: resolvedLevel,
          durationMinutes: Math.max(1, Math.round(resolvedDurationSeconds / 60)),
          durationSeconds: resolvedDurationSeconds,
          patternId: selectedPattern.id,
          patternName: selectedPattern.name,
          symbol: selectedSymbol,
          symbolLabel,
          showGrid,
          soundEnabled,
          totalFlashes: flashes,
          roundCount: flashes,
          assignmentTask: assignmentTask
            ? {
                id: assignmentTask.id,
                status: assignmentTask.status,
                dayNumber: assignmentTask.dayNumber,
                taskOrder: assignmentTask.taskOrder,
                currentLevel: assignmentTask.currentLevel,
                durationSeconds: assignmentTask.durationSeconds,
                exerciseSlug: assignmentTask.exerciseSlug,
              }
            : null,
        },
      } satisfies SecureExerciseResultInput;

      pendingResultRef.current = payload;
      void persistResult(payload);
    },
    [
      assignmentTask,
      clearTimers,
      isAssignmentMode,
      isEducationProgramMode,
      persistResult,
      resolvedDurationSeconds,
      resolvedLevel,
      selectedPattern.id,
      selectedPattern.name,
      selectedSymbol,
      showGrid,
      soundEnabled,
      symbolLabel,
    ],
  );

  useEffect(() => {
    if (status !== "running") {
      clearTimers();
      return;
    }

    const positions = patternPositionsRef.current.length > 0 ? patternPositionsRef.current : generatePatternPositions(selectedPattern.id, 100);
    patternPositionsRef.current = positions;
    positionIndexRef.current = Math.min(positionIndexRef.current, Math.max(positions.length - 1, 0));

    const flashOnce = () => {
      if (phaseRef.current !== "running" || positions.length === 0) {
        return;
      }

      const currentIndex = positionIndexRef.current % positions.length;
      setPosition(positions[currentIndex]);
      setIsVisible(true);
      playFlashTone();

      flashTimeoutRef.current = window.setTimeout(() => {
        if (phaseRef.current !== "running") {
          return;
        }

        setIsVisible(false);
        setTotalFlashes((prev) => {
          const next = prev + 1;
          totalFlashesRef.current = next;
          return next;
        });
        positionIndexRef.current = (currentIndex + 1) % positions.length;
        flashTimeoutRef.current = window.setTimeout(flashOnce, levelTiming.gapMs);
      }, levelTiming.flashMs);
    };

    flashTimeoutRef.current = window.setTimeout(flashOnce, 120);
    clockIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= resolvedDurationSeconds) {
          window.setTimeout(() => finishExercise("natural"), 0);
          return resolvedDurationSeconds;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearTimers();
    };
  }, [clearTimers, finishExercise, levelTiming.flashMs, levelTiming.gapMs, playFlashTone, resolvedDurationSeconds, selectedPattern.id, status]);

  const startExercise = useCallback(() => {
    clearTimers();
    resetSaveState();
    totalFlashesRef.current = 0;
    positionIndexRef.current = 0;
    patternPositionsRef.current = generatePatternPositions(selectedPattern.id, 100);
    setElapsedSeconds(0);
    setTotalFlashes(0);
    setPosition(patternPositionsRef.current[0] ?? { x: 50, y: 50 });
    setIsVisible(false);
    setStatus("running");
  }, [clearTimers, resetSaveState, selectedPattern.id]);

  const pauseExercise = useCallback(() => {
    if (status !== "running") {
      return;
    }

    clearTimers();
    setIsVisible(false);
    setStatus("paused");
  }, [clearTimers, status]);

  const resumeExercise = useCallback(() => {
    if (status !== "paused") {
      return;
    }

    setStatus("running");
  }, [status]);

  const stopExercise = useCallback(() => {
    clearTimers();
    setIsVisible(false);
    setStatus("idle");
  }, [clearTimers]);

  const resetExercise = useCallback(() => {
    clearTimers();
    resetSaveState();
    totalFlashesRef.current = 0;
    positionIndexRef.current = 0;
    patternPositionsRef.current = [];
    setStatus("idle");
    setElapsedSeconds(0);
    setTotalFlashes(0);
    setIsVisible(false);
    setPosition({ x: 50, y: 50 });
    setSaveMessage("");
  }, [clearTimers, resetSaveState]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await workspaceRef.current?.requestFullscreen();
    } catch {
      // Bazı tarayıcılar tam ekran isteğini desteklemeyebilir.
    }
  }, []);

  const resolvedStatusLabel =
    status === "running"
      ? "Çalışma sürüyor"
      : status === "paused"
        ? "Duraklatıldı"
        : status === "result"
          ? "Tamamlandı"
          : isAssignmentMode
            ? "Ödev hazırlığı"
            : isEducationProgramMode
              ? "Program hazırlığı"
              : "Hazırlık";

  return (
    <div ref={workspaceRef} className={themeRootClassName}>
      <ExerciseStage
        title="Göz Kaslarını Geliştirme Çalışması"
        subtitle={resolvedStatusLabel}
        status={
          <>
            <span className={`compact-stat-chip ${styles.statChipOverride}`}>Seviye: {resolvedLevel}</span>
            <span className={`compact-stat-chip ${styles.statChipOverride}`}>Gösterim: {totalFlashes}</span>
            {!isEducationProgramMode ? <span className={`compact-stat-chip ${styles.statChipOverride}`}>Süre: {formatTime(elapsedSeconds)}</span> : null}
            <span className={`compact-stat-chip ${styles.statChipOverride}`}>Desen: {selectedPattern.name}</span>
            {isAssignmentMode ? (
              <span className={`compact-stat-chip ${styles.statChipOverride}`}>Ödev: {assignmentTask?.dayNumber}.{assignmentTask?.taskOrder}</span>
            ) : null}
          </>
        }
        onExit={() => router.push("/egzersizler")}
        settings={
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold">
              <span>Seviye</span>
              <select
                value={resolvedLevel}
                disabled={status === "running" || status === "paused" || isAssignmentMode || isEducationProgramMode}
                onChange={(event) => setSelectedLevel(clampLevel(Number(event.target.value)))}
                className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level}. Seviye
                  </option>
                ))}
              </select>
            </label>

            {!isAssignmentMode && !isEducationProgramMode ? (
              <label className="grid gap-2 text-sm font-bold">
                <span>Süre</span>
                <select
                  value={selectedDurationMinutes}
                  disabled={status === "running" || status === "paused"}
                  onChange={(event) => setSelectedDurationMinutes(clampDurationMinutes(Number(event.target.value)))}
                  className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} dk
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="grid gap-2 text-sm font-bold">
                <span>Süre</span>
                <div className={`min-h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 ${styles.settingsSelect}`}>
                  {formatDuration(resolvedDurationSeconds)}
                </div>
              </div>
            )}

            <label className="grid gap-2 text-sm font-bold">
              <span>Desen</span>
              <select
                value={selectedPattern.id}
                disabled={status === "running" || status === "paused" || availablePatternsForLevel.length === 0}
                onChange={(event) => setSelectedPatternId(event.target.value)}
                className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
              >
                {availablePatternsForLevel.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.icon} {pattern.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              <span>Simge</span>
              <select
                value={selectedSymbol}
                onChange={(event) => setSelectedSymbol(event.target.value)}
                className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
              >
                {SYMBOL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              <span>Ses</span>
              <select
                value={soundEnabled ? "on" : "off"}
                onChange={(event) => setSoundEnabled(event.target.value === "on")}
                className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
              >
                <option value="on">Açık</option>
                <option value="off">Kapalı</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              <span>Grid</span>
              <select
                value={showGrid ? "on" : "off"}
                onChange={(event) => setShowGrid(event.target.value === "on")}
                className={`min-h-11 rounded-xl border border-slate-300 px-3 ${styles.settingsSelect}`}
              >
                <option value="on">Görünür</option>
                <option value="off">Gizli</option>
              </select>
            </label>
          </div>
        }
        footer={
          <div className="flex flex-wrap justify-center gap-2">
            {status === "idle" ? (
              <button
                type="button"
                onClick={startExercise}
                className={`min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white ${styles.startButton}`}
              >
                Başlat
              </button>
            ) : null}

            {status === "running" ? (
              <button
                type="button"
                onClick={pauseExercise}
                className={`min-h-11 rounded-xl bg-amber-600 px-5 font-bold text-white ${styles.stopButton}`}
              >
                Duraklat
              </button>
            ) : null}

            {status === "paused" ? (
              <button
                type="button"
                onClick={resumeExercise}
                className={`min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white ${styles.startButton}`}
              >
                Devam Et
              </button>
            ) : null}

            <button
              type="button"
              onClick={stopExercise}
              className={`min-h-11 rounded-xl bg-red-600 px-5 font-bold text-white ${styles.stopButton}`}
            >
              Durdur
            </button>

            <button
              type="button"
              onClick={resetExercise}
              className={`min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold ${styles.secondaryButton}`}
            >
              Sıfırla
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className={`min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold ${styles.secondaryButton}`}
            >
              {isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
            </button>
          </div>
        }
      >
        <main className="h-full min-h-0 min-w-0 w-full max-w-full overflow-hidden bg-white text-slate-900">
          <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
            <section
              className={`relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.05),_rgba(255,255,255,1)_55%,_rgba(248,250,252,1))] shadow-sm ${styles.stageBackground}`}
            >
              <div
                className={`absolute left-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur ${styles.infoPanel}`}
              >
                Seçilen simge: <span className="ml-1 text-xl">{selectedSymbol}</span>
                <span className={`ml-2 font-black text-slate-900 ${styles.infoPanelValue}`}>{symbolLabel}</span>
              </div>

              <div
                className={`absolute right-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur ${styles.infoPanel}`}
              >
                {selectedPattern.icon} {selectedPattern.name}
              </div>

              {showGrid ? (
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className={`absolute left-1/3 top-0 h-full w-px bg-slate-300 ${styles.gridLine}`} />
                  <div className={`absolute left-2/3 top-0 h-full w-px bg-slate-300 ${styles.gridLine}`} />
                  <div className={`absolute left-0 top-1/3 h-px w-full bg-slate-300 ${styles.gridLine}`} />
                  <div className={`absolute left-0 top-2/3 h-px w-full bg-slate-300 ${styles.gridLine}`} />
                </div>
              ) : null}

              <div
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
              >
                <span
                  className={`select-none text-6xl md:text-7xl transition-opacity duration-100 ${
                    status === "running" && isVisible ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={status !== "running" || !isVisible}
                >
                  {selectedSymbol}
                </span>
              </div>

              {status === "idle" ? (
                <div
                  className={`absolute inset-0 z-30 flex items-center justify-center bg-white/55 p-6 text-center backdrop-blur-sm ${styles.introOverlay}`}
                >
                  <div className={`max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ${styles.introCard}`}>
                    <div
                      className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-5xl shadow-sm ${styles.introBadge}`}
                    >
                      {selectedSymbol}
                    </div>

                    <h2 className={`text-xl font-black text-slate-950 ${styles.introTitle}`}>
                      Simgeyi gözlerinle takip et
                    </h2>

                    <p className={`mt-2 text-sm leading-6 text-slate-600 ${styles.introBody}`}>
                      Başlat düğmesine bastığında seçilen simge seçili desenin
                      koordinatlarında yanıp söner. Simgeyi gözünle takip ederek
                      göz kaslarını güçlendir.
                    </p>
                  </div>
                </div>
              ) : null}

              {status === "paused" ? (
                <div className={`absolute inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-6 text-center backdrop-blur-sm ${styles.introOverlay}`}>
                  <div className={`max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ${styles.introCard}`}>
                    <h2 className={`text-xl font-black text-slate-950 ${styles.introTitle}`}>Çalışma duraklatıldı</h2>
                    <p className={`mt-2 text-sm leading-6 text-slate-600 ${styles.introBody}`}>
                      Devam Et ile kaldığın yerden sürdürebilirsin.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </section>
        </main>

        {status === "result" ? (
          <section className="mx-auto mt-4 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Çalışma Sonucu</h2>
            <p className="mt-1 text-sm text-slate-600">
              {saveStatus === "success" ? "Sonuç kaydedildi." : saveMessage || "Sonuç işleniyor..."}
            </p>

            {saveStatus !== "idle" ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  saveStatus === "error" || saveMessage.includes("görev")
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-blue-200 bg-blue-50 text-blue-800"
                }`}
              >
                <p>{saveMessage}</p>
                {saveStatus === "error" ? (
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-xl bg-amber-700 px-4 text-white"
                    onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}
                  >
                    Yeniden Dene
                  </button>
                ) : null}
              </div>
            ) : null}

            {completionStatus.state !== "idle" ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  completionStatus.state === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-800"
                }`}
              >
                <p>{completionStatus.message}</p>
                {completionStatus.state === "error" && completionStatus.canRetry ? (
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-xl bg-amber-700 px-4 text-white"
                    onClick={() => void retryTaskCompletion()}
                  >
                    Program ilerlemesini yeniden dene
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-xs uppercase text-slate-500">Gösterim</p>
                <p className="mt-2 text-3xl font-black text-red-700">{totalFlashes}</p>
              </article>
              <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
                <p className="text-xs uppercase text-slate-500">Süre</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{formatTime(resolvedDurationSeconds)}</p>
              </article>
              <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
                <p className="text-xs uppercase text-slate-500">Seviye</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{resolvedLevel}</p>
              </article>
              <article className="rounded-2xl border border-red-100 bg-white p-4 text-center">
                <p className="text-xs uppercase text-slate-500">Tür</p>
                <p className="mt-2 text-3xl font-black text-slate-900">eye-muscle</p>
              </article>
            </div>

            <div className="mt-4 rounded-2xl border border-red-100 bg-white p-4 text-sm text-slate-700">
              <p>
                <strong>Desen:</strong> {selectedPattern.name}
              </p>
              <p className="mt-1">
                <strong>Simge:</strong> {symbolLabel}
              </p>
              <p className="mt-1">
                <strong>Mod:</strong>{" "}
                {isEducationProgramMode ? "Eğitim Programı" : isAssignmentMode ? "Ödev" : "Serbest kullanım"}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={resetExercise}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold"
              >
                Tekrar Çalış
              </button>
            </div>
          </section>
        ) : null}
      </ExerciseStage>
    </div>
  );
}
