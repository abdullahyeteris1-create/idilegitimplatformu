"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { FixedExerciseStage } from "@/components/exercises/FixedExerciseStage";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import swStyles from "@/components/exercises/similar-words-theme.module.css";

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

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const BOX_TONE_CLASSES = [
  swStyles.boxTone0,
  swStyles.boxTone1,
  swStyles.boxTone2,
  swStyles.boxTone3,
  swStyles.boxTone4,
  swStyles.boxTone5,
];

const STAT_TONE_CLASS = {
  neutral: swStyles.statNeutral,
  ok: swStyles.statOk,
  bad: swStyles.statBad,
  brand: swStyles.statBrand,
  progress: swStyles.statProgress,
} as const;

function SwStat({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: keyof typeof STAT_TONE_CLASS }) {
  return (
    <span className={`${swStyles.statChip} ${STAT_TONE_CLASS[tone]}`}>
      {label}: {value}
    </span>
  );
}

function CategoryTag() {
  return <span className={swStyles.categoryTag}>◎ Algı ve Dikkat</span>;
}

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
      <div className={swStyles.themeRoot}>
        <FixedExerciseStage
          title="Benzer Kelimeler"
          subtitle="Giriş"
          topStats={<CategoryTag />}
          controls={
            <div className="mx-auto w-full max-w-md">
              <button type="button" onClick={handleStart} className={swStyles.primaryButton} style={TOUCH_STYLE}>
                Egitime Basla
              </button>
            </div>
          }
          onExit={() => router.push("/egzersizler")}
        >
          <div
            className={`fx-slide-up flex max-h-full w-full max-w-2xl flex-col items-center overflow-auto rounded-[28px] border px-5 py-6 text-center md:px-7 md:py-8 ${swStyles.introCard}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${swStyles.introEyebrow}`}>Egzersiz</p>
            <h2 className={`mt-2 text-2xl font-black tracking-tight md:text-4xl ${swStyles.introTitle}`}>Benzer Kelimeler</h2>
            <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 ${swStyles.introBody}`}>
              Her kutudaki kelime ciftini kontrol et. Sadece farkli olan ciftleri sec; ayni olana basarsan puan kaybedersin.
            </p>
          </div>
        </FixedExerciseStage>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={swStyles.themeRoot}>
        <FixedExerciseStage
          title="Benzer Kelimeler"
          subtitle="Hazirlik modu"
          topStats={
            <>
              <CategoryTag />
              <SwStat label="Sure" value={formatDuration(durationSeconds)} tone="brand" />
              <SwStat label="Kutu" value={boxCount} />
              <SwStat label="Hedef" value={targetDifferentCount} tone="progress" />
              <SwStat label="Kalan" value={targetDifferentCount} tone="progress" />
              <SwStat label="Dogru" value={0} tone="ok" />
              <SwStat label="Yanlis" value={0} tone="bad" />
            </>
          }
          bottomSettings={
            <div className="grid gap-2 lg:grid-cols-5">
              <label className="flex min-w-0 flex-col gap-1">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Sure</span>
                <select
                  value={durationSeconds}
                  onChange={(event) => {
                    const nextDuration = Number(event.target.value) as DurationSeconds;
                    setDurationSeconds(nextDuration);
                    setRemainingSeconds(nextDuration);
                  }}
                  className={swStyles.select}
                >
                  <option value={60}>1 dakika</option>
                  <option value={120}>2 dakika</option>
                  <option value={180}>3 dakika</option>
                  <option value={240}>4 dakika</option>
                  <option value={300}>5 dakika</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Kutu Sayisi</span>
                <select
                  value={boxCount}
                  onChange={(event) => setBoxCount(Number(event.target.value) as BoxCount)}
                  className={swStyles.select}
                >
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={20}>20</option>
                  <option value={24}>24</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Hedef Kelime</span>
                <select
                  value={targetDifferentCount}
                  onChange={(event) => setTargetDifferentCount(Number(event.target.value) as TargetDifferentCount)}
                  className={swStyles.select}
                >
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </label>
              <button type="button" className={swStyles.primaryButton} style={TOUCH_STYLE} onClick={handleBeginPlay}>
                Baslat
              </button>
              <button type="button" className={swStyles.secondaryButton} style={TOUCH_STYLE} onClick={handleRetry}>
                Yeniden Baslat
              </button>
            </div>
          }
          onExit={() => router.push("/egzersizler")}
        >
          <div className="flex h-full min-h-0 w-full max-w-6xl flex-col items-center justify-center text-center">
            <div
              className={`fx-slide-up flex h-full min-h-0 w-full flex-col items-center justify-center rounded-[28px] border px-3 py-3 text-center md:px-4 md:py-4 ${swStyles.introCard}`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${swStyles.introEyebrow}`}>Hazirlik</p>
              <h2 className={`mt-2 text-2xl font-black tracking-tight md:text-4xl ${swStyles.introTitle}`}>Ayarlarini sec, hazir oldugunda baslat.</h2>
              <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 ${swStyles.introBody}`}>
                Sure, kutu sayisi ve hedef kelime ayarlarini yaptiktan sonra Baslat ile tura gec.
              </p>
            </div>
          </div>
        </FixedExerciseStage>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className={swStyles.resultRoot}>
        <section className={swStyles.resultCard}>
          <div className={swStyles.resultAccent} aria-hidden="true" />
          <h2 className={swStyles.resultTitle}>Benzer Kelimeler Sonucu</h2>
          <p className={swStyles.resultSubtitle}>
            {saveStatus === "success" ? "Sure tamamlandi veya calisma Bitir ile sonlandirildi." : saveMessage}
          </p>
          {saveStatus !== "idle" ? (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                saveStatus === "error" || saveMessage.includes("görev") ? swStyles.resultNoticeError : swStyles.resultNoticeInfo
              }`}
            >
              <p>{saveMessage}</p>
              {saveStatus === "error" ? (
                <button
                  type="button"
                  className={`mt-2 ${swStyles.primaryButton}`}
                  style={TOUCH_STYLE}
                  onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}
                >
                  Yeniden Dene
                </button>
              ) : null}
            </div>
          ) : null}

          <div className={swStyles.resultStatGrid}>
            <article className={swStyles.resultStatTile} style={{ "--tone": "var(--sw-green)" } as CSSProperties}>
              <p>Dogru</p>
              <p>{correctCount}</p>
            </article>
            <article className={swStyles.resultStatTile} style={{ "--tone": "var(--sw-pink)" } as CSSProperties}>
              <p>Yanlis</p>
              <p>{wrongCount}</p>
            </article>
            <article className={swStyles.resultStatTile} style={{ "--tone": "var(--sw-purple)" } as CSSProperties}>
              <p>Puan</p>
              <p>{score}</p>
            </article>
            <article className={swStyles.resultStatTile} style={{ "--tone": "var(--sw-blue)" } as CSSProperties}>
              <p>Net</p>
              <p>{net}</p>
            </article>
          </div>

          <div className={swStyles.resultStatGrid3}>
            <article className={swStyles.resultStatTile}>
              <p>Tamamlanan Tur</p>
              <p>{completedRounds}</p>
            </article>
            <article className={swStyles.resultStatTile}>
              <p>Sure</p>
              <p>{formatDuration(resultDuration || durationSeconds)}</p>
            </article>
            <article className={swStyles.resultStatTile}>
              <p>Basari</p>
              <p>{successPercent}%</p>
            </article>
          </div>

          <div className={swStyles.resultActionRow}>
            <button type="button" disabled={saveStatus !== "success"} className={swStyles.primaryButton} style={TOUCH_STYLE} onClick={handleRetry}>
              Tekrar Çalış
            </button>
            <button
              type="button"
              className={swStyles.primaryButton}
              disabled={saveStatus !== "success"}
              style={TOUCH_STYLE}
              onClick={() =>
                router.push(
                  `/sonuc?exerciseType=similar-words&correct=${correctCount}&wrong=${wrongCount}&successRate=${successPercent}&score=${score}`,
                )
              }
            >
              Sonuçları Gör
            </button>
          </div>

          <div className="mt-4 flex justify-end [&>nav>button]:min-h-11">
            <ExerciseNavigationControls />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={swStyles.themeRoot}>
      <FixedExerciseStage
        title="Benzer Kelimeler"
        subtitle="Tam ekran calisma modu"
        topStats={
          <>
            <CategoryTag />
            <SwStat label="Sure" value={formatDuration(remainingSeconds)} tone="brand" />
            <SwStat label="Kutu" value={boxCount} />
            <SwStat label="Tur Hedefi" value={targetDifferentCount} tone="progress" />
            <SwStat label="Kalan" value={remainingTarget} tone="progress" />
            <SwStat label="Dogru" value={correctCount} tone="ok" />
            <SwStat label="Yanlis" value={wrongCount} tone="bad" />
            <SwStat label="Net" value={net} tone={net >= 0 ? "brand" : "bad"} />
            <SwStat label="Skor" value={score} tone="brand" />
          </>
        }
        bottomSettings={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Sure</span>
              <select
                value={durationSeconds}
                onChange={(event) => {
                  const nextDuration = Number(event.target.value) as DurationSeconds;
                  setDurationSeconds(nextDuration);
                  setRemainingSeconds(nextDuration);
                }}
                className={swStyles.select}
              >
                <option value={60}>1 dakika</option>
                <option value={120}>2 dakika</option>
                <option value={180}>3 dakika</option>
                <option value={240}>4 dakika</option>
                <option value={300}>5 dakika</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Kutu Sayisi</span>
              <select
                value={boxCount}
                onChange={(event) => setBoxCount(Number(event.target.value) as BoxCount)}
                className={swStyles.select}
              >
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={20}>20</option>
                <option value={24}>24</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${swStyles.settingsLabel}`}>Hedef Kelime</span>
              <select
                value={targetDifferentCount}
                onChange={(event) => setTargetDifferentCount(Number(event.target.value) as TargetDifferentCount)}
                className={swStyles.select}
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
        controls={
          <div className="flex gap-1">
            <button type="button" onClick={handleRetry} className={swStyles.secondaryButton} style={TOUCH_STYLE}>
              Yeniden
            </button>
            <button type="button" onClick={handleFinishEarly} className={swStyles.secondaryButton} style={TOUCH_STYLE}>
              Bitir
            </button>
          </div>
        }
        onExit={() => router.push("/egzersizler")}
      >
        <div className={`flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-[20px] border p-[clamp(6px,1.5vw,16px)] md:rounded-[32px] ${swStyles.gameFrame}`}>
          <div className="fx-fade-in flex h-full min-h-0 w-full flex-col">
            <p className={`mb-1 shrink-0 text-xs font-semibold md:mb-2 md:text-sm ${swStyles.stageInfoText}`}>{stageInfoText}</p>
            <div className={`grid min-h-0 flex-1 auto-rows-fr content-stretch [gap:clamp(6px,1.5vw,16px)] ${getGridClass(boxCount)}`}>
              {boxes.map((box, index) => {
                const toneClass = BOX_TONE_CLASSES[index % BOX_TONE_CLASSES.length];
                const stateClass =
                  box.state === "correct" ? `${swStyles.boxCorrect} fx-glow-green` : box.state === "wrong" ? `${swStyles.boxWrong} fx-shake` : "";

                return (
                  <button
                    key={box.id}
                    type="button"
                    className={`relative isolate z-50 flex h-full min-h-0 w-full cursor-pointer select-none touch-manipulation items-center justify-center overflow-hidden rounded-xl border p-1 text-center transition-all duration-300 active:scale-95 md:rounded-2xl md:p-2 ${swStyles.box} ${toneClass} ${stateClass}`}
                    style={TOUCH_STYLE}
                    onClick={() => handleSelectBox(box.id)}
                    disabled={phase !== "play" || box.state !== "idle" || remainingSeconds <= 0}
                  >
                    {box.state === "idle" ? <span className={`pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${swStyles.boxDot}`} /> : null}

                    <div className="relative flex min-h-0 max-w-full flex-col items-center justify-center gap-0.5 text-center md:gap-1">
                      <p className={`max-w-full [overflow-wrap:anywhere] text-[clamp(0.85rem,3.2vw,1.5rem)] font-extrabold leading-tight tracking-wide ${swStyles.boxWord}`}>
                        {box.pair.leftWord}
                      </p>
                      <div className={`h-0.5 w-8 rounded-full md:w-12 ${swStyles.boxDivider}`} />
                      <p className={`max-w-full [overflow-wrap:anywhere] text-[clamp(0.85rem,3.2vw,1.5rem)] font-extrabold leading-tight tracking-wide ${swStyles.boxWord}`}>
                        {box.pair.rightWord}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FixedExerciseStage>
    </div>
  );
}
