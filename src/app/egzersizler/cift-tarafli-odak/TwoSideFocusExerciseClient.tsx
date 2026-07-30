"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExerciseFullscreenShell from "@/components/exercises/ExerciseFullscreenShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { useAssignmentTask } from "@/components/assignments/AssignmentTaskProvider";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { pickEducationProgramSettingOption } from "@/lib/education-programs/exerciseSettingsSchemas";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import {
  buildTwoSideFocusResultPayload,
  getTwoSideFocusRemainingSeconds,
  isTwoSideFocusTimedMode,
  resolveTwoSideFocusDurationSeconds,
} from "./twoSideFocusDuration";
import styles from "@/components/exercises/two-side-focus-theme.module.css";

type ExerciseLevel = 1 | 2 | 3 | 4 | 5;
type AnswerType = "same" | "different";
type WordOffset = "normal" | "up" | "down";
type TwoSideFocusStudentWordSet = {
  base: string;
  variants: string[];
};

type WordItem = {
  id: string;
  text: string;
  offset: WordOffset;
};

type RoundData = {
  words: WordItem[];
  correctAnswer: AnswerType;
  baseWord: string;
  differentWord?: string;
};

const LEVELS: ExerciseLevel[] = [1, 2, 3, 4, 5];

const SPEED_MIN = 500;
const SPEED_MAX = 5000;
const SPEED_OPTIONS = [1500, 1200, 900, 650, 450] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];
const DEFAULT_SPEED: SpeedOption = 1500;
const NET_TARGET = 10;
const EXPECTED_RESULT_EXERCISE_TYPE = "two-side-focus";

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}



function getWordCount(level: ExerciseLevel) {
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  if (level === 4) return 4;
  return 5;
}

function getRandomItem<T>(items: readonly T[]) {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

function getDifferentVariant(wordSet: TwoSideFocusStudentWordSet): string | null {
  const variants = wordSet.variants.filter(
    (variant) => variant !== wordSet.base,
  );

  return getRandomItem(variants.length > 0 ? variants : wordSet.variants);
}

function shouldCreateSameRound() {
  return Math.random() >= 0.5;
}

function getOffsetForIndex(level: ExerciseLevel, index: number): WordOffset {
  if (level === 4) {
    if (index % 3 === 0) return "up";
    if (index % 3 === 1) return "down";
    return "normal";
  }

  if (level === 5) {
    if (index === 1 || index === 4) return "up";
    if (index === 2) return "down";
    return "normal";
  }

  return "normal";
}

function createEmptyRound(): RoundData {
  return {
    words: [],
    correctAnswer: "same",
    baseWord: "",
  };
}

function createRound(
  level: ExerciseLevel,
  wordSets: readonly TwoSideFocusStudentWordSet[],
): RoundData {
  const wordCount = getWordCount(level);
  const wordSet = getRandomItem(wordSets);
  if (!wordSet) {
    return createEmptyRound();
  }

  const isSameRound = shouldCreateSameRound();

  const words = Array.from({ length: wordCount }, (_, index) => ({
    id: `${wordSet.base}-${index}-${Date.now()}-${Math.random()}`,
    text: wordSet.base,
    offset: getOffsetForIndex(level, index),
  }));

  if (isSameRound) {
    return {
      words,
      correctAnswer: "same",
      baseWord: wordSet.base,
    };
  }

  const differentIndex = Math.floor(Math.random() * wordCount);
  const differentWord = getDifferentVariant(wordSet);
  if (!differentWord) {
    return createEmptyRound();
  }

  words[differentIndex] = {
    ...words[differentIndex],
    text: differentWord,
  };

  return {
    words,
    correctAnswer: "different",
    baseWord: wordSet.base,
    differentWord,
  };
}

function getNextLevel(level: ExerciseLevel): ExerciseLevel {
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  if (level === 4) return 5;
  return 5;
}

function getOffsetClass(offset: WordOffset) {
  if (offset === "up") return "md:-translate-y-5";
  if (offset === "down") return "md:translate-y-5";
  return "";
}

function clampSpeed(value: number) {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, value));
}

export function TwoSideFocusExerciseClient({
  educationProgramLaunch,
  initialWordSets = [],
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
  initialWordSets?: TwoSideFocusStudentWordSet[];
}) {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const wordSets = initialWordSets;

  // Egitim Programi / Odev (Assignment System V2) modlarinda sure, ogretmenin
  // sablonda/gorev snapshot'inda belirledigi deger ile SUNUCUDAN gelir ve
  // ogrenci tarafindan degistirilemez - serbest kullanimda ise (ikisi de
  // yoksa) sure kavrami hic yoktur, calisma mevcut davranisiyla suresiz
  // devam eder (bkz. Kare Gorme Alani / Goz Kaslari'ndaki ayni ayrim).
  const assignmentTask = useAssignmentTask();
  const isEducationProgramMode = Boolean(educationProgramLaunch);
  const isAssignmentMode = !isEducationProgramMode && assignmentTask !== null;
  const isTimedMode = isTwoSideFocusTimedMode(isEducationProgramMode, isAssignmentMode);

  const educationProgramDurationSeconds = educationProgramLaunch?.durationSeconds;
  const assignmentDurationSeconds = assignmentTask?.durationSeconds;
  const resolvedDurationSeconds = useMemo(
    () =>
      resolveTwoSideFocusDurationSeconds({
        isEducationProgramMode,
        isAssignmentMode,
        educationProgramDurationSeconds,
        assignmentDurationSeconds,
      }),
    [assignmentDurationSeconds, educationProgramDurationSeconds, isAssignmentMode, isEducationProgramMode],
  );

  const educationProgramTaskId = isEducationProgramMode ? educationProgramLaunch?.taskId : undefined;
  const { completionStatus, completeTaskAfterResultSave, retryTaskCompletion } = useEducationProgramTaskCompletion(
    educationProgramTaskId,
    EXPECTED_RESULT_EXERCISE_TYPE,
  );

  const initialLevel = (educationProgramLaunch?.initialLevel ?? 1) as ExerciseLevel;
  const educationProgramSpeed = pickEducationProgramSettingOption(
    educationProgramLaunch?.settings,
    "speed",
    SPEED_OPTIONS,
    DEFAULT_SPEED,
  );
  const assignmentSpeedValue = assignmentTask?.settings.speed;
  const assignmentSpeed =
    typeof assignmentSpeedValue === "number" && SPEED_OPTIONS.includes(assignmentSpeedValue as SpeedOption)
      ? (assignmentSpeedValue as SpeedOption)
      : null;
  const controlledSpeed = isEducationProgramMode ? educationProgramSpeed : assignmentSpeed;
  const isSpeedLocked = controlledSpeed !== null;
  const [level, setLevel] = useState<ExerciseLevel>(initialLevel);
  const [freeSpeed, setFreeSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
  const speed = controlledSpeed ?? freeSpeed;
  const [isRunning, setIsRunning] = useState(false);
  const [roundData, setRoundData] = useState<RoundData>(() => createRound(initialLevel, wordSets));

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({
    type: "info",
    message: "Başlat'a bas. Kelimeler aynıysa Sol, farklıysa Sağ seç.",
  });

  const answerLockedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const hasFinalizedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<SecureExerciseResultInput | null>(null);

  const netCount = correctCount - wrongCount;
  const wordCount = useMemo(() => getWordCount(level), [level]);
  const remainingSeconds = getTwoSideFocusRemainingSeconds(resolvedDurationSeconds, elapsedSeconds);
  const isTimeUp = isTimedMode && remainingSeconds <= 0;

  const clearRoundTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const persistResult = useCallback(
    async (payload: SecureExerciseResultInput) => {
      if (saveInFlightRef.current || saveCompletedRef.current) return;
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

  // Egitim Programi/Odev modunda sure dogal olarak 0'a indiginde TEK sefer
  // cagirilir (hasFinalizedRef korumasi) - calismayi durdurur ve sonucu
  // kaydeder. Serbest kullanimda isTimedMode false oldugu icin bu yol hic
  // tetiklenmez, mevcut suresiz davranis degismez.
  const finishExercise = useCallback(() => {
    if (hasFinalizedRef.current) return;
    hasFinalizedRef.current = true;

    clearRoundTimeout();
    setIsRunning(false);

    const payload = buildTwoSideFocusResultPayload({
      durationSeconds: resolvedDurationSeconds,
      correctCount,
      wrongCount,
    }) satisfies SecureExerciseResultInput;

    pendingResultRef.current = payload;
    setFeedback({
      type: "info",
      message: "Çalışma süresi doldu. Sonuç kaydediliyor...",
    });
    void persistResult(payload);
  }, [clearRoundTimeout, correctCount, persistResult, resolvedDurationSeconds, wrongCount]);

  const createNextRound = useCallback(
    (nextLevel = level) => {
      clearRoundTimeout();
      answerLockedRef.current = false;
      setRoundData(createRound(nextLevel, wordSets));
    },
    [clearRoundTimeout, level, wordSets],
  );

  const resetLevelStats = useCallback(() => {
    clearRoundTimeout();
    setCorrectCount(0);
    setWrongCount(0);
    
    answerLockedRef.current = false;
  }, [clearRoundTimeout]);

  const prepareLevel = useCallback(
    (
      nextLevel: ExerciseLevel,
      message?: string,
      type: "success" | "info" = "info",
    ) => {
      clearRoundTimeout();
      setLevel(nextLevel);
      setIsRunning(false);
      setCorrectCount(0);
      setWrongCount(0);
      setRoundData(createRound(nextLevel, wordSets));
      answerLockedRef.current = false;
      setFeedback({
        type,
        message:
          message ??
          `${nextLevel}. seviye hazır. Başlat'a bas. Aynıysa Sol, farklıysa Sağ.`,
      });
    },
    [clearRoundTimeout, wordSets],
  );

  const advanceLevel = useCallback(() => {
  clearRoundTimeout();

  if (level >= 5) {
    // 5. seviyede 10 net'e ulaşınca çalışma durmasın, kullanıcı durdurana kadar
    // aynı seviyede devam etsin.
    setCorrectCount(0);
    setWrongCount(0);
    setRoundData(createRound(level, wordSets));
    answerLockedRef.current = false;
    setIsRunning(true);
    setFeedback({
      type: "success",
      message: "Tebrikler! 5. seviyede 10 net'e ulaştın. Devam ediyorsun!",
    });
    return;
  }

  const nextLevel = getNextLevel(level);

  setLevel(nextLevel);
  setCorrectCount(0);
  setWrongCount(0);
  setRoundData(createRound(nextLevel, wordSets));
  answerLockedRef.current = false;

  // ÖNEMLİ:
  // Seviye geçince çalışma durmasın, otomatik devam etsin.
  setIsRunning(true);

  setFeedback({
    type: "success",
    message: `${nextLevel}. seviyeye otomatik geçildi. Devam et!`,
  });
}, [clearRoundTimeout, level, wordSets]);

  const handleAnswer = useCallback(
    (answer: AnswerType) => {
      if (!isRunning) {
        setFeedback({
          type: "info",
          message: "Önce Başlat'a basmalısın.",
        });
        return;
      }

      if (answerLockedRef.current) return;

      answerLockedRef.current = true;
      clearRoundTimeout();

      const isCorrect = answer === roundData.correctAnswer;

      if (isCorrect) {
        const nextCorrect = correctCount + 1;
        const nextNet = nextCorrect - wrongCount;

        setCorrectCount(nextCorrect);

        if (nextNet >= NET_TARGET) {
          setFeedback({
            type: "success",
            message: "10 net tamamlandı. Seviye atlanıyor.",
          });

          window.setTimeout(() => {
            advanceLevel();
          }, 450);

          return;
        }

        setFeedback({
          type: "success",
          message: `Doğru! Net: ${nextNet}/${NET_TARGET}`,
        });
      } else {
        const nextWrong = wrongCount + 1;
        const nextNet = correctCount - nextWrong;

        setWrongCount(nextWrong);
        setFeedback({
          type: "error",
          message: `Yanlış. Doğru cevap: ${
            roundData.correctAnswer === "same" ? "Sol / Aynı" : "Sağ / Farklı"
          }. Net: ${nextNet}/${NET_TARGET}`,
        });
      }

      window.setTimeout(() => {
        createNextRound();
      }, 300);
    },
    [
      advanceLevel,
      clearRoundTimeout,
      correctCount,
      createNextRound,
      isRunning,
      roundData.correctAnswer,
      wrongCount,
    ],
  );

  const handleTimeOut = useCallback(() => {
    if (!isRunning) return;
    if (answerLockedRef.current) return;

    answerLockedRef.current = true;

    setWrongCount((previous) => previous + 1);
    setFeedback({
      type: "error",
      message: `Süre doldu. Doğru cevap: ${
        roundData.correctAnswer === "same" ? "Sol / Aynı" : "Sağ / Farklı"
      }.`,
    });

    window.setTimeout(() => {
      createNextRound();
    }, 250);
  }, [createNextRound, isRunning, roundData.correctAnswer]);

  useEffect(() => {
    clearRoundTimeout();

    if (!isRunning) return;

    answerLockedRef.current = false;

    timeoutRef.current = window.setTimeout(() => {
      handleTimeOut();
    }, speed);

    return () => {
      clearRoundTimeout();
    };
  }, [clearRoundTimeout, handleTimeOut, isRunning, roundData, speed]);

  // Egitim Programi/Odev suresi: yalniz isTimedMode'da ve calisma calisirken
  // saniyede bir azalir; Duraklat ile isRunning false olunca interval
  // temizlenir (durur), Devam Et ile isRunning tekrar true olunca kaldigi
  // elapsedSeconds degerinden devam eder. Serbest kullanimda isTimedMode
  // false oldugu icin bu efekt hicbir sey yapmaz.
  useEffect(() => {
    if (!isTimedMode || !isRunning) return;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((previous) => Math.min(previous + 1, resolvedDurationSeconds));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, isTimedMode, resolvedDurationSeconds]);

  useEffect(() => {
    if (!isTimedMode || !isRunning) return;
    if (elapsedSeconds >= resolvedDurationSeconds) {
      finishExercise();
    }
  }, [elapsedSeconds, finishExercise, isRunning, isTimedMode, resolvedDurationSeconds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleAnswer("same");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleAnswer("different");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAnswer]);

  const handleStartStop = () => {
    // Sure dolduysa (Egitim Programi/Odev modunda) yeniden baslatilamaz -
    // ogrenci "Yeniden Başlat" ile acikca sifirlamadan tekrar oynayamaz.
    if (isTimeUp && !isRunning) {
      return;
    }

    const nextRunning = !isRunning;

    setIsRunning(nextRunning);

    if (nextRunning) {
      setFeedback({
        type: "info",
        message: "Çalışma başladı. Aynıysa Sol, farklıysa Sağ.",
      });
    } else {
      clearRoundTimeout();
      setFeedback({
        type: "info",
        message: "Çalışma durduruldu.",
      });
    }
  };

  const handleRefresh = () => {
    createNextRound();
    setFeedback({
      type: "info",
      message: "Yeni kelimeler hazır. Aynıysa Sol, farklıysa Sağ.",
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    resetLevelStats();
    setRoundData(createRound(level, wordSets));
    setElapsedSeconds(0);
    hasFinalizedRef.current = false;
    saveInFlightRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    setSaveStatus("idle");
    setSaveMessage("");
    setFeedback({
      type: "info",
      message: "Çalışma sıfırlandı. Başlat'a basarak yeniden başla.",
    });
  };

  const handleSpeedChange = (value: number) => {
    setFreeSpeed(clampSpeed(value) as SpeedOption);
  };

  return (
    <div className={themeRootClassName}>
      <ExerciseFullscreenShell
        title="Çift Taraflı Odak"
        backHref="/egzersizler"
        status={<>{isTimedMode ? <span className={`compact-stat-chip ${styles.statChipOverride}`}>Süre: {formatTime(remainingSeconds)}</span> : null}<span className={`compact-stat-chip ${styles.statChipOverride}`}>Seviye: {level}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Doğru: {correctCount}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Yanlış: {wrongCount}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Net: {netCount}/{NET_TARGET}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Kelime: {wordCount}</span></>}
        settings={(
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold"><span className={styles.settingsLabel}>Seviye</span><select value={level} onChange={(event) => prepareLevel(Number(event.target.value) as ExerciseLevel)} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs ${styles.levelSelect}`}>{LEVELS.map((value) => <option key={value} value={value}>{value}. seviye</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold"><span className={styles.settingsLabel}>Hız: {speed} ms</span>{isSpeedLocked ? <select value={speed} disabled className="min-h-9 rounded-xl border border-slate-300 bg-slate-100 px-2 text-xs text-slate-500">{SPEED_OPTIONS.map((value) => <option key={value} value={value}>{value} ms</option>)}</select> : <input type="range" min={500} max={5000} step={100} value={speed} onChange={(event) => handleSpeedChange(Number(event.target.value))} className="h-2" />}</label>
          </div>
        )}
        footer={<div className="flex flex-wrap justify-center gap-1.5"><button type="button" onClick={handleStartStop} disabled={isTimeUp && !isRunning} className={`min-h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50 md:text-sm ${styles.startButton}`}>{isRunning ? "Duraklat" : "Başlat"}</button><button type="button" onClick={handleRefresh} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold md:text-sm ${styles.secondaryButton}`}>Yeni Kelimeler</button><button type="button" onClick={handleReset} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold md:text-sm ${styles.secondaryButton}`}>Yeniden Başlat</button></div>}
      >
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="shrink-0 px-1 md:px-2">
            <h2 className={`text-sm font-black text-slate-950 md:text-base ${styles.headingTitle}`}>
              Aynı mı, Farklı mı?
            </h2>
            <p className={`text-[10px] font-semibold text-slate-600 md:text-xs ${styles.headingBody}`}>
              Tüm kelimeler aynıysa Sol. Bir kelime farklıysa Sağ.
            </p>
          </div>

          <div className="shrink-0 px-1 md:px-2">
            <div
              className={`rounded-lg border px-2 py-1 text-center text-[10px] font-bold md:text-xs ${
                feedback.type === "success"
                  ? `border-emerald-200 bg-emerald-50 text-emerald-700 ${styles.feedbackSuccess}`
                  : feedback.type === "error"
                    ? `border-rose-200 bg-rose-50 text-rose-700 ${styles.feedbackError}`
                    : `border-blue-200 bg-blue-50 text-blue-700 ${styles.feedbackInfo}`
              }`}
            >
              {feedback.message}
            </div>
            {saveStatus === "error" ? (
              <div className={`mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-[10px] font-bold text-rose-700 ${styles.feedbackError}`}>
                <p>{saveMessage}</p>
                <button
                  type="button"
                  className="mt-1 min-h-8 rounded-lg bg-rose-700 px-3 text-white"
                  onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}
                >
                  Yeniden Dene
                </button>
              </div>
            ) : null}
            {completionStatus.state === "error" ? (
              <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center text-[10px] font-bold text-amber-900">
                <p>{completionStatus.message}</p>
                {completionStatus.canRetry ? (
                  <button
                    type="button"
                    className="mt-1 min-h-8 rounded-lg bg-amber-700 px-3 text-white"
                    onClick={() => void retryTaskCompletion()}
                  >
                    Program ilerlemesini yeniden dene
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 md:px-2">
            <div className="flex w-full max-w-5xl flex-row flex-wrap items-center justify-center gap-2 md:gap-3">
              {roundData.words.map((item) => (
                <div
                  key={item.id}
                  className={`transition-all duration-300 ${getOffsetClass(
                    item.offset,
                  )}`}
                >
                  <span className={`flex min-h-[44px] min-w-[90px] items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white px-3 py-2 text-center text-lg font-black text-slate-950 shadow shadow-slate-200/60 sm:min-h-[52px] sm:min-w-[110px] sm:text-xl md:min-h-[60px] md:min-w-[140px] md:px-5 md:py-2 md:text-2xl ${styles.wordTile}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 px-1 md:px-2">
            <div className="grid gap-1.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleAnswer("same")}
                className={`min-h-[40px] rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800 shadow-sm transition hover:bg-blue-100 active:scale-95 md:min-h-[48px] md:text-base ${styles.answerSame}`}
              >
                ← SOL / AYNI
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("different")}
                className={`min-h-[40px] rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-sm font-black text-rose-800 shadow-sm transition hover:bg-rose-100 active:scale-95 md:min-h-[48px] md:text-base ${styles.answerDifferent}`}
              >
                SAĞ / FARKLI →
              </button>
            </div>
          </div>
        </div>
      </ExerciseFullscreenShell>
    </div>
  );
}

export default TwoSideFocusExerciseClient;
