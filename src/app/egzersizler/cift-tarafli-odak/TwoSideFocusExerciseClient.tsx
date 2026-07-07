"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  { base: "kalem", variants: ["kelam", "kalen", "kalım", "kalem"] },
  { base: "kitap", variants: ["katip", "kıtap", "kitap", "kitapç"] },
  { base: "masa", variants: ["masal", "musa", "maşa", "masa"] },
  { base: "deniz", variants: ["denir", "beniz", "deniz", "deniş"] },
  { base: "çiçek", variants: ["çilek", "çiçem", "çiçek", "çicek"] },
  { base: "sahil", variants: ["sahip", "sakin", "sahil", "sahir"] },
  { base: "orman", variants: ["organ", "ortam", "orman", "orhan"] },
  { base: "güneş", variants: ["güreş", "gümüş", "güneş", "günel"] },
  { base: "yıldız", variants: ["yalnız", "yıldır", "yıldız", "yıldız"] },
  { base: "ırmak", variants: ["ırgat", "irmik", "ırmak", "ırmak"] },
  { base: "bahçe", variants: ["bahçe", "bahane", "bahri", "bahçe"] },
  { base: "defter", variants: ["defter", "defne", "defter", "defter"] },
  { base: "renkli", variants: ["renkler", "renki", "renkli", "renkli"] },
  { base: "oyuncu", variants: ["oyunçu", "oyuncak", "oyuncu", "oyuncu"] },
  { base: "sevgi", variants: ["sezgi", "sergi", "sevgi", "sevgi"] },
  { base: "umutlu", variants: ["unuttu", "umuttu", "umutlu", "umutlu"] },
  { base: "zaman", variants: ["zamanı", "saman", "zaman", "zaman"] },
  { base: "şehir", variants: ["nehir", "sehir", "şehir", "şehir"] },
  { base: "köprü", variants: ["köpük", "kömür", "köprü", "köprü"] },
  { base: "rüzgar", variants: ["rüzgarı", "rüzgâr", "rüzgar", "rüzgar"] },
  { base: "yağmur", variants: ["yamuk", "yağma", "yağmur", "yağmur"] },
  { base: "toprak", variants: ["yaprak", "toplam", "toprak", "toprak"] },
  { base: "dikkat", variants: ["dikat", "dikkât", "dikkat", "dikkat"] },
  { base: "odaklı", variants: ["odakla", "ocaklı", "odaklı", "odaklı"] },
  { base: "hedef", variants: ["heves", "heder", "hedef", "hedef"] },
  { base: "başarı", variants: ["başka", "başarı", "başarı", "başari"] },
  { base: "anlama", variants: ["anlatma", "anlams", "anlama", "anlama"] },
  { base: "okuma", variants: ["okumu", "dokuma", "okuma", "okuma"] },
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
    return "Ekranda aynı anda 2 kelime görünür. Aynıysa Sol, farklıysa Sağ.";
  }

  if (level === 2) {
    return "Ekranda aynı anda 3 kelime görünür. Tüm kelimeler aynı mı, yoksa biri farklı mı hızlıca karar ver.";
  }

  if (level === 3) {
    return "Ekranda aynı anda 4 kelime görünür. Benzer kelimeler arasındaki küçük farkları yakala.";
  }

  if (level === 4) {
    return "Ekranda 4 kelime görünür, kelimelerin yerleri hafif değişir. Dikkat ve çevresel algı zorlaşır.";
  }

  return "Ekranda aynı anda 5 kelime görünür. Benzer kelimeler arasında hızlı ve doğru karar vermeye çalış.";
}

function getOffsetClass(offset: WordOffset) {
  if (offset === "up") return "md:-translate-y-6";
  if (offset === "down") return "md:translate-y-6";
  return "";
}

function clampSpeed(value: number) {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, value));
}

export function TwoSideFocusExerciseClient() {
  const [level, setLevel] = useState<ExerciseLevel>(1);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [isRunning, setIsRunning] = useState(false);
  const [round, setRound] = useState(1);
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

  const wordCount = useMemo(() => getWordCount(level), [level]);
  const netCount = correctCount - wrongCount;

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
      setRound((previous) => previous + 1);
    },
    [clearRoundTimeout, level],
  );

  const resetLevelStats = useCallback(() => {
    clearRoundTimeout();
    setCorrectCount(0);
    setWrongCount(0);
    setRound(1);
    answerLockedRef.current = false;
  }, [clearRoundTimeout]);

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
    setFeedback({
      type: "success",
      message: `${nextLevel}. seviyeye geçtin. Yeni hedef: 10 net.`,
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
    setRoundData(createRound(level));
    resetLevelStats();
    setIsRunning(false);
    setFeedback({
      type: "info",
      message: `${level}. seviye hazır. Başlat'a bas. Aynıysa Sol, farklıysa Sağ.`,
    });
  }, [level, resetLevelStats]);

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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-6 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-2xl shadow-slate-300/50 backdrop-blur">
        <header className="border-b border-slate-200 bg-white/85 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/egzersizler"
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                ← Egzersizlere Dön
              </Link>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Odaklanma Çalışması
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Çift Taraflı Odak
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
                Kelimeler aynıysa Sol, farklıysa Sağ cevabını ver. Farklı
                kelimeler özellikle birbirine çok benzer seçilir.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Seviye
                </p>
                <p className="mt-1 text-2xl font-black text-indigo-700">
                  {level}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-emerald-700">
                  Doğru
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {correctCount}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-rose-700">
                  Yanlış
                </p>
                <p className="mt-1 text-2xl font-black text-rose-700">
                  {wrongCount}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-blue-700">
                  Net
                </p>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  {netCount}/{NET_TARGET}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-800">Seviye Seç</p>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {LEVELS.map((levelNumber) => (
                <button
                  key={levelNumber}
                  type="button"
                  onClick={() => setLevel(levelNumber)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                    level === levelNumber
                      ? "border-indigo-300 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-indigo-50"
                  }`}
                >
                  {levelNumber}
                </button>
              ))}
            </div>

            <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
              {getLevelDescription(level)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">Hız Ayarı</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Kelimeler bu süre boyunca görünür. Cevap verilmezse yanlış
                  sayılır.
                </p>
              </div>

              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-black text-rose-700">
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
              className="mt-4 w-full accent-indigo-600"
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSpeedChange(500)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                500ms
              </button>

              <button
                type="button"
                onClick={() => handleSpeedChange(1500)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                1500ms
              </button>

              <button
                type="button"
                onClick={() => handleSpeedChange(5000)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                5000ms
              </button>
            </div>
          </div>
        </div>

        <section className="flex flex-1 flex-col px-5 py-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Aynı mı, Farklı mı?
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Tüm kelimeler aynıysa Sol. Kelimelerden biri farklıysa Sağ.
                10 net yapınca seviye atlar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartStop}
                className={`rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 ${
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
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Yeni Kelimeler
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sıfırla
              </button>
            </div>
          </div>

          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-center text-sm font-black ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {feedback.message}
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-6 shadow-inner">
            <div className="relative z-10 flex w-full max-w-5xl flex-row flex-wrap items-center justify-center gap-5 py-10">
              {roundData.words.map((item) => (
                <div
                  key={item.id}
                  className={`transition-all duration-300 ${getOffsetClass(
                    item.offset,
                  )}`}
                >
                  <span className="flex min-h-[86px] min-w-[150px] items-center justify-center rounded-3xl border-2 border-indigo-200 bg-white px-8 py-4 text-center text-2xl font-black text-slate-950 shadow-lg shadow-slate-200/60 sm:min-w-[190px] sm:text-3xl">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleAnswer("same")}
              className="rounded-3xl border-2 border-blue-200 bg-blue-50 px-6 py-6 text-2xl font-black text-blue-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 active:scale-95"
            >
              ← SOL / AYNI
            </button>

            <button
              type="button"
              onClick={() => handleAnswer("different")}
              className="rounded-3xl border-2 border-rose-200 bg-rose-50 px-6 py-6 text-2xl font-black text-rose-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 active:scale-95"
            >
              SAĞ / FARKLI →
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-800">Kullanım</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              Bilgisayarda klavyedeki sol ve sağ yön tuşlarını kullanabilirsin.
              Dokunmatik ekranda alttaki SOL / AYNI ve SAĞ / FARKLI
              butonlarına bas. Kelimeler verilen süre içinde yanıp söner; cevap
              verilmezse yanlış sayılır.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default TwoSideFocusExerciseClient;