"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExerciseFullscreenShell from "@/components/exercises/ExerciseFullscreenShell";

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

function getLevelDescription(level: ExerciseLevel) {
  if (level === 1) {
    return "2 kelime görünür. Aynıysa Sol, farklıysa Sağ.";
  }

  if (level === 2) {
    return "3 kelime görünür. Tüm kelimeler aynı mı, biri farklı mı karar ver.";
  }

  if (level === 3) {
    return "4 kelime görünür. Benzer kelimelerde küçük farkları yakala.";
  }

  if (level === 4) {
    return "4 kelime görünür. Kelimelerin yerleri hafif değişir.";
  }

  return "5 kelime görünür. Hızlı ve doğru karar vermeye çalış.";
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
      setRound(1);
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
    setIsRunning(false);
    setFeedback({
      type: "success",
      message: "Tebrikler! 5. seviyeyi de tamamladın.",
    });
    return;
  }

  const nextLevel = getNextLevel(level);

  setLevel(nextLevel);
  setCorrectCount(0);
  setWrongCount(0);
  setRound(1);
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
    <ExerciseFullscreenShell
      title="Çift Taraflı Odak"
      description="Kelimeler aynıysa Sol, farklıysa Sağ cevabını ver."
      backHref="/egzersizler"
    >
      <section className="mx-auto flex h-full min-h-[calc(100vh-120px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-lg">
        <header className="border-b border-slate-200 bg-white/90 px-3 py-2 md:px-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Seviye
              </p>
              <p className="text-lg font-black text-indigo-700 md:text-xl">
                {level}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                Doğru
              </p>
              <p className="text-lg font-black text-emerald-700 md:text-xl">
                {correctCount}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">
                Yanlış
              </p>
              <p className="text-lg font-black text-rose-700 md:text-xl">
                {wrongCount}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                Net
              </p>
              <p className="text-lg font-black text-blue-700 md:text-xl">
                {netCount}/{NET_TARGET}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-800">Seviye Seç</p>
              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700">
                {wordCount} kelime
              </span>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-2">
              {LEVELS.map((levelNumber) => (
                <button
                  key={levelNumber}
                  type="button"
                  onClick={() => prepareLevel(levelNumber)}
                  className={`min-h-[38px] rounded-xl border px-2 py-2 text-sm font-black transition ${
                    level === levelNumber
                      ? "border-indigo-300 bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-indigo-50"
                  }`}
                >
                  {levelNumber}
                </button>
              ))}
            </div>

            <p className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-800">
              {getLevelDescription(level)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">Hız Ayarı</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  Cevap verilmezse yanlış sayılır.
                </p>
              </div>

              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                {speed}ms
              </span>
            </div>

            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={100}
              value={speed}
              onChange={(event) => handleSpeedChange(Number(event.target.value))}
              className="mt-3 w-full accent-indigo-600"
            />

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSpeedChange(500)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                500ms
              </button>

              <button
                type="button"
                onClick={() => handleSpeedChange(1500)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                1500ms
              </button>

              <button
                type="button"
                onClick={() => handleSpeedChange(5000)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                5000ms
              </button>
            </div>
          </div>
        </div>

        <section className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-4 md:py-4">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Aynı mı, Farklı mı?
              </h2>
              <p className="text-xs font-semibold text-slate-600 md:text-sm">
                Tüm kelimeler aynıysa Sol. Bir kelime farklıysa Sağ.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartStop}
                className={`min-h-[42px] rounded-xl px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 ${
                  isRunning
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isRunning ? "Durdur" : "Başlat"}
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Yeni Kelimeler
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sıfırla
              </button>
            </div>
          </div>

          <div
            className={`mb-3 rounded-xl border px-3 py-2 text-center text-xs font-black md:text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {feedback.message}
          </div>

          <div className="relative flex min-h-[330px] flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-4 shadow-inner sm:min-h-[380px] md:min-h-[430px] md:p-6">
            <div className="relative z-10 flex w-full max-w-5xl flex-row flex-wrap items-center justify-center gap-4 py-8 md:gap-5 md:py-10">
              {roundData.words.map((item) => (
                <div
                  key={item.id}
                  className={`transition-all duration-300 ${getOffsetClass(
                    item.offset,
                  )}`}
                >
                  <span className="flex min-h-[76px] min-w-[140px] items-center justify-center rounded-3xl border-2 border-indigo-200 bg-white px-5 py-3 text-center text-2xl font-black text-slate-950 shadow-lg shadow-slate-200/60 sm:min-h-[84px] sm:min-w-[175px] sm:text-3xl md:min-h-[92px] md:min-w-[210px] md:px-8 md:py-4 md:text-4xl">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleAnswer("same")}
              className="min-h-[72px] rounded-3xl border-2 border-blue-200 bg-blue-50 px-4 py-4 text-xl font-black text-blue-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 active:scale-95 md:min-h-[84px] md:text-2xl"
            >
              ← SOL / AYNI
            </button>

            <button
              type="button"
              onClick={() => handleAnswer("different")}
              className="min-h-[72px] rounded-3xl border-2 border-rose-200 bg-rose-50 px-4 py-4 text-xl font-black text-rose-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 active:scale-95 md:min-h-[84px] md:text-2xl"
            >
              SAĞ / FARKLI →
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-black text-slate-800">Kullanım</p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600 md:text-sm">
              Bilgisayarda sol ve sağ yön tuşlarını kullanabilirsin. Dokunmatik
              ekranda alttaki SOL / AYNI ve SAĞ / FARKLI butonlarına bas.
            </p>
          </div>
        </section>
      </section>
    </ExerciseFullscreenShell>
  );
}

export default TwoSideFocusExerciseClient;