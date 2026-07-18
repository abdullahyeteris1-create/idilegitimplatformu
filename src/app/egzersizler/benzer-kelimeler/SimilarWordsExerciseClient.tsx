"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type ExercisePhase = "setup" | "ready" | "play" | "result";
type DurationSeconds = 60 | 120 | 180 | 240 | 300;
type BoxCount = 12 | 16 | 20 | 24;
type TargetDifferentCount = 3 | 4 | 5 | 6 | 7 | 8;
type BoxState = "idle" | "correct" | "wrong";
type SaveStatus = "idle" | "saving" | "success" | "error";

type SimilarWordPair = {
  leftWord: string;
  rightWord: string;
  isDifferent: boolean;
};

type SimilarWordBox = {
  id: string;
  pair: SimilarWordPair;
  state: BoxState;
};

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const cardThemes = [
  {
    base: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 hover:border-rose-300 hover:shadow-rose-100",
    dot: "bg-rose-400",
    line: "bg-rose-200/80",
  },
  {
    base: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-300 hover:shadow-sky-100",
    dot: "bg-sky-400",
    line: "bg-sky-200/80",
  },
  {
    base: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 hover:border-emerald-300 hover:shadow-emerald-100",
    dot: "bg-emerald-400",
    line: "bg-emerald-200/80",
  },
  {
    base: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 hover:border-violet-300 hover:shadow-violet-100",
    dot: "bg-violet-400",
    line: "bg-violet-200/80",
  },
  {
    base: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 hover:border-amber-300 hover:shadow-amber-100",
    dot: "bg-amber-400",
    line: "bg-amber-200/80",
  },
  {
    base: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 hover:border-indigo-300 hover:shadow-indigo-100",
    dot: "bg-indigo-400",
    line: "bg-indigo-200/80",
  },
];

const DIFFERENT_PAIRS: Array<[string, string]> = [
  ["yanik", "yanki"],
  ["dari", "dara"],
  ["kalem", "kelam"],
  ["kitap", "kitip"],
  ["masa", "kasa"],
  ["yazar", "yasar"],
  ["cicek", "cilek"],
  ["kadin", "kabin"],
  ["hedef", "heder"],
  ["sabir", "sabun"],
  ["kanal", "kanat"],
  ["beden", "neden"],
  ["sakin", "sakim"],
  ["hasar", "hazar"],
  ["sicak", "sacak"],
  ["davet", "devet"],
  ["serin", "seyrin"],
  ["dolap", "dolab"],
  ["sefer", "seder"],
  ["tasar", "tazar"],
];

const SAME_WORDS = [
  "sabah",
  "kitap",
  "masa",
  "kalem",
  "okul",
  "sehir",
  "bahar",
  "nehir",
  "orman",
  "kapi",
  "duvar",
  "cati",
  "deniz",
  "gunes",
  "bulut",
  "zihin",
  "yolcu",
  "bahce",
  "pencere",
  "sokak",
  "kopru",
  "defter",
  "ceket",
  "dagit",
  "doktor",
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index] as T;
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current;
  }
  return next;
}

function createRoundBoxes(boxCount: number, targetDifferentCount: number): SimilarWordBox[] {
  const safeDifferentCount = Math.max(1, Math.min(targetDifferentCount, boxCount));
  const boxes: SimilarWordBox[] = [];

  for (let index = 0; index < safeDifferentCount; index += 1) {
    const pair = randomItem(DIFFERENT_PAIRS);
    boxes.push({
      id: `diff-${Date.now()}-${index}-${Math.floor(Math.random() * 100000)}`,
      pair: {
        leftWord: pair[0],
        rightWord: pair[1],
        isDifferent: pair[0] !== pair[1],
      },
      state: "idle",
    });
  }

  for (let index = safeDifferentCount; index < boxCount; index += 1) {
    const sameWord = randomItem(SAME_WORDS);
    boxes.push({
      id: `same-${Date.now()}-${index}-${Math.floor(Math.random() * 100000)}`,
      pair: {
        leftWord: sameWord,
        rightWord: sameWord,
        isDifferent: false,
      },
      state: "idle",
    });
  }

  return shuffleArray(boxes);
}

function getGridClass(boxCount: BoxCount): string {
  if (boxCount === 12) {
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  }

  if (boxCount === 16) {
    return "grid-cols-2 sm:grid-cols-4";
  }

  if (boxCount === 20) {
    return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5";
  }

  return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6";
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export function SimilarWordsExerciseClient() {
  const router = useRouter();
  const hasSavedResultRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<SecureExerciseResultInput | null>(null);
  const phaseRef = useRef<ExercisePhase>("setup");

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [durationSeconds, setDurationSeconds] = useState<DurationSeconds>(60);
  const [boxCount, setBoxCount] = useState<BoxCount>(16);
  const [targetDifferentCount, setTargetDifferentCount] = useState<TargetDifferentCount>(4);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [boxes, setBoxes] = useState<SimilarWordBox[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [score, setScore] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [foundInCurrentRound, setFoundInCurrentRound] = useState(0);
  const [totalShownTargetCount, setTotalShownTargetCount] = useState(0);
  const [resultDuration, setResultDuration] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const net = correctCount - wrongCount;
  const totalClicks = correctCount + wrongCount;
  const remainingTarget = Math.max(targetDifferentCount - foundInCurrentRound, 0);
  const successPercent =
    totalShownTargetCount <= 0 ? 0 : Math.round((correctCount / totalShownTargetCount) * 100);

  const stageInfoText = useMemo(() => {
    if (phase !== "play") {
      return "Ayarlarini sec, hazir oldugunda baslat.";
    }

    return `Tur: ${completedRounds + 1} | Kalan: ${remainingTarget}`;
  }, [completedRounds, phase, remainingTarget]);

  const startNewRound = useCallback(() => {
    setBoxes(createRoundBoxes(boxCount, targetDifferentCount));
    setFoundInCurrentRound(0);
    setTotalShownTargetCount((prev) => prev + targetDifferentCount);
  }, [boxCount, targetDifferentCount]);

  const resetExercise = useCallback(
    (nextPhase: ExercisePhase) => {
      hasSavedResultRef.current = false;
      saveInFlightRef.current = false;
      saveCompletedRef.current = false;
      pendingResultRef.current = null;
      setSaveStatus("idle");
      setSaveMessage("");
      setCorrectCount(0);
      setWrongCount(0);
      setScore(0);
      setCompletedRounds(0);
      setFoundInCurrentRound(0);
      setTotalShownTargetCount(0);
      setResultDuration(0);
      setRemainingSeconds(durationSeconds);
      setBoxes([]);
      setPhase(nextPhase);
    },
    [durationSeconds],
  );

  useEffect(() => {
    if (phase !== "play") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          setResultDuration(durationSeconds);
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [durationSeconds, phase]);

  const handleStart = () => {
    resetExercise("ready");
  };

  const handleBeginPlay = () => {
    resetExercise("play");
    startNewRound();
  };

  const handleSelectBox = (boxId: string) => {
    if (phase !== "play") {
      return;
    }

    setBoxes((prevBoxes) => {
      const targetBox = prevBoxes.find((box) => box.id === boxId);
      if (!targetBox || targetBox.state !== "idle") {
        return prevBoxes;
      }

      if (targetBox.pair.isDifferent) {
        const nextBoxes = prevBoxes.map((box) =>
          box.id === boxId
            ? {
                ...box,
                state: "correct" as const,
              }
            : box,
        );

        const nextFoundCount = prevBoxes.filter((box) => box.state === "correct").length + 1;

        setCorrectCount((prev) => prev + 1);
        setScore((prev) => prev + 10);
        setFoundInCurrentRound(nextFoundCount);

        if (nextFoundCount >= targetDifferentCount) {
          setCompletedRounds((prev) => prev + 1);
          window.setTimeout(() => {
            if (phaseRef.current === "play") {
              startNewRound();
            }
          }, 320);
        }

        return nextBoxes;
      }

      const nextBoxes = prevBoxes.map((box) =>
        box.id === boxId
          ? {
              ...box,
              state: "wrong" as const,
            }
          : box,
      );

      setWrongCount((prev) => prev + 1);
      setScore((prev) => prev - 5);

      window.setTimeout(() => {
        setBoxes((latest) =>
          latest.map((box) =>
            box.id === boxId && box.state === "wrong"
              ? {
                  ...box,
                  state: "idle" as const,
                }
              : box,
          ),
        );
      }, 420);

      return nextBoxes;
    });
  };

  const handleRetry = () => {
    resetExercise("ready");
  };

  const handleFinishEarly = () => {
    if (phase === "play") {
      setResultDuration(Math.max(1, durationSeconds - remainingSeconds));
    }
    setPhase("result");
  };

  const persistResult = useCallback(async (payload: SecureExerciseResultInput) => {
    if (saveInFlightRef.current || saveCompletedRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    try {
      const saved = await saveExerciseResultSecure(payload);
      saveCompletedRef.current = true;
      setSaveStatus("success");
      setSaveMessage(saved.assignmentCompletionStatus === "failed"
        ? "Sonuç kaydedildi ancak görev tamamlanamadı."
        : "Sonuç başarıyla kaydedildi.");
    } catch {
      setSaveStatus("error");
      setSaveMessage("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      saveInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (phase !== "result" || hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    const actualDurationSeconds = Math.max(1, resultDuration || durationSeconds - remainingSeconds);

    const payload = {
      exerciseType: "similar-words",
      exerciseTitle: "Benzer Kelimeler",
      durationSeconds: actualDurationSeconds,
      correctCount,
      wrongCount,
      score,
      successRate: successPercent,
      details: {
        boxCount,
        targetDifferentCount,
        completedRounds,
        net,
        totalClicks,
        scoreRule: "+10 dogru, -5 yanlis",
      },
    } satisfies SecureExerciseResultInput;
    pendingResultRef.current = payload;
    void persistResult(payload);
  }, [
    boxCount,
    completedRounds,
    correctCount,
    durationSeconds,
    net,
    phase,
    remainingSeconds,
    resultDuration,
    score,
    successPercent,
    targetDifferentCount,
    totalClicks,
    wrongCount,
    persistResult,
  ]);

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Benzer Kelimeler"
        description="Her kutudaki kelime ciftini kontrol et. Sadece farkli olan ciftleri sec; ayni olana basarsan puan kaybedersin."
        buttonLabel="Egitime Basla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Benzer Kelimeler"
        subtitle="Hazirlik modu"
        stats={[
          { label: "Sure", value: formatDuration(durationSeconds), tone: "brand" },
          { label: "Kutu", value: boxCount },
          { label: "Hedef", value: targetDifferentCount, tone: "brand" },
          { label: "Kalan", value: targetDifferentCount },
          { label: "Dogru", value: 0, tone: "ok" },
          { label: "Yanlis", value: 0, tone: "bad" },
        ]}
        stageClassName="fx-slide-up flex h-full min-h-0 w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-3 py-3 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:px-4 md:py-4"
        footer={
          <div className="grid gap-2 lg:grid-cols-5">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sure</span>
              <select
                value={durationSeconds}
                onChange={(event) => {
                  const nextDuration = Number(event.target.value) as DurationSeconds;
                  setDurationSeconds(nextDuration);
                  setRemainingSeconds(nextDuration);
                }}
                className={FULLSCREEN_SELECT_CLASS}
              >
                <option value={60}>1 dakika</option>
                <option value={120}>2 dakika</option>
                <option value={180}>3 dakika</option>
                <option value={240}>4 dakika</option>
                <option value={300}>5 dakika</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kutu Sayisi</span>
              <select
                value={boxCount}
                onChange={(event) => setBoxCount(Number(event.target.value) as BoxCount)}
                className={FULLSCREEN_SELECT_CLASS}
              >
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={20}>20</option>
                <option value={24}>24</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hedef Kelime</span>
              <select
                value={targetDifferentCount}
                onChange={(event) => setTargetDifferentCount(Number(event.target.value) as TargetDifferentCount)}
                className={FULLSCREEN_SELECT_CLASS}
              >
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={7}>7</option>
                <option value={8}>8</option>
              </select>
            </label>
            <button
              type="button"
              className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleBeginPlay}
            >
              Baslat
            </button>
            <button
              type="button"
              className={FULLSCREEN_SECONDARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleRetry}
            >
              Yeniden Baslat
            </button>
          </div>
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Sure, kutu sayisi ve hedef kelime ayarlarini yaptiktan sonra Baslat ile tura gec.
        </p>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result") {
    return (
      <section className="idil-card mx-auto w-full max-w-5xl p-4 md:p-6">
        <h2 className="text-2xl font-bold">Benzer Kelimeler Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{saveStatus === "success" ? "Sure tamamlandi veya calisma Bitir ile sonlandirildi." : saveMessage}</p>
        {saveStatus !== "idle" ? <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${saveStatus === "error" || saveMessage.includes("görev") ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}><p>{saveMessage}</p>{saveStatus === "error" ? <button type="button" className="mt-2 min-h-11 rounded-xl bg-red-700 px-4 text-white" onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}>Yeniden Dene</button> : null}</div> : null}

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Dogru</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">{correctCount}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Yanlis</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">{wrongCount}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{score}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Net</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{net}</p>
          </article>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Tamamlanan Tur</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{completedRounds}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatDuration(resultDuration || durationSeconds)}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Basari</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{successPercent}%</p>
          </article>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={saveStatus !== "success"} className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleRetry}>
            Tekrar Dene
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            disabled={saveStatus !== "success"}
            style={TOUCH_STYLE}
            onClick={() =>
              router.push(
                `/sonuc?exerciseType=similar-words&correct=${correctCount}&wrong=${wrongCount}&successRate=${successPercent}&score=${score}`,
              )
            }
          >
            Sonuc Ekranina Git
          </button>
        </div>

        <div className="mt-4 flex justify-end [&>nav>button]:min-h-11">
          <ExerciseNavigationControls />
        </div>
      </section>
    );
  }

    return (
    <FullscreenExerciseShell
      title="Benzer Kelimeler"
      subtitle="Tam ekran calisma modu"
      stats={[
        { label: "Sure", value: formatDuration(remainingSeconds), tone: "brand" },
        { label: "Kutu", value: boxCount },
        { label: "Tur Hedefi", value: targetDifferentCount },
        { label: "Kalan", value: remainingTarget, tone: "brand" },
        { label: "Dogru", value: correctCount, tone: "ok" },
        { label: "Yanlis", value: wrongCount, tone: "bad" },
        { label: "Net", value: net, tone: net >= 0 ? "brand" : "bad" },
        { label: "Skor", value: score, tone: "brand" },
      ]}
      settings={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sure</span>
            <select
              value={durationSeconds}
              onChange={(event) => {
                const nextDuration = Number(event.target.value) as DurationSeconds;
                setDurationSeconds(nextDuration);
                setRemainingSeconds(nextDuration);
              }}
              className={FULLSCREEN_SELECT_CLASS}
            >
              <option value={60}>1 dakika</option>
              <option value={120}>2 dakika</option>
              <option value={180}>3 dakika</option>
              <option value={240}>4 dakika</option>
              <option value={300}>5 dakika</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kutu Sayisi</span>
            <select
              value={boxCount}
              onChange={(event) => setBoxCount(Number(event.target.value) as BoxCount)}
              className={FULLSCREEN_SELECT_CLASS}
            >
              <option value={12}>12</option>
              <option value={16}>16</option>
              <option value={20}>20</option>
              <option value={24}>24</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hedef Kelime</span>
            <select
              value={targetDifferentCount}
              onChange={(event) => setTargetDifferentCount(Number(event.target.value) as TargetDifferentCount)}
              className={FULLSCREEN_SELECT_CLASS}
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={7}>7</option>
              <option value={8}>8</option>
            </select>
          </label>
        </div>
      }
      finishButton={
        <div className="flex gap-1">
          <button type="button" onClick={handleRetry} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Yeniden
          </button>
          <button type="button" onClick={handleFinishEarly} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
            Bitir
          </button>
        </div>
      }
      stageClassName="exercise-stage-fit flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,248,246,0.86)_100%)] p-[clamp(6px,1.5vw,16px)] shadow-[0_20px_60px_rgba(185,28,28,0.10)] backdrop-blur md:rounded-[32px]"
    >
      <div className="fx-fade-in flex h-full min-h-0 w-full flex-col">
        <p className="mb-1 shrink-0 text-xs font-semibold text-slate-500 md:mb-2 md:text-sm">{stageInfoText}</p>
        <div className={`grid min-h-0 flex-1 auto-rows-fr content-stretch [gap:clamp(6px,1.5vw,16px)] ${getGridClass(boxCount)}`}>
          {boxes.map((box, index) => {
            const theme = cardThemes[index % cardThemes.length];
            const boxStateClass =
              box.state === "correct"
                ? "border-green-400 bg-green-100 text-green-900 fx-glow-green"
                : box.state === "wrong"
                  ? "border-red-400 bg-red-100 text-red-900 fx-blink-red fx-shake"
                  : `${theme.base} text-slate-900 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl`;

            return (
              <button
                key={box.id}
                type="button"
                className={`relative isolate z-50 flex h-full min-h-0 w-full cursor-pointer select-none touch-manipulation items-center justify-center overflow-hidden rounded-xl border p-1 text-center shadow-md transition-all duration-300 active:scale-95 md:rounded-2xl md:p-2 ${boxStateClass}`}
                style={TOUCH_STYLE}
                onClick={() => handleSelectBox(box.id)}
                disabled={phase !== "play" || box.state !== "idle" || remainingSeconds <= 0}
              >
                {box.state === "idle" ? (
                  <>
                    <span className={`pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                    <span className="pointer-events-none absolute -left-6 -top-6 h-14 w-14 rounded-full bg-white/65 blur-xl" />
                  </>
                ) : null}

                <div className="relative flex min-h-0 max-w-full flex-col items-center justify-center gap-0.5 text-center md:gap-1">
                  <p className="max-w-full [overflow-wrap:anywhere] text-[clamp(0.85rem,3.2vw,1.5rem)] font-extrabold leading-tight tracking-wide text-slate-900">{box.pair.leftWord}</p>
                  <div className={`h-0.5 w-8 rounded-full md:w-12 ${box.state === "idle" ? theme.line : "bg-slate-300/70"}`} />
                  <p className="max-w-full [overflow-wrap:anywhere] text-[clamp(0.85rem,3.2vw,1.5rem)] font-extrabold leading-tight tracking-wide text-slate-900">{box.pair.rightWord}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FullscreenExerciseShell>
  );
}
