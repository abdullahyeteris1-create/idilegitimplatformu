"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { useExerciseTimer } from "@/hooks/useExerciseTimer";
import {
  calculateIntervalMs,
  calculateRemainingActiveSeconds,
  calculateTotalActiveSeconds,
  createWordBlocks,
  hasReachedAssignedDuration,
  splitTextIntoWords,
  type BlockReadingSpeedMode,
} from "@/lib/exercise-engine/blockReading";
import { getResolvedCurrentUser } from "@/lib/auth/auth";
import { normalizeReadingSpeed } from "@/lib/exercises/timing";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { pickEducationProgramSettingOption } from "@/lib/education-programs/exerciseSettingsSchemas";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { getTextCategories, loadActiveTextLibraryItems, type TextLibraryLoadResult } from "@/lib/settings/textLibraryStorage";
import { getDisplayTextTitle, sortByCategoryAndTitle } from "@/lib/text-library/sorting";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/block-reading-theme.module.css";

type ExercisePhase = "setup" | "ready" | "running" | "result";
type BlockSize = 1 | 2 | 3 | 4 | 5;
type FontSizePx = 24 | 32 | 40 | 48 | 56;
type ReadableText = {
  id: string;
  title: string;
  category: string;
  text: string;
};
type BlockReadingResult = {
  completed: boolean;
  completedBlocks: number;
  totalBlocks: number;
  totalWords: number;
  durationSeconds: number;
  score: number;
  successRate: number;
  intervalMs: number;
};
type SaveStatus = "idle" | "saving" | "success" | "error";
type NewTextNotice = {
  cumulativeActiveSeconds: number;
  remainingSeconds: number;
  completedTextCount: number;
};

const EXPECTED_RESULT_EXERCISE_TYPE = "block-reading";
// Result API whitelist ust siniriyla ayni (bkz. route.ts MAX_DURATION_SECONDS)
// - gercek biriken aktif sure gonderilir, yalniz bu guvenlik siniriyla kirpilir.
const MAX_RESULT_DURATION_SECONDS = 21_600;
const BLOCK_SIZE_OPTIONS: BlockSize[] = [1, 2, 3, 4, 5];
const SPEED_MODE_OPTIONS: BlockReadingSpeedMode[] = ["interval", "wpm"];
const INTERVAL_MS_OPTIONS = [250, 500, 750, 1000, 1500, 2000, 3000, 5000];
const WORDS_PER_MINUTE_OPTIONS = [50, 100, 150, 200, 250, 300, 400, 500];

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";
const ALL_CATEGORIES = "all";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getFontLabel(fontSize: FontSizePx): string {
  if (fontSize === 24) {
    return "Kucuk";
  }

  if (fontSize === 32) {
    return "Orta";
  }

  if (fontSize === 40) {
    return "Buyuk";
  }

  return "Cok Buyuk";
}

export function BlockReadingExerciseClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
} = {}) {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const saveLockRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<SecureExerciseResultInput | null>(null);
  // Egitim Programi coklu-metin biriken sure modeli: bu iki ref, ayni client
  // yasam dongusu icinde onceki metinlerde biriken aktif saniyeyi ve
  // tamamen bitirilen metin sayisini tutar - sayfa yenilenirse kaybolur
  // (kasitli, bu ilk surumun bilinen siniri).
  const cumulativeActiveSecondsRef = useRef(0);
  const completedTextCountRef = useRef(0);
  const textEndInFlightRef = useRef(false);

  const isAssignmentMode = useIsAssignmentMode();
  const isEducationProgramMode = Boolean(educationProgramLaunch);
  const assignedDurationSeconds = educationProgramLaunch?.durationSeconds ?? Number.POSITIVE_INFINITY;

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadableText[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [textId, setTextId] = useState<string>("");
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [textDiagnostics, setTextDiagnostics] = useState<TextLibraryLoadResult["diagnostics"] | null>(null);
  const [blockSize, setBlockSize] = useState<BlockSize>(() =>
    pickEducationProgramSettingOption(educationProgramLaunch?.settings, "blockSize", BLOCK_SIZE_OPTIONS, 3),
  );
  const [speedMode, setSpeedMode] = useState<BlockReadingSpeedMode>(() =>
    pickEducationProgramSettingOption(educationProgramLaunch?.settings, "speedMode", SPEED_MODE_OPTIONS, "interval"),
  );
  const [intervalInputMs, setIntervalInputMs] = useState(() =>
    pickEducationProgramSettingOption(educationProgramLaunch?.settings, "intervalMs", INTERVAL_MS_OPTIONS, 750),
  );
  const [wordsPerMinute, setWordsPerMinute] = useState(() =>
    pickEducationProgramSettingOption(educationProgramLaunch?.settings, "wordsPerMinute", WORDS_PER_MINUTE_OPTIONS, 150),
  );
  const [wordsPerMinuteInput, setWordsPerMinuteInput] = useState(() =>
    String(pickEducationProgramSettingOption(educationProgramLaunch?.settings, "wordsPerMinute", WORDS_PER_MINUTE_OPTIONS, 150)),
  );
  const [readingSpeedError, setReadingSpeedError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<FontSizePx>(40);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<BlockReadingResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [newTextNotice, setNewTextNotice] = useState<NewTextNotice | null>(null);

  const educationProgramTaskId =
    isEducationProgramMode && !isAssignmentMode ? educationProgramLaunch?.taskId : undefined;
  const { completionStatus, completeTaskAfterResultSave, retryTaskCompletion } =
    useEducationProgramTaskCompletion(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsTeacher(getResolvedCurrentUser()?.role === "teacher");
        setIsLoadingTexts(true);
        setTextLoadError(null);

        const result = await loadActiveTextLibraryItems();
        const activeTexts = result.items.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          text: item.content,
        }));

        setLibraryTexts(activeTexts);
        setTextLoadError(result.error);
        setTextDiagnostics(result.diagnostics ?? null);
        setTextId(activeTexts[0]?.id ?? "");
        setCategory(ALL_CATEGORIES);
        setIsLoadingTexts(false);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const availableTexts = useMemo<ReadableText[]>(() => {
    return libraryTexts;
  }, [libraryTexts]);

  const hasActiveTexts = availableTexts.length > 0;

  const availableCategories = useMemo<string[]>(() => {
    return [ALL_CATEGORIES, ...getTextCategories()];
  }, []);

  const sortedTexts = useMemo<ReadableText[]>(() => {
    const categoryOrder = availableCategories.filter((item) => item !== ALL_CATEGORIES);
    return sortByCategoryAndTitle(availableTexts, { categoryOrder });
  }, [availableCategories, availableTexts]);

  const resolvedCategory = useMemo(() => {
    return availableCategories.includes(category) ? category : ALL_CATEGORIES;
  }, [availableCategories, category]);

  const textsByCategory = useMemo(() => {
    if (resolvedCategory === ALL_CATEGORIES) {
      return sortedTexts;
    }

    return sortedTexts.filter((item) => item.category === resolvedCategory);
  }, [resolvedCategory, sortedTexts]);

  const resolvedTextId = useMemo(() => {
    if (textsByCategory.length === 0) {
      return "";
    }

    const exists = textsByCategory.some((item) => item.id === textId);
    return exists ? textId : textsByCategory[0].id;
  }, [textId, textsByCategory]);

  const selectedText = useMemo(() => {
    return sortedTexts.find((item) => item.id === resolvedTextId) ?? null;
  }, [resolvedTextId, sortedTexts]);

  const words = useMemo(() => {
    if (!selectedText) {
      return [];
    }

    return splitTextIntoWords(selectedText.text);
  }, [selectedText]);

  const blocks = useMemo(() => {
    return createWordBlocks(words, blockSize);
  }, [blockSize, words]);

  const totalBlocks = blocks.length;
  const totalWords = words.length;
  const safeWordsPerMinute = normalizeReadingSpeed(wordsPerMinute, 150, 1);
  const currentBlock = blocks[currentBlockIndex] ?? "";
  const currentBlockWordCount = currentBlock
    ? currentBlock.split(/\s+/).filter(Boolean).length
    : blockSize;

  const intervalMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [blockSize, intervalInputMs, safeWordsPerMinute, speedMode]);

  const timerDelayMs = useMemo(() => {
    return calculateIntervalMs({
      mode: speedMode,
      blockSize: currentBlockWordCount,
      intervalMs: intervalInputMs,
      wordsPerMinute: safeWordsPerMinute,
    });
  }, [currentBlockWordCount, intervalInputMs, safeWordsPerMinute, speedMode]);

  const speedLabel =
    speedMode === "interval"
      ? `Atlama hizi: ${intervalMs} ms`
      : `Hiz: ${safeWordsPerMinute} kelime/dk (${intervalMs} ms)`;
  const transitionSeconds = timerDelayMs / 1000;
  const transitionSecondsLabel = transitionSeconds >= 10
    ? transitionSeconds.toFixed(0)
    : transitionSeconds >= 1
      ? transitionSeconds.toFixed(1)
      : transitionSeconds.toFixed(2);

  const commitWordsPerMinuteInput = useCallback((rawValue: string): boolean => {
    if (rawValue.trim() === "") {
      setReadingSpeedError("Okuma hızı 1 veya daha büyük bir sayı olmalıdır.");
      setWordsPerMinuteInput(String(wordsPerMinute));
      return false;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setReadingSpeedError("Okuma hızı 1 veya daha büyük bir sayı olmalıdır.");
      setWordsPerMinuteInput(String(wordsPerMinute));
      return false;
    }

    const nextSpeed = Math.max(1, Math.round(parsed));
    setWordsPerMinute(nextSpeed);
    setWordsPerMinuteInput(String(nextSpeed));
    setReadingSpeedError(null);
    return true;
  }, [wordsPerMinute]);

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

  const finalizeExercise = useCallback((completed: boolean) => {
    if (!selectedText || totalBlocks === 0 || saveLockRef.current) {
      return;
    }

    saveLockRef.current = true;
    const completedBlocks = completed ? totalBlocks : Math.min(currentBlockIndex + 1, totalBlocks);
    const successRate = Math.round((completedBlocks / totalBlocks) * 100);
    const score = completed ? 100 : successRate;
    const startedAt = startedAtRef.current;
    // Egitim Programi modunda sure, biriken (onceki metinler + bu metin)
    // yalniz-aktif-calisirken-artan toplam saniyeden gelir - Date.now() farki
    // KULLANILMAZ (pause suresini de icerebilir). Standalone modda mevcut
    // davranis (Date.now() farki, yoksa elapsedSeconds) aynen korunur.
    const durationSeconds = isEducationProgramMode
      ? Math.max(1, cumulativeActiveSecondsRef.current)
      : Math.max(1, startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds);

    const payload = {
      exerciseType: "block-reading",
      exerciseTitle: "Blok Okuma",
      durationSeconds,
      correctCount: 0,
      wrongCount: 0,
      score,
      successRate,
      details: {
        category: selectedText.category,
        textTitle: selectedText.title,
        totalWords,
        totalBlocks,
        blockSize,
        speedMode,
        intervalMs,
        wordsPerMinute: speedMode === "wpm" ? safeWordsPerMinute : undefined,
        fontSize,
        ...(isEducationProgramMode
          ? {
              completedTextCount: completed
                ? completedTextCountRef.current + 1
                : completedTextCountRef.current,
              assignedDurationSeconds: educationProgramLaunch?.durationSeconds ?? 0,
              cumulativeActiveSeconds: Math.min(cumulativeActiveSecondsRef.current, MAX_RESULT_DURATION_SECONDS),
              lastTextId: selectedText.id,
            }
          : {}),
      },
    } satisfies SecureExerciseResultInput;

    setResult({
      completed,
      completedBlocks,
      totalBlocks,
      totalWords,
      durationSeconds,
      score,
      successRate,
      intervalMs,
    });
    setPhase("result");
    setIsPaused(false);
    pendingResultRef.current = payload;
    void persistResult(payload);
  }, [
    blockSize,
    currentBlockIndex,
    educationProgramLaunch?.durationSeconds,
    elapsedSeconds,
    fontSize,
    intervalMs,
    isEducationProgramMode,
    persistResult,
    selectedText,
    speedMode,
    totalBlocks,
    totalWords,
    safeWordsPerMinute,
  ]);

  const resetFlowToReady = useCallback(() => {
    saveLockRef.current = true;
    startedAtRef.current = null;
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
    saveInFlightRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    setSaveStatus("idle");
    setSaveMessage("");
  }, []);

  const handleStart = () => {
    saveLockRef.current = false;
    startedAtRef.current = null;
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("ready");
    textEndInFlightRef.current = false;
  };

  const handleBeginPlay = () => {
    if (!selectedText || totalBlocks === 0) {
      return;
    }

    if (speedMode === "wpm" && !commitWordsPerMinuteInput(wordsPerMinuteInput)) {
      return;
    }

    saveLockRef.current = false;
    startedAtRef.current = Date.now();
    setCurrentBlockIndex(0);
    setElapsedSeconds(0);
    setResult(null);
    setIsPaused(false);
    setPhase("running");
    setNewTextNotice(null);
    textEndInFlightRef.current = false;
  };

  const handleRestart = () => {
    // "Yeniden Baslat", ayni Egitim Programi gorevi icinde yeni bir metne
    // gecmekten FARKLI bir eylemdir: butun gorevi bastan baslatir, bu yuzden
    // biriken sure/tamamlanan metin sayacini da sifirlar. resetFlowToReady
    // (metinler arasi gecis) bunlara bilerek dokunmaz.
    cumulativeActiveSecondsRef.current = 0;
    completedTextCountRef.current = 0;
    textEndInFlightRef.current = false;
    setNewTextNotice(null);
    resetFlowToReady();
  };

  const handleTextEnd = useCallback(
    (completedText: boolean) => {
      if (!isEducationProgramMode) {
        finalizeExercise(completedText);
        return;
      }

      if (textEndInFlightRef.current) {
        return;
      }
      textEndInFlightRef.current = true;

      const nextTotalActiveSeconds = calculateTotalActiveSeconds(
        cumulativeActiveSecondsRef.current,
        elapsedSeconds,
      );
      cumulativeActiveSecondsRef.current = nextTotalActiveSeconds;

      if (completedText) {
        completedTextCountRef.current += 1;
      }

      if (hasReachedAssignedDuration(assignedDurationSeconds, nextTotalActiveSeconds, 0)) {
        finalizeExercise(completedText);
        return;
      }

      textEndInFlightRef.current = false;
      setNewTextNotice({
        cumulativeActiveSeconds: nextTotalActiveSeconds,
        remainingSeconds: calculateRemainingActiveSeconds(assignedDurationSeconds, nextTotalActiveSeconds, 0),
        completedTextCount: completedTextCountRef.current,
      });
      resetFlowToReady();
    },
    [assignedDurationSeconds, elapsedSeconds, finalizeExercise, isEducationProgramMode, resetFlowToReady],
  );

  const handleFinishEarly = () => {
    handleTextEnd(false);
  };

  const advanceBlock = useCallback(() => {
    if (currentBlockIndex >= totalBlocks - 1) {
      handleTextEnd(true);
      return;
    }

    setCurrentBlockIndex((current) => Math.min(current + 1, totalBlocks - 1));
  }, [currentBlockIndex, handleTextEnd, totalBlocks]);

  useExerciseTimer({
    running: phase === "running" && totalBlocks > 0,
    paused: isPaused,
    delayMs: totalBlocks > 0 ? timerDelayMs : null,
    onTick: advanceBlock,
  });

  // Ogretmenin belirledigi gorev suresi bir metnin ORTASINDA dolabilir - bu
  // efekt, mevcut tek aktif-saniye sayacini (elapsedSeconds) izleyerek bunu
  // yakalar; ikinci/bagimsiz bir setInterval KURULMAZ.
  useEffect(() => {
    if (!isEducationProgramMode || phase !== "running" || isPaused) {
      return;
    }

    if (hasReachedAssignedDuration(assignedDurationSeconds, cumulativeActiveSecondsRef.current, elapsedSeconds)) {
      handleTextEnd(false);
    }
  }, [assignedDurationSeconds, elapsedSeconds, handleTextEnd, isEducationProgramMode, isPaused, phase]);

  useEffect(() => {
    if (phase !== "running" || isPaused) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPaused, phase]);

  const completedBlocks = phase === "running" ? Math.min(currentBlockIndex + 1, totalBlocks) : 0;
  const progressPercent = totalBlocks === 0 ? 0 : Math.round((completedBlocks / totalBlocks) * 100);

  const footerControls = (
    <div className="grid gap-3 lg:grid-cols-7">
      <label className="flex min-w-0 flex-col gap-1 lg:col-span-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Kategori</span>
        <select value={resolvedCategory} onChange={(event) => {
          setCategory(event.target.value);
          setTextId("");
          resetFlowToReady();
        }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {availableCategories.map((item) => (
            <option key={item} value={item}>
              {item === ALL_CATEGORIES ? "Tümü" : item}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 lg:col-span-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Metin</span>
        <select value={resolvedTextId} onChange={(event) => {
          setTextId(event.target.value);
          resetFlowToReady();
        }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {textsByCategory.map((item) => (
            <option key={item.id} value={item.id}>
              {getDisplayTextTitle(item.title)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Kelime Sayısı</span>
        <select value={blockSize} disabled={isEducationProgramMode} onChange={(event) => {
          const nextBlockSize = Number(event.target.value);
          if (!Number.isFinite(nextBlockSize)) return;
          setBlockSize(nextBlockSize as BlockSize);
          resetFlowToReady();
        }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Hız Modu</span>
        <select value={speedMode} disabled={isEducationProgramMode} onChange={(event) => {
          const nextMode = event.target.value as BlockReadingSpeedMode;
          setSpeedMode(nextMode);
          if (nextMode === "wpm") {
            setWordsPerMinuteInput(String(safeWordsPerMinute));
            setReadingSpeedError(null);
          }
        }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          <option value="interval">Atlama Hızı</option>
          <option value="wpm">Kelime / Dakika</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>
          {speedMode === "interval" ? "Hız" : "Okuma Hızı (kelime/dk)"}
        </span>
        {speedMode === "interval" ? (
          <input type="number" min={100} step={50} value={intervalInputMs} disabled={isEducationProgramMode} onChange={(event) => {
            const nextSpeed = Number(event.target.value);
            if (!Number.isFinite(nextSpeed)) return;
            setIntervalInputMs(Math.min(60_000, Math.max(100, nextSpeed)));
          }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`} />
        ) : (
          <>
            <input
              type="number"
              step={1}
              inputMode="numeric"
              value={wordsPerMinuteInput}
              disabled={isEducationProgramMode}
              onChange={(event) => {
                const rawValue = event.target.value;
                setWordsPerMinuteInput(rawValue);

                if (rawValue.trim() === "") {
                  setReadingSpeedError(null);
                  return;
                }

                const parsed = Number(rawValue);
                if (!Number.isFinite(parsed) || parsed < 1) {
                  setReadingSpeedError("Okuma hızı 1 veya daha büyük bir sayı olmalıdır.");
                  return;
                }

                setWordsPerMinute(Math.max(1, Math.round(parsed)));
                setReadingSpeedError(null);
              }}
              onBlur={() => {
                void commitWordsPerMinuteInput(wordsPerMinuteInput);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void commitWordsPerMinuteInput(wordsPerMinuteInput);
                }
              }}
              className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
            />
            {readingSpeedError ? <p className={`text-xs font-semibold text-red-700 ${styles.errorText}`}>{readingSpeedError}</p> : null}
            <p className={`text-[11px] text-slate-500 ${styles.helperText}`}>Geçiş süresi: {transitionSecondsLabel.replace(".", ",")} saniye</p>
            {safeWordsPerMinute > 1500 ? <p className={`text-[11px] text-amber-700 ${styles.warnText}`}>Çok yüksek hızlarda kelimeler çok kısa süre görünür.</p> : null}
          </>
        )}
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Font</span>
        <select value={fontSize} onChange={(event) => {
          setFontSize(Number(event.target.value) as FontSizePx);
          if (isPaused) {
            resetFlowToReady();
          }
        }} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {[24, 32, 40, 48, 56].map((value) => (
            <option key={value} value={value}>
              {getFontLabel(value as FontSizePx)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
        {phase === "ready" ? (
          <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleBeginPlay} disabled={!selectedText || totalBlocks === 0}>
            {newTextNotice ? "Yeni Metinle Devam Et" : "Başlat"}
          </button>
        ) : (
          <>
            <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={() => setIsPaused((prev) => !prev)}>
              {isPaused ? "Devam Et" : "Duraklat"}
            </button>
            <div className="flex gap-2">
              <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart}>
                Yeniden Başlat
              </button>
              <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleFinishEarly}>
                Bitir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseIntro
          title="Blok Okuma"
          description="Kelimeleri gruplar halinde görerek okuma alanını genişlet. Eğitime başla ile tam ekran çalışma moduna geçersin."
          buttonLabel="Eğitime Başla"
          onStart={handleStart}
        />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={themeRootClassName}>
      <FullscreenExerciseShell
        title="Blok Okuma"
        subtitle="Hazırlık modu"
        stats={[
          { label: "Hız", value: speedLabel, tone: "brand" },
          { label: "Kelime", value: totalWords },
          { label: "Blok", value: totalBlocks },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName={`fx-slide-up flex min-h-[300px] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-4 py-5 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[350px] ${styles.stageOverride}`}
        footer={footerControls}
        settings={footerControls}
      >
        {isEducationProgramMode && newTextNotice ? (
          <div className={`mx-auto mb-4 flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center ${styles.noticeInfo}`}>
            <p className="text-sm font-bold text-slate-900">Görev süreniz henüz dolmadı</p>
            <p className="text-xs text-slate-700">
              Bu metni tamamladınız. Görevi tamamlamak için yeni bir metin seçerek devam etmelisiniz.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-800">
              <span>Tamamlanan süre: {formatElapsed(newTextNotice.cumulativeActiveSeconds)}</span>
              <span>
                Kalan süre:{" "}
                {Number.isFinite(newTextNotice.remainingSeconds) ? formatElapsed(newTextNotice.remainingSeconds) : "—"}
              </span>
              <span>Tamamlanan metin: {newTextNotice.completedTextCount}</span>
            </div>
          </div>
        ) : null}
        {isLoadingTexts ? (
          <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center ${styles.noticeInfo}`}>
            <p className="text-sm font-bold text-slate-900">Metinler yükleniyor...</p>
          </div>
        ) : textLoadError ? (
          <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center ${styles.noticeError}`}>
            <p className="text-sm font-bold text-red-900">{textLoadError}</p>
          </div>
        ) : hasActiveTexts && totalBlocks === 0 ? (
          <p className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 font-bold text-amber-900 ${styles.noticeWarn}`}>
            Çalıştırılacak içerik bulunamadı.
          </p>
        ) : hasActiveTexts ? (
          <>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700 ${styles.introEyebrow}`}>Hazırlık</p>
            <h2 className={`mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl ${styles.introTitle}`}>Ayarlarını seç, hazır olduğunda başlat.</h2>
            <p className={`mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base ${styles.introBody}`}>
              Kategori, metin, blok boyutu, hız ve font ayarlarını alt bardan yap. Başlat dediğinde bloklar tam ekran sahnede akmaya başlar.
            </p>
          </>
        ) : (
          <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center ${styles.noticeWarn}`}>
            <p className="text-sm font-bold text-amber-900">Metin Kütüphanesinde aktif metin bulunamadı.</p>
            {process.env.NODE_ENV !== "production" && textDiagnostics ? (
              <p className="text-xs text-amber-800">
                Teşhis: Supabase {textDiagnostics.supabaseCount}, localStorage {textDiagnostics.localStorageCount}, filtre {textDiagnostics.activeFilter}, kaynak {textDiagnostics.source}
                {textDiagnostics.error ? `, hata: ${textDiagnostics.error}` : ""}
              </p>
            ) : null}
            <p className="text-sm text-amber-800">
              {isTeacher
                ? "Blok Okuma, Golgeleme, Odakli Okuma ve Anlama Testi icin metin ekleyin."
                : "Bu çalışma için henüz öğretmeniniz tarafından metin eklenmemiş."}
            </p>
            {isTeacher ? (
              <Link
                href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-900/25 bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Metin Ekle
              </Link>
            ) : null}
          </div>
        )}
      </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "result" && selectedText && result) {
    return (
      <div className={themeRootClassName}>
      <section className={`idil-card mx-auto w-full max-w-5xl p-4 md:p-6 ${styles.resultCardOverride}`}>
        <h2 className={`text-2xl font-bold ${styles.resultTitle}`}>Blok Okuma Sonucu</h2>
        <p className={`mt-1 text-sm text-[var(--muted)] ${styles.resultMuted}`}>
          {saveStatus === "success"
            ? result.completed
              ? "Metin tamamlandi."
              : "Egzersiz erken bitirildi."
            : saveMessage}
        </p>
        {saveStatus === "error" ? (
          <div className={`mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 ${styles.noticeError}`}>
            <p>{saveMessage}</p>
            <button
              type="button"
              className="mt-2 min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
              onClick={() => {
                const pending = pendingResultRef.current;
                if (pending) {
                  saveCompletedRef.current = false;
                  void persistResult(pending);
                }
              }}
            >
              Yeniden Dene
            </button>
          </div>
        ) : null}
        {completionStatus.state !== "idle" ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
              completionStatus.state === "error"
                ? `border-red-200 bg-red-50 text-red-800 ${styles.noticeError}`
                : `border-slate-200 bg-white text-slate-800 ${styles.noticeInfo}`
            }`}
          >
            <p>{completionStatus.message}</p>
            {completionStatus.state === "error" && completionStatus.canRetry ? (
              <button
                type="button"
                className="mt-2 min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                onClick={() => void retryTaskCompletion()}
              >
                Program ilerlemesini yeniden dene
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Basari</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{result.successRate}%</p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Blok</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>
              {result.completedBlocks}/{result.totalBlocks}
            </p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Sure</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{formatElapsed(result.durationSeconds)}</p>
          </article>
        </div>

        <div className={`mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm ${styles.resultDetailCard}`}>
          <p><strong>Metin:</strong> {selectedText.title}</p>
          <p className="mt-1"><strong>Kategori:</strong> {selectedText.category}</p>
          <p className="mt-1"><strong>Toplam Kelime:</strong> {result.totalWords}</p>
          <p className="mt-1"><strong>Blok Sayisi:</strong> {result.totalBlocks}</p>
          <p className="mt-1"><strong>Kelime / Blok:</strong> {blockSize}</p>
          <p className="mt-1"><strong>Hiz Modu:</strong> {speedMode === "interval" ? "Atlama Hizi" : "Dakikadaki Kelime Hizi"}</p>
          <p className="mt-1"><strong>Atlama Hizi:</strong> {result.intervalMs} ms</p>
          {speedMode === "wpm" ? <p className="mt-1"><strong>Kelime / Dakika:</strong> {safeWordsPerMinute}</p> : null}
          <p className="mt-1"><strong>Font Boyutu:</strong> {fontSize}px</p>
          <p className="mt-1"><strong>Tamamlandi:</strong> {result.completed ? "Evet" : "Hayir"}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleRestart} disabled={saveStatus !== "success"}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            disabled={saveStatus !== "success"}
            onClick={() =>
              router.push(
                `/sonuc?exerciseType=block-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`,
              )
            }
          >
            Ortak Sonuc Ekrani
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <ExerciseNavigationControls />
        </div>
      </section>
      </div>
    );
  }

  return (
    <div className={themeRootClassName}>
    <FullscreenExerciseShell
      title="Blok Okuma"
      subtitle={selectedText?.title ?? "Tam ekran çalışma modu"}
      stats={[
        { label: "Blok", value: `${currentBlockIndex + 1}/${totalBlocks}` },
        { label: "Süre", value: formatElapsed(elapsedSeconds) },
        { label: "Hız", value: speedLabel, tone: "brand" },
        { label: "Kelime", value: blockSize },
      ]}
      finishButton={
        <button type="button" onClick={handleFinishEarly} className={`min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      footer={footerControls}
      settings={footerControls}
    >
      <div className="fx-fade-in flex w-full flex-col items-center justify-center text-center">
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.helperText}`}>Kelime Bloğu</p>
        <p key={`block-${currentBlockIndex}`} className={`fx-slide-up mt-4 font-extrabold leading-tight text-slate-900 transition-all duration-300 ${styles.runningWord}`} style={{ fontSize: `${fontSize}px`, textShadow: "0 12px 32px rgba(185, 28, 28, 0.12)" }}>
          {currentBlock}
        </p>
        <p className={`mt-4 text-sm font-semibold text-slate-500 ${styles.helperText}`}>İlerleme: %{progressPercent}</p>
      </div>
    </FullscreenExerciseShell>
    </div>
  );
}


