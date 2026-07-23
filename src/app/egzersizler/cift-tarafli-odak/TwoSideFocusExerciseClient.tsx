"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExerciseFullscreenShell from "@/components/exercises/ExerciseFullscreenShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/two-side-focus-theme.module.css";

type ExerciseLevel = 1 | 2 | 3 | 4 | 5;
type AnswerType = "same" | "different";
type WordOffset = "normal" | "up" | "down";

type SimilarWordSet = {
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
const DEFAULT_SPEED = 1500;
const NET_TARGET = 10;

const SIMILAR_WORD_SETS: SimilarWordSet[] = [
  { base: "kalem", variants: ["kelam", "kalen", "kalım"] },
  { base: "kitap", variants: ["katip", "kıtap", "kitapç"] },
  { base: "masa", variants: ["masal", "musa", "maşa"] },
  { base: "deniz", variants: ["denir", "beniz", "deniş"] },
  { base: "çiçek", variants: ["çilek", "çiçem", "çicek"] },
  { base: "sahil", variants: ["sahip", "sakin", "sahir"] },
  { base: "orman", variants: ["organ", "ortam", "orhan"] },
  { base: "güneş", variants: ["güreş", "gümüş", "günel"] },
  { base: "yıldız", variants: ["yalnız", "yıldır", "yıldızlı"] },
  { base: "ırmak", variants: ["ırgat", "irmik", "ırmaklı"] },
  { base: "bahçe", variants: ["bahane", "bahri", "bahçem"] },
  { base: "defter", variants: ["defne", "defterim", "defterci"] },
  { base: "renkli", variants: ["renkler", "renki", "renkçe"] },
  { base: "oyuncu", variants: ["oyunçu", "oyuncak", "oyunlu"] },
  { base: "sevgi", variants: ["sezgi", "sergi", "sevim"] },
  { base: "umutlu", variants: ["unuttu", "umuttu", "umutla"] },
  { base: "zaman", variants: ["saman", "zamanı", "zamans"] },
  { base: "şehir", variants: ["nehir", "sehir", "şehirli"] },
  { base: "köprü", variants: ["köpük", "kömür", "köprüm"] },
  { base: "rüzgar", variants: ["rüzgâr", "rüzgarı", "rüzgarlı"] },
  { base: "yağmur", variants: ["yamuk", "yağma", "yağmurlu"] },
  { base: "toprak", variants: ["yaprak", "toplam", "topraklı"] },
  { base: "dikkat", variants: ["dikat", "dikkât", "dikkatli"] },
  { base: "odaklı", variants: ["odakla", "ocaklı", "odakçı"] },
  { base: "hedef", variants: ["heves", "heder", "hedefli"] },
  { base: "başarı", variants: ["başka", "başari", "başarılı"] },
  { base: "anlama", variants: ["anlatma", "anlams", "anlayan"] },
  { base: "okuma", variants: ["okumu", "dokuma", "okuyan"] },
];

function getWordCount(level: ExerciseLevel) {
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  if (level === 4) return 4;
  return 5;
}

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getDifferentVariant(wordSet: SimilarWordSet) {
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

function createRound(level: ExerciseLevel): RoundData {
  const wordCount = getWordCount(level);
  const wordSet = getRandomItem(SIMILAR_WORD_SETS);
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

export function TwoSideFocusExerciseClient() {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const [level, setLevel] = useState<ExerciseLevel>(1);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [isRunning, setIsRunning] = useState(false);
  const [roundData, setRoundData] = useState<RoundData>(() => createRound(1));

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({
    type: "info",
    message: "Başlat'a bas. Kelimeler aynıysa Sol, farklıysa Sağ seç.",
  });

  const answerLockedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const netCount = correctCount - wrongCount;
  const wordCount = useMemo(() => getWordCount(level), [level]);

  const clearRoundTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const createNextRound = useCallback(
    (nextLevel = level) => {
      clearRoundTimeout();
      answerLockedRef.current = false;
      setRoundData(createRound(nextLevel));
     
    },
    [clearRoundTimeout, level],
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
      setRoundData(createRound(nextLevel));
      answerLockedRef.current = false;
      setFeedback({
        type,
        message:
          message ??
          `${nextLevel}. seviye hazır. Başlat'a bas. Aynıysa Sol, farklıysa Sağ.`,
      });
    },
    [clearRoundTimeout],
  );

  const advanceLevel = useCallback(() => {
  clearRoundTimeout();

  if (level >= 5) {
    // 5. seviyede 10 net'e ulaşınca çalışma durmasın, kullanıcı durdurana kadar
    // aynı seviyede devam etsin.
    setCorrectCount(0);
    setWrongCount(0);
    setRoundData(createRound(level));
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
  setRoundData(createRound(nextLevel));
  answerLockedRef.current = false;

  // ÖNEMLİ:
  // Seviye geçince çalışma durmasın, otomatik devam etsin.
  setIsRunning(true);

  setFeedback({
    type: "success",
    message: `${nextLevel}. seviyeye otomatik geçildi. Devam et!`,
  });
}, [clearRoundTimeout, level]);

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
    setRoundData(createRound(level));
    setFeedback({
      type: "info",
      message: "Çalışma sıfırlandı. Başlat'a basarak yeniden başla.",
    });
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(clampSpeed(value));
  };

  return (
    <div className={themeRootClassName}>
      <ExerciseFullscreenShell
        title="Çift Taraflı Odak"
        backHref="/egzersizler"
        status={<><span className={`compact-stat-chip ${styles.statChipOverride}`}>Seviye: {level}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Doğru: {correctCount}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Yanlış: {wrongCount}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Net: {netCount}/{NET_TARGET}</span><span className={`compact-stat-chip ${styles.statChipOverride}`}>Kelime: {wordCount}</span></>}
        settings={(
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold"><span className={styles.settingsLabel}>Seviye</span><select value={level} onChange={(event) => prepareLevel(Number(event.target.value) as ExerciseLevel)} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs ${styles.levelSelect}`}>{LEVELS.map((value) => <option key={value} value={value}>{value}. seviye</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold"><span className={styles.settingsLabel}>Hız: {speed} ms</span><input type="range" min={500} max={5000} step={100} value={speed} onChange={(event) => handleSpeedChange(Number(event.target.value))} className="h-2" /></label>
          </div>
        )}
        footer={<div className="flex flex-wrap justify-center gap-1.5"><button type="button" onClick={handleStartStop} className={`min-h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white md:text-sm ${styles.startButton}`}>{isRunning ? "Duraklat" : "Başlat"}</button><button type="button" onClick={handleRefresh} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold md:text-sm ${styles.secondaryButton}`}>Yeni Kelimeler</button><button type="button" onClick={handleReset} className={`min-h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold md:text-sm ${styles.secondaryButton}`}>Yeniden Başlat</button></div>}
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
