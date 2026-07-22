"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { WORD_FINDING_TEXTS } from "@/lib/data/wordFindingTexts";
import {
  calculateScore,
  calculateSuccessRate,
  createWordFindingRound,
  type ClickableWord,
} from "@/lib/exercise-engine/wordFinding";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/word-finding-theme.module.css";

type ExercisePhase = "setup" | "ready" | "running" | "result";
type DurationMinutes = 1 | 2 | 3 | 4 | 5;
type TargetWordsPerText = 3 | 4 | 5 | 6;
type FeedbackType = "correct" | "wrong";
type SaveStatus = "idle" | "saving" | "success" | "error";

type WordFindingResult = {
  correctCount: number;
  wrongCount: number;
  net: number;
  score: number;
  successRate: number;
  completedRounds: number;
  durationSeconds: number;
  totalClicks: number;
};

const DURATION_OPTIONS: DurationMinutes[] = [1, 2, 3, 4, 5];
const TARGET_WORD_OPTIONS: TargetWordsPerText[] = [3, 4, 5, 6];

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getTextIndex(seed: number): number {
  return seed % WORD_FINDING_TEXTS.length;
}

export function WordFindingExerciseClient() {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? "" : styles.darkTheme].join(" ");
  const hasSavedResultRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const pendingResultRef = useRef<{ payload: SecureExerciseResultInput; result: WordFindingResult } | null>(null);
  const tickRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(2);
  const [targetWordsPerText, setTargetWordsPerText] = useState<TargetWordsPerText>(3);
  const [textSeed, setTextSeed] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [foundInRound, setFoundInRound] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState<{ wordId: string; type: FeedbackType } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [result, setResult] = useState<WordFindingResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const selectedText = WORD_FINDING_TEXTS[getTextIndex(textSeed)];

  const round = useMemo(() => {
    return createWordFindingRound({
      text: selectedText.text,
      targetCount: targetWordsPerText,
    });
  }, [selectedText.text, targetWordsPerText]);

  const activeTarget = round.targets[targetIndex] ?? round.targets[0] ?? null;
  const score = calculateScore(correctCount, wrongCount);
  const net = correctCount - wrongCount;
  const configuredDurationSeconds = durationMinutes * 60;
  const elapsedSeconds = Math.max(0, configuredDurationSeconds - remainingSeconds);

  const resetToReady = useCallback((nextDurationMinutes = durationMinutes) => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    hasSavedResultRef.current = false;
    saveInFlightRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    setSaveStatus("idle");
    setSaveMessage("");
    setTargetIndex(0);
    setFoundInRound(0);
    setCompletedRounds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setRemainingSeconds(nextDurationMinutes * 60);
    setIsPaused(false);
    setFeedback(null);
    setIsResolving(false);
    setResult(null);
    setPhase("ready");
  }, [durationMinutes]);

  const persistResult = useCallback(async (pending: { payload: SecureExerciseResultInput; result: WordFindingResult }) => {
    if (saveInFlightRef.current || saveCompletedRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    try {
      const saved = await saveExerciseResultSecure(pending.payload);
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

  const finalizeExercise = useCallback(() => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const finalScore = calculateScore(correctCount, wrongCount);
    const finalSuccessRate = calculateSuccessRate(correctCount, wrongCount);
    const finalNet = correctCount - wrongCount;
    const finalTotalClicks = correctCount + wrongCount;
    const finalDuration = Math.max(1, elapsedSeconds || configuredDurationSeconds);
    const payload = {
      exerciseType: "word-finding",
      exerciseTitle: "Kelime Bulma Calismasi",
      durationSeconds: finalDuration,
      correctCount,
      wrongCount,
      score: finalScore,
      successRate: finalSuccessRate,
      details: {
        targetWordsPerText,
        completedRounds,
        totalClicks: finalTotalClicks,
        net: finalNet,
        scoreRule: "+10 dogru, -5 yanlis",
      },
    } satisfies SecureExerciseResultInput;
    const nextResult = {
      correctCount,
      wrongCount,
      net: finalNet,
      score: finalScore,
      successRate: finalSuccessRate,
      completedRounds,
      durationSeconds: finalDuration,
      totalClicks: finalTotalClicks,
    } satisfies WordFindingResult;
    const pending = { payload, result: nextResult };
    pendingResultRef.current = pending;
    setResult(nextResult);
    setIsPaused(false);
    setIsResolving(false);
    setPhase("result");
    void persistResult(pending);
  }, [
    completedRounds,
    configuredDurationSeconds,
    correctCount,
    elapsedSeconds,
    targetWordsPerText,
    wrongCount,
    persistResult,
  ]);

  const handleStartIntro = () => {
    hasSavedResultRef.current = false;
    saveCompletedRef.current = false;
    pendingResultRef.current = null;
    setSaveStatus("idle");
    setSaveMessage("");
    setPhase("ready");
    setRemainingSeconds(durationMinutes * 60);
  };

  const handleBeginPlay = () => {
    hasSavedResultRef.current = false;
    setTargetIndex(0);
    setFoundInRound(0);
    setCompletedRounds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setRemainingSeconds(durationMinutes * 60);
    setFeedback(null);
    setIsResolving(false);
    setIsPaused(false);
    setPhase("running");

    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
    }

    tickRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const handleRestart = () => {
    resetToReady();
  };

  const handleFinishEarly = () => {
    finalizeExercise();
  };

  useEffect(() => {
    if (phase === "running" && remainingSeconds === 0) {
      window.setTimeout(finalizeExercise, 0);
    }
  }, [finalizeExercise, phase, remainingSeconds]);

  useEffect(() => {
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
      }
    };
  }, []);

  const advanceRound = () => {
    setFoundInRound((prevFound) => {
      const nextFound = prevFound + 1;

      if (nextFound >= targetWordsPerText) {
        setCompletedRounds((prev) => prev + 1);
        setTextSeed((prev) => prev + 1);
        setTargetIndex(0);
        return 0;
      }

      setTargetIndex((prev) => prev + 1);
      return nextFound;
    });
  };

  const handleWordClick = (word: ClickableWord) => {
    if (phase !== "running" || isPaused || isResolving || !activeTarget) {
      return;
    }

    const isCorrect = word.normalized === activeTarget.normalized;
    setFeedback({ wordId: word.id, type: isCorrect ? "correct" : "wrong" });
    setIsResolving(true);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      window.setTimeout(() => {
        setFeedback(null);
        advanceRound();
        setIsResolving(false);
      }, 430);
      return;
    }

    setWrongCount((prev) => prev + 1);
    window.setTimeout(() => {
      setFeedback(null);
      setIsResolving(false);
    }, 320);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const nextPaused = !prev;

      if (nextPaused && tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }

      if (!nextPaused && tickRef.current === null) {
        tickRef.current = window.setInterval(() => {
          setRemainingSeconds((prevSeconds) => {
            if (prevSeconds <= 1) {
              return 0;
            }

            return prevSeconds - 1;
          });
        }, 1000);
      }

      return nextPaused;
    });
  };

  const stats = [
    { label: "Sure", value: formatDuration(phase === "ready" ? durationMinutes * 60 : remainingSeconds), tone: "brand" as const },
    { label: "Dogru", value: correctCount, tone: "ok" as const },
    { label: "Yanlis", value: wrongCount, tone: "bad" as const },
    { label: "Net", value: net },
    { label: "Puan", value: score, tone: "brand" as const },
    { label: "Bulunan", value: `${foundInRound}/${targetWordsPerText}` },
  ];

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-5">
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Sure</span>
        <select
          value={durationMinutes}
          onChange={(event) => {
            const nextDuration = Number(event.target.value) as DurationMinutes;
            setDurationMinutes(nextDuration);
            resetToReady(nextDuration);
          }}
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
        >
          {DURATION_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} dakika
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Kelime</span>
        <select
          value={targetWordsPerText}
          onChange={(event) => {
            setTargetWordsPerText(Number(event.target.value) as TargetWordsPerText);
            resetToReady();
          }}
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
        >
          {TARGET_WORD_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-3 lg:col-span-3">
        {phase === "ready" ? (
          <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleBeginPlay}>
            Baslat
          </button>
        ) : (
          <>
            <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={togglePause}>
              {isPaused ? "Devam Et" : "Duraklat"}
            </button>
            <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Baslat
            </button>
            <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleFinishEarly}>
              Bitir
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseIntro
          title="Kelime Bulma Calismasi"
          description="Paragraf icindeki hedef kelimeyi hizlica bul ve tikla."
          buttonLabel="Egitime Basla"
          onStart={handleStartIntro}
        />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseShell
          title="Kelime Bulma Calismasi"
          subtitle="Hazirlik modu"
          stats={[
            { label: "Sure", value: `${durationMinutes} dk`, tone: "brand" },
            { label: "Hedef", value: targetWordsPerText },
          ]}
          stageClassName={`fx-slide-up flex min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-4 py-5 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[380px] ${styles.stageOverride}`}
          footer={footerControls}
        >
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700 ${styles.introEyebrow}`}>Hazirlik</p>
            <h2 className={`mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl ${styles.introTitle}`}>Ayarlarini sec, hazir oldugunda baslat.</h2>
            <p className={`mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base ${styles.introBody}`}>
              Sureyi ve bir paragrafta bulunacak hedef kelime sayisini sec. Baslat dediginde sure islemeye baslar.
            </p>
          </div>
        </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className={themeRootClassName}>
        <section className={`idil-card mx-auto w-full max-w-5xl p-4 md:p-6 ${styles.resultCardOverride}`}>
          <h2 className="text-2xl font-bold">Kelime Bulma Sonucu</h2>
          <p className={`mt-1 text-sm text-[var(--muted)] ${styles.resultMuted}`}>{saveStatus === "success" ? "Calisma tamamlandi." : saveMessage}</p>
          {saveStatus !== "idle" ? <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${saveStatus === "error" || saveMessage.includes("görev") ? `border-red-200 bg-red-50 text-red-800 ${styles.noticeError}` : `border-blue-200 bg-blue-50 text-blue-800 ${styles.noticeInfo}`}`}><p>{saveMessage}</p>{saveStatus === "error" ? <button type="button" className="mt-2 min-h-11 rounded-xl bg-red-700 px-4 text-white" onClick={() => pendingResultRef.current && void persistResult(pendingResultRef.current)}>Yeniden Dene</button> : null}</div> : null}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Dogru</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">{result.correctCount}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Yanlis</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">{result.wrongCount}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Net</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.net}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Puan</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Tur</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.completedRounds}</p>
            </article>
          </div>

          <div className={`mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm ${styles.resultDetailCard}`}>
            <p><strong>Toplam Sure:</strong> {formatDuration(result.durationSeconds)}</p>
            <p className="mt-1"><strong>Toplam Tiklama:</strong> {result.totalClicks}</p>
            <p className="mt-1"><strong>Basari:</strong> {result.successRate}%</p>
            <p className="mt-1"><strong>Puanlama:</strong> +10 dogru, -5 yanlis</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={saveStatus !== "success"} className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleRestart}>
              Yeniden Baslat
            </button>
            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              disabled={saveStatus !== "success"}
              style={TOUCH_STYLE}
              onClick={() => router.push(`/sonuc?exerciseType=word-finding&correct=${result.correctCount}&wrong=${result.wrongCount}&successRate=${result.successRate}&score=${result.score}`)}
            >
              Ortak Sonuc Ekrani
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
    <div className={themeRootClassName}>
      <FullscreenExerciseShell
        title="Kelime Bulma Calismasi"
        subtitle={selectedText.title}
        stats={stats}
        finishButton={
          <button type="button" onClick={handleFinishEarly} className={`min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE}>
            Bitir
          </button>
        }
        stageClassName={`fx-slide-up flex min-h-[380px] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,246,0.9)_100%)] px-3 py-4 text-center shadow-[0_14px_42px_rgba(185,28,28,0.10)] backdrop-blur md:min-h-[460px] md:px-5 ${styles.stageOverride}`}
        footer={footerControls}
      >
        <div className="w-full max-w-4xl">
          <article className={`rounded-[26px] border border-red-100 bg-white px-4 py-5 text-left leading-9 shadow-[0_18px_50px_rgba(185,28,28,0.10)] md:px-7 md:py-6 md:leading-10 ${styles.readingArticle}`}>
            {round.words.map((word) => {
              const feedbackClass =
                feedback?.wordId === word.id
                  ? feedback.type === "correct"
                    ? `fx-glow-green border-green-200 bg-green-100 text-green-800 ${styles.wordCorrect}`
                    : `fx-blink-red border-red-300 bg-red-100 text-red-800 ${styles.wordWrong}`
                  : `border-transparent bg-transparent text-slate-800 hover:border-red-100 hover:bg-red-50 ${styles.wordIdle}`;

              return (
                <button
                  key={word.id}
                  type="button"
                  disabled={phase !== "running" || isPaused || isResolving}
                  onClick={() => handleWordClick(word)}
                  className={`mx-0.5 inline-flex min-h-11 items-center cursor-pointer rounded-lg border px-1.5 text-base font-semibold transition duration-150 active:scale-[0.96] disabled:cursor-default md:text-lg ${feedbackClass}`}
                  style={FULLSCREEN_TOUCH_STYLE}
                >
                  {word.raw}
                </button>
              );
            })}
          </article>

          <div className={`mt-5 rounded-[24px] border border-red-200/90 bg-[linear-gradient(135deg,#fff7f7_0%,#fee2e2_100%)] px-5 py-4 text-center shadow-inner shadow-red-100/70 ${styles.targetPanel}`}>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] text-red-700 ${styles.targetLabel}`}>Bulunacak kelime</p>
            <p className={`mt-2 text-3xl font-black text-slate-950 ${styles.targetValue}`}>{activeTarget?.normalized ?? "-"}</p>
          </div>

          {isPaused ? (
            <p className={`mt-4 text-sm font-semibold text-red-700 ${styles.pausedText}`}>Duraklatildi. Devam Et ile kaldigin yerden surdur.</p>
          ) : null}
        </div>
      </FullscreenExerciseShell>
    </div>
  );
}
