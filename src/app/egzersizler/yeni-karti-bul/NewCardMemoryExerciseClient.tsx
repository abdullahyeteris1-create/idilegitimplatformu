"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/new-card-memory-theme.module.css";

type ActiveGameStatus = "memorize" | "ready" | "challenge";
type GameStatus = "idle" | ActiveGameStatus | "paused" | "feedback" | "saving" | "save-error" | "finished";
type FeedbackType = "correct" | "wrong" | null;

type MemoryCard = {
  id: string;
  symbol: string;
  label: string;
};

type LevelConfig = {
  level: number;
  cardCount: number;
  label: string;
};

type AnswerRecord = {
  round: number;
  isCorrect: boolean;
  responseTimeMs: number;
  gainedScore: number;
};

type FinalResultMetrics = {
  score: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  durationSeconds: number;
};

const LEVELS: LevelConfig[] = [
  { level: 1, cardCount: 6, label: "6 kart" },
  { level: 2, cardCount: 9, label: "9 kart" },
  { level: 3, cardCount: 12, label: "12 kart" },
];

const MEMORY_DURATIONS = [5, 10, 15, 20] as const;
const TOTAL_ROUNDS = 10;
const CORRECT_SCORE = 100;
const WRONG_PENALTY = 25;
const FEEDBACK_DURATION_MS = 850;

const CARD_LIBRARY: MemoryCard[] = [
  { id: "rocket", symbol: "🚀", label: "Roket" },
  { id: "planet", symbol: "🪐", label: "Gezegen" },
  { id: "moon", symbol: "🌙", label: "Ay" },
  { id: "star", symbol: "⭐", label: "Yıldız" },
  { id: "rainbow", symbol: "🌈", label: "Gökkuşağı" },
  { id: "sunflower", symbol: "🌻", label: "Ayçiçeği" },
  { id: "cactus", symbol: "🌵", label: "Kaktüs" },
  { id: "mushroom", symbol: "🍄", label: "Mantar" },
  { id: "apple", symbol: "🍎", label: "Elma" },
  { id: "watermelon", symbol: "🍉", label: "Karpuz" },
  { id: "cherry", symbol: "🍒", label: "Kiraz" },
  { id: "lemon", symbol: "🍋", label: "Limon" },
  { id: "pizza", symbol: "🍕", label: "Pizza" },
  { id: "cupcake", symbol: "🧁", label: "Kek" },
  { id: "balloon", symbol: "🎈", label: "Balon" },
  { id: "gift", symbol: "🎁", label: "Hediye" },
  { id: "guitar", symbol: "🎸", label: "Gitar" },
  { id: "drum", symbol: "🥁", label: "Davul" },
  { id: "camera", symbol: "📷", label: "Kamera" },
  { id: "lamp", symbol: "💡", label: "Lamba" },
  { id: "key", symbol: "🔑", label: "Anahtar" },
  { id: "compass", symbol: "🧭", label: "Pusula" },
  { id: "book", symbol: "📚", label: "Kitaplar" },
  { id: "puzzle", symbol: "🧩", label: "Yapboz" },
  { id: "robot", symbol: "🤖", label: "Robot" },
  { id: "unicorn", symbol: "🦄", label: "Tekboynuz" },
  { id: "butterfly", symbol: "🦋", label: "Kelebek" },
  { id: "penguin", symbol: "🐧", label: "Penguen" },
  { id: "fox", symbol: "🦊", label: "Tilki" },
  { id: "owl", symbol: "🦉", label: "Baykuş" },
  { id: "whale", symbol: "🐳", label: "Balina" },
  { id: "turtle", symbol: "🐢", label: "Kaplumbağa" },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function formatMilliseconds(value: number): string {
  return `${Math.max(0, Math.round(value))} ms`;
}

function getLevelConfig(level: number): LevelConfig {
  return LEVELS.find((item) => item.level === level) ?? LEVELS[0];
}

function createRound(cardCount: number) {
  const selected = shuffle(CARD_LIBRARY).slice(0, cardCount + 1);
  const memoryCards = selected.slice(0, cardCount);
  const addedCard = selected[cardCount];

  return {
    memoryCards,
    addedCard,
    challengeCards: shuffle([...memoryCards, addedCard]),
  };
}

export default function NewCardMemoryExerciseClient() {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? "" : styles.darkTheme].join(" ");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [memoryDuration, setMemoryDuration] = useState<number>(10);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [challengeCards, setChallengeCards] = useState<MemoryCard[]>([]);
  const [addedCard, setAddedCard] = useState<MemoryCard | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(10);
  const [roundIndex, setRoundIndex] = useState(0);
  const [memoryScore, setMemoryScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const [answerHistory, setAnswerHistory] = useState<AnswerRecord[]>([]);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [pausedFrom, setPausedFrom] = useState<ActiveGameStatus | null>(null);
  const [saveError, setSaveError] = useState("");

  const challengeStartedAtRef = useRef(0);
  const pauseStartedAtRef = useRef(0);
  const answerLockedRef = useRef(false);
  const feedbackTimerRef = useRef<number | null>(null);
  const exerciseStartedAtRef = useRef(0);
  const pendingResultRef = useRef<FinalResultMetrics | null>(null);

  const activeLevel = getLevelConfig(selectedLevel);

  const progressPercent = useMemo(() => {
    return Math.round((roundIndex / TOTAL_ROUNDS) * 100);
  }, [roundIndex]);

  const averageResponseTime = useMemo(() => {
    if (answerHistory.length === 0) return 0;

    const total = answerHistory.reduce(
      (sum, answer) => sum + answer.responseTimeMs,
      0,
    );

    return Math.round(total / answerHistory.length);
  }, [answerHistory]);

  const accuracyPercent = useMemo(() => {
    if (answerHistory.length === 0) return 0;
    return Math.round((correctCount / answerHistory.length) * 100);
  }, [answerHistory.length, correctCount]);

  const prepareRound = useCallback(
    (nextRoundIndex: number) => {
      const round = createRound(activeLevel.cardCount);

      setMemoryCards(round.memoryCards);
      setChallengeCards(round.challengeCards);
      setAddedCard(round.addedCard);
      setRoundIndex(nextRoundIndex);
      setRemainingSeconds(memoryDuration);
      setFeedback(null);
      setSelectedCardId(null);
      setLastResponseTime(null);
      setIsAnswerLocked(false);
      answerLockedRef.current = false;
      setStatus("memorize");
    },
    [activeLevel.cardCount, memoryDuration],
  );

  useEffect(() => {
    if (status !== "memorize") return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setStatus("ready");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function startExercise() {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setMemoryScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerHistory([]);
    setRoundIndex(0);
    setPausedFrom(null);
    setSaveError("");
    pendingResultRef.current = null;
    exerciseStartedAtRef.current = Date.now();
    prepareRound(0);
  }

  function showChallenge() {
    setStatus("challenge");
    setFeedback(null);
    setSelectedCardId(null);
    setLastResponseTime(null);
    setIsAnswerLocked(false);
    answerLockedRef.current = false;

    window.requestAnimationFrame((timestamp) => {
      challengeStartedAtRef.current = timestamp;
    });
  }

  const persistResult = useCallback(async (metrics: FinalResultMetrics) => {
    pendingResultRef.current = metrics;
    setSaveError("");
    setStatus("saving");
    try {
      await saveExerciseResultSecure({
        exerciseType: "memory-game",
        exerciseTitle: "Yeni Kartı Bul",
        ...metrics,
      });
      setStatus("finished");
    } catch {
      setSaveError("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
      setStatus("save-error");
    }
  }, []);

  const finishExercise = useCallback((metrics: FinalResultMetrics) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setPausedFrom(null);
    setIsAnswerLocked(true);
    answerLockedRef.current = true;
    setFeedback(null);
    void persistResult(metrics);
  }, [persistResult]);

  const handleManualFinish = useCallback(() => {
    const answeredCount = correctCount + wrongCount;
    finishExercise({
      score: memoryScore,
      correctCount,
      wrongCount,
      successRate: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
      durationSeconds: Math.max(0, Math.round((Date.now() - exerciseStartedAtRef.current) / 1000)),
    });
  }, [correctCount, finishExercise, memoryScore, wrongCount]);

  function pauseExercise(eventTimestamp: number) {
    if (
      status !== "memorize" &&
      status !== "ready" &&
      status !== "challenge"
    ) {
      return;
    }

    setPausedFrom(status);
    pauseStartedAtRef.current = eventTimestamp;
    setStatus("paused");
    setIsAnswerLocked(true);
    answerLockedRef.current = true;
  }

  function resumeExercise(eventTimestamp: number) {
    if (status !== "paused" || pausedFrom === null) return;

    if (pausedFrom === "challenge") {
      const pausedDuration = Math.max(
        0,
        eventTimestamp - pauseStartedAtRef.current,
      );
      challengeStartedAtRef.current += pausedDuration;
      setIsAnswerLocked(false);
      answerLockedRef.current = false;
    }

    setStatus(pausedFrom);
    setPausedFrom(null);
  }

  function handleCardClick(card: MemoryCard, eventTimestamp: number) {
    if (
      status !== "challenge" ||
      answerLockedRef.current ||
      addedCard === null
    ) {
      return;
    }

    answerLockedRef.current = true;
    setIsAnswerLocked(true);
    setSelectedCardId(card.id);

    const responseTimeMs = Math.max(
      0,
      eventTimestamp - challengeStartedAtRef.current,
    );
    const isCorrect = card.id === addedCard.id;
    const gainedScore = isCorrect ? CORRECT_SCORE : -WRONG_PENALTY;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextWrongCount = wrongCount + (isCorrect ? 0 : 1);
    const nextMemoryScore = isCorrect ? memoryScore + CORRECT_SCORE : Math.max(0, memoryScore - WRONG_PENALTY);

    setLastResponseTime(responseTimeMs);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setCorrectCount((current) => current + 1);
      setMemoryScore((current) => current + CORRECT_SCORE);
    } else {
      setWrongCount((current) => current + 1);
      setMemoryScore((current) => Math.max(0, current - WRONG_PENALTY));
    }

    setAnswerHistory((current) => [
      ...current,
      {
        round: roundIndex + 1,
        isCorrect,
        responseTimeMs: Math.round(responseTimeMs),
        gainedScore,
      },
    ]);

    setStatus("feedback");

    feedbackTimerRef.current = window.setTimeout(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        finishExercise({
          score: nextMemoryScore,
          correctCount: nextCorrectCount,
          wrongCount: nextWrongCount,
          successRate: Math.round((nextCorrectCount / TOTAL_ROUNDS) * 100),
          durationSeconds: Math.max(0, Math.round((Date.now() - exerciseStartedAtRef.current) / 1000)),
        });
        return;
      }

      prepareRound(roundIndex + 1);
    }, FEEDBACK_DURATION_MS);
  }

  function resetExercise() {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setStatus("idle");
    setMemoryCards([]);
    setChallengeCards([]);
    setAddedCard(null);
    setRemainingSeconds(memoryDuration);
    setRoundIndex(0);
    setMemoryScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setFeedback(null);
    setSelectedCardId(null);
    setLastResponseTime(null);
    setAnswerHistory([]);
    setPausedFrom(null);
    setSaveError("");
    setIsAnswerLocked(false);
    answerLockedRef.current = false;
    pendingResultRef.current = null;
  }

  function changeLevel(level: number) {
    if (status !== "idle" && status !== "finished") return;

    setSelectedLevel(level);
    setStatus("idle");
    setMemoryCards([]);
    setChallengeCards([]);
    setAddedCard(null);
    setRoundIndex(0);
    setMemoryScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerHistory([]);
    setFeedback(null);
    setSelectedCardId(null);
    setLastResponseTime(null);
    setPausedFrom(null);
    setIsAnswerLocked(false);
    answerLockedRef.current = false;
  }

  function changeDuration(duration: number) {
    if (status !== "idle" && status !== "finished") return;

    setMemoryDuration(duration);
    setRemainingSeconds(duration);
  }

  const displayedCards =
    status === "memorize" ? memoryCards : challengeCards;

  const gridClass =
    activeLevel.cardCount <= 6
      ? "grid-cols-2 sm:grid-cols-3"
      : activeLevel.cardCount <= 9
        ? "grid-cols-3"
        : "grid-cols-3 sm:grid-cols-4";

  return (
    <main className={`min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-3 py-4 text-slate-900 sm:px-6 ${styles.pageBackground} ${themeRootClassName}`}>
      <section className={`mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${styles.panel}`}>
        <header className={`border-b border-slate-200 px-5 py-5 sm:px-7 ${styles.panelHeader}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${styles.title}`}>
                Yeni Kartı Bul
              </h1>
              <p className={`mt-1 max-w-2xl text-sm text-slate-500 ${styles.subtitle}`}>
                Kartları hafızanda tut. Devam ettiğinde eklenen yeni kartı bul.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Hafıza Puanı" value={memoryScore} />
              <StatCard label="Doğru" value={correctCount} />
              <StatCard label="Yanlış" value={wrongCount} />
            </div>
          </div>
        </header>

        <div className={`grid gap-5 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-7 lg:grid-cols-2 ${styles.settingsBar}`}>
          <div>
            <p className={`mb-2 text-xs font-black uppercase tracking-wider text-slate-500 ${styles.settingsLabel}`}>
              Seviye
            </p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <button
                  key={level.level}
                  type="button"
                  onClick={() => changeLevel(level.level)}
                  disabled={status !== "idle" && status !== "finished"}
                  className={[
                    "min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition",
                    selectedLevel === level.level
                      ? `border-indigo-600 bg-indigo-600 text-white shadow ${styles.levelButtonActive}`
                      : `border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 ${styles.optionButtonIdle}`,
                    status !== "idle" && status !== "finished"
                      ? "cursor-not-allowed opacity-55"
                      : "",
                  ].join(" ")}
                >
                  {level.level}. Seviye · {level.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={`mb-2 text-xs font-black uppercase tracking-wider text-slate-500 ${styles.settingsLabel}`}>
              Kartları görme süresi
            </p>
            <div className="flex flex-wrap gap-2">
              {MEMORY_DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => changeDuration(duration)}
                  disabled={status !== "idle" && status !== "finished"}
                  className={[
                    "min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition",
                    memoryDuration === duration
                      ? `border-fuchsia-600 bg-fuchsia-600 text-white shadow ${styles.durationButtonActive}`
                      : `border-slate-200 bg-white text-slate-700 hover:border-fuchsia-300 hover:bg-fuchsia-50 ${styles.optionButtonIdle}`,
                    status !== "idle" && status !== "finished"
                      ? "cursor-not-allowed opacity-55"
                      : "",
                  ].join(" ")}
                >
                  {duration} saniye
                </button>
              ))}
            </div>
          </div>
        </div>

        {status === "idle" && (
          <div className="px-5 py-12 text-center sm:px-7">
            <div className={`mx-auto max-w-xl rounded-3xl border border-indigo-200 bg-indigo-50 p-8 ${styles.idleCard}`}>
              <div className="text-6xl">🧠</div>
              <h2 className={`mt-4 text-2xl font-black text-indigo-950 ${styles.idleTitle}`}>
                Hafızanı test etmeye hazır mısın?
              </h2>
              <p className={`mt-3 text-sm leading-6 text-indigo-700 ${styles.idleBody}`}>
                Seçtiğin seviyedeki kartları süre boyunca incele. Ardından
                kartlara yeni bir kart eklenecek. Yeni eklenen kartı bul.
              </p>
              <button
                type="button"
                onClick={startExercise}
                className={`mt-6 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.98] ${styles.startButton}`}
              >
                Çalışmayı Başlat
              </button>
            </div>
          </div>
        )}

        {(status === "memorize" ||
          status === "ready" ||
          status === "challenge" ||
          status === "feedback" ||
          status === "paused") && (
          <div className="px-4 py-5 sm:px-7 sm:py-7">
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-4 text-sm font-black">
                <span>
                  Tur {roundIndex + 1} / {TOTAL_ROUNDS}
                </span>
                <span>%{Math.min(100, progressPercent)} tamamlandı</span>
              </div>
              <div className={`h-3 overflow-hidden rounded-full bg-slate-200 ${styles.progressTrack}`}>
                <div
                  className={`h-full rounded-full bg-indigo-600 transition-[width] duration-300 ${styles.progressFill}`}
                  style={{
                    width: `${Math.min(100, progressPercent)}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {status === "paused" ? (
                  <button
                    type="button"
                    onClick={(event) => resumeExercise(event.timeStamp)}
                    className={`min-h-11 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow transition hover:bg-emerald-700 active:scale-[0.98] ${styles.resumeButton}`}
                  >
                    Devam Et
                  </button>
                ) : (
                  (status === "memorize" ||
                    status === "ready" ||
                    status === "challenge") && (
                    <button
                      type="button"
                      onClick={(event) => pauseExercise(event.timeStamp)}
                      className={`min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100 ${styles.pauseButton}`}
                    >
                      Durdur
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={handleManualFinish}
                  className={`min-h-11 rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-sm font-black text-rose-600 transition hover:bg-rose-50 ${styles.finishButton}`}
                >
                  Bitir
                </button>
              </div>
            </div>

            <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7 ${styles.contentCard}`}>
              <div className="mb-5 text-center">
                {status === "memorize" && (
                  <>
                    <h2 className={`text-xl font-black text-indigo-900 ${styles.phaseHeadingMemorize}`}>
                      Kartları hafızanda tut
                    </h2>
                    <p className={`mt-1 text-sm font-bold text-slate-500 ${styles.phaseBody}`}>
                      Kalan süre: {remainingSeconds} saniye
                    </p>
                  </>
                )}

                {status === "paused" && (
                  <>
                    <h2 className={`text-xl font-black text-amber-800 ${styles.phaseHeadingPaused}`}>
                      Çalışma durduruldu
                    </h2>
                    <p className={`mt-1 text-sm text-slate-500 ${styles.phaseBody}`}>
                      Devam Et butonuna bastığında kaldığın yerden sürdürebilirsin.
                    </p>
                  </>
                )}

                {status === "ready" && (
                  <>
                    <h2 className={`text-xl font-black text-emerald-800 ${styles.phaseHeadingReady}`}>
                      Hazırsan devam et
                    </h2>
                    <p className={`mt-1 text-sm text-slate-500 ${styles.phaseBody}`}>
                      Bir sonraki ekranda yeni eklenen kartı bul.
                    </p>
                  </>
                )}

                {(status === "challenge" || status === "feedback") && (
                  <>
                    <h2 className={`text-xl font-black text-fuchsia-900 ${styles.phaseHeadingChallenge}`}>
                      Yeni eklenen kart hangisi?
                    </h2>
                    <p className={`mt-1 text-sm text-slate-500 ${styles.phaseBody}`}>
                      Önceki ekranda bulunmayan karta dokun.
                    </p>
                  </>
                )}
              </div>

              {status === "paused" ? (
                <div className={`flex min-h-80 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100 p-8 text-center ${styles.pausedVisual}`}>
                  <div>
                    <div className="text-7xl">⏸️</div>
                    <p className={`mt-4 text-sm font-bold text-amber-800 ${styles.pausedVisualText}`}>
                      Çalışma geçici olarak durduruldu.
                    </p>
                  </div>
                </div>
              ) : status === "ready" ? (
                <div className={`flex min-h-80 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 p-8 text-center ${styles.readyVisual}`}>
                  <div>
                    <div className="text-7xl">🔍</div>
                    <button
                      type="button"
                      onClick={showChallenge}
                      className={`mt-6 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-black text-white shadow-lg transition hover:bg-indigo-700 active:scale-[0.98] ${styles.continueButton}`}
                    >
                      Devam Et
                    </button>
                  </div>
                </div>
              ) : (
                <div className={["grid gap-3", gridClass].join(" ")}>
                  {displayedCards.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    const isNewCard = addedCard?.id === card.id;
                    const showCorrect =
                      status === "feedback" && isNewCard;
                    const showWrong =
                      status === "feedback" && isSelected && !isNewCard;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={(event) =>
                          handleCardClick(card, event.timeStamp)
                        }
                        disabled={
                          status !== "challenge" || isAnswerLocked
                        }
                        aria-label={card.label}
                        className={[
                          "relative flex min-h-28 flex-col items-center justify-center rounded-2xl border bg-white p-3 shadow-sm transition sm:min-h-32",
                          status === "challenge"
                            ? `cursor-pointer border-slate-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md active:scale-[0.98] ${styles.cardTile}`
                            : `border-slate-200 ${styles.cardTile}`,
                          showCorrect
                            ? `border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 ${styles.cardCorrect}`
                            : "",
                          showWrong
                            ? `border-rose-500 bg-rose-50 ring-4 ring-rose-200 ${styles.cardWrong}`
                            : "",
                        ].join(" ")}
                      >
                        <span className="text-5xl sm:text-6xl">
                          {card.symbol}
                        </span>
                        <span className={`mt-2 text-xs font-black text-slate-600 sm:text-sm ${styles.cardLabel}`}>
                          {card.label}
                        </span>
                        {showCorrect && (
                          <span className={`absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white ${styles.newBadge}`}>
                            YENİ
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {status === "feedback" &&
                feedback !== null &&
                lastResponseTime !== null && (
                  <div
                    className={[
                      "mt-5 rounded-2xl border px-4 py-3 text-center",
                      feedback === "correct"
                        ? `border-emerald-200 bg-emerald-50 text-emerald-700 ${styles.feedbackCorrect}`
                        : `border-rose-200 bg-rose-50 text-rose-700 ${styles.feedbackWrong}`,
                    ].join(" ")}
                  >
                    <p className="text-lg font-black">
                      {feedback === "correct"
                        ? "✓ Doğru kartı buldun"
                        : "✕ Bu kart yeni değildi"}
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      Yanıt süresi: {formatMilliseconds(lastResponseTime)}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {(status === "saving" || status === "save-error") && (
          <div className="px-5 py-12 text-center sm:px-7">
            <div className={`mx-auto max-w-xl rounded-3xl border border-indigo-200 bg-indigo-50 p-8 ${styles.savingCard}`}>
              <h2 className={`text-2xl font-black text-indigo-900 ${styles.savingTitle}`}>
                {status === "saving" ? "Sonuç kaydediliyor..." : "Sonuç kaydedilemedi"}
              </h2>
              {saveError && <p className={`mt-3 text-sm font-bold text-rose-700 ${styles.savingError}`} role="alert">{saveError}</p>}
              {status === "save-error" && (
                <button
                  type="button"
                  onClick={() => { if (pendingResultRef.current) void persistResult(pendingResultRef.current); }}
                  className={`mt-6 min-h-11 rounded-xl bg-indigo-700 px-7 py-3 text-sm font-black text-white shadow transition hover:bg-indigo-800 ${styles.retryButton}`}
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          </div>
        )}

        {status === "finished" && (
          <div className="px-5 py-7 sm:px-7">
            <div className={`rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8 ${styles.finishedBanner}`}>
              <div className="text-6xl">🏆</div>
              <h2 className={`mt-3 text-2xl font-black text-emerald-900 ${styles.finishedTitle}`}>
                Çalışma tamamlandı
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <ResultCard label="Hafıza Puanı" value={memoryScore} />
                <ResultCard label="Doğru" value={correctCount} />
                <ResultCard label="Yanlış" value={wrongCount} />
                <ResultCard label="Başarı" value={`%${accuracyPercent}`} />
                <ResultCard
                  label="Ortalama yanıt"
                  value={formatMilliseconds(averageResponseTime)}
                />
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={startExercise}
                  className={`rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow transition hover:bg-emerald-700 ${styles.startButton}`}
                >
                  Yeniden Başlat
                </button>
                <button
                  type="button"
                  onClick={resetExercise}
                  className={`rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 ${styles.secondaryButton}`}
                >
                  Ayarlara Dön
                </button>
              </div>
            </div>

            <div className={`mt-6 overflow-hidden rounded-2xl border border-slate-200 ${styles.tableWrap}`}>
              <div className={`border-b border-slate-200 bg-slate-50 px-4 py-3 ${styles.tableHeaderBar}`}>
                <h3 className={`font-black text-slate-800 ${styles.tableHeaderTitle}`}>Tur sonuçları</h3>
              </div>

              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className={`sticky top-0 bg-white text-xs uppercase text-slate-500 ${styles.tableHead}`}>
                    <tr>
                      <th className="px-4 py-3">Tur</th>
                      <th className="px-4 py-3">Sonuç</th>
                      <th className="px-4 py-3">Puan</th>
                      <th className="px-4 py-3">Yanıt süresi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answerHistory.map((answer) => (
                      <tr
                        key={answer.round}
                        className={`border-t border-slate-100 ${styles.tableRow}`}
                      >
                        <td className="px-4 py-3 font-black">
                          {answer.round}
                        </td>
                        <td
                          className={[
                            "px-4 py-3 font-black",
                            answer.isCorrect
                              ? `text-emerald-600 ${styles.tableCorrect}`
                              : `text-rose-600 ${styles.tableWrong}`,
                          ].join(" ")}
                        >
                          {answer.isCorrect ? "Doğru" : "Yanlış"}
                        </td>
                        <td className="px-4 py-3 font-black">
                          {answer.gainedScore > 0
                            ? `+${answer.gainedScore}`
                            : answer.gainedScore}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {formatMilliseconds(answer.responseTimeMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={`min-w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center ${styles.statCard}`}>
      <div className={`text-[10px] font-black uppercase tracking-wide text-slate-500 ${styles.statCardLabel}`}>
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-black text-slate-900 ${styles.statCardValue}`}>
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={`rounded-2xl border border-emerald-200 bg-white p-4 text-center shadow-sm ${styles.resultCard}`}>
      <div className={`text-xs font-black uppercase tracking-wide text-slate-500 ${styles.resultCardLabel}`}>
        {label}
      </div>
      <div className={`mt-2 text-xl font-black text-emerald-700 ${styles.resultCardValue}`}>
        {value}
      </div>
    </div>
  );
}
