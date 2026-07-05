"use client";

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";

type ExercisePhase = "start" | "ready" | "play";
type ResponsePhase = "show" | "answer" | "feedback";
type SpeedMs = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
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

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[50px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-4 py-3 text-sm font-bold text-white shadow-md shadow-red-300/45 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-300/60 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "relative z-50 min-h-[42px] rounded-xl border border-red-200/80 bg-white/90 px-3 py-2.5 text-xs font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md";

const SELECT_CLASS =
  "h-10 w-full rounded-xl border border-red-100 bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-red-100/60 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const LETTERS = "ABCDEFGHJKLMNPRSTUVYZ";
const DIGITS = "0123456789";
const SPEED_OPTIONS: SpeedMs[] = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const LEVEL_OPTIONS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function normalizeInput(value: string): string {
  return value.replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

function randomPick(source: string): string {
  return source[Math.floor(Math.random() * source.length)] ?? source[0] ?? "A";
}

function generateContent(length: number, contentType: ContentType): string {
  const safeLength = Math.max(1, Math.min(15, Math.floor(length)));

  return Array.from({ length: safeLength }, () => {
    if (contentType === "letter") {
      return randomPick(LETTERS);
    }

    if (contentType === "number") {
      return randomPick(DIGITS);
    }

    return Math.random() < 0.5 ? randomPick(LETTERS) : randomPick(DIGITS);
  }).join("");
}

export function TachistoscopeExerciseClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const finishLockRef = useRef(false);

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

    const nextRound: TachistoscopeRound = {
      expected: generateContent(settings.level, settings.contentType),
      content: "",
      level: settings.level,
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
    finishLockRef.current = false;
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
    setPhase("play");
    setSessionStartedAt(Date.now());
    startNextRound({ level, speedMs, contentType });
  };

  const finishExercise = () => {
    if (finishLockRef.current) {
      return;
    }

    finishLockRef.current = true;

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
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ffd7dd_0%,#fff8f6_42%,#f7efe9_100%)] px-3 py-5 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-4xl items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">Takistoskop</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Takistoskop</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Kisa sureli harf, rakam veya karisik icerikleri takip et. Egitime basla ile tam ekran calisma moduna gecersin.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="fx-pop-in mt-7 inline-flex min-h-[52px] w-full max-w-md items-center justify-center rounded-2xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-red-300/50 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-300/60 sm:w-auto sm:px-10"
            >
              Egitime Basla
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "ready") {
    return (
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ffd8de_0%,#fff7f4_46%,#f7efe9_100%)] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
          <main className="flex flex-1 items-center justify-center px-3 py-4 md:px-5 md:py-5">
            <div className="fx-slide-up flex w-full max-w-3xl flex-col items-center rounded-[28px] border border-white/70 bg-white/75 px-5 py-8 text-center shadow-[0_20px_70px_rgba(153,27,27,0.12)] backdrop-blur md:px-8 md:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Hiz, seviye, calisma sekli ve icerik turunu alt bolumden sec. Hazir oldugunda ilk icerik baslayacak.
              </p>

              <button
                type="button"
                onClick={handleBeginPlay}
                className="fx-pop-in mt-7 inline-flex min-h-[52px] w-full max-w-sm items-center justify-center rounded-2xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-red-300/50 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-300/60"
                style={TOUCH_STYLE}
              >
                Baslat / Hazirim
              </button>
            </div>
          </main>

          <footer className="glass-control-bar border-t border-red-100/75 px-3 py-2.5 md:px-5 md:py-2.5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hiz</span>
                <select className={SELECT_CLASS} value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)}>
                  {SPEED_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item} ms</option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
                <select className={SELECT_CLASS} value={level} onChange={(event) => setLevel(Number(event.target.value) as Level)}>
                  {LEVEL_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calisma Sekli</span>
                <select className={SELECT_CLASS} value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)}>
                  <option value="manual">Manuel</option>
                  <option value="automatic">Otomatik</option>
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Icerik Turu</span>
                <select className={SELECT_CLASS} value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>
                  <option value="letter">Harf</option>
                  <option value="number">Rakam</option>
                  <option value="mixed">Harf + Rakam</option>
                </select>
              </label>
            </div>
          </footer>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="sticky top-0 z-30 border-b border-red-100/80 bg-white/84 shadow-[0_8px_28px_rgba(185,28,28,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 md:px-5 md:py-2.5">
            <div className="mr-auto min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Takistoskop</p>
              <p className="text-xs text-slate-500">Tam ekran calisma modu</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="compact-stat-chip border-red-100 bg-white/90 shadow-sm shadow-red-100/70">Seviye: {level}</span>
              <span className="compact-stat-chip border-green-100 bg-green-50/90 text-green-700 shadow-sm shadow-green-100/60">Dogru: {currentCorrect}</span>
              <span className="compact-stat-chip border-red-100 bg-red-50/90 text-red-700 shadow-sm shadow-red-100/60">Yanlis: {currentWrong}</span>
              <span className={`compact-stat-chip border px-3 py-1.5 shadow-sm ${currentNet >= 0 ? "border-red-100 bg-white/90 text-red-700" : "border-red-200 bg-red-50/90 text-red-700"}`}>
                Net: {currentNet}
              </span>
              <span className="compact-stat-chip border-red-100 bg-white/90 shadow-sm shadow-red-100/70">Hiz: {speedMs} ms</span>
            </div>

            <button
              type="button"
              onClick={finishExercise}
              className={SECONDARY_BUTTON_CLASS}
              style={TOUCH_STYLE}
            >
              Bitir
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-3 py-4 md:px-5 md:py-5">
          <div className="flex w-full max-w-5xl flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Gosterim Alani</p>

            <div className="fx-slide-up mt-3 flex min-h-[37vh] w-full items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,246,0.88)_100%)] px-4 py-6 shadow-[0_20px_62px_rgba(185,28,28,0.10)] backdrop-blur md:min-h-[44vh] md:px-6 md:py-7">
              <div
                className={`font-black tracking-[0.18em] text-slate-950 transition-all duration-300 ease-out ${responsePhase === "show" ? "fx-pop-in" : ""}`}
                style={{
                  fontSize: `${Math.max(3.0, 5.6 - (level - 1) * 0.16)}rem`,
                  lineHeight: 1,
                  wordBreak: "break-all",
                  opacity: responsePhase === "show" || responsePhase === "feedback" ? 1 : 0.2,
                  transform: responsePhase === "show" ? "scale(1)" : responsePhase === "feedback" ? "scale(0.98)" : "scale(0.94)",
                  textShadow: responsePhase === "show" ? "0 12px 32px rgba(185, 28, 28, 0.16)" : "0 8px 24px rgba(15, 23, 42, 0.08)",
                }}
              >
                {responsePhase === "show" && currentRound ? currentRound.content : responsePhase === "feedback" ? currentRound?.content : ""}
              </div>
            </div>

            {responsePhase !== "show" ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                {responsePhase === "answer"
                  ? "Gordugun icerigi yaz. Buyuk kucuk harf fark etmez, bosluklar temizlenir."
                  : "Kontrol edildi. Manuel modda Sonraki ile bir sonraki icerige gecebilirsin."}
              </p>
            ) : null}

            {responsePhase === "answer" ? (
              <div className="mt-5 w-full max-w-2xl">
                <input
                  ref={inputRef}
                  value={currentInput}
                  onChange={(event) => setCurrentInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="min-h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[16px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  placeholder={contentType === "number" ? "Gordugun rakamlari yaz" : "Gordugun icerigi yaz"}
                  inputMode={contentType === "number" ? "numeric" : "text"}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={checkAnswer}>
                    Kontrol Et
                  </button>
                  <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={finishExercise}>
                    Bitir
                  </button>
                </div>
              </div>
            ) : null}

            {responsePhase === "feedback" ? (
              <div className="mt-5 w-full max-w-2xl">
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
                  <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={handleNext}>
                    Sonraki
                  </button>

                  <button type="button" className={SECONDARY_BUTTON_CLASS} style={TOUCH_STYLE} onClick={finishExercise}>
                    Bitir
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        <footer className="glass-control-bar border-t border-red-100/75 px-3 py-2.5 md:px-5 md:py-2.5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hiz</span>
              <select className={SELECT_CLASS} value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value) as SpeedMs)}>
                {SPEED_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item} ms</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seviye</span>
              <select className={SELECT_CLASS} value={level} onChange={(event) => setLevel(Number(event.target.value) as Level)}>
                {LEVEL_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Calisma Sekli</span>
              <select className={SELECT_CLASS} value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)}>
                <option value="manual">Manuel</option>
                <option value="automatic">Otomatik</option>
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Icerik Turu</span>
              <select className={SELECT_CLASS} value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>
                <option value="letter">Harf</option>
                <option value="number">Rakam</option>
                <option value="mixed">Harf + Rakam</option>
              </select>
            </label>
          </div>
        </footer>
      </div>
    </section>
  );
}
