"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { pickEducationProgramSettingOption } from "@/lib/education-programs/exerciseSettingsSchemas";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import {
  ANLIK_GORUNTU_FEEDBACK_MS,
  ANLIK_GORUNTU_FIXATION_MS,
  ANLIK_GORUNTU_LEVELS,
  ANLIK_GORUNTU_POST_STIMULUS_GAP_MS,
  ANLIK_GORUNTU_ROUNDS_PER_LEVEL,
  ANLIK_GORUNTU_SPEEDS,
  ANLIK_GORUNTU_TUTORIAL_WORD,
  buildAnlikGoruntuAnswerSlots,
  buildAnlikGoruntuOptions,
  calculateAnlikGoruntuPoints,
  getAnlikGoruntuLetterCount,
  getAnlikGoruntuLevelLetterCount,
  getAnlikGoruntuSpeed,
  pickAnlikGoruntuTarget,
  resolveAnlikGoruntuCapacity,
  resolveAnlikGoruntuRank,
  type AnlikGoruntuLevelStat,
  type AnlikGoruntuSpeedId,
} from "@/lib/anlik-goruntu/game";

type Phase = "intro" | "fixation" | "exposure" | "gap" | "answer" | "feedback" | "level-up" | "finished";

type RoundResult = {
  level: number;
  letterCount: number;
  isCorrect: boolean;
  responseTimeMs: number;
};

const TITLE = "Anlık Görüntü";
const RESULT_TYPE = "anlik-goruntu";
const SPEED_IDS = ANLIK_GORUNTU_SPEEDS.map((item) => item.id);
const OPTION_KEY_LABELS = ["A", "B", "C", "D"];
const LEVEL_UP_BANNER_MS = 1200;
const TUTORIAL_HANDOFF_MS = 900;
const TUTORIAL_EXPOSURE_MS = 1000;

function averageOf(values: readonly number[]): number {
  return values.length > 0 ? Math.round(values.reduce((total, item) => total + item, 0) / values.length) : 0;
}

function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Uzun kelimeler dar ekranda taşmasın diye harf sayısına göre punto. */
function stimulusFontClass(letterCount: number): string {
  if (letterCount > 12) return "text-2xl sm:text-4xl md:text-5xl";
  if (letterCount > 9) return "text-3xl sm:text-5xl md:text-6xl";
  return "text-4xl sm:text-6xl md:text-7xl";
}

export function AnlikGoruntuExerciseClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
} = {}) {
  const router = useRouter();
  const isEducationProgramMode = Boolean(educationProgramLaunch);

  const [phase, setPhase] = useState<Phase>("intro");
  const [speedId, setSpeedId] = useState<AnlikGoruntuSpeedId>(() =>
    pickEducationProgramSettingOption(educationProgramLaunch?.settings, "speed", SPEED_IDS, "normal"),
  );
  const [startLevel, setStartLevel] = useState<number>(() => {
    const requested = educationProgramLaunch?.initialLevel ?? 1;
    return Number.isInteger(requested) && requested >= 1 && requested <= ANLIK_GORUNTU_LEVELS.length ? requested : 1;
  });

  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const [isTutorial, setIsTutorial] = useState(false);

  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [levelStats, setLevelStats] = useState<AnlikGoruntuLevelStat[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const timersRef = useRef<number[]>([]);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const answerSlotsRef = useRef<number[]>([]);
  const answerStartedAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const saveGuardRef = useRef(false);
  const answerLockRef = useRef(false);

  const speed = getAnlikGoruntuSpeed(speedId);
  const letterCount = getAnlikGoruntuLevelLetterCount(level);
  const answered = correct + wrong;
  const isPlaying = phase !== "intro" && phase !== "finished";
  useEducationProgramExerciseRunning(isEducationProgramMode && isPlaying);
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(
    educationProgramLaunch?.taskId,
    RESULT_TYPE,
  );

  const clearTimers = useCallback(() => {
    for (const timerId of timersRef.current) window.clearTimeout(timerId);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const timerId = window.setTimeout(callback, delayMs);
    timersRef.current.push(timerId);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const persistResult = useCallback(
    async (finalStats: AnlikGoruntuLevelStat[], finalResults: RoundResult[], finalScore: number, finalMaxCombo: number) => {
      if (saveGuardRef.current || finalResults.length === 0) return;
      saveGuardRef.current = true;
      setSaveState("saving");

      const finalCorrect = finalResults.filter((item) => item.isCorrect).length;
      const capacity = resolveAnlikGoruntuCapacity(finalStats);

      try {
        await saveExerciseResultSecure({
          exerciseType: RESULT_TYPE,
          exerciseTitle: TITLE,
          score: finalScore,
          successRate: percentOf(finalCorrect, finalResults.length),
          correctCount: finalCorrect,
          wrongCount: finalResults.length - finalCorrect,
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
          details: {
            speed: speedId,
            exposureMs: speed.exposureMs,
            startLevel,
            reachedLevel: finalStats.length > 0 ? finalStats[finalStats.length - 1].level : startLevel,
            completedLevels: finalStats.length,
            totalRounds: finalResults.length,
            capacityLetterCount: capacity,
            maxCombo: finalMaxCombo,
            averageResponseTimeMs: averageOf(finalResults.map((item) => item.responseTimeMs)),
          },
        });
        setSaveState("saved");
        await completeTaskAfterResultSave();
      } catch {
        saveGuardRef.current = false;
        setSaveState("error");
      }
    },
    [completeTaskAfterResultSave, speed.exposureMs, speedId, startLevel],
  );

  const finishSession = useCallback(
    (finalStats: AnlikGoruntuLevelStat[], finalResults: RoundResult[], finalScore: number, finalMaxCombo: number) => {
      clearTimers();
      setLevelStats(finalStats);
      setPhase("finished");
      void persistResult(finalStats, finalResults, finalScore, finalMaxCombo);
    },
    [clearTimers, persistResult],
  );

  /** Sabitleme haçı -> gösterim -> boş aralık -> şıklar zincirini kurar. */
  const runRound = useCallback(
    (nextLevel: number, nextRound: number, tutorial: boolean) => {
      clearTimers();
      answerLockRef.current = false;
      setChosenOption(null);
      setIsTutorial(tutorial);

      if (nextRound === 1) {
        usedWordsRef.current = new Set();
        answerSlotsRef.current = buildAnlikGoruntuAnswerSlots();
      }

      const word = tutorial
        ? ANLIK_GORUNTU_TUTORIAL_WORD
        : pickAnlikGoruntuTarget(nextLevel, usedWordsRef.current);
      usedWordsRef.current.add(word);

      const slot = tutorial ? 0 : answerSlotsRef.current[nextRound - 1] ?? 0;
      const roundOptions = buildAnlikGoruntuOptions(word, nextLevel, slot);
      const exposureMs = tutorial ? TUTORIAL_EXPOSURE_MS : speed.exposureMs;

      setLevel(nextLevel);
      setRound(nextRound);
      setTarget(word);
      setOptions(roundOptions);
      setPhase("fixation");

      schedule(() => {
        setPhase("exposure");
        schedule(() => {
          setPhase("gap");
          schedule(() => {
            answerStartedAtRef.current = performance.now();
            setPhase("answer");
          }, ANLIK_GORUNTU_POST_STIMULUS_GAP_MS);
        }, exposureMs);
      }, ANLIK_GORUNTU_FIXATION_MS);
    },
    [clearTimers, schedule, speed.exposureMs],
  );

  const startSession = useCallback(() => {
    saveGuardRef.current = false;
    startedAtRef.current = Date.now();
    setSaveState("idle");
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setMaxCombo(0);
    setRoundResults([]);
    setLevelStats([]);
    runRound(startLevel, 1, true);
  }, [runRound, startLevel]);

  // Yanit suresi tikin kendi zaman damgasindan olculur (performance.now ile
  // ayni zaman ekseni); boylece render sirasinda impure cagri yapilmaz.
  const handleAnswer = (option: string, eventTimestamp: number) => {
    if (phase !== "answer" || answerLockRef.current) return;
    answerLockRef.current = true;

    const responseTimeMs = Math.max(0, Math.round(eventTimestamp - answerStartedAtRef.current));
    const isCorrect = option === target;
    setChosenOption(option);
    setPhase("feedback");

    if (isTutorial) {
      schedule(() => runRound(startLevel, 1, false), TUTORIAL_HANDOFF_MS);
      return;
    }

    const currentLetterCount = getAnlikGoruntuLetterCount(target);
    const nextCombo = isCorrect ? combo + 1 : 0;
    const nextScore = isCorrect ? score + calculateAnlikGoruntuPoints(currentLetterCount, nextCombo) : score;
    const nextResults = [...roundResults, { level, letterCount: currentLetterCount, isCorrect, responseTimeMs }];
    const nextMaxCombo = Math.max(maxCombo, nextCombo);

    setCombo(nextCombo);
    setMaxCombo(nextMaxCombo);
    setScore(nextScore);
    setCorrect((current) => current + (isCorrect ? 1 : 0));
    setWrong((current) => current + (isCorrect ? 0 : 1));
    setRoundResults(nextResults);

    schedule(() => {
      if (round < ANLIK_GORUNTU_ROUNDS_PER_LEVEL) {
        runRound(level, round + 1, false);
        return;
      }

      const levelRounds = nextResults.filter((item) => item.level === level);
      const levelCorrect = levelRounds.filter((item) => item.isCorrect).length;
      const nextStats: AnlikGoruntuLevelStat[] = [
        ...levelStats,
        {
          level,
          letterCount: currentLetterCount,
          exposureMs: speed.exposureMs,
          rounds: levelRounds.length,
          correct: levelCorrect,
          wrong: levelRounds.length - levelCorrect,
          accuracy: percentOf(levelCorrect, levelRounds.length),
          averageResponseTimeMs: averageOf(levelRounds.map((item) => item.responseTimeMs)),
        },
      ];
      setLevelStats(nextStats);

      if (level >= ANLIK_GORUNTU_LEVELS.length) {
        finishSession(nextStats, nextResults, nextScore, nextMaxCombo);
        return;
      }

      setPhase("level-up");
      schedule(() => runRound(level + 1, 1, false), LEVEL_UP_BANNER_MS);
    }, isCorrect ? ANLIK_GORUNTU_FEEDBACK_MS.correct : ANLIK_GORUNTU_FEEDBACK_MS.wrong);
  };

  /** "Bitir": tamamlanmamış seviyeyi de oynanan tur sayısıyla kayda dahil eder. */
  const handleManualFinish = () => {
    if (phase === "finished") return;
    const levelRounds = roundResults.filter((item) => item.level === level);
    const nextStats = [...levelStats];

    if (levelRounds.length > 0 && !levelStats.some((item) => item.level === level)) {
      const levelCorrect = levelRounds.filter((item) => item.isCorrect).length;
      nextStats.push({
        level,
        letterCount: getAnlikGoruntuLevelLetterCount(level),
        exposureMs: speed.exposureMs,
        rounds: levelRounds.length,
        correct: levelCorrect,
        wrong: levelRounds.length - levelCorrect,
        accuracy: percentOf(levelCorrect, levelRounds.length),
        averageResponseTimeMs: averageOf(levelRounds.map((item) => item.responseTimeMs)),
      });
    }

    finishSession(nextStats, roundResults, score, maxCombo);
  };

  const backToIntro = () => {
    clearTimers();
    saveGuardRef.current = false;
    setSaveState("idle");
    setPhase("intro");
  };

  const capacity = resolveAnlikGoruntuCapacity(levelStats);
  const accuracy = percentOf(correct, answered);

  const topStats = (
    <>
      <FixedExerciseStat label="Kategori" value="Göz Algılama" tone="brand" />
      <FixedExerciseStat label="Seviye" value={`${level}/${ANLIK_GORUNTU_LEVELS.length}`} />
      <FixedExerciseStat label="Harf" value={letterCount} />
      <FixedExerciseStat label="Hız" value={`${speed.exposureMs} ms`} />
      <FixedExerciseStat label="Puan" value={score} tone="brand" />
      <FixedExerciseStat label="Doğru" value={correct} tone="ok" />
      <FixedExerciseStat label="Yanlış" value={wrong} tone="bad" />
      <FixedExerciseStat label="Combo" value={combo > 0 ? `×${combo}` : "—"} />
    </>
  );

  const settings = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--exercise-text-secondary)]">Gösterim hızı</p>
        <div className="flex flex-wrap gap-1.5">
          {ANLIK_GORUNTU_SPEEDS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isEducationProgramMode || isPlaying}
              onClick={() => setSpeedId(item.id)}
              title={item.description}
              className={`min-h-9 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                item.id === speedId
                  ? "border-red-600 bg-red-600 text-white shadow-sm"
                  : "border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] text-[var(--exercise-text)] hover:border-red-400 hover:bg-red-500/15"
              }`}
            >
              {item.name}
              <span className="ml-1 opacity-70">{item.exposureMs}ms</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--exercise-text-secondary)]">Başlangıç seviyesi</p>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
          {ANLIK_GORUNTU_LEVELS.map((count, index) => (
            <button
              key={count}
              type="button"
              disabled={isEducationProgramMode || isPlaying}
              onClick={() => setStartLevel(index + 1)}
              className={`min-h-9 rounded-lg border px-1 py-1 text-[10px] font-bold leading-tight transition disabled:cursor-not-allowed disabled:opacity-50 ${
                index + 1 === startLevel
                  ? "border-red-600 bg-red-600 text-white shadow-sm"
                  : "border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] text-[var(--exercise-text)] hover:border-red-400 hover:bg-red-500/15"
              }`}
            >
              {index + 1}
              <span className="block text-[9px] opacity-70">{count} harf</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (phase === "intro") {
    return (
      <FixedExerciseStage
        title={TITLE}
        subtitle="Hazırlık modu · Göz Algılama"
        topStats={topStats}
        bottomSettings={settings}
        controls={
          <div className="mx-auto w-full max-w-sm">
            <button
              type="button"
              onClick={startSession}
              className="w-full min-h-[46px] rounded-xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-300/45 transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Çalışmayı Başlat
            </button>
          </div>
        }
        onExit={() => router.push("/egzersizler")}
      >
        <div className="exercise-theme-content flex h-full w-full max-w-3xl flex-col items-center justify-center overflow-auto rounded-3xl border border-[var(--exercise-border)] bg-[var(--exercise-surface)] px-5 py-6 text-center shadow-[0_18px_54px_rgba(153,27,27,0.13)] md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--idil-danger-text)]">Göz Algılama</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--exercise-text)] md:text-4xl">⚡ Anlık Görüntü</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--exercise-text-secondary)]">
            Ortada bir anlığına beliren kelimeyi tek bakışta algıla. Kelime kaybolduktan sonra dört seçenek
            arasından gördüğünü seç.
          </p>
          <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-3">
            {[
              { icon: "⏱️", title: "Sabit hız", text: "Seçtiğin süre oturum boyunca değişmez." },
              { icon: "🔠", title: "13 seviye", text: "Her 10 turda kelime bir harf uzar." },
              { icon: "🎯", title: "Benzer şıklar", text: "Çeldiriciler hedefe görsel olarak yakındır." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] px-3 py-3 text-left">
                <div className="text-lg">{item.icon}</div>
                <p className="mt-1 text-xs font-black text-[var(--exercise-text)]">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-[var(--exercise-text-secondary)]">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold text-[var(--exercise-text-secondary)]">
            Hız ve başlangıç seviyesini alt şeritten seçebilirsin. İlk tur alıştırmadır, puana yazılmaz.
          </p>
        </div>
      </FixedExerciseStage>
    );
  }

  if (phase === "finished") {
    return (
      <FixedExerciseStage
        title={`${TITLE} · Sonuç`}
        subtitle="Çalışma tamamlandı"
        topStats={topStats}
        controls={
          <div className="grid gap-2">
            <p
              className={`text-center text-xs font-bold ${
                saveState === "error" ? "text-[var(--idil-danger-text)]" : "text-[var(--exercise-text-secondary)]"
              }`}
              role={saveState === "error" ? "alert" : undefined}
            >
              {saveState === "saved"
                ? "Sonuç kaydedildi."
                : saveState === "error"
                  ? "Sonuç kaydedilemedi."
                  : "Sonuç kaydediliyor..."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={startSession}
                className="min-h-[42px] rounded-xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-5 py-2 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Yeniden Başla
              </button>
              <button
                type="button"
                onClick={backToIntro}
                className="min-h-[42px] rounded-xl border border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] px-5 py-2 text-sm font-bold text-[var(--exercise-text)] shadow-sm transition hover:opacity-90"
              >
                Ayarlara Dön
              </button>
              <ExerciseNavigationControls />
            </div>
          </div>
        }
        onExit={() => router.push("/egzersizler")}
      >
        <div className="exercise-theme-content flex h-full w-full max-w-3xl flex-col overflow-auto rounded-3xl border border-[var(--exercise-border)] bg-[var(--exercise-surface)] px-4 py-5 shadow-[0_18px_54px_rgba(153,27,27,0.13)] md:px-7">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--idil-danger-text)]">Algılama Kapasiten</p>
            <p className="mt-1 text-4xl font-black text-[var(--exercise-text)] md:text-5xl">
              {capacity > 0 ? `${capacity} harf` : "—"}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--exercise-text)]">{resolveAnlikGoruntuRank(capacity)}</p>
            <p className="mt-1 text-[11px] text-[var(--exercise-text-secondary)]">
              {capacity > 0
                ? `${speed.name} hızında (${speed.exposureMs} ms) %75+ başarıyla okunan en uzun kelime.`
                : "Henüz %75 başarıyla tamamlanmış bir seviye yok."}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Puan", value: score },
              { label: "Doğru / Yanlış", value: `${correct} / ${wrong}` },
              { label: "Başarı", value: `%${accuracy}` },
              { label: "Max Combo", value: `×${maxCombo}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wide text-[var(--exercise-text-secondary)]">{item.label}</p>
                <p className="mt-1 text-lg font-black text-[var(--exercise-text)]">{item.value}</p>
              </div>
            ))}
          </div>

          {levelStats.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[var(--exercise-text-secondary)]">Seviye sonuçları</p>
              <div className="grid gap-1.5">
                {levelStats.map((item) => (
                  <div
                    key={item.level}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-[var(--exercise-text)]">
                      {item.level}. seviye · {item.letterCount} harf · {item.rounds} tur
                    </span>
                    <span
                      className={`font-black ${
                        item.accuracy >= 88
                          ? "text-[var(--idil-success-text)]"
                          : item.accuracy >= 75
                            ? "text-[var(--idil-warning-text)]"
                            : "text-[var(--idil-danger-text)]"
                      }`}
                    >
                      %{item.accuracy} · {item.averageResponseTimeMs} ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </FixedExerciseStage>
    );
  }

  return (
    <FixedExerciseStage
      title={TITLE}
      subtitle={isTutorial ? "Alıştırma turu" : `${level}. seviye · ${letterCount} harf · ${speed.name}`}
      topStats={topStats}
      controls={
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-semibold text-[var(--exercise-text-secondary)]">
            {isTutorial ? "Alıştırma: bu tur puana yazılmaz." : `Tur ${round} / ${ANLIK_GORUNTU_ROUNDS_PER_LEVEL}`}
          </p>
          <button
            type="button"
            onClick={handleManualFinish}
            className="min-h-[42px] shrink-0 rounded-xl border border-red-400/60 bg-[var(--exercise-surface-elevated)] px-5 py-2 text-sm font-bold text-[var(--idil-danger-text)] shadow-sm transition hover:bg-red-500/15"
          >
            Bitir
          </button>
        </div>
      }
      onExit={() => router.push("/egzersizler")}
    >
      <div className="exercise-theme-content flex h-full w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-3xl border border-[var(--exercise-border)] bg-[var(--exercise-surface)] px-3 py-3 shadow-[0_18px_54px_rgba(153,27,27,0.13)] md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-2">
          {isTutorial ? (
            <span className="rounded-full border border-amber-500/45 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black tracking-[0.14em] text-[var(--idil-warning-text)]">
              ALIŞTIRMA
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--exercise-text-secondary)]">
              Tur {round}/{ANLIK_GORUNTU_ROUNDS_PER_LEVEL}
            </span>
          )}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--exercise-border)]">
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-300"
              style={{ width: `${(round / ANLIK_GORUNTU_ROUNDS_PER_LEVEL) * 100}%` }}
            />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {phase === "level-up" ? (
            <div className="text-center">
              <p className="text-3xl font-black text-[var(--exercise-text)] md:text-4xl">Seviye {level} tamamlandı</p>
              <p className="mt-2 text-sm font-bold text-[var(--idil-danger-text)]">
                Sıradaki: {getAnlikGoruntuLevelLetterCount(level + 1)} harf
              </p>
            </div>
          ) : phase === "fixation" ? (
            <span className="text-4xl font-black text-[var(--exercise-text-secondary)]">+</span>
          ) : phase === "exposure" ? (
            <span
              className={`max-w-full break-words px-2 text-center font-black leading-tight text-[var(--exercise-text)] ${stimulusFontClass(
                getAnlikGoruntuLetterCount(target),
              )}`}
              style={{ animation: "none", transition: "none", overflowWrap: "anywhere" }}
            >
              {target}
            </span>
          ) : phase === "gap" ? (
            <span className="sr-only">Kelime gizlendi</span>
          ) : (
            <p className="px-4 text-center text-sm font-semibold text-[var(--exercise-text-secondary)]">
              {phase === "feedback"
                ? chosenOption === target
                  ? "✅ Doğru!"
                  : `❌ Doğru cevap: ${target}`
                : "Gördüğün kelimeyi seç"}
            </p>
          )}
        </div>

        <div
          className={`grid shrink-0 grid-cols-2 gap-2 transition-opacity duration-100 ${
            phase === "answer" || phase === "feedback" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {options.map((option, index) => {
            const revealed = chosenOption !== null;
            const stateClass = !revealed
              ? "border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] text-[var(--exercise-text)] hover:border-red-400 hover:bg-red-500/15"
              : option === target
                ? "border-green-700 bg-green-700 text-white"
                : option === chosenOption
                  ? "border-red-700 bg-red-700 text-white"
                  : "border-[var(--exercise-border)] bg-[var(--exercise-surface-elevated)] text-[var(--exercise-text-secondary)] opacity-55";

            return (
              <button
                key={option}
                type="button"
                disabled={phase !== "answer" || revealed}
                onClick={(event) => handleAnswer(option, event.timeStamp)}
                className={`flex min-h-[52px] items-center justify-center gap-2 break-words rounded-xl border-2 px-2 py-2.5 text-sm font-black transition active:scale-[0.98] disabled:cursor-default md:min-h-[60px] md:text-base ${stateClass}`}
                style={{ overflowWrap: "anywhere" }}
              >
                <span className="text-[10px] font-black opacity-50">{OPTION_KEY_LABELS[index]}</span>
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </FixedExerciseStage>
  );
}
