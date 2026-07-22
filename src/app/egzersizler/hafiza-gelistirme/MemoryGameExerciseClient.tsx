"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
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
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/memory-game-theme.module.css";

type ExercisePhase = "setup" | "ready" | "play" | "result";
type RoundPhase = "prepare" | "show" | "select" | "feedback";
type MemoryGridLayout = "5x5" | "5x10" | "10x10";
type DisplayMs = 500 | 750 | 1000 | 1500 | 2000;
type FontSizePx = 12 | 16 | 20 | 24;
type FeedbackType = "correct" | "wrong" | "level-up" | "info";

type GridInfo = {
  rows: number;
  cols: number;
  totalBoxes: number;
  label: string;
};

const LEVEL_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const DISPLAY_OPTIONS: DisplayMs[] = [500, 750, 1000, 1500, 2000];
const FONT_OPTIONS: FontSizePx[] = [12, 16, 20, 24];
const NET_TARGET = 10;
const MAX_LEVEL = 10;

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function getGridInfo(layout: MemoryGridLayout): GridInfo {
  if (layout === "5x10") {
    return {
      rows: 5,
      cols: 10,
      totalBoxes: 50,
      label: "5 x 10",
    };
  }

  if (layout === "10x10") {
    return {
      rows: 10,
      cols: 10,
      totalBoxes: 100,
      label: "10 x 10",
    };
  }

  return {
    rows: 5,
    cols: 5,
    totalBoxes: 25,
    label: "5 x 5",
  };
}

function getFontLabel(value: FontSizePx): string {
  if (value === 12) return "Küçük";
  if (value === 16) return "Orta";
  if (value === 20) return "Büyük";
  return "Çok Büyük";
}

function generateTargets(totalBoxes: number, targetCount: number): Set<number> {
  const indexes = Array.from({ length: totalBoxes }, (_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [
      indexes[randomIndex],
      indexes[index],
    ];
  }

  return new Set(indexes.slice(0, targetCount));
}

function calculateScore(totalCorrect: number, totalWrong: number): number {
  return Math.max(0, totalCorrect * 10 - totalWrong * 5);
}

function calculateSuccessRate(totalCorrect: number, totalWrong: number): number {
  const total = totalCorrect + totalWrong;

  if (total === 0) return 0;

  return Math.round((totalCorrect / total) * 100);
}

function getFeedbackClass(type: FeedbackType): string {
  if (type === "correct") {
    return `fx-glow-green border-green-200 bg-green-50 text-green-700 ${styles.feedbackOk}`;
  }

  if (type === "level-up") {
    return `border-blue-200 bg-blue-50 text-blue-800 ${styles.feedbackLevelUp}`;
  }

  if (type === "wrong") {
    return `fx-shake border-red-200 bg-red-50 text-red-700 ${styles.feedbackBad}`;
  }

  return `border-slate-200 bg-slate-50 text-slate-700 ${styles.feedbackInfo}`;
}

function getRoundPhaseLabel(roundPhase: RoundPhase): string {
  if (roundPhase === "prepare") return "Hazırlanıyor";
  if (roundPhase === "show") return "Kutular yanıyor";
  if (roundPhase === "select") return "Kutuları seç";
  return "Sonuç";
}

export function MemoryGameExerciseClient() {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");

  const hasSavedResultRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const prepareTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const nextRoundTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("prepare");

  const [gridLayout, setGridLayout] = useState<MemoryGridLayout>("5x5");
  const [level, setLevel] = useState(2);
  const [displayMs, setDisplayMs] = useState<DisplayMs>(1000);
  const [fontSize, setFontSize] = useState<FontSizePx>(16);

  const [roundNumber, setRoundNumber] = useState(1);
  const [levelCorrectCount, setLevelCorrectCount] = useState(0);
  const [levelWrongCount, setLevelWrongCount] = useState(0);
  const [totalCorrectCount, setTotalCorrectCount] = useState(0);
  const [totalWrongCount, setTotalWrongCount] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [activeTargets, setActiveTargets] = useState<Set<number>>(new Set());
  const [selectedCorrect, setSelectedCorrect] = useState<Set<number>>(
    new Set(),
  );
  const [selectedWrong, setSelectedWrong] = useState<number | null>(null);

  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const gridInfo = useMemo(() => getGridInfo(gridLayout), [gridLayout]);
  const net = levelCorrectCount - levelWrongCount;
  const score = calculateScore(totalCorrectCount, totalWrongCount);
  const successRate = calculateSuccessRate(totalCorrectCount, totalWrongCount);
  const clearRoundTimers = useCallback(() => {
    if (prepareTimerRef.current !== null) {
      window.clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (nextRoundTimerRef.current !== null) {
      window.clearTimeout(nextRoundTimerRef.current);
      nextRoundTimerRef.current = null;
    }
  }, []);

  const beginRound = useCallback(
    (nextRoundNumber: number, activeLevel = level) => {
      clearRoundTimers();

      const nextTargets = generateTargets(gridInfo.totalBoxes, activeLevel);

      setRoundNumber(nextRoundNumber);
      setRoundPhase("prepare");
      setFeedbackType("info");
      setFeedbackMessage(
        `${activeLevel}. seviye: ${activeLevel} kutu yanıp sönecek.`,
      );
      setActiveTargets(nextTargets);
      setSelectedCorrect(new Set());
      setSelectedWrong(null);

      prepareTimerRef.current = window.setTimeout(() => {
        setRoundPhase("show");
        setFeedbackType("info");
        setFeedbackMessage("Yanan kutulara dikkatlice bak.");

        hideTimerRef.current = window.setTimeout(() => {
          setRoundPhase("select");
          setFeedbackType("info");
          setFeedbackMessage("Şimdi aklında kalan kutuları seç.");
        }, displayMs);
      }, 350);
    },
    [clearRoundTimers, displayMs, gridInfo.totalBoxes, level],
  );

  const resetToReady = useCallback(() => {
    clearRoundTimers();
    hasSavedResultRef.current = false;
    startedAtRef.current = null;

    setPhase("ready");
    setRoundPhase("prepare");
    setRoundNumber(1);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setTotalCorrectCount(0);
    setTotalWrongCount(0);
    setLevelUpCount(0);
    setElapsedSeconds(0);
    setActiveTargets(new Set());
    setSelectedCorrect(new Set());
    setSelectedWrong(null);
    setFeedbackType(null);
    setFeedbackMessage("");
  }, [clearRoundTimers]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const handleBeginPlay = () => {
    clearRoundTimers();

    hasSavedResultRef.current = false;
    startedAtRef.current = Date.now();

    setPhase("play");
    setRoundNumber(1);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setTotalCorrectCount(0);
    setTotalWrongCount(0);
    setLevelUpCount(0);
    setElapsedSeconds(0);

    beginRound(1, level);
  };

  const handleRestart = () => {
    resetToReady();
  };

  const scheduleNextRound = useCallback(
    (nextLevel: number, resetLevelStats: boolean) => {
      nextRoundTimerRef.current = window.setTimeout(() => {
        if (resetLevelStats) {
          setLevelCorrectCount(0);
          setLevelWrongCount(0);
        }

        beginRound(roundNumber + 1, nextLevel);
      }, 850);
    },
    [beginRound, roundNumber],
  );

  const handleLevelUp = useCallback(
    (nextLevelCorrect: number, nextLevelWrong: number) => {
      const nextNet = nextLevelCorrect - nextLevelWrong;

      if (nextNet < NET_TARGET) {
        scheduleNextRound(level, false);
        return;
      }

      if (level >= MAX_LEVEL) {
        setFeedbackType("level-up");
        setFeedbackMessage(
          "10 net tamamlandı. 10. seviyedesin, aynı seviyede yeni tur başlıyor.",
        );

        scheduleNextRound(MAX_LEVEL, true);
        return;
      }

      const upgradedLevel = level + 1;

      setLevel(upgradedLevel);
      setLevelUpCount((previous) => previous + 1);
      setFeedbackType("level-up");
      setFeedbackMessage(
        `10 net tamamlandı. Otomatik olarak ${upgradedLevel}. seviyeye geçtin.`,
      );

      scheduleNextRound(upgradedLevel, true);
    },
    [level, scheduleNextRound],
  );

  const handleSelectBox = (boxIndex: number) => {
    if (phase !== "play" || roundPhase !== "select") {
      return;
    }

    if (selectedCorrect.has(boxIndex) || selectedWrong === boxIndex) {
      return;
    }

    if (!activeTargets.has(boxIndex)) {
      const nextWrong = levelWrongCount + 1;

      setSelectedWrong(boxIndex);
      setLevelWrongCount(nextWrong);
      setTotalWrongCount((previous) => previous + 1);
      setFeedbackType("wrong");
      setFeedbackMessage("Yanlış seçim yaptın. Yeni tur başlıyor.");
      setRoundPhase("feedback");

      scheduleNextRound(level, false);
      return;
    }

    const nextSelectedCorrect = new Set(selectedCorrect);
    nextSelectedCorrect.add(boxIndex);
    setSelectedCorrect(nextSelectedCorrect);

    if (nextSelectedCorrect.size >= activeTargets.size) {
      const nextCorrect = levelCorrectCount + 1;

      setLevelCorrectCount(nextCorrect);
      setTotalCorrectCount((previous) => previous + 1);
      setFeedbackType("correct");
      setFeedbackMessage("Doğru! Tüm hedef kutuları buldun.");
      setRoundPhase("feedback");

      handleLevelUp(nextCorrect, levelWrongCount);
    }
  };

  const finishExercise = useCallback(() => {
    if (hasSavedResultRef.current) return;

    hasSavedResultRef.current = true;
    clearRoundTimers();

    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );

    const finalScore = calculateScore(totalCorrectCount, totalWrongCount);
    const finalSuccessRate = calculateSuccessRate(
      totalCorrectCount,
      totalWrongCount,
    );
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "memory-game",
      exerciseTitle: "Hafıza Geliştirme",
      durationSeconds,
      correctCount: totalCorrectCount,
      wrongCount: totalWrongCount,
      score: finalScore,
      successRate: finalSuccessRate,
      details: {
        gridRows: gridInfo.rows,
        gridCols: gridInfo.cols,
        totalBoxes: gridInfo.totalBoxes,
        gridLabel: gridInfo.label,
        reachedLevel: level,
        levelCorrectCount,
        levelWrongCount,
        net,
        displayMs,
        levelUpCount,
        roundNumber,
        rule: "Seviye 2-10. Seviye sayısı kadar kutu yanar. 10 net olunca otomatik seviye artar.",
      },
    });

    setPhase("result");
  }, [
    clearRoundTimers,
    displayMs,
    elapsedSeconds,
    gridInfo.cols,
    gridInfo.label,
    gridInfo.rows,
    gridInfo.totalBoxes,
    level,
    levelCorrectCount,
    levelUpCount,
    levelWrongCount,
    net,
    roundNumber,
    totalCorrectCount,
    totalWrongCount,
  ]);

  useEffect(() => {
    if (phase !== "play") return;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      clearRoundTimers();
    };
  }, [clearRoundTimers]);

  const footerControls = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>
          Kutu Düzeni
        </span>
        <select
          value={gridLayout}
          onChange={(event) =>
            setGridLayout(event.target.value as MemoryGridLayout)
          }
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
          disabled={phase === "play"}
        >
          <option value="5x5">5 x 5</option>
          <option value="5x10">5 x 10</option>
          <option value="10x10">10 x 10</option>
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>
          Seviye
        </span>
        <select
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
          disabled={phase === "play"}
        >
          {LEVEL_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>
          Gösterim
        </span>
        <select
          value={displayMs}
          onChange={(event) => setDisplayMs(Number(event.target.value) as DisplayMs)}
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
          disabled={phase === "play"}
        >
          {DISPLAY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} ms
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>
          Görünüm
        </span>
        <select
          value={fontSize}
          onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)}
          className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}
          disabled={phase === "play"}
        >
          {FONT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {getFontLabel(value)}
            </option>
          ))}
        </select>
      </label>

      <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-3 lg:col-span-2">
        {phase === "ready" ? (
          <button
            type="button"
            className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`}
            style={FULLSCREEN_TOUCH_STYLE}
            onClick={handleBeginPlay}
          >
            Başlat
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleRestart}
            >
              Yeniden Başlat
            </button>

            <button
              type="button"
              className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`}
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
      <div className={themeRootClassName}>
        <FullscreenExerciseIntro
          title="Hafıza Geliştirme"
          description="Seviye kadar kutu kısa süre yanar. Kutular kapandıktan sonra aklında kalanları bulmaya çalışırsın."
          buttonLabel="Eğitime Başla"
          onStart={handleIntroStart}
        />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseShell
          title="Hafıza Geliştirme"
          subtitle="Hazırlık modu"
          stats={[
            { label: "Düzen", value: gridInfo.label },
            { label: "Seviye", value: level },
            { label: "Yanan Kutu", value: level, tone: "brand" },
            { label: "Hedef Net", value: NET_TARGET },
          ]}
          stageClassName="fx-slide-up flex min-h-[300px] w-full flex-col items-center justify-center rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-4 py-5 text-center shadow-[0_14px_42px_rgba(185,28,28,0.10)] backdrop-blur md:min-h-[350px]"
          footer={footerControls}
        >
          <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700 ${styles.introEyebrow}`}>
            Hazırlık
          </p>

          <h2 className={`mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl ${styles.introTitle}`}>
            Seviye kadar kutu yanar.
          </h2>

          <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 ${styles.introBody}`}>
            Seviye 2’de 2 kutu, seviye 3’te 3 kutu, seviye 10’da 10 kutu
            yanıp söner. Kutular kapandıktan sonra aklında kalanları seç.
            10 net yapınca seviye otomatik artar.
          </p>
        </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className={themeRootClassName}>
        <section className={`idil-card mx-auto w-full max-w-5xl p-4 md:p-6 ${styles.resultCardOverride}`}>
          <h2 className="text-2xl font-bold">Hafıza Geliştirme Sonucu</h2>

          <p className={`mt-1 text-sm text-[var(--muted)] ${styles.resultMuted}`}>
            Çalışma sonucu kaydedildi.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>
                Doğru
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">
                {totalCorrectCount}
              </p>
            </article>

            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>
                Yanlış
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">
                {totalWrongCount}
              </p>
            </article>

            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>
                Skor
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">
                {score}
              </p>
            </article>

            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>
                Başarı
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {successRate}%
              </p>
            </article>
          </div>

          <div className={`mt-5 rounded-2xl border border-red-100 bg-white p-4 text-sm ${styles.resultDetailCard}`}>
            <p>
              <strong>Ulaşılan Seviye:</strong> {level}
            </p>
            <p className="mt-1">
              <strong>Seviye Atlama:</strong> {levelUpCount}
            </p>
            <p className="mt-1">
              <strong>Son Net:</strong> {net}
            </p>
            <p className="mt-1">
              <strong>Düzen:</strong> {gridInfo.label}
            </p>
            <p className="mt-1">
              <strong>Gösterim:</strong> {displayMs} ms
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              style={TOUCH_STYLE}
              onClick={handleRestart}
            >
              Yeniden Başlat
            </button>

            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              style={TOUCH_STYLE}
              onClick={() =>
                router.push(
                  `/sonuc?exerciseType=memory-game&correct=${totalCorrectCount}&wrong=${totalWrongCount}&successRate=${successRate}&score=${score}`,
                )
              }
            >
              Sonuç Ekranına Git
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <ExerciseNavigationControls />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={themeRootClassName}>
      <FullscreenExerciseShell
        title="Hafıza Geliştirme"
        subtitle="Tam ekran çalışma modu"
        stats={[
          { label: "Seviye", value: level },
          { label: "Yanan Kutu", value: level, tone: "brand" },
          { label: "Doğru", value: levelCorrectCount, tone: "ok" },
          { label: "Yanlış", value: levelWrongCount, tone: "bad" },
          { label: "Net", value: net, tone: "brand" },
        ]}
        finishButton={
          <button
            type="button"
            onClick={finishExercise}
            className={`min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md ${styles.secondaryButtonOverride}`}
            style={FULLSCREEN_TOUCH_STYLE}
          >
            Bitir
          </button>
        }
        footer={footerControls}
        stageClassName="!mt-2 flex min-h-0 flex-1 overflow-hidden !p-2 md:!p-3"
      >
        <div className="fx-fade-in flex h-full min-h-0 w-full flex-col">
          {feedbackType ? (
            <div
              className={`mx-auto mb-2 max-w-2xl shrink-0 rounded-xl border px-3 py-2 text-center text-sm font-bold ${getFeedbackClass(
                feedbackType,
              )}`}
            >
              {feedbackMessage}
            </div>
          ) : null}

          <div className={`mb-1.5 shrink-0 text-center text-xs font-black text-slate-600 ${styles.helperText}`}>
            Durum: {getRoundPhaseLabel(roundPhase)}
          </div>

          <div className={`flex min-h-0 flex-1 overflow-hidden rounded-xl border border-red-100/85 bg-red-50/40 p-1.5 md:p-2 ${styles.gridFrame}`}>
            <div
              className="grid h-full min-h-0 w-full gap-1 md:gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${gridInfo.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridInfo.rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: gridInfo.totalBoxes }, (_, index) => {
                const isShowingTarget =
                  roundPhase === "show" && activeTargets.has(index);
                const isFeedbackTarget =
                  roundPhase === "feedback" && activeTargets.has(index);
                const isSelectedCorrect = selectedCorrect.has(index);
                const isSelectedWrong = selectedWrong === index;

                let boxClass = `border-red-200 bg-white ${styles.boxIdle}`;

                if (isShowingTarget) {
                  boxClass =
                    `fx-pulse-soft border-red-500 bg-red-500 shadow-[0_0_0_1px_rgba(220,38,38,0.35)] ${styles.boxShowing}`;
                } else if (isSelectedCorrect) {
                  boxClass = `fx-glow-green border-green-400 bg-green-400 ${styles.boxCorrect}`;
                } else if (isSelectedWrong) {
                  boxClass = `fx-blink-red fx-shake border-red-400 bg-red-300 ${styles.boxWrong}`;
                } else if (isFeedbackTarget && feedbackType === "wrong") {
                  boxClass = `border-green-300 bg-green-100 ${styles.boxRevealed}`;
                }

                return (
                  <button
                    key={`memory-cell-${index + 1}`}
                    type="button"
                    className={`relative z-10 h-full min-h-0 w-full min-w-0 cursor-pointer select-none touch-manipulation pointer-events-auto rounded-md border transition active:scale-[0.98] ${boxClass}`}
                    style={{
                      ...TOUCH_STYLE,
                      fontSize: `${fontSize}px`,
                    }}
                    onClick={() => handleSelectBox(index)}
                    disabled={roundPhase !== "select"}
                  >
                    <span className="sr-only">Kutu {index + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className={`mt-1.5 shrink-0 text-center text-xs font-semibold text-slate-600 ${styles.helperText}`}>
            {level}. seviyede {level} kutu yanar. Tümünü doğru seçersen doğru
            sayılır; yanlış kutuya basarsan yanlış sayılır.
          </p>
        </div>
      </FullscreenExerciseShell>
    </div>
  );
}

export default MemoryGameExerciseClient;
