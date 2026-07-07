"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  calculateScore,
  calculateSuccessRate,
  checkGroupAnswer,
  generateExerciseGroup,
  type TwoSideFocusAnswer,
  type TwoSideFocusGroup,
} from "@/lib/exercise-engine/twoSideFocus";
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

type ExercisePhase = "setup" | "ready" | "play" | "result";
type ExerciseLevel = 1 | 2 | 3 | 4 | 5 | 6;
type SpeedMs = 500 | 750 | 850 | 1000 | 1500 | 2000;
type FontSizePx = 28 | 36 | 44 | 52 | 60;

const MAX_TWO_SIDE_FOCUS_DISPLAY_LEVEL = 6;

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const STAGGERED_ROW_CLASSES = [
  "md:pr-24",
  "md:pl-24",
  "md:pr-12",
  "md:pl-12",
  "md:pr-32",
];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getFontLabel(fontSize: FontSizePx): string {
  if (fontSize === 28) {
    return "Küçük";
  }

  if (fontSize === 36) {
    return "Orta";
  }

  if (fontSize === 44) {
    return "Büyük";
  }

  return "Çok Büyük";
}

function getPairCountForLevel(level: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;

  return 5;
}

function getGeneratorLevelForDisplayLevel(level: ExerciseLevel): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;

  return 5;
}

function getAnswerLabel(group: TwoSideFocusGroup | null): string {
  if (!group) {
    return "-";
  }

  return group.isSame ? "Aynı" : "Farklı";
}

export function TwoSideFocusExerciseClient() {
  const router = useRouter();
  const hasSavedResultRef = useRef(false);
  const answeredForCurrentGroupRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const groupTimerRef = useRef<number | null>(null);
  const latestLevelRef = useRef<ExerciseLevel>(1);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [level, setLevel] = useState<ExerciseLevel>(1);
  const [speedMs, setSpeedMs] = useState<SpeedMs>(850);
  const [fontSize, setFontSize] = useState<FontSizePx>(44);

  const [currentGroup, setCurrentGroup] =
    useState<TwoSideFocusGroup | null>(null);
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [currentWrong, setCurrentWrong] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [totalShownGroups, setTotalShownGroups] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [canAnswer, setCanAnswer] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("Cevabını seç.");
  const [reachedLevel, setReachedLevel] = useState<ExerciseLevel>(1);
  const [autoLevelUpCount, setAutoLevelUpCount] = useState(0);

  const currentNet = currentCorrect - currentWrong;
  const totalNet = totalCorrect - totalWrong;
  const score = calculateScore(totalCorrect, totalWrong);
  const successRate = calculateSuccessRate(totalCorrect, totalWrong);
  const currentPairCount = currentGroup?.pairCount ?? getPairCountForLevel(level);
  const levelProgressCount = Math.max(0, Math.min(10, currentNet));
  const displayFontSize = Math.max(
    22,
    fontSize - Math.max(0, currentPairCount - 1) * 4,
  );

  useEffect(() => {
    latestLevelRef.current = level;
  }, [level]);

  const clearGroupTimer = () => {
    if (groupTimerRef.current) {
      window.clearTimeout(groupTimerRef.current);
      groupTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearGroupTimer();
    };
  }, []);

  const startNextGroup = useCallback((overrideLevel?: ExerciseLevel) => {
    const nextLevel = overrideLevel ?? latestLevelRef.current;
    const generatorLevel = getGeneratorLevelForDisplayLevel(nextLevel);

    const nextGroup = generateExerciseGroup({
      level: generatorLevel,
    });

    setCurrentGroup(nextGroup);
    setCanAnswer(true);
    setLastAnswerCorrect(null);
    setStatusMessage("Cevabını seç.");
    answeredForCurrentGroupRef.current = false;
    setTotalShownGroups((prev) => prev + 1);
  }, []);

  const applyRoundResult = useCallback(
    (group: TwoSideFocusGroup, isCorrect: boolean, isUnanswered: boolean) => {
      const nextCurrentCorrect = currentCorrect + (isCorrect ? 1 : 0);
      const nextCurrentWrong = currentWrong + (isCorrect ? 0 : 1);
      const nextCurrentNet = nextCurrentCorrect - nextCurrentWrong;
      const correctAnswerLabel = getAnswerLabel(group);

      setTotalCorrect((prev) => prev + (isCorrect ? 1 : 0));
      setTotalWrong((prev) => prev + (isCorrect ? 0 : 1));
      setCurrentCorrect(nextCurrentCorrect);
      setCurrentWrong(nextCurrentWrong);
      setLastAnswerCorrect(isCorrect && !isUnanswered);
      setCanAnswer(false);

      if (isUnanswered) {
        setUnansweredCount((prev) => prev + 1);
      }

      const shouldLevelUp =
        nextCurrentNet >= 10 && level < MAX_TWO_SIDE_FOCUS_DISPLAY_LEVEL;
      const isMaxLevel =
        nextCurrentNet >= 10 && level >= MAX_TWO_SIDE_FOCUS_DISPLAY_LEVEL;

      if (shouldLevelUp) {
        const nextLevel = (level + 1) as ExerciseLevel;
        latestLevelRef.current = nextLevel;
        setLevel(nextLevel);
        setReachedLevel((prev) => (prev > nextLevel ? prev : nextLevel));
        setAutoLevelUpCount((prev) => prev + 1);
        setCurrentCorrect(0);
        setCurrentWrong(0);
        setStatusMessage(`Tebrikler! Seviye ${nextLevel}'ye geçtin.`);
        return;
      }

      if (isMaxLevel) {
        setStatusMessage("En yüksek seviyedesin.");
        return;
      }

      if (isCorrect) {
        setStatusMessage(`Doğru cevap. Doğru yön: ${correctAnswerLabel}`);
        return;
      }

      if (isUnanswered) {
        setStatusMessage(`Süre doldu. Doğru cevap: ${correctAnswerLabel}`);
        return;
      }

      setStatusMessage(`Yanlış cevap. Doğru cevap: ${correctAnswerLabel}`);
    },
    [currentCorrect, currentWrong, level],
  );

  const finishExercise = useCallback(() => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearGroupTimer();

    const startedAt = startedAtRef.current;
    const durationSeconds = Math.max(
      1,
      startedAt ? Math.round((Date.now() - startedAt) / 1000) : elapsedSeconds,
    );
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Seçilmemiş Öğrenci",
      exerciseType: "two-side-focus",
      exerciseTitle: "Çift Taraflı Odak",
      durationSeconds,
      correctCount: totalCorrect,
      wrongCount: totalWrong,
      score,
      successRate,
      details: {
        level,
        reachedLevel,
        speedMs,
        fontSize,
        net: totalNet,
        maxPairCount: getPairCountForLevel(reachedLevel),
        totalShownGroups,
        unansweredCount,
        autoLevelUpCount,
      },
    });

    setPhase("result");
    answeredForCurrentGroupRef.current = false;
    setCanAnswer(false);
  }, [
    autoLevelUpCount,
    elapsedSeconds,
    fontSize,
    level,
    reachedLevel,
    score,
    speedMs,
    successRate,
    totalCorrect,
    totalNet,
    totalShownGroups,
    totalWrong,
    unansweredCount,
  ]);

  const handleAnswer = useCallback(
    (answer: TwoSideFocusAnswer) => {
      if (
        phase !== "play" ||
        !currentGroup ||
        answeredForCurrentGroupRef.current ||
        !canAnswer
      ) {
        return;
      }

      answeredForCurrentGroupRef.current = true;
      const isCorrect = checkGroupAnswer(currentGroup, answer);
      applyRoundResult(currentGroup, isCorrect, false);
    },
    [applyRoundResult, canAnswer, currentGroup, phase],
  );

  const handleStart = () => {
    clearGroupTimer();
    hasSavedResultRef.current = false;
    latestLevelRef.current = level;
    startedAtRef.current = null;
    setCurrentGroup(null);
    setCurrentCorrect(0);
    setCurrentWrong(0);
    setTotalCorrect(0);
    setTotalWrong(0);
    setUnansweredCount(0);
    setTotalShownGroups(0);
    setElapsedSeconds(0);
    setCanAnswer(false);
    setLastAnswerCorrect(null);
    setStatusMessage("Ayarlarını seç, hazır olduğunda başlat.");
    setReachedLevel(level);
    setAutoLevelUpCount(0);
    answeredForCurrentGroupRef.current = false;
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    clearGroupTimer();
    hasSavedResultRef.current = false;
    latestLevelRef.current = level;
    startedAtRef.current = Date.now();
    setCurrentCorrect(0);
    setCurrentWrong(0);
    setTotalCorrect(0);
    setTotalWrong(0);
    setUnansweredCount(0);
    setTotalShownGroups(0);
    setElapsedSeconds(0);
    setCanAnswer(false);
    setLastAnswerCorrect(null);
    setStatusMessage("Cevabını seç.");
    setReachedLevel(level);
    setAutoLevelUpCount(0);
    answeredForCurrentGroupRef.current = false;
    setPhase("play");
    startNextGroup(level);
  };

  const handleRestart = () => {
    handleStart();
  };

  const handleFinishEarly = () => {
    finishExercise();
  };

  useEffect(() => {
    if (phase !== "play") {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || !currentGroup) {
      return;
    }

    clearGroupTimer();

    groupTimerRef.current = window.setTimeout(() => {
      if (!answeredForCurrentGroupRef.current) {
        answeredForCurrentGroupRef.current = true;
        applyRoundResult(currentGroup, false, true);
      }

      startNextGroup();
      groupTimerRef.current = null;
    }, speedMs);

    return () => {
      clearGroupTimer();
    };
  }, [applyRoundResult, currentGroup, phase, speedMs, startNextGroup]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        phase !== "play" ||
        answeredForCurrentGroupRef.current ||
        !canAnswer
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleAnswer("different");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleAnswer("same");
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canAnswer, handleAnswer, phase]);

  const questionStatusClass =
    lastAnswerCorrect === null
      ? "text-slate-500"
      : lastAnswerCorrect
        ? "text-[var(--ok)]"
        : "text-[var(--bad)]";

  const footerControls = (
    <div className="grid gap-3 lg:grid-cols-5">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Seviye
        </span>
        <select
          value={level}
          onChange={(event) =>
            setLevel(Number(event.target.value) as ExerciseLevel)
          }
          className={FULLSCREEN_SELECT_CLASS}
        >
          {Array.from(
            { length: MAX_TWO_SIDE_FOCUS_DISPLAY_LEVEL },
            (_, index) => index + 1,
          ).map((value) => (
            <option key={value} value={value}>
              {value}. Seviye - {getPairCountForLevel(value)} kelime çifti
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Hız
        </span>
        <select
          value={speedMs}
          onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)}
          className={FULLSCREEN_SELECT_CLASS}
        >
          {[500, 750, 850, 1000, 1500, 2000].map((value) => (
            <option key={value} value={value}>
              {value} ms
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Font
        </span>
        <select
          value={fontSize}
          onChange={(event) =>
            setFontSize(Number(event.target.value) as FontSizePx)
          }
          className={FULLSCREEN_SELECT_CLASS}
        >
          {[28, 36, 44, 52, 60].map((value) => (
            <option key={value} value={value}>
              {getFontLabel(value as FontSizePx)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
        {phase === "ready" ? (
          <button
            type="button"
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            style={FULLSCREEN_TOUCH_STYLE}
            onClick={handleBeginPlay}
          >
            Başlat
          </button>
        ) : (
          <>
            <button
              type="button"
              className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleRestart}
            >
              Yeniden Başlat
            </button>

            <button
              type="button"
              className={FULLSCREEN_SECONDARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleFinishEarly}
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
        title="Çift Taraflı Odak"
        description="Birden fazla kelime çiftini aynı anda karşılaştır. Ekrandaki tüm çiftler aynıysa sağ, en az bir farklı çift varsa sol yönde cevap ver."
        buttonLabel="Eğitime Başla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Çift Taraflı Odak"
        subtitle="Hazırlık modu"
        stats={[
          { label: "Seviye", value: level },
          { label: "Hız", value: `${speedMs} ms`, tone: "brand" },
          { label: "Font", value: `${fontSize}px` },
          { label: "Çift", value: getPairCountForLevel(level) },
        ]}
        stageClassName="fx-slide-up mt-3 flex min-h-[32vh] w-full flex-col items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-5 py-6 text-center shadow-[0_18px_56px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[38vh]"
        footer={footerControls}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">
          Hazırlık
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
          Ayarlarını seç, hazır olduğunda başlat.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
          Seviye arttıkça aynı anda karşılaştıracağın kelime çifti sayısı artar.
          6. seviyede 5 çift farklı satır konumlarına dağıtılır.
        </p>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result") {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Çift Taraflı Odak Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Çalışma Bitir ile sonlandırıldı. Sonuç özeti aşağıda.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Gösterilen Grup
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {totalShownGroups}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Doğru
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">
              {totalCorrect}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Yanlış
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--bad)]">
              {totalWrong}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Başarı
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {successRate}%
            </p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm">
          <p>
            <strong>Egzersiz:</strong> Çift Taraflı Odak
          </p>
          <p className="mt-1">
            <strong>Net:</strong> {totalNet}
          </p>
          <p className="mt-1">
            <strong>Skor:</strong> {score}
          </p>
          <p className="mt-1">
            <strong>Ulaşılan Seviye:</strong> {reachedLevel}
          </p>
          <p className="mt-1">
            <strong>Otomatik Seviye Atlama:</strong> {autoLevelUpCount}
          </p>
          <p className="mt-1">
            <strong>Cevapsız:</strong> {unansweredCount}
          </p>
          <p className="mt-1">
            <strong>Maksimum Çift:</strong> {getPairCountForLevel(reachedLevel)}
          </p>
          <p className="mt-1">
            <strong>Hız:</strong> {speedMs} ms
          </p>
          <p className="mt-1">
            <strong>Font Boyutu:</strong> {fontSize}px
          </p>
          <p className="mt-1">
            <strong>Toplam Süre:</strong> {formatElapsed(elapsedSeconds)}
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
                `/sonuc?exerciseType=two-side-focus&correct=${totalCorrect}&wrong=${totalWrong}&successRate=${successRate}&score=${score}`,
              )
            }
          >
            Ortak Sonuç Ekranı
          </button>
        </div>

        <div className="mt-3">
          <Link
            href="/egzersizler"
            className="relative z-50 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-4 text-base font-bold text-red-800 transition hover:bg-red-50"
            style={TOUCH_STYLE}
          >
            Egzersizlere Dön
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Çift Taraflı Odak"
      subtitle="Tam ekran çalışma modu"
      stats={[
        { label: "Doğru", value: totalCorrect, tone: "ok" },
        { label: "Yanlış", value: totalWrong, tone: "bad" },
        {
          label: "Net",
          value: currentNet,
          tone: currentNet >= 0 ? "brand" : "bad",
        },
        { label: "Skor", value: score, tone: "brand" },
        { label: "Seviye", value: level },
        { label: "Hız", value: `${speedMs} ms`, tone: "brand" },
      ]}
      finishButton={
        <button
          type="button"
          onClick={handleFinishEarly}
          className="min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md"
          style={FULLSCREEN_TOUCH_STYLE}
        >
          Bitir
        </button>
      }
      footer={
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              className="fx-pop-in relative z-50 min-h-[50px] w-full rounded-2xl border border-red-900/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_50%,#b91c1c_100%)] px-4 py-3 text-sm font-black text-white shadow-md shadow-red-200/70 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={() => handleAnswer("different")}
              disabled={!canAnswer}
            >
              ← Farklı
            </button>

            <button
              type="button"
              className="fx-pop-in relative z-50 min-h-[50px] w-full rounded-2xl border border-red-900/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_50%,#b91c1c_100%)] px-4 py-3 text-sm font-black text-white shadow-md shadow-red-200/70 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={() => handleAnswer("same")}
              disabled={!canAnswer}
            >
              Aynı →
            </button>
          </div>

          {footerControls}
        </div>
      }
    >
      <div className="fx-fade-in flex w-full flex-col items-center justify-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-red-100/80 bg-white/80 px-3 py-2 shadow-sm">
          {Array.from({ length: 10 }, (_, index) => {
            const filled = index < levelProgressCount;

            return (
              <span
                key={`net-box-${index + 1}`}
                className={`h-2.5 w-6 rounded-full border transition ${
                  filled
                    ? "fx-pulse-soft border-red-500 bg-red-500"
                    : "border-red-100 bg-white"
                }`}
              />
            );
          })}
        </div>

        <p
          className={`rounded-full px-3 py-1 text-xs font-semibold ${questionStatusClass} ${
            lastAnswerCorrect === false ? "fx-shake" : ""
          }`}
        >
          {statusMessage}
        </p>

        <div
          className={`mt-4 w-full space-y-3 ${
            level === 6 ? "max-w-6xl" : "max-w-4xl"
          }`}
        >
          {currentGroup?.pairs
            .slice(0, getPairCountForLevel(level))
            .map((pair, index) => {
              const staggerClass =
                level === 6
                  ? STAGGERED_ROW_CLASSES[
                      index % STAGGERED_ROW_CLASSES.length
                    ]
                  : "";

              return (
                <div
                  key={pair.id}
                  className={`grid gap-3 md:grid-cols-2 ${staggerClass}`}
                  style={{ fontSize: `${displayFontSize}px` }}
                >
                  <p className="fx-slide-up rounded-2xl border border-red-100/85 bg-[linear-gradient(180deg,#fffefe_0%,#fff6f5_100%)] px-4 py-4 text-center font-extrabold text-slate-900 break-words shadow-sm shadow-red-100/70">
                    {pair.leftWord}
                  </p>

                  <p className="fx-slide-up rounded-2xl border border-red-100/85 bg-[linear-gradient(180deg,#fffefe_0%,#fff6f5_100%)] px-4 py-4 text-center font-extrabold text-slate-900 break-words shadow-sm shadow-red-100/70">
                    {pair.rightWord}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </FullscreenExerciseShell>
  );
}