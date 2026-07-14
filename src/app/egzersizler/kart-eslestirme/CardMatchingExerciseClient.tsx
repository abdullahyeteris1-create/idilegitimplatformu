"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import {
  calculateNet,
  calculateScore,
  calculateSuccessRate,
  generateCardDeck,
  getNextLevel,
  getPairCountByLevel,
  shouldLevelUp,
  type MatchingCard,
} from "@/lib/exercise-engine/cardMatching";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase =
  | "setup"
  | "ready"
  | "preview"
  | "playing"
  | "paused"
  | "completed";

type FeedbackTone = "ok" | "bad" | "info";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

type CardMatchingResult = {
  correctCount: number;
  wrongCount: number;
  totalMoves: number;
  net: number;
  score: number;
  successRate: number;
  reachedLevel: number;
  elapsedSeconds: number;
  levelUpCount: number;
  completedRounds: number;
};

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];
const DELAY_OPTIONS = [500, 750, 1000, 1250, 1500, 2000];
const PREVIEW_OPTIONS = [2000, 3000, 4000, 5000, 7000, 10000];
const CARD_MATCHING_SELECT_CLASS = `${FULLSCREEN_SELECT_CLASS} !h-8`;

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatSeconds(milliseconds: number): string {
  return `${milliseconds / 1000} sn`;
}

function getFeedbackClass(tone: FeedbackTone): string {
  if (tone === "ok") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (tone === "bad") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function getGridClass(cardCount: number): string {
  if (cardCount <= 8) {
    return "grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-2";
  }

  if (cardCount <= 12) {
    return "grid-cols-3 grid-rows-4 sm:grid-cols-6 sm:grid-rows-2";
  }

  if (cardCount <= 16) {
    return "grid-cols-4 grid-rows-4 sm:grid-cols-8 sm:grid-rows-2";
  }

  if (cardCount <= 20) {
    return "grid-cols-4 grid-rows-5 sm:grid-cols-5 sm:grid-rows-4 lg:grid-cols-10 lg:grid-rows-2";
  }

  return "grid-cols-6 grid-rows-4 lg:grid-cols-8 lg:grid-rows-3";
}

export function CardMatchingExerciseClient() {
  const router = useRouter();

  const timerRef = useRef<number | null>(null);
  const resolveRef = useRef<number | null>(null);
  const previewRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [startLevel, setStartLevel] = useState(1);
  const [level, setLevel] = useState(1);
  const [previewDurationMs, setPreviewDurationMs] = useState(4000);
  const [flipBackDelayMs, setFlipBackDelayMs] = useState(1000);

  const [cards, setCards] = useState<MatchingCard[]>([]);
  const [openedCardIds, setOpenedCardIds] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [levelCorrectCount, setLevelCorrectCount] = useState(0);
  const [levelWrongCount, setLevelWrongCount] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [brokenVisualIds, setBrokenVisualIds] = useState<string[]>([]);
  const [result, setResult] = useState<CardMatchingResult | null>(null);

  const net = calculateNet(levelCorrectCount, levelWrongCount);
  const totalMoves = correctCount + wrongCount;
  const pairCount = getPairCountByLevel(level);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearResolveTimer = useCallback(() => {
    if (resolveRef.current !== null) {
      window.clearTimeout(resolveRef.current);
      resolveRef.current = null;
    }
  }, []);

  const clearPreviewTimer = useCallback(() => {
    if (previewRef.current !== null) {
      window.clearTimeout(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  const createDeck = useCallback((nextLevel: number) => {
    setCards(generateCardDeck(nextLevel));
    setOpenedCardIds([]);
    setIsResolving(false);
  }, []);

  const resetToReady = useCallback(
    (nextStartLevel = startLevel) => {
      clearTimer();
      clearResolveTimer();
      clearPreviewTimer();

      hasSavedResultRef.current = false;

      setLevel(nextStartLevel);
      setElapsedSeconds(0);
      setCorrectCount(0);
      setWrongCount(0);
      setLevelCorrectCount(0);
      setLevelWrongCount(0);
      setLevelUpCount(0);
      setCompletedRounds(0);
      setFeedback(null);
      setResult(null);
      setBrokenVisualIds([]);

      createDeck(nextStartLevel);
      setPhase("ready");
    },
    [
      clearPreviewTimer,
      clearResolveTimer,
      clearTimer,
      createDeck,
      startLevel,
    ],
  );

  const handleIntroStart = () => {
    resetToReady();
  };

  const startElapsedTimer = useCallback(() => {
    clearTimer();

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
  }, [clearTimer]);

  const startPreviewThenPlay = useCallback(
    (deck: MatchingCard[]) => {
      clearPreviewTimer();

      setPhase("preview");
      setOpenedCardIds(deck.map((card) => card.id));
      setIsResolving(true);
      setFeedback({
        tone: "info",
        message: "Kartlara dikkatlice bak. Süre bitince kartlar kapanacak.",
      });

      previewRef.current = window.setTimeout(() => {
        setOpenedCardIds([]);
        setIsResolving(false);
        setPhase("playing");
        setFeedback({
          tone: "info",
          message: "Kartlar kapandı. Aklında kalan eşleri bul.",
        });
      }, previewDurationMs);
    },
    [clearPreviewTimer, previewDurationMs],
  );

  const handleStart = () => {
    clearTimer();
    clearResolveTimer();
    clearPreviewTimer();

    hasSavedResultRef.current = false;

    const nextDeck = generateCardDeck(startLevel);

    setLevel(startLevel);
    setCards(nextDeck);
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setLevelUpCount(0);
    setCompletedRounds(0);
    setResult(null);
    setBrokenVisualIds([]);

    startElapsedTimer();
    startPreviewThenPlay(nextDeck);
  };

  const renewDeckAfterRound = useCallback(
    (
      nextLevel: number,
      message: string,
      tone: FeedbackTone = "info",
      autoPreview = true,
    ) => {
      clearResolveTimer();
      clearPreviewTimer();

      setFeedback({ tone, message });
      setCompletedRounds((previous) => previous + 1);

      resolveRef.current = window.setTimeout(() => {
        const nextDeck = generateCardDeck(nextLevel);

        setCards(nextDeck);
        setOpenedCardIds([]);
        setIsResolving(false);

        if (autoPreview) {
          startPreviewThenPlay(nextDeck);
        } else {
          setPhase("playing");
          setFeedback(null);
        }
      }, 850);
    },
    [clearPreviewTimer, clearResolveTimer, startPreviewThenPlay],
  );

  const handleCardClick = (card: MatchingCard) => {
    if (
      phase !== "playing" ||
      isResolving ||
      card.isMatched ||
      openedCardIds.includes(card.id)
    ) {
      return;
    }

    if (openedCardIds.length === 0) {
      setOpenedCardIds([card.id]);
      return;
    }

    if (openedCardIds.length !== 1) {
      return;
    }

    const firstCard = cards.find((item) => item.id === openedCardIds[0]);

    if (!firstCard) {
      setOpenedCardIds([card.id]);
      return;
    }

    const nextOpenedIds = [firstCard.id, card.id];

    setOpenedCardIds(nextOpenedIds);
    setIsResolving(true);

    if (firstCard.visualId === card.visualId) {
      const nextCorrect = correctCount + 1;
      const nextLevelCorrect = levelCorrectCount + 1;
      const nextNet = calculateNet(nextLevelCorrect, levelWrongCount);

      const matchedCards = cards.map((item) =>
        item.visualId === card.visualId ? { ...item, isMatched: true } : item,
      );

      const allMatched = matchedCards.every((item) => item.isMatched);

      setCards(matchedCards);
      setCorrectCount(nextCorrect);
      setLevelCorrectCount(nextLevelCorrect);
      setFeedback({ tone: "ok", message: "Eşleşme doğru!" });

      resolveRef.current = window.setTimeout(() => {
        setOpenedCardIds([]);
        setIsResolving(false);

        if (shouldLevelUp(nextNet)) {
          const upgradedLevel = getNextLevel(level);
          const didLevelUp = upgradedLevel > level;

          setLevel(upgradedLevel);
          setLevelCorrectCount(0);
          setLevelWrongCount(0);
          setLevelUpCount((previous) => previous + (didLevelUp ? 1 : 0));

          renewDeckAfterRound(
            upgradedLevel,
            didLevelUp
              ? `Tebrikler! Seviye ${upgradedLevel}'ye geçtin. Yeni kartlara dikkatlice bak.`
              : "En yüksek seviyede yeni tur başlıyor. Kartlara dikkatlice bak.",
            "ok",
            true,
          );

          return;
        }

        if (allMatched) {
          renewDeckAfterRound(
            level,
            "Harika! Aynı seviyede yeni kart destesi hazırlanıyor. Yeni kartlara dikkatlice bak.",
            "ok",
            true,
          );

          return;
        }

        setFeedback(null);
      }, 450);

      return;
    }

    setWrongCount((previous) => previous + 1);
    setLevelWrongCount((previous) => previous + 1);
    setFeedback({
      tone: "bad",
      message: "Eşleşme değil. Kartları aklında tut.",
    });

    resolveRef.current = window.setTimeout(() => {
      setOpenedCardIds([]);
      setIsResolving(false);
      setFeedback(null);
    }, flipBackDelayMs);
  };

  const handlePause = () => {
    if (phase !== "playing" && phase !== "preview") {
      return;
    }

    clearTimer();
    clearResolveTimer();
    clearPreviewTimer();

    setIsResolving(false);
    setOpenedCardIds((previous) => previous.slice(0, 1));
    setPhase("paused");
    setFeedback({
      tone: "info",
      message: "Çalışma duraklatıldı.",
    });
  };

  const handleResume = () => {
    if (phase !== "paused") {
      return;
    }

    startElapsedTimer();

    setOpenedCardIds([]);
    setIsResolving(false);
    setPhase("playing");
    setFeedback({
      tone: "info",
      message: "Devam ediyorsun. Eşleri bul.",
    });
  };

  const finishExercise = () => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;

    clearTimer();
    clearResolveTimer();
    clearPreviewTimer();

    const score = calculateScore(correctCount, wrongCount);
    const successRate = calculateSuccessRate(correctCount, wrongCount);
    const finalNet = calculateNet(levelCorrectCount, levelWrongCount);
    const durationSeconds = Math.max(1, elapsedSeconds);
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "card-matching",
      exerciseTitle: "Kart Eşleştirme Çalışması",
      durationSeconds,
      correctCount,
      wrongCount,
      score,
      successRate,
      details: {
        startLevel,
        reachedLevel: level,
        pairCount,
        totalCards: pairCount * 2,
        totalMoves,
        correctMatches: correctCount,
        wrongMatches: wrongCount,
        net: finalNet,
        elapsedSeconds: durationSeconds,
        levelUpCount,
        completedRounds,
        previewDurationMs,
        flipBackDelayMs,
        theme: "Canlı Çocuk Görselleri",
        scoreRule: "correctCount * 10 - wrongCount * 5",
        maxLevel: 5,
      },
    });

    setResult({
      correctCount,
      wrongCount,
      totalMoves,
      net: finalNet,
      score,
      successRate,
      reachedLevel: level,
      elapsedSeconds: durationSeconds,
      levelUpCount,
      completedRounds,
    });

    setPhase("completed");
  };

  const handleStartLevelChange = (nextLevel: number) => {
    setStartLevel(nextLevel);
    resetToReady(nextLevel);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      clearResolveTimer();
      clearPreviewTimer();
    };
  }, [clearPreviewTimer, clearResolveTimer, clearTimer]);

  const stats = [
    { label: "Süre", value: formatElapsed(elapsedSeconds), tone: "brand" as const },
    { label: "Seviye", value: level },
    { label: "Doğru", value: correctCount, tone: "ok" as const },
    { label: "Yanlış", value: wrongCount, tone: "bad" as const },
    { label: "Net", value: net, tone: "brand" as const },
  ];

  const footerControls = (
    <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-9 lg:gap-2">
      <label className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
          Seviye
        </span>
        <select
          value={startLevel}
          onChange={(event) => handleStartLevelChange(Number(event.target.value))}
          className={CARD_MATCHING_SELECT_CLASS}
          disabled={phase === "playing" || phase === "preview"}
        >
          {LEVEL_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
          Bakma
        </span>
        <select
          value={previewDurationMs}
          onChange={(event) => setPreviewDurationMs(Number(event.target.value))}
          className={CARD_MATCHING_SELECT_CLASS}
          disabled={phase === "playing" || phase === "preview"}
        >
          {PREVIEW_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {formatSeconds(item)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
          Kapanma
        </span>
        <select
          value={flipBackDelayMs}
          onChange={(event) => setFlipBackDelayMs(Number(event.target.value))}
          className={CARD_MATCHING_SELECT_CLASS}
          disabled={phase === "playing" || phase === "preview"}
        >
          {DELAY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {formatSeconds(item)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
          Tema
        </span>
        <div
          className="flex h-8 items-center truncate rounded-xl border border-red-100 bg-white/95 px-2 text-xs font-semibold text-slate-800 shadow-sm shadow-red-100/55 md:h-9 md:px-3 md:text-sm"
          title="Canlı Çocuk Görselleri"
        >
          Canlı
        </div>
      </div>

      <div className="col-span-4 grid grid-cols-3 gap-1.5 lg:col-span-5 lg:gap-2">
        {phase === "ready" ? (
          <button
            type="button"
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
            onClick={handleStart}
          >
            Başlat
          </button>
        ) : (
          <>
            {phase === "paused" ? (
              <button
                type="button"
                className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
                style={FULLSCREEN_TOUCH_STYLE}
                onClick={handleResume}
              >
                Devam Et
              </button>
            ) : (
              <button
                type="button"
                className={FULLSCREEN_SECONDARY_BUTTON_CLASS}
                style={FULLSCREEN_TOUCH_STYLE}
                onClick={handlePause}
                disabled={phase !== "playing" && phase !== "preview"}
              >
                Duraklat
              </button>
            )}

            <button
              type="button"
              className={FULLSCREEN_SECONDARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={() => resetToReady()}
            >
              Yeniden Başlat
            </button>

            <button
              type="button"
              className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={finishExercise}
            >
              Bitir
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Kart Eşleştirme Çalışması"
        description="Önce açık kartlara dikkatlice bak. Kartlar kapandıktan sonra aynı görselleri eşleştir."
        buttonLabel="Eğitime Başla"
        onStart={handleIntroStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Kart Eşleştirme Çalışması"
        subtitle="Hazırlık modu"
        stats={stats}
        stageClassName="fx-slide-up flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/92 px-4 py-5 text-center shadow-[0_14px_42px_rgba(185,28,28,0.1)] backdrop-blur md:min-h-[380px]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">
          Hazırlık
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
          Önce kartlara bak, sonra eşleri bul.
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Başlat dediğinde tüm kartlar önce açık görünecek. Süre bitince kartlar
          kapanacak ve aklında kalan eşleri bulmaya çalışacaksın.
        </p>

        <div className="mt-4 grid w-full max-w-xl grid-cols-3 gap-2">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Çift</p>
            <p className="mt-1 text-2xl font-black text-red-700">
              {getPairCountByLevel(startLevel)}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Kart</p>
            <p className="mt-1 text-2xl font-black text-red-700">
              {getPairCountByLevel(startLevel) * 2}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Bakma</p>
            <p className="mt-1 text-2xl font-black text-red-700">
              {formatSeconds(previewDurationMs)}
            </p>
          </article>
        </div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "completed" && result) {
    return (
      <section className="idil-card mx-auto w-full max-w-5xl p-4 md:p-6">
        <h2 className="text-2xl font-bold">Kart Eşleştirme Sonucu</h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Çalışma sonucu kaydedildi.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Puan
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">
              {result.score}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Başarı
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {result.successRate}%
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Net
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {result.net}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Süre
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {formatElapsed(result.elapsedSeconds)}
            </p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm font-semibold">
          <p>
            Ulaşılan Seviye:{" "}
            <span className="text-slate-900">{result.reachedLevel}</span>
          </p>
          <p className="mt-1">
            Toplam Hamle:{" "}
            <span className="text-slate-900">{result.totalMoves}</span>
          </p>
          <p className="mt-1">
            Doğru Eşleşme:{" "}
            <span className="text-[var(--ok)]">{result.correctCount}</span>
          </p>
          <p className="mt-1">
            Yanlış Eşleşme:{" "}
            <span className="text-[var(--bad)]">{result.wrongCount}</span>
          </p>
          <p className="mt-1">
            Tamamlanan Deste:{" "}
            <span className="text-slate-900">{result.completedRounds}</span>
          </p>
          <p className="mt-1">
            Seviye Atlama:{" "}
            <span className="text-slate-900">{result.levelUpCount}</span>
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() => resetToReady()}
          >
            Yeniden Başlat
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() =>
              router.push(
                `/sonuc?exerciseType=card-matching&correct=${result.correctCount}&wrong=${result.wrongCount}&successRate=${result.successRate}&score=${result.score}`,
              )
            }
          >
            Ortak Sonuç Ekranı
          </button>

          <div className="flex justify-end sm:col-span-3">
            <ExerciseNavigationControls />
          </div>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Kart Eşleştirme"
      compactHeader
      subtitle={
        phase === "preview"
          ? "Kartlara bak"
          : phase === "paused"
            ? "Duraklatıldı"
            : "Aynı görselleri eşleştir"
      }
      stats={stats}
      finishButton={
        <button
          type="button"
          onClick={finishExercise}
          className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md"
          style={FULLSCREEN_TOUCH_STYLE}
        >
          Bitir
        </button>
      }
      stageClassName="fx-slide-up flex h-full min-h-0 w-full flex-col !overflow-hidden rounded-[20px] border border-white/80 bg-white/94 p-1.5 text-center shadow-[0_10px_28px_rgba(185,28,28,0.09)] backdrop-blur md:rounded-3xl md:p-2.5"
      footer={footerControls}
    >
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-1.5 md:gap-2">
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-red-100 bg-red-50 px-2.5 py-1.5 text-left md:px-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700 md:text-xs">
              {phase === "preview" ? "Bakma Süresi" : "Hedef"}
            </p>

            <p className="truncate text-xs font-black text-slate-950 sm:text-sm md:text-base">
              {phase === "preview"
                ? "Kartları aklında tut. Birazdan kapanacak."
                : "Net 10 yap, otomatik seviye atla."}
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-white/80 bg-white px-2.5 py-1 text-center shadow-sm">
            <p className="text-[10px] font-bold leading-none text-slate-500">Süre</p>
            <p className="text-base font-black leading-tight text-red-700 md:text-lg">
              {formatElapsed(elapsedSeconds)}
            </p>
          </div>
        </div>

        {feedback ? (
          <div
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-black md:text-sm ${getFeedbackClass(
              feedback.tone,
            )}`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div
          className={`relative min-h-0 flex-1 overflow-hidden rounded-[18px] border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f0_100%)] p-1.5 shadow-inner md:rounded-[22px] md:p-2.5 ${
            phase === "paused" ? "blur-sm" : ""
          }`}
        >
          <div
            className={`grid h-full min-h-0 w-full content-stretch items-stretch justify-items-stretch gap-[clamp(4px,0.8vmin,10px)] ${getGridClass(
              cards.length,
            )}`}
          >
            {cards.map((card) => {
              const isOpen =
                phase === "preview" ||
                openedCardIds.includes(card.id) ||
                card.isMatched;

              const isBroken = brokenVisualIds.includes(card.visualId);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={
                    phase !== "playing" || isResolving || card.isMatched
                  }
                  className="group relative h-full min-h-0 w-full touch-manipulation rounded-[10px] outline-none transition active:scale-[0.97] disabled:cursor-default sm:rounded-xl md:rounded-2xl"
                  style={{ ...FULLSCREEN_TOUCH_STYLE, perspective: "900px" }}
                  aria-label={isOpen ? card.title : "Kapalı kart"}
                >
                  <span
                    className={`absolute inset-0 rounded-[10px] border shadow-[0_4px_12px_rgba(15,23,42,0.11)] transition duration-300 [backface-visibility:hidden] [transform-style:preserve-3d] sm:rounded-xl md:rounded-2xl ${
                      isOpen
                        ? "[transform:rotateY(180deg)] border-amber-200 bg-white"
                        : "[transform:rotateY(0deg)] border-red-200 bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] group-hover:-translate-y-0.5"
                    }`}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-[inherit] text-[clamp(1.1rem,3.2vmin,2rem)] font-black text-white">
                      ?
                    </span>
                  </span>

                  <span
                    className={`absolute inset-0 flex items-center justify-center rounded-[10px] border border-amber-200 bg-white p-[clamp(2px,0.8vmin,8px)] shadow-[0_4px_12px_rgba(15,23,42,0.11)] transition duration-300 [backface-visibility:hidden] [transform-style:preserve-3d] sm:rounded-xl md:rounded-2xl ${
                      isOpen
                        ? "[transform:rotateY(0deg)] opacity-100"
                        : "[transform:rotateY(180deg)] opacity-0"
                    } ${card.isMatched ? "ring-2 ring-green-300" : ""}`}
                  >
                    {isBroken ? (
                      <span className="flex h-full w-full items-center justify-center rounded-lg bg-amber-50 text-[clamp(0.85rem,3vmin,1.75rem)] font-black text-amber-800">
                        {card.fallback}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.src}
                        alt={card.title}
                        className="h-[clamp(32px,8vmin,84px)] max-h-full w-[clamp(32px,8vmin,84px)] max-w-full object-contain"
                        onError={() =>
                          setBrokenVisualIds((previous) =>
                            previous.includes(card.visualId)
                              ? previous
                              : [...previous, card.visualId],
                          )
                        }
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {phase === "paused" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[26px] bg-white/60 backdrop-blur-[2px]">
              <p className="rounded-2xl border border-red-100 bg-white px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
                Duraklatıldı. Devam Et ile kart eşleştirme kaldığı yerden sürer.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </FullscreenExerciseShell>
  );
}

export default CardMatchingExerciseClient;
