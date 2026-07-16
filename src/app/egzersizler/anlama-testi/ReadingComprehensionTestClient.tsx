"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import {
  type ReadingComprehensionText,
} from "@/lib/data/readingComprehensionTexts";
import {
  calculateComprehensionScore,
  calculateReadingSpeed,
  countCharacters,
  countWords,
  evaluateAnswers,
  formatDuration,
  type AnswerEvaluation,
} from "@/lib/exercise-engine/readingComprehension";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { saveReadingTestResult } from "@/lib/results/readingTestStorage";
import { getActiveQuestionsByTextId, mapQuestionToReadingQuestion, refreshQuestionLibraryCache } from "@/lib/settings/questionLibraryStorage";
import { DEFAULT_TEXT_CATEGORY, getTextCategories, loadActiveTextLibraryItems } from "@/lib/settings/textLibraryStorage";
import { getDisplayTextTitle, sortByCategoryAndTitle } from "@/lib/text-library/sorting";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type TestPhase = "setup" | "ready" | "reading" | "paused" | "questions" | "result";
type FontSizePx = 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28;

type ReadingResult = {
  category: string;
  textTitle: string;
  totalWords: number;
  totalCharacters: number;
  readingDurationSeconds: number;
  readingSpeedWpm: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  emptyAnswers: number;
  comprehensionScore: number;
  fontSize: FontSizePx;
  pausedCount: number;
  totalPausedSeconds: number;
  evaluations: AnswerEvaluation[];
};

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const FONT_SIZE_OPTIONS: FontSizePx[] = [12, 14, 16, 18, 20, 22, 24, 26, 28];
const ALL_CATEGORIES = "all";

const EMPTY_TEXT: ReadingComprehensionText = {
  id: "",
  category: DEFAULT_TEXT_CATEGORY,
  title: "",
  text: "",
  questions: [],
};

function getOptionClass(evaluation: AnswerEvaluation | undefined, optionIndex: number): string {
  if (!evaluation) {
    return "border-red-100 bg-white text-slate-800";
  }

  if (optionIndex === evaluation.correctAnswerIndex) {
    return "border-green-300 bg-green-50 text-green-800";
  }

  if (optionIndex === evaluation.selectedAnswerIndex && !evaluation.isCorrect) {
    return "border-red-300 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

export function ReadingComprehensionTestClient() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const saveLockRef = useRef(true);

  const [phase, setPhase] = useState<TestPhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadingComprehensionText[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [readingDurationSeconds, setReadingDurationSeconds] = useState(0);
  const [fontSize, setFontSize] = useState<FontSizePx>(18);
  const [pausedCount, setPausedCount] = useState(0);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | undefined>>({});
  const [result, setResult] = useState<ReadingResult | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsTeacher(getResolvedCurrentUser()?.role === "teacher");
        setIsLoadingTexts(true);
        setTextLoadError(null);
        await refreshQuestionLibraryCache();

        const result = await loadActiveTextLibraryItems();
        const activeTexts = result.items
          .map((item) => ({
            id: item.id,
            category: item.category,
            title: item.title,
            text: item.content,
            questions: getActiveQuestionsByTextId(item.id).map((question) => mapQuestionToReadingQuestion(question)),
          }))
          .filter((item) => item.questions.length > 0);

        setLibraryTexts(activeTexts);
        setTextLoadError(result.error);
        setSelectedCategory(ALL_CATEGORIES);
        setSelectedTextId(activeTexts[0]?.id ?? "");
        setIsLoadingTexts(false);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const allTexts = useMemo(() => {
    return libraryTexts;
  }, [libraryTexts]);

  const hasQuestionTexts = allTexts.length > 0;

  const categories = useMemo<string[]>(() => {
    return [ALL_CATEGORIES, ...getTextCategories()];
  }, []);

  const sortedTexts = useMemo<ReadingComprehensionText[]>(() => {
    const categoryOrder = categories.filter((item) => item !== ALL_CATEGORIES);
    return sortByCategoryAndTitle(allTexts, { categoryOrder });
  }, [allTexts, categories]);

  const resolvedCategory = useMemo(() => {
    return categories.includes(selectedCategory) ? selectedCategory : ALL_CATEGORIES;
  }, [categories, selectedCategory]);

  const availableTexts = useMemo(() => {
    if (resolvedCategory === ALL_CATEGORIES) {
      return sortedTexts;
    }

    return sortedTexts.filter((text) => text.category === resolvedCategory);
  }, [resolvedCategory, sortedTexts]);

  const selectedText = useMemo<ReadingComprehensionText>(() => {
    return sortedTexts.find((text) => text.id === selectedTextId) ?? availableTexts[0] ?? EMPTY_TEXT;
  }, [availableTexts, selectedTextId, sortedTexts]);
  const totalWords = useMemo(() => countWords(selectedText.text), [selectedText.text]);
  const totalCharacters = useMemo(() => countCharacters(selectedText.text), [selectedText.text]);
  const liveReadingSpeed = calculateReadingSpeed(totalWords, elapsedSeconds);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearTimer();
    clearPauseTimer();
  }, [clearPauseTimer, clearTimer]);

  useEffect(() => {
    if (phase !== "reading") {
      clearTimer();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearTimer();
  }, [clearTimer, phase]);

  useEffect(() => {
    if (phase !== "paused") {
      clearPauseTimer();
      return;
    }

    pauseTimerRef.current = window.setInterval(() => {
      setTotalPausedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearPauseTimer();
  }, [clearPauseTimer, phase]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const resetToReady = useCallback(() => {
    clearTimers();
    saveLockRef.current = true;
    setElapsedSeconds(0);
    setReadingDurationSeconds(0);
    setPausedCount(0);
    setTotalPausedSeconds(0);
    setSelectedAnswers({});
    setResult(null);
    setPhase("ready");
  }, [clearTimers]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const handleCategoryChange = (category: string) => {
    const firstText = category === ALL_CATEGORIES ? allTexts[0] : allTexts.find((text) => text.category === category);
    setSelectedCategory(category);
    setSelectedTextId(firstText?.id ?? "");
    resetToReady();
  };

  const handleTextChange = (textId: string) => {
    setSelectedTextId(textId);
    resetToReady();
  };

  const handleStartReading = () => {
    clearTimers();
    saveLockRef.current = false;
    setElapsedSeconds(0);
    setReadingDurationSeconds(0);
    setPausedCount(0);
    setTotalPausedSeconds(0);
    setSelectedAnswers({});
    setResult(null);
    setPhase("reading");
  };

  const handlePauseReading = () => {
    if (phase !== "reading") {
      return;
    }

    clearTimer();
    setPausedCount((prev) => prev + 1);
    setPhase("paused");
  };

  const handleResumeReading = () => {
    if (phase !== "paused") {
      return;
    }

    clearPauseTimer();
    setPhase("reading");
  };

  const handleGoToQuestions = () => {
    if (phase !== "reading") {
      return;
    }

    const finalDuration = Math.max(1, elapsedSeconds);
    clearTimers();
    setReadingDurationSeconds(finalDuration);
    setPhase("questions");
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleFinishTest = () => {
    if (saveLockRef.current || selectedText.questions.length === 0) {
      return;
    }

    saveLockRef.current = true;
    clearTimers();

    const duration = Math.max(1, readingDurationSeconds || elapsedSeconds);
    const evaluation = evaluateAnswers(selectedText.questions, selectedAnswers);
    const comprehensionScore = calculateComprehensionScore(evaluation.correctCount, selectedText.questions.length);
    const readingSpeedWpm = calculateReadingSpeed(totalWords, duration);
    const student = getCurrentStudent();
    const completedAt = new Date().toISOString();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "reading-comprehension",
      exerciseTitle: "Anlama Testi",
      durationSeconds: duration,
      correctCount: evaluation.correctCount,
      wrongCount: evaluation.wrongCount,
      score: comprehensionScore,
      successRate: comprehensionScore,
      details: {
        category: selectedText.category,
        textTitle: selectedText.title,
        totalWords,
        totalCharacters,
        readingDurationSeconds: duration,
        readingSpeedWpm,
        totalQuestions: selectedText.questions.length,
        correctAnswers: evaluation.correctCount,
        wrongAnswers: evaluation.wrongCount,
        emptyAnswers: evaluation.emptyCount,
        comprehensionScore,
        fontSize,
        pausedCount,
        totalPausedSeconds,
        activeReadingSeconds: duration,
        completedAt,
      },
    });

    saveReadingTestResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      username: student?.username,
      date: completedAt,
      category: selectedText.category,
      textTitle: selectedText.title,
      totalWords,
      readingDurationSeconds: duration,
      readingSpeedWpm,
      totalQuestions: selectedText.questions.length,
      correctAnswers: evaluation.correctCount,
      wrongAnswers: evaluation.wrongCount,
      emptyAnswers: evaluation.emptyCount,
      comprehensionScore,
      fontSize,
    });

    setResult({
      category: selectedText.category,
      textTitle: selectedText.title,
      totalWords,
      totalCharacters,
      readingDurationSeconds: duration,
      readingSpeedWpm,
      totalQuestions: selectedText.questions.length,
      correctAnswers: evaluation.correctCount,
      wrongAnswers: evaluation.wrongCount,
      emptyAnswers: evaluation.emptyCount,
      comprehensionScore,
      fontSize,
      pausedCount,
      totalPausedSeconds,
      evaluations: evaluation.evaluations,
    });
    setPhase("result");
  };

  const readingStats = [
    { label: "Sure", value: formatDuration(elapsedSeconds), tone: "brand" as const },
    { label: "Kelime", value: totalWords },
    { label: "Hiz", value: `${liveReadingSpeed} kelime/dk` },
    { label: "Font", value: `${fontSize}px` },
  ];

  const finalReadingStats = [
    { label: "Kelime", value: totalWords },
    { label: "Okuma Suresi", value: formatDuration(readingDurationSeconds) },
    { label: "Okuma Hizi", value: `${calculateReadingSpeed(totalWords, readingDurationSeconds)} kelime/dk`, tone: "brand" as const },
  ];

  const readyFooter = (
    <div className="grid gap-2 md:grid-cols-[1fr_1fr_140px_180px]">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kategori</span>
        <select value={resolvedCategory} onChange={(event) => handleCategoryChange(event.target.value)} className={FULLSCREEN_SELECT_CLASS}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === ALL_CATEGORIES ? "Tümü" : category}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Metin</span>
        <select value={selectedTextId} onChange={(event) => handleTextChange(event.target.value)} className={FULLSCREEN_SELECT_CLASS}>
          {availableTexts.map((text) => (
            <option key={text.id} value={text.id}>
              {getDisplayTextTitle(text.title)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Font</span>
        <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)} className={FULLSCREEN_SELECT_CLASS}>
          {FONT_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </label>
        <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleStartReading} disabled={!hasQuestionTexts}>
        Baslat
      </button>
    </div>
  );

  const readingFooter = (
    <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_1fr]">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Font</span>
        <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)} className={FULLSCREEN_SELECT_CLASS}>
          {FONT_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </label>
      {phase === "paused" ? (
        <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResumeReading}>
          Devam Et
        </button>
      ) : (
        <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePauseReading}>
          Durdur
        </button>
      )}
      <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={resetToReady}>
        Yeniden Baslat
      </button>
      {phase === "reading" ? (
        <button type="button" className={FULLSCREEN_PRIMARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={handleGoToQuestions}>
          Sorulara Gec
        </button>
      ) : (
        <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} disabled>
          Sorulara Gec
        </button>
      )}
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Anlama Testi"
        description="Metni oku, hizini olc, ardindan sorulari cevaplayarak anlama oranini gor."
        buttonLabel="Egitime Basla"
        onStart={handleIntroStart}
      />
    );
  }

  if (phase === "ready") {
    return (
      <FullscreenExerciseShell
        title="Anlama Testi"
        subtitle="Hazirlik modu"
        stats={[
          { label: "Kelime", value: totalWords },
          { label: "Karakter", value: totalCharacters },
          { label: "Soru", value: selectedText.questions.length, tone: "brand" },
          { label: "Font", value: `${fontSize}px` },
        ]}
        stageClassName="fx-slide-up flex min-h-[340px] w-full flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/92 px-4 py-5 text-center shadow-[0_14px_42px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[420px]"
        footer={readyFooter}
      >
        {isLoadingTexts ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-bold text-slate-900">Metinler yükleniyor...</p>
          </div>
        ) : textLoadError ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-red-900">{textLoadError}</p>
          </div>
        ) : hasQuestionTexts ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">Hazirlik</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
            <div className="mt-5 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
              <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs text-slate-500">Kategori</p>
                <p className="mt-1 font-bold text-slate-900">{selectedText.category}</p>
              </article>
              <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs text-slate-500">Metin</p>
                <p className="mt-1 font-bold text-slate-900">{selectedText.title}</p>
              </article>
              <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs text-slate-500">Soru</p>
                <p className="mt-1 font-bold text-slate-900">{selectedText.questions.length}</p>
              </article>
            </div>
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-amber-900">Henüz anlama testi için hazırlanmış metin bulunmuyor.</p>
            <p className="text-sm text-amber-800">{isTeacher ? "Metin Kütüphanesi'ndeki aktif metinlere soru ekleyin." : "Bu çalışma için şu anda sorulu metin yok."}</p>
            {isTeacher ? (
              <Link
                href="/ogretmen/icerik-yonetimi/anlama-testi-olustur"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-900/25 bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Anlama Testi Oluştur
              </Link>
            ) : null}
          </div>
        )}
      </FullscreenExerciseShell>
    );
  }

  if (phase === "reading" || phase === "paused") {
    return (
      <FullscreenExerciseShell
        title="Anlama Testi"
        subtitle={phase === "paused" ? "Calisma duraklatildi" : `${selectedText.category} - ${selectedText.title}`}
        stats={readingStats}
        stageClassName="fx-slide-up flex min-h-[430px] w-full flex-col rounded-3xl border border-white/80 bg-white/92 p-3 text-left shadow-[0_14px_42px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[500px] md:p-4 lg:min-h-[540px]"
        footer={readingFooter}
      >
        <div className="relative w-full">
          <article
            className={`h-[62vh] w-full overflow-y-auto rounded-2xl border border-red-100 bg-white px-4 py-5 text-slate-900 shadow-inner transition duration-200 md:h-[66vh] md:px-7 md:py-6 ${
              phase === "paused" ? "select-none blur-sm" : ""
            }`}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
          >
            <h2 className="mb-4 text-[1.35em] font-black text-red-700">{selectedText.title}</h2>
            <p className="whitespace-pre-line">{selectedText.text}</p>
          </article>
          {phase === "paused" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/65 px-4 text-center backdrop-blur-[2px]">
              <p className="max-w-md rounded-2xl border border-red-100 bg-white/95 px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
                Calisma duraklatildi. Devam Et dugmesine basinca kaldigin yerden devam edeceksin.
              </p>
            </div>
          ) : null}
        </div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "questions") {
    return (
      <FullscreenExerciseShell
        title="Anlama Testi"
        subtitle="Sorular"
        stats={finalReadingStats}
        stageClassName="fx-slide-up flex min-h-[430px] w-full flex-col rounded-3xl border border-white/80 bg-white/92 p-3 text-left shadow-[0_14px_42px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[500px] md:p-4 lg:min-h-[540px]"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={FULLSCREEN_SECONDARY_BUTTON_CLASS} style={FULLSCREEN_TOUCH_STYLE} onClick={resetToReady}>
              Yeniden Baslat
            </button>
            <button
              type="button"
              className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={handleFinishTest}
              disabled={selectedText.questions.length === 0}
            >
              Testi Bitir
            </button>
          </div>
        }
      >
        <div className="max-h-[66vh] w-full overflow-y-auto pr-1">
          {selectedText.questions.length === 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
              <p className="text-lg font-black text-amber-900">Bu metin icin henuz soru eklenmemis.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-amber-800">
                Okuma suresi ve hiz olcumu tamamlandi, ancak soru olmadigi icin test sonucu olusturulmaz.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedText.questions.map((question, questionIndex) => (
                <article key={question.id} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                  <h3 className="font-extrabold text-slate-900" style={{ fontSize: `${Math.min(fontSize, 22)}px`, lineHeight: 1.45 }}>
                    {questionIndex + 1}. {question.question}
                  </h3>
                  <div className="mt-3 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-red-100 bg-red-50/45 px-3 py-2 font-semibold text-slate-800" style={{ fontSize: `${Math.min(fontSize, 18)}px`, lineHeight: 1.45 }}>
                        <input
                          type="radio"
                          name={question.id}
                          checked={selectedAnswers[question.id] === optionIndex}
                          onChange={() => handleAnswerSelect(question.id, optionIndex)}
                          className="h-4 w-4 accent-red-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </FullscreenExerciseShell>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="idil-card mx-auto w-full max-w-5xl p-4 md:p-6">
        <h2 className="text-2xl font-bold">Anlama Testi Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Okuma hizi ve anlama orani kaydedildi.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Okuma Hizi</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.readingSpeedWpm}</p>
            <p className="text-xs text-slate-500">kelime/dk</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Sure</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatDuration(result.readingDurationSeconds)}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Kelime</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{result.totalWords}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Anlama Orani</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--ok)]">{result.comprehensionScore}</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-red-100 bg-white p-4">
            <h3 className="font-extrabold text-red-700">Okuma Bilgileri</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <p>Metin: <span className="text-slate-900">{result.textTitle}</span></p>
              <p>Kategori: <span className="text-slate-900">{result.category}</span></p>
              <p>Karakter Sayisi: <span className="text-slate-900">{result.totalCharacters}</span></p>
              <p>Okuma Suresi: <span className="text-slate-900">{formatDuration(result.readingDurationSeconds)}</span></p>
              <p>Okuma Hizi: <span className="text-slate-900">{result.readingSpeedWpm} kelime/dk</span></p>
              <p>Font Boyutu: <span className="text-slate-900">{result.fontSize}px</span></p>
              <p>Duraklatma: <span className="text-slate-900">{result.pausedCount} kez / {result.totalPausedSeconds} sn</span></p>
            </div>
          </section>
          <section className="rounded-2xl border border-red-100 bg-white p-4">
            <h3 className="font-extrabold text-red-700">Anlama Bilgileri</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <p>Toplam Soru: <span className="text-slate-900">{result.totalQuestions}</span></p>
              <p>Dogru Cevap: <span className="text-[var(--ok)]">{result.correctAnswers}</span></p>
              <p>Yanlis Cevap: <span className="text-[var(--bad)]">{result.wrongAnswers}</span></p>
              <p>Bos Birakilan: <span className="text-slate-900">{result.emptyAnswers}</span></p>
              <p>Anlama Orani: <span className="text-[var(--ok)]">{result.comprehensionScore} puan</span></p>
            </div>
          </section>
        </div>

        <section className="mt-5">
          <h3 className="text-lg font-bold">Cevap Degerlendirmesi</h3>
          <div className="mt-3 grid gap-3">
            {selectedText.questions.map((question, index) => {
              const evaluation = result.evaluations.find((item) => item.questionId === question.id);

              return (
                <article key={question.id} className="rounded-2xl border border-red-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900">{index + 1}. {question.question}</h4>
                    {evaluation?.isEmpty ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Bos birakildi</span> : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={option} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${getOptionClass(evaluation, optionIndex)}`}>
                        {option}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={resetToReady}>
            Yeniden Baslat
          </button>
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={() => router.push(`/sonuc?exerciseType=reading-comprehension&correct=${result.correctAnswers}&wrong=${result.wrongAnswers}&successRate=${result.comprehensionScore}&score=${result.comprehensionScore}`)}>
            Ortak Sonuc Ekrani
          </button>
          <div className="flex justify-end sm:col-span-3">
            <ExerciseNavigationControls />
          </div>
        </div>
      </section>
    );
  }

  return null;
}
