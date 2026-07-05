"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
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

type ExercisePhase = "setup" | "ready" | "playing" | "paused" | "completed";
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
    return "grid-cols-4";
  }

  if (cardCount <= 12) {
    return "grid-cols-4 sm:grid-cols-6";
  }

  if (cardCount <= 16) {
    return "grid-cols-4 sm:grid-cols-8";
  }

  return "grid-cols-4 sm:grid-cols-5 lg:grid-cols-8";
}

export function CardMatchingExerciseClient() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const resolveRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [startLevel, setStartLevel] = useState(1);
  const [level, setLevel] = useState(1);
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

  const createDeck = useCallback((nextLevel: number) => {
    setCards(generateCardDeck(nextLevel));
    setOpenedCardIds([]);
    setIsResolving(false);
  }, []);

  const resetToReady = useCallback((nextStartLevel = startLevel) => {
    clearTimer();
    clearResolveTimer();
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
    createDeck(nextStartLevel);
    setPhase("ready");
  }, [clearResolveTimer, clearTimer, createDeck, startLevel]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const handleStart = () => {
    hasSavedResultRef.current = false;
    setLevel(startLevel);
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setLevelUpCount(0);
    setCompletedRounds(0);
    setFeedback(null);
    setResult(null);
    createDeck(startLevel);
    setPhase("playing");
  };

  const renewDeckAfterRound = useCallback((nextLevel: number, message: string, tone: FeedbackTone = "info") => {
    setFeedback({ tone, message });
    setCompletedRounds((prev) => prev + 1);
    resolveRef.current = window.setTimeout(() => {
      createDeck(nextLevel);
      setFeedback(null);
    }, 850);
  }, [createDeck]);

  const handleCardClick = (card: MatchingCard) => {
    if (phase !== "playing" || isResolving || card.isMatched || openedCardIds.includes(card.id)) {
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
      setFeedback({ tone: "ok", message: "Eslesme dogru!" });

      resolveRef.current = window.setTimeout(() => {
        setOpenedCardIds([]);
        setIsResolving(false);

        if (shouldLevelUp(nextNet)) {
          const upgradedLevel = getNextLevel(level);
          const didLevelUp = upgradedLevel > level;
          setLevel(upgradedLevel);
          setLevelCorrectCount(0);
          setLevelWrongCount(0);
          setLevelUpCount((prev) => prev + (didLevelUp ? 1 : 0));
          renewDeckAfterRound(
            upgradedLevel,
            didLevelUp ? `Tebrikler! Seviye ${upgradedLevel}'ye gectin.` : "En yuksek seviyede yeni tur basliyor.",
          );
          return;
        }

        if (allMatched) {
          renewDeckAfterRound(level, "Harika! Ayni seviyede yeni kart destesi hazirlaniyor.", "ok");
          return;
        }

        setFeedback(null);
      }, 450);
      return;
    }

    setWrongCount((prev) => prev + 1);
    setLevelWrongCount((prev) => prev + 1);
    setFeedback({ tone: "bad", message: "Eslesme degil. Kartlari aklinda tut." });

    resolveRef.current = window.setTimeout(() => {
      setOpenedCardIds([]);
      setIsResolving(false);
      setFeedback(null);
    }, flipBackDelayMs);
  };

  useEffect(() => {
    if (phase !== "playing") {
      clearTimer();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearTimer();
  }, [clearTimer, phase]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearResolveTimer();
    };
  }, [clearResolveTimer, clearTimer]);

  const handlePause = () => {
    if (phase !== "playing") {
      return;
    }

    clearTimer();
    clearResolveTimer();
    setIsResolving(false);
    setOpenedCardIds((prev) => prev.slice(0, 1));
    setPhase("paused");
  };

  const handleResume = () => {
    if (phase !== "paused") {
      return;
    }

    setPhase("playing");
  };

  const finishExercise = () => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearTimer();
    clearResolveTimer();

    const score = calculateScore(correctCount, wrongCount);
    const successRate = calculateSuccessRate(correctCount, wrongCount);
    const finalNet = calculateNet(levelCorrectCount, levelWrongCount);
    const durationSeconds = Math.max(1, elapsedSeconds);
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "card-matching",
      exerciseTitle: "Kart Eslestirme Calismasi",
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
        flipBackDelayMs,
        theme: "Canli Cocuk Gorselleri",
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

  const stats = [
    { label: "Sure", value: formatElapsed(elapsedSeconds), tone: "brand" as const },
    { label: "Seviye", value: level },
    { label: "Dogru", value: correctCount, tone: "ok" as const },
    { label: "Yanlis", value: wrongCount, tone: "bad" as const },
    { label: "Net", value: net, tone: "brand" as const },
    { label: "Kart", value: cards.length },
  ];

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-8">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
        <select value={startLevel} onChange={(event) => handleStartLevelChange(Number(event.target.value))} className={FULLSCREEN_SELECT_CLASS}>
          {LEVEL_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kapanma</span>
        <select value={flipBackDelayMs} onChange={(event) => setFlipBackDelayMs(Number(event.target.value))} className={FULLSCREEN_SELECT_CLASS}>
          {DELAY_OPTIONS.map((item) => (
            <option key={item} value={item}>{item / 1000} sn</option>
          ))}
        </select>
      </label>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tema</span>
        <div className="flex h-10 items-center rounded-xl border border-red-100 bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-red-100/55">
          Canli Cocuk Gorselleri
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:col-span-5">
        {phase === "ready" ? (
          <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleStart}>
            Baslat
          </button>
        ) : (
          <>
            {phase === "paused" ? (
              <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResume}>
                Devam Et
              </button>
            ) : (
              <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePause} disabled={phase !== "playing"}>
                Duraklat
              </button>
            )}
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={() => resetToReady()}>
              Yeniden Baslat
            </button>
            <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
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
        title="Kart Eslestirme Calismasi"
        description="Kapali kartlari ac, ayni gorselleri eslestir ve gorsel hafiza ile odak becerini gelistir."
        buttonLabel="Egitime Basla"
        onStart={handleIntroStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Kart Eslestirme Calismasi"
        subtitle="Hazirlik modu"
        stats={stats}
        stageClassName="fx-slide-up mt-3 flex min-h-[46vh] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-white/92 px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.1)] backdrop-blur md:min-h-[54vh]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Kartlari hatirla, esleri bul.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
          Baslangic seviyesini ve yanlis eslesmede kartlarin kapanma suresini sec. Baslat dediginde sure ve eslestirme turu baslar.
        </p>
        <div className="mt-6 grid w-full max-w-xl grid-cols-3 gap-3">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Cift</p>
            <p className="mt-1 text-2xl font-black text-red-700">{getPairCountByLevel(startLevel)}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Kart</p>
            <p className="mt-1 text-2xl font-black text-red-700">{getPairCountByLevel(startLevel) * 2}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-bold text-slate-500">Hedef Net</p>
            <p className="mt-1 text-2xl font-black text-red-700">10</p>
          </article>
        </div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "completed" && result) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Kart Eslestirme Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Calisma sonucu kaydedildi.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.successRate}%</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Net</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.net}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatElapsed(result.elapsedSeconds)}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm font-semibold">
          <p>Ulasilan Seviye: <span className="text-slate-900">{result.reachedLevel}</span></p>
          <p className="mt-1">Toplam Hamle: <span className="text-slate-900">{result.totalMoves}</span></p>
          <p className="mt-1">Dogru Eslesme: <span className="text-[var(--ok)]">{result.correctCount}</span></p>
          <p className="mt-1">Yanlis Eslesme: <span className="text-[var(--bad)]">{result.wrongCount}</span></p>
          <p className="mt-1">Tamamlanan Deste: <span className="text-slate-900">{result.completedRounds}</span></p>
          <p className="mt-1">Seviye Atlama: <span className="text-slate-900">{result.levelUpCount}</span></p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={() => resetToReady()}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() => router.push(`/sonuc?exerciseType=card-matching&correct=${result.correctCount}&wrong=${result.wrongCount}&successRate=${result.successRate}&score=${result.score}`)}
          >
            Ortak Sonuc Ekrani
          </button>
          <Link href="/egzersizler" className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-4 text-base font-bold text-red-800 transition hover:bg-red-50" style={TOUCH_STYLE}>
            Egzersizlere Don
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Kart Eslestirme Calismasi"
      subtitle={phase === "paused" ? "Duraklatildi" : "Ayni gorselleri eslestir"}
      stats={stats}
      finishButton={
        <button type="button" onClick={finishExercise} className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md" style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up mt-3 flex min-h-[64vh] w-full flex-col rounded-[28px] border border-white/80 bg-white/94 p-3 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[70vh] md:p-5"
      footer={footerControls}
    >
      <div className="flex w-full flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Hedef</p>
            <p className="mt-1 text-xl font-black text-slate-950 md:text-2xl">Net 10 yap, otomatik seviye atla.</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-2 text-center shadow-sm">
            <p className="text-xs font-bold text-slate-500">Sure</p>
            <p className="text-3xl font-black text-red-700">{formatElapsed(elapsedSeconds)}</p>
          </div>
        </div>

        {feedback ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${getFeedbackClass(feedback.tone)}`}>
            {feedback.message}
          </div>
        ) : null}

        <div className={`relative flex-1 rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f0_100%)] p-2 shadow-inner md:p-4 ${phase === "paused" ? "blur-sm" : ""}`}>
          <div className={`grid h-full min-h-[44vh] content-center gap-2 md:gap-3 ${getGridClass(cards.length)}`}>
            {cards.map((card) => {
              const isOpen = openedCardIds.includes(card.id) || card.isMatched;
              const isBroken = brokenVisualIds.includes(card.visualId);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={phase !== "playing" || isResolving || card.isMatched}
                  className="group relative aspect-[4/5] min-h-[62px] rounded-2xl outline-none transition active:scale-[0.97] disabled:cursor-default"
                  style={{ ...FULLSCREEN_TOUCH_STYLE, perspective: "900px" }}
                  aria-label={isOpen ? card.title : "Kapali kart"}
                >
                  <span
                    className={`absolute inset-0 rounded-2xl border shadow-[0_10px_24px_rgba(15,23,42,0.13)] transition duration-300 [backface-visibility:hidden] [transform-style:preserve-3d] ${
                      isOpen
                        ? "[transform:rotateY(180deg)] border-amber-200 bg-white"
                        : "[transform:rotateY(0deg)] border-red-200 bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] group-hover:-translate-y-0.5"
                    }`}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-2xl text-lg font-black text-white md:text-2xl">
                      ?
                    </span>
                  </span>
                  <span
                    className={`absolute inset-0 flex items-center justify-center rounded-2xl border border-amber-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.13)] transition duration-300 [backface-visibility:hidden] [transform-style:preserve-3d] ${
                      isOpen ? "[transform:rotateY(0deg)] opacity-100" : "[transform:rotateY(180deg)] opacity-0"
                    } ${card.isMatched ? "ring-2 ring-green-300" : ""}`}
                  >
                    {isBroken ? (
                      <span className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 text-xl font-black text-amber-800 md:text-3xl">
                        {card.fallback}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.src}
                        alt={card.title}
                        className="h-full max-h-[96px] w-full object-contain"
                        onError={() => setBrokenVisualIds((prev) => prev.includes(card.visualId) ? prev : [...prev, card.visualId])}
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
                Duraklatildi. Devam Et ile kart eslestirme kaldigi yerden surer.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </FullscreenExerciseShell>
  );
}
