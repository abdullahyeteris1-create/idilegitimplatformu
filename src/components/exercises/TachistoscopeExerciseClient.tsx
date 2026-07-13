"use client";

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";
import { getCurrentStudent } from "@/lib/auth/auth";
import { getRandomTachistoscopeWord, normalizeTachistoscopeLevel, type TachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";
import { saveExerciseResult } from "@/lib/results/resultStorage";

type ExercisePhase = "start" | "ready" | "play";
type ResponsePhase = "show" | "answer" | "feedback";
type SpeedMs = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
type Level = TachistoscopeLevel;
type WorkMode = "automatic" | "manual";
type ContentType = "letter" | "number" | "mixed";

type TachistoscopeRound = {
  expected: string;
  content: string;
  level: Level;
  speedMs: SpeedMs;
  contentType: ContentType;
};

type RoundSettings = {
  level: Level;
  speedMs: SpeedMs;
  contentType: ContentType;
};

const SPEED_OPTIONS: SpeedMs[] = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const LEVEL_OPTIONS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function normalizeInput(value: string): string {
  return value.replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

function generateContent(level: Level, previousWord?: string): string {
  const normalizedLevel = normalizeTachistoscopeLevel(level);
  return getRandomTachistoscopeWord(normalizedLevel, previousWord).toLocaleUpperCase("tr-TR");
}

export function TachistoscopeExerciseClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);

  const [phase, setPhase] = useState<ExercisePhase>("start");
  const [responsePhase, setResponsePhase] = useState<ResponsePhase>("show");
  const [speedMs, setSpeedMs] = useState<SpeedMs>(300);
  const [level, setLevel] = useState<Level>(1);
  const [workMode, setWorkMode] = useState<WorkMode>("manual");
  const [contentType, setContentType] = useState<ContentType>("letter");

  const [currentRound, setCurrentRound] = useState<TachistoscopeRound | null>(null);
  const [currentInput, setCurrentInput] = useState("");
  const [currentFeedback, setCurrentFeedback] = useState("");
  const [currentFeedbackTone, setCurrentFeedbackTone] = useState<"ok" | "bad" | "brand" | "neutral">("neutral");
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [currentWrong, setCurrentWrong] = useState(0);
  const [currentLevelCorrect, setCurrentLevelCorrect] = useState(0);
  const [currentLevelWrong, setCurrentLevelWrong] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [autoLevelUpCount, setAutoLevelUpCount] = useState(0);
  const [reachedLevel, setReachedLevel] = useState<Level>(1);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  const latestSettingsRef = useRef<RoundSettings>({
    level: 1,
    speedMs: 300,
    contentType: "letter",
  });

  const feedbackAdvanceGuardRef = useRef(false);

  const currentNet = currentLevelCorrect - currentLevelWrong;
  const totalAnswered = totalCorrect + totalWrong;
  const totalNet = totalCorrect - totalWrong;

  useEffect(() => {
    latestSettingsRef.current = { level, speedMs, contentType };
  }, [level, speedMs, contentType]);

  useEffect(() => {
    feedbackAdvanceGuardRef.current = false;
  }, [currentRound?.content, responsePhase]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }

      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "play" || responsePhase !== "answer") {
      return;
    }

    inputRef.current?.focus();
  }, [phase, responsePhase, currentRound?.content]);

  useEffect(() => {
    if (phase !== "play" || responsePhase !== "show" || !currentRound) {
      return;
    }

    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
    }

    revealTimerRef.current = window.setTimeout(() => {
      setResponsePhase("answer");
      setCurrentInput("");
      setCurrentFeedback("");
      setCurrentFeedbackTone("neutral");
      setAnswerLocked(false);
    }, currentRound.speedMs);

    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, [currentRound, phase, responsePhase]);

  const startNextRound = (overrideSettings?: Partial<RoundSettings>) => {
    const settings = { ...latestSettingsRef.current, ...overrideSettings };
    const normalizedLevel = normalizeTachistoscopeLevel(settings.level);

    const nextRound: TachistoscopeRound = {
      expected: generateContent(normalizedLevel, currentRound?.expected),
      content: "",
      level: normalizedLevel,
      speedMs: settings.speedMs,
      contentType: settings.contentType,
    };

    nextRound.content = nextRound.expected;

    setCurrentRound(nextRound);
    setResponsePhase("show");
    setCurrentInput("");
    setAnswerLocked(false);
    setCurrentFeedback("");
    setCurrentFeedbackTone("neutral");
  };

  const scheduleNextRound = () => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }

    autoAdvanceTimerRef.current = window.setTimeout(() => {
      handleNext();
    }, 900);
  };

  const handleStart = () => {
    hasSavedResultRef.current = false;
    setCurrentCorrect(0);
    setCurrentWrong(0);
    setCurrentLevelCorrect(0);
    setCurrentLevelWrong(0);
    setTotalCorrect(0);
    setTotalWrong(0);
    setAutoLevelUpCount(0);
    setReachedLevel(level);
    setCurrentFeedback("");
    setCurrentFeedbackTone("neutral");
    setCurrentInput("");
    setCurrentRound(null);
    setResponsePhase("show");
    setSessionStartedAt(null);
    setPhase("ready");
  };

  const handleBeginPlay = () => {
    hasSavedResultRef.current = false;
    setPhase("play");
    setSessionStartedAt(Date.now());
    startNextRound({ level, speedMs, contentType });
  };

  const finishExercise = () => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;

    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
    }

    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }

    const student = getCurrentStudent();
    const durationSeconds = Math.max(1, sessionStartedAt ? Math.round((Date.now() - sessionStartedAt) / 1000) : 1);
    const score = totalCorrect * 10 - totalWrong * 5;
    const successRate = totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "tachistoscope",
      exerciseTitle: "Takistoskop",
      durationSeconds,
      correctCount: totalCorrect,
      wrongCount: totalWrong,
      score,
      successRate,
      details: {
        speedMs,
        level,
        contentType,
        mode: workMode,
        net: totalNet,
        reachedLevel,
        autoLevelUpCount,
      },
    });

    router.push(`/sonuc?exerciseType=tachistoscope&correct=${totalCorrect}&wrong=${totalWrong}&successRate=${successRate}&score=${score}`);
  };

  const checkAnswer = () => {
    if (phase !== "play" || responsePhase !== "answer" || answerLocked || !currentRound) {
      return;
    }

    const normalizedExpected = normalizeInput(currentRound.expected);
    const normalizedInput = normalizeInput(currentInput);
    const isCorrect = normalizedExpected === normalizedInput;

    const nextCurrentCorrect = currentLevelCorrect + (isCorrect ? 1 : 0);
    const nextCurrentWrong = currentLevelWrong + (isCorrect ? 0 : 1);
    const nextCurrentNet = nextCurrentCorrect - nextCurrentWrong;

    setTotalCorrect((prev) => prev + (isCorrect ? 1 : 0));
    setTotalWrong((prev) => prev + (isCorrect ? 0 : 1));
    setCurrentCorrect(nextCurrentCorrect);
    setCurrentWrong(nextCurrentWrong);
    setCurrentLevelCorrect(nextCurrentCorrect);
    setCurrentLevelWrong(nextCurrentWrong);
    setCurrentFeedback(isCorrect ? "Doğru cevap." : `Yanlış cevap.\nDoğru cevap: ${currentRound.expected}`);
    setCurrentFeedbackTone(isCorrect ? "ok" : "bad");
    setResponsePhase("feedback");
    setCurrentRound((prev) => (prev ? { ...prev, content: "" } : prev));
    setAnswerLocked(true);

    const shouldLevelUp = nextCurrentNet >= 10 && level < 15;
    const shouldHoldMax = nextCurrentNet >= 10 && level === 15;

    if (shouldLevelUp) {
      const nextLevel = (level + 1) as Level;
      setTimeout(() => {
        setLevel(nextLevel);
        setReachedLevel((prev) => Math.max(prev, nextLevel) as Level);
        setAutoLevelUpCount((prev) => prev + 1);
        setCurrentFeedback(`Tebrikler! Seviye ${nextLevel} seviyesine gectin.`);
        setCurrentFeedbackTone("brand");
        setCurrentCorrect(0);
        setCurrentWrong(0);
        setCurrentLevelCorrect(0);
        setCurrentLevelWrong(0);
      }, 120);
    } else if (shouldHoldMax) {
      setTimeout(() => {
        setCurrentFeedback("En yuksek seviyedesin. Bu seviyede devam edebilirsin.");
        setCurrentFeedbackTone("brand");
      }, 120);
    }

    if (workMode === "automatic") {
      scheduleNextRound();
    }
  };

  const handleNext = () => {
    if (phase !== "play") {
      return;
    }

    if (responsePhase === "show") {
      return;
    }

    if (workMode === "automatic" && responsePhase !== "feedback") {
      return;
    }

    feedbackAdvanceGuardRef.current = false;

    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
    }

    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }

    setCurrentInput("");
    setCurrentFeedback("");
    setCurrentFeedbackTone("neutral");
    setAnswerLocked(false);
    startNextRound();
  };

  const handleFeedbackAdvance = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.repeat) {
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    if (feedbackAdvanceGuardRef.current) {
      return;
    }

    feedbackAdvanceGuardRef.current = true;
    event.preventDefault();
    handleNext();

    window.setTimeout(() => {
      feedbackAdvanceGuardRef.current = false;
    }, 120);
  });

  useEffect(() => {
    if (phase !== "play" || responsePhase !== "feedback") {
      return;
    }

    window.addEventListener("keydown", handleFeedbackAdvance);
    return () => {
      window.removeEventListener("keydown", handleFeedbackAdvance);
    };
  }, [phase, responsePhase]);

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (responsePhase === "answer") {
      checkAnswer();
      return;
    }

    if (responsePhase === "feedback" && workMode === "manual") {
      handleNext();
    }
  };

  if (phase === "start") {
    return (
      <FullscreenExerciseIntro
        title="Takistoskop"
        description="Kisa sureli anlamli kelimeleri takip et. Egitime basla ile odakli calisma moduna gecersin."
        buttonLabel="Egitime Basla"
        onStart={handleStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Takistoskop"
        subtitle="Hazirlik modu"
        stats={[
          { label: "Seviye", value: level },
          { label: "Hiz", value: `${speedMs} ms`, tone: "brand" },
          { label: "Mod", value: workMode === "manual" ? "Manuel" : "Otomatik" },
        ]}
        footer={
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hiz</span>
                <select className={FULLSCREEN_SELECT_CLASS} value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)}>
                  {SPEED_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item} ms</option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
                <select className={FULLSCREEN_SELECT_CLASS} value={level} onChange={(event) => setLevel(Number(event.target.value) as Level)}>
                  {LEVEL_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calisma Sekli</span>
                <select className={FULLSCREEN_SELECT_CLASS} value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)}>
                  <option value="manual">Manuel</option>
                  <option value="automatic">Otomatik</option>
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Icerik Turu</span>
                <select className={FULLSCREEN_SELECT_CLASS} value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>
                  <option value="letter">Harf</option>
                  <option value="number">Rakam</option>
                  <option value="mixed">Harf + Rakam</option>
                </select>
              </label>
              <button type="button" onClick={handleBeginPlay} className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
                Baslat / Hazirim
              </button>
          </div>
        }
      >
        <div className="flex h-full flex-col items-center justify-center px-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-3xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-5 text-slate-500">
            Hiz, seviye, calisma sekli ve icerik turunu sec. Basladiktan sonra ayarlar gizlenir.
          </p>
        </div>
      </FullscreenExerciseShell>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Takistoskop"
      subtitle="Odakli calisma modu"
      stats={[
        { label: "Seviye", value: level },
        { label: "Dogru", value: currentCorrect, tone: "ok" },
        { label: "Yanlis", value: currentWrong, tone: "bad" },
        { label: "Net", value: currentNet, tone: currentNet >= 0 ? "brand" : "bad" },
        { label: "Hiz", value: `${speedMs} ms` },
        { label: "Mod", value: workMode === "manual" ? "Manuel" : "Otomatik" },
        { label: "Icerik", value: contentType === "mixed" ? "Karisik" : contentType === "number" ? "Rakam" : "Harf" },
      ]}
      finishButton={
        <button type="button" onClick={finishExercise} className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="exercise-stage-fit fx-slide-up flex h-full min-h-0 w-full flex-col items-center justify-center overflow-y-auto rounded-[20px] border border-white/80 bg-white/90 p-2 shadow-[0_18px_54px_rgba(185,28,28,0.10)] md:rounded-[28px] md:p-4"
    >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Gosterim Alani</p>

            <div className="mt-1 flex min-h-[120px] w-full flex-1 items-center justify-center rounded-[18px] border border-red-50 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-2 py-2 md:mt-2 md:min-h-[180px] md:px-5">
              {responsePhase === "show" && currentRound ? (
                <div
                  className="font-black tracking-[0.18em] text-slate-950 transition-all duration-300 ease-out fx-pop-in"
                  style={{
                    fontSize: `clamp(2rem, 10vw, ${Math.max(3.0, 5.6 - (level - 1) * 0.16)}rem)`,
                    lineHeight: 1,
                    wordBreak: "break-all",
                    opacity: 1,
                    transform: "scale(1)",
                    textShadow: "0 12px 32px rgba(185, 28, 28, 0.16)",
                  }}
                >
                  {currentRound.content}
                </div>
              ) : (
                <div className="text-lg font-semibold text-slate-300">Sonraki kelime icin Sonraki butonuna bas.</div>
              )}
            </div>

            {responsePhase !== "show" ? (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 md:text-sm">
                {responsePhase === "answer"
                  ? "Gordugun kelimeyi yaz. Buyuk kucuk harf fark etmez, bosluklar temizlenir."
                  : "Kontrol edildi. Manuel modda Sonraki ile bir sonraki icerige gecebilirsin."}
              </p>
            ) : null}

            {responsePhase === "answer" ? (
              <div className="mt-2 w-full max-w-2xl">
                <input
                  ref={inputRef}
                  value={currentInput}
                  onChange={(event) => setCurrentInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  placeholder="Gordugun kelimeyi yaz"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={checkAnswer}>
                    Kontrol Et
                  </button>
                  <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
                    Bitir
                  </button>
                </div>
              </div>
            ) : null}

            {responsePhase === "feedback" ? (
              <div className="mt-2 w-full max-w-2xl">
                {currentFeedback ? (
                  <div
                    className={`mx-auto max-w-2xl rounded-3xl border px-4 py-3 text-left text-sm font-semibold leading-6 shadow-lg whitespace-pre-line break-words md:px-5 ${
                      currentFeedbackTone === "ok"
                        ? "fx-glow-green border-green-200 bg-green-50/95 text-green-700 shadow-green-100/70"
                        : currentFeedbackTone === "bad"
                          ? "fx-shake border-red-200 bg-red-50/95 text-red-700 shadow-red-100/80"
                          : currentFeedbackTone === "brand"
                            ? "fx-pulse-soft border-red-200 bg-white/95 text-[var(--brand)] shadow-red-100/70"
                            : "border-slate-200 bg-white/95 text-slate-700 shadow-slate-100/70"
                    }`}
                  >
                    {currentFeedback}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleNext}>
                    Sonraki
                  </button>

                  <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
                    Bitir
                  </button>
                </div>
              </div>
            ) : null}
    </FullscreenExerciseShell>
  );
}
