"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage } from "@/components/exercises/FixedExerciseStage";

type GamePhase = "intro" | "memorize" | "question" | "result" | "finished";

type CardItem = {
  id: string;
  icon: string;
  name: string;
  colorClass: string;
};

type QuestionItem = {
  card: CardItem;
  wasSeen: boolean;
};

const ALL_CARDS: CardItem[] = [
  { id: "fox", icon: "🦊", name: "Tilki", colorClass: "bg-orange-100 border-orange-300" },
  { id: "cat", icon: "🐱", name: "Kedi", colorClass: "bg-amber-100 border-amber-300" },
  { id: "dog", icon: "🐶", name: "Köpek", colorClass: "bg-yellow-100 border-yellow-300" },
  { id: "rabbit", icon: "🐰", name: "Tavşan", colorClass: "bg-pink-100 border-pink-300" },
  { id: "panda", icon: "🐼", name: "Panda", colorClass: "bg-slate-100 border-slate-300" },
  { id: "lion", icon: "🦁", name: "Aslan", colorClass: "bg-orange-100 border-orange-300" },
  { id: "tiger", icon: "🐯", name: "Kaplan", colorClass: "bg-amber-100 border-amber-300" },
  { id: "bear", icon: "🐻", name: "Ayı", colorClass: "bg-stone-100 border-stone-300" },
  { id: "koala", icon: "🐨", name: "Koala", colorClass: "bg-slate-100 border-slate-300" },
  { id: "monkey", icon: "🐵", name: "Maymun", colorClass: "bg-yellow-100 border-yellow-300" },
  { id: "frog", icon: "🐸", name: "Kurbağa", colorClass: "bg-green-100 border-green-300" },
  { id: "fish", icon: "🐟", name: "Balık", colorClass: "bg-blue-100 border-blue-300" },
  { id: "dolphin", icon: "🐬", name: "Yunus", colorClass: "bg-cyan-100 border-cyan-300" },
  { id: "butterfly", icon: "🦋", name: "Kelebek", colorClass: "bg-indigo-100 border-indigo-300" },
  { id: "bird", icon: "🐦", name: "Kuş", colorClass: "bg-sky-100 border-sky-300" },
  { id: "owl", icon: "🦉", name: "Baykuş", colorClass: "bg-violet-100 border-violet-300" },
  { id: "apple", icon: "🍎", name: "Elma", colorClass: "bg-red-100 border-red-300" },
  { id: "banana", icon: "🍌", name: "Muz", colorClass: "bg-yellow-100 border-yellow-300" },
  { id: "strawberry", icon: "🍓", name: "Çilek", colorClass: "bg-rose-100 border-rose-300" },
  { id: "grape", icon: "🍇", name: "Üzüm", colorClass: "bg-purple-100 border-purple-300" },
  { id: "sun", icon: "☀️", name: "Güneş", colorClass: "bg-yellow-100 border-yellow-300" },
  { id: "moon", icon: "🌙", name: "Ay", colorClass: "bg-indigo-100 border-indigo-300" },
  { id: "star", icon: "⭐", name: "Yıldız", colorClass: "bg-amber-100 border-amber-300" },
  { id: "cloud", icon: "☁️", name: "Bulut", colorClass: "bg-slate-100 border-slate-300" },
  { id: "rainbow", icon: "🌈", name: "Gökkuşağı", colorClass: "bg-pink-100 border-pink-300" },
  { id: "tree", icon: "🌳", name: "Ağaç", colorClass: "bg-green-100 border-green-300" },
  { id: "flower", icon: "🌸", name: "Çiçek", colorClass: "bg-pink-100 border-pink-300" },
  { id: "car", icon: "🚗", name: "Araba", colorClass: "bg-red-100 border-red-300" },
  { id: "rocket", icon: "🚀", name: "Roket", colorClass: "bg-slate-100 border-slate-300" },
  { id: "ball", icon: "⚽", name: "Top", colorClass: "bg-emerald-100 border-emerald-300" },
];

const LEVEL_CONFIG: Record<
  number,
  {
    seenCount: number;
    questionCount: number;
    showMs: number;
    label: string;
  }
> = {
  1: {
    seenCount: 3,
    questionCount: 6,
    showMs: 1400,
    label: "3 kartı aklında tut",
  },
  2: {
    seenCount: 4,
    questionCount: 8,
    showMs: 1200,
    label: "4 kartı aklında tut",
  },
  3: {
    seenCount: 5,
    questionCount: 10,
    showMs: 1000,
    label: "5 kartı aklında tut",
  },
  4: {
    seenCount: 6,
    questionCount: 12,
    showMs: 850,
    label: "6 kartı aklında tut",
  },
  5: {
    seenCount: 7,
    questionCount: 14,
    showMs: 700,
    label: "7 kartı aklında tut",
  },
};

function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeRound(level: number) {
  const config = LEVEL_CONFIG[level];
  const shuffledCards = shuffleArray(ALL_CARDS);

  const seenCards = shuffledCards.slice(0, config.seenCount);
  const unseenCards = shuffledCards
    .filter((card) => !seenCards.some((seen) => seen.id === card.id))
    .slice(0, config.questionCount);

  const seenQuestions = seenCards.map<QuestionItem>((card) => ({
    card,
    wasSeen: true,
  }));

  const unseenQuestions = unseenCards.map<QuestionItem>((card) => ({
    card,
    wasSeen: false,
  }));

  const questions = shuffleArray([...seenQuestions, ...unseenQuestions]).slice(
    0,
    config.questionCount,
  );

  return {
    seenCards,
    questions,
  };
}

function getNet(correct: number, wrong: number) {
  return correct - wrong;
}

export default function CardMemoryGamePage() {
  const router = useRouter();
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);

  const [seenCards, setSeenCards] = useState<CardItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [memorizeIndex, setMemorizeIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);

    const memorizeTimerRef = useRef<number | null>(null);
  const resultTransitionTimerRef = useRef<number | null>(null);
  const answerLockRef = useRef(false);
  const config = LEVEL_CONFIG[level];
  const currentMemorizeCard = seenCards[memorizeIndex];
  const currentQuestion = questions[questionIndex];

  const netCount = useMemo(
    () => getNet(correctCount, wrongCount),
    [correctCount, wrongCount],
  );

  const progressPercent = useMemo(() => {
    if (phase === "memorize") {
      return Math.round(((memorizeIndex + 1) / Math.max(seenCards.length, 1)) * 100);
    }

    if (phase === "question" || phase === "result") {
      return Math.round(((questionIndex + 1) / Math.max(questions.length, 1)) * 100);
    }

    if (phase === "finished") {
      return 100;
    }

    return 0;
  }, [memorizeIndex, phase, questionIndex, questions.length, seenCards.length]);

  function clearMemorizeTimer() {
    if (memorizeTimerRef.current !== null) {
      window.clearTimeout(memorizeTimerRef.current);
      memorizeTimerRef.current = null;
    }
  }

  function clearResultTransitionTimer() {
    if (resultTransitionTimerRef.current !== null) {
      window.clearTimeout(resultTransitionTimerRef.current);
      resultTransitionTimerRef.current = null;
    }
  }

  function clearAllTimers() {
    clearMemorizeTimer();
    clearResultTransitionTimer();
  }

  function startGame(selectedLevel = level) {
    clearAllTimers();

    const nextRound = makeRound(selectedLevel);

    setLevel(selectedLevel);
    setSeenCards(nextRound.seenCards);
    setQuestions(nextRound.questions);
    setMemorizeIndex(0);
    setQuestionIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLastResult(null);
    setIsAnswerLocked(false);
    answerLockRef.current = false;
    setPhase("memorize");
  }

  function restartSameLevel() {
    startGame(level);
  }

  function goNextLevel() {
    const nextLevel = Math.min(level + 1, 5);
    startGame(nextLevel);
  }

  function goPreviousLevel() {
    const previousLevel = Math.max(level - 1, 1);
    startGame(previousLevel);
  }

  function resetGame() {
    clearAllTimers();

    setPhase("intro");
    setSeenCards([]);
    setQuestions([]);
    setMemorizeIndex(0);
    setQuestionIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLastResult(null);
    setIsAnswerLocked(false);
    answerLockRef.current = false;
  }

  useEffect(() => {
    if (phase !== "memorize") {
      return;
    }

    memorizeTimerRef.current = window.setTimeout(() => {
      setMemorizeIndex((previous) => {
        const next = previous + 1;

        if (next >= seenCards.length) {
          setPhase("question");
          return previous;
        }

        return next;
      });
    }, config.showMs);

    return () => {
      clearMemorizeTimer();
    };
  }, [config.showMs, memorizeIndex, phase, seenCards.length]);

  function answerQuestion(answerSeen: boolean) {
    if (answerLockRef.current || isAnswerLocked) {
      return;
    }

    if (phase !== "question") {
      return;
    }

    if (!currentQuestion) {
      return;
    }

    answerLockRef.current = true;
    setIsAnswerLocked(true);

    const isCorrect = answerSeen === currentQuestion.wasSeen;

    if (isCorrect) {
      setCorrectCount((previous) => previous + 1);
      setLastResult("correct");
    } else {
      setWrongCount((previous) => previous + 1);
      setLastResult("wrong");
    }

    setPhase("result");

    resultTransitionTimerRef.current = window.setTimeout(() => {
      resultTransitionTimerRef.current = null;
      setQuestionIndex((previous) => {
        const next = previous + 1;

        if (next >= questions.length) {
          setPhase("finished");
          answerLockRef.current = false;
          setIsAnswerLocked(false);
          return previous;
        }

        setPhase("question");
        setLastResult(null);
        answerLockRef.current = false;
        setIsAnswerLocked(false);
        return next;
      });
    }, 700);
  }

    useEffect(() => {
      return () => {
        clearMemorizeTimer();
        clearResultTransitionTimer();
      };
    }, []);

  function renderCard(card: CardItem | undefined, options?: { isBack?: boolean }) {
    if (!card && !options?.isBack) {
      return null;
    }

    if (options?.isBack) {
      return (
        <div className="relative flex aspect-[13/18] h-[clamp(10rem,34dvh,15rem)] max-w-full items-center justify-center rounded-[2rem] border-8 border-white bg-yellow-200 shadow-2xl">
          <div className="absolute inset-4 rounded-[1.4rem] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65)_0,rgba(255,255,255,0.65)_10%,transparent_11%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.55)_0,rgba(255,255,255,0.55)_9%,transparent_10%)]" />
          <div className="relative text-5xl font-black text-white/80">?</div>
        </div>
      );
    }

    return (
      <div
        className={`relative flex aspect-[13/18] h-[clamp(10rem,34dvh,15rem)] max-w-full flex-col items-center justify-center rounded-[2rem] border-8 border-white shadow-2xl ${card?.colorClass}`}
      >
        <div className="absolute left-5 top-5 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          {card?.name}
        </div>

        <div className="text-8xl drop-shadow-sm">{card?.icon}</div>
      </div>
    );
  }

    const content = (
    <main className="h-full min-h-0 min-w-0 max-w-full overflow-hidden bg-slate-900 px-2 py-2 text-slate-900 md:px-4 md:py-4">
      <section className="mx-auto h-full min-h-0 min-w-0 max-w-6xl overflow-hidden rounded-[2rem] bg-[#dceee7] shadow-2xl">
        <div className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55)_0,rgba(255,255,255,0.55)_5%,transparent_6%),radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.35)_0,rgba(255,255,255,0.35)_5%,transparent_6%)]">
          {/* Progress bar ve skor */}
          {phase !== "intro" && phase !== "finished" && (
            <div className="flex w-full max-w-4xl items-center justify-between gap-2 px-4 pt-4">
              <div className="flex flex-1 items-center gap-2">
                <span className="text-2xl">❓</span>
                <div className="flex h-5 w-full max-w-sm overflow-hidden rounded-full border-4 border-slate-500 bg-slate-500">
                  <div
                    className="h-full bg-yellow-300 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-500 px-4 py-2 text-white shadow-md">
                <span className="text-2xl">🪙</span>
                <span className="text-xl font-black">{correctCount}</span>
              </div>
            </div>
          )}

          {/* Oyun başlığı */}
          {phase !== "intro" && phase !== "finished" && (
            <div className="w-full px-5 pt-4 text-center">
              <h1 className="text-xl font-black text-cyan-700">
                {phase === "memorize" && "Kartları aklında tut"}
                {phase === "question" && "Bunu daha önce görmüş müydün?"}
                {phase === "result" &&
                  (lastResult === "correct" ? "Doğru!" : "Yanlış!")}
              </h1>
            </div>
          )}

          {/* Skor tablosu */}
          {phase !== "intro" && phase !== "finished" && (
            <div className="mx-auto mt-3 grid w-full max-w-4xl grid-cols-4 gap-2 px-5 text-center">
              <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="text-xs font-black text-slate-500">Seviye</p>
                <p className="text-xl font-black text-cyan-700">{level}</p>
              </div>
              <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="text-xs font-black text-slate-500">Doğru</p>
                <p className="text-xl font-black text-emerald-600">{correctCount}</p>
              </div>
              <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="text-xs font-black text-slate-500">Yanlış</p>
                <p className="text-xl font-black text-rose-600">{wrongCount}</p>
              </div>
              <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="text-xs font-black text-slate-500">Net</p>
                <p className="text-xl font-black text-blue-700">{netCount}</p>
              </div>
            </div>
          )}

          <section className="flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden px-3 py-4 md:px-5 md:py-6">
                        {phase === "intro" && (
              <div className="w-full max-w-2xl rounded-[2rem] border-4 border-white bg-white/80 p-6 text-center shadow-xl">
                <h2 className="text-3xl font-black text-slate-900">
                  Hafıza Kartları
                </h2>

                <p className="mt-3 text-base font-bold leading-7 text-slate-600">
                  Önce kartları dikkatlice izle. Sonra gelen kartı daha önce
                  görüp görmediğini seç. Amaç görsel hafızayı ve dikkati
                  geliştirmektir.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  {[1, 2, 3, 4, 5].map((levelNumber) => (
                    <button
                      key={levelNumber}
                      type="button"
                      onClick={() => setLevel(levelNumber)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-black transition ${
                        level === levelNumber
                          ? "border-cyan-500 bg-cyan-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-cyan-50"
                      }`}
                    >
                      {levelNumber}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800">
                  {LEVEL_CONFIG[level].label} • Gösterim süresi:{" "}
                  {LEVEL_CONFIG[level].showMs}ms
                </div>

              </div>
            )}

            {phase === "memorize" && (
              <div className="flex flex-col items-center">
                {renderCard(currentMemorizeCard)}

                <p className="mt-5 rounded-full bg-white/70 px-5 py-2 text-sm font-black text-cyan-800 shadow-sm">
                  {memorizeIndex + 1} / {seenCards.length}
                </p>
              </div>
            )}

            {(phase === "question" || phase === "result") && (
              <div className="flex flex-col items-center">
                {phase === "question" && renderCard(currentQuestion?.card)}

                {phase === "result" && (
                  <div className="flex flex-col items-center">
                    {renderCard(currentQuestion?.card)}

                    <div
                      className={`mt-4 rounded-2xl px-5 py-3 text-lg font-black shadow-md ${
                        lastResult === "correct"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {lastResult === "correct"
                        ? "Doğru cevap!"
                        : currentQuestion?.wasSeen
                          ? "Yanlış. Bu kart daha önce gösterilmişti."
                          : "Yanlış. Bu kart daha önce gösterilmemişti."}
                    </div>
                  </div>
                )}

                {phase === "question" && (
                  <div className="relative z-50 mt-4 flex touch-manipulation select-none items-center justify-center gap-4 sm:gap-6">
  <button
    type="button"
    onClick={() => answerQuestion(true)}
    disabled={phase !== "question" || isAnswerLocked}
    className="relative z-50 flex h-20 w-20 touch-manipulation select-none items-center justify-center rounded-full border-4 border-emerald-900 bg-emerald-500 text-4xl font-black text-white shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-24 sm:w-24 sm:text-5xl"
    title="Gördüm"
    aria-label="Gördüm"
  >
    👁
  </button>

  <button
    type="button"
    onClick={() => answerQuestion(false)}
    disabled={phase !== "question" || isAnswerLocked}
    className="relative z-50 flex h-20 w-20 touch-manipulation select-none items-center justify-center rounded-full border-4 border-rose-900 bg-rose-600 text-4xl font-black text-white shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-24 sm:w-24 sm:text-5xl"
    title="Görmedim"
    aria-label="Görmedim"
  >
    ✕
  </button>
</div>
                )}
              </div>
            )}

            {phase === "finished" && (
              <div className="w-full max-w-2xl rounded-[2rem] border-4 border-white bg-white/80 p-6 text-center shadow-xl">
                <h2 className="text-3xl font-black text-slate-900">
                  Tur Tamamlandı
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-black text-emerald-700">Doğru</p>
                    <p className="text-3xl font-black text-emerald-700">
                      {correctCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <p className="text-xs font-black text-rose-700">Yanlış</p>
                    <p className="text-3xl font-black text-rose-700">
                      {wrongCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 px-4 py-4">
                    <p className="text-xs font-black text-blue-700">Net</p>
                    <p className="text-3xl font-black text-blue-700">
                      {netCount}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={restartSameLevel}
                    className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Aynı Seviyeyi Tekrarla
                  </button>

                  {level > 1 && (
                    <button
                      type="button"
                      onClick={goPreviousLevel}
                      className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Önceki Seviye
                    </button>
                  )}

                  {level < 5 && (
                    <button
                      type="button"
                      onClick={goNextLevel}
                      className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
                    >
                      Sonraki Seviye
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={resetGame}
                    className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    Ana Ekran
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </section>
    </main>
  );

  return (
    <FixedExerciseStage
      title="Kart Hafıza"
      subtitle={phase === "intro" ? "Hazırlık modu" : phase === "memorize" ? "Kartları aklında tut" : phase === "finished" ? "Tur tamamlandı" : "Kartı değerlendir"}
      bottomSettings={(
        <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Seviye</span>
            <select value={level} onChange={(event) => phase === "intro" ? setLevel(Number(event.target.value)) : startGame(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}. seviye</option>)}
            </select>
          </label>
          {phase !== "intro" ? <button type="button" onClick={resetGame} className="min-h-11 rounded-xl bg-slate-900 px-4 font-bold text-white">Ayarlara dön</button> : null}
        </div>
      )}
      controls={phase === "intro" ? <button type="button" onClick={() => startGame(level)} className="mx-auto block min-h-12 w-full max-w-md rounded-2xl bg-emerald-600 px-8 font-black text-white shadow-lg transition hover:bg-emerald-700">Çalışmayı Başlat</button> : undefined}
      onExit={() => router.push("/egzersizler")}
    >
      {content}
    </FixedExerciseStage>
  );
}
