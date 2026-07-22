"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { getResolvedCurrentUser } from "@/lib/auth/auth";
import { calculateReadingSpeed, countCharacters, countWords, formatDuration } from "@/lib/exercise-engine/readingComprehension";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { getTextCategories, loadActiveTextLibraryItems, type TextLibraryLoadResult } from "@/lib/settings/textLibraryStorage";
import { getDisplayTextTitle, sortByCategoryAndTitle } from "@/lib/text-library/sorting";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/reading-speed-test-theme.module.css";

type TestPhase = "setup" | "ready" | "reading" | "paused" | "result";
type FontSizePx = 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28;
type ReadableText = {
  id: string;
  category: string;
  readingLevel?: string;
  title: string;
  text: string;
};

type ReadingSpeedResult = {
  category: string;
  textTitle: string;
  totalWords: number;
  totalCharacters: number;
  readingDurationSeconds: number;
  readingSpeedWpm: number;
  fontSize: FontSizePx;
  pausedCount: number;
  totalPausedSeconds: number;
};

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const FONT_SIZE_OPTIONS: FontSizePx[] = [12, 14, 16, 18, 20, 22, 24, 26, 28];
const ALL_CATEGORIES = "all";

const EMPTY_TEXT: ReadableText = {
  id: "",
  category: "",
  title: "",
  text: "",
};

export function ReadingSpeedTestClient() {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const timerRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const saveLockRef = useRef(true);

  const [phase, setPhase] = useState<TestPhase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [libraryTexts, setLibraryTexts] = useState<ReadableText[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [textDiagnostics, setTextDiagnostics] = useState<TextLibraryLoadResult["diagnostics"] | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fontSize, setFontSize] = useState<FontSizePx>(18);
  const [pausedCount, setPausedCount] = useState(0);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [result, setResult] = useState<ReadingSpeedResult | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsTeacher(getResolvedCurrentUser()?.role === "teacher");
        setIsLoadingTexts(true);
        setTextLoadError(null);

        const result = await loadActiveTextLibraryItems();
        const activeTexts = result.items.map((item) => ({
          id: item.id,
          category: item.category,
          readingLevel: item.level?.trim() || undefined,
          title: item.title,
          text: item.content,
        }));

        setLibraryTexts(activeTexts);
        setTextLoadError(result.error);
        setTextDiagnostics(result.diagnostics ?? null);
        setSelectedCategory(ALL_CATEGORIES);
        setSelectedTextId(activeTexts[0]?.id ?? "");
        setIsLoadingTexts(false);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const allTexts = useMemo(() => libraryTexts, [libraryTexts]);
  const hasActiveTexts = allTexts.length > 0;

  const categories = useMemo<string[]>(() => {
    return [ALL_CATEGORIES, ...getTextCategories()];
  }, []);

  const sortedTexts = useMemo<ReadableText[]>(() => {
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

  const selectedText = useMemo<ReadableText>(() => {
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
    setPausedCount(0);
    setTotalPausedSeconds(0);
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
    setPausedCount(0);
    setTotalPausedSeconds(0);
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

  const handleFinishReading = () => {
    if (saveLockRef.current || (phase !== "reading" && phase !== "paused")) {
      return;
    }

    saveLockRef.current = true;
    clearTimers();

    const duration = Math.max(1, elapsedSeconds);
    const readingSpeedWpm = calculateReadingSpeed(totalWords, duration);
    const completedAt = new Date().toISOString();

    setResult({
      category: selectedText.category,
      textTitle: selectedText.title,
      totalWords,
      totalCharacters,
      readingDurationSeconds: duration,
      readingSpeedWpm,
      fontSize,
      pausedCount,
      totalPausedSeconds,
    });
    setPhase("result");

    void saveExerciseResultSecure({
      exerciseType: "reading-speed-test",
      exerciseTitle: "Okuma Hızı Testi",
      durationSeconds: duration,
      correctCount: 0,
      wrongCount: 0,
      score: 0,
      successRate: 0,
      completedAt,
      details: {
        textId: selectedText.id,
        category: selectedText.category,
        ...(selectedText.readingLevel ? { readingLevel: selectedText.readingLevel } : {}),
        textTitle: selectedText.title,
        wordCount: totalWords,
        totalCharacters,
        readingSpeedWpm,
        fontSize,
        pausedCount,
        totalPausedSeconds,
        completedAt,
      },
    }).catch(() => undefined);
  };

  const readingStats = [
    { label: "Süre", value: formatDuration(elapsedSeconds), tone: "brand" as const },
    { label: "Kelime", value: totalWords },
    { label: "Hız", value: `${liveReadingSpeed} kelime/dk` },
    { label: "Font", value: `${fontSize}px` },
  ];

  const readyFooter = (
    <div className="grid gap-2 md:grid-cols-[1fr_1fr_140px_180px]">
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Kategori</span>
        <select value={resolvedCategory} onChange={(event) => handleCategoryChange(event.target.value)} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === ALL_CATEGORIES ? "Tümü" : category}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Metin</span>
        <select value={selectedTextId} onChange={(event) => handleTextChange(event.target.value)} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {availableTexts.map((text) => (
            <option key={text.id} value={text.id}>
              {getDisplayTextTitle(text.title)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Font</span>
        <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {FONT_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </label>
      <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleStartReading} disabled={!hasActiveTexts}>
        Başla
      </button>
    </div>
  );

  const readingFooter = (
    <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr]">
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Font</span>
        <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) as FontSizePx)} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {FONT_SIZE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </label>
      {phase === "paused" ? (
        <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResumeReading}>
          Devam Et
        </button>
      ) : (
        <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePauseReading}>
          Durdur
        </button>
      )}
      <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleFinishReading}>
        Okumayı Bitir
      </button>
    </div>
  );

  if (phase === "setup") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseIntro
          title="Okuma Hızı Testi"
          description="Bir metin seç, okumaya başla ve bitirdiğinde okuma hızını (kelime/dk) öğren."
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
          title="Okuma Hızı Testi"
          subtitle="Hazırlık modu"
          stats={[
            { label: "Kelime", value: totalWords },
            { label: "Karakter", value: totalCharacters },
            { label: "Font", value: `${fontSize}px` },
          ]}
          stageClassName="fx-slide-up flex min-h-[340px] w-full flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/92 px-4 py-5 text-center shadow-[0_14px_42px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[420px]"
          footer={readyFooter}
        >
          {isLoadingTexts ? (
            <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center ${styles.noticeInfo}`}>
              <p className="text-sm font-bold text-slate-900">Metinler yükleniyor...</p>
            </div>
          ) : textLoadError ? (
            <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center ${styles.noticeError}`}>
              <p className="text-sm font-bold text-red-900">{textLoadError}</p>
            </div>
          ) : hasActiveTexts ? (
            <>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700 ${styles.introEyebrow}`}>Hazırlık</p>
              <h2 className={`mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-4xl ${styles.introTitle}`}>Ayarlarını seç, hazır olduğunda başlat.</h2>
              <div className="mt-5 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2">
                <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 ${styles.infoTile}`}>
                  <p className={`text-xs text-slate-500 ${styles.infoTileLabel}`}>Kategori</p>
                  <p className={`mt-1 font-bold text-slate-900 ${styles.infoTileValue}`}>{selectedText.category}</p>
                </article>
                <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 ${styles.infoTile}`}>
                  <p className={`text-xs text-slate-500 ${styles.infoTileLabel}`}>Metin</p>
                  <p className={`mt-1 font-bold text-slate-900 ${styles.infoTileValue}`}>{selectedText.title}</p>
                </article>
              </div>
            </>
          ) : (
            <div className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center ${styles.noticeWarn}`}>
              <p className="text-sm font-bold text-amber-900">Metin Kütüphanesinde aktif metin bulunamadı.</p>
              {process.env.NODE_ENV !== "production" && textDiagnostics ? (
                <p className="text-xs text-amber-800">
                  Teşhis: Supabase {textDiagnostics.supabaseCount}, localStorage {textDiagnostics.localStorageCount}, filtre {textDiagnostics.activeFilter}, kaynak {textDiagnostics.source}
                  {textDiagnostics.error ? `, hata: ${textDiagnostics.error}` : ""}
                </p>
              ) : null}
              <p className="text-sm text-amber-800">
                {isTeacher
                  ? "Blok Okuma, Gölgeleme, Odaklı Okuma ve Anlama Testi için metin ekleyin."
                  : "Bu çalışma için henüz öğretmeniniz tarafından metin eklenmemiş."}
              </p>
              {isTeacher ? (
                <Link
                  href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-900/25 bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
                >
                  Metin Ekle
                </Link>
              ) : null}
            </div>
          )}
        </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "reading" || phase === "paused") {
    return (
      <div className={themeRootClassName}>
        <FullscreenExerciseShell
          title="Okuma Hızı Testi"
          subtitle={phase === "paused" ? "Çalışma duraklatıldı" : `${selectedText.category} - ${selectedText.title}`}
          stats={readingStats}
          stageClassName="fx-slide-up flex min-h-[430px] w-full flex-col rounded-3xl border border-white/80 bg-white/92 p-3 text-left shadow-[0_14px_42px_rgba(185,28,28,0.09)] backdrop-blur md:min-h-[500px] md:p-4 lg:min-h-[540px]"
          footer={readingFooter}
        >
          <div className="relative w-full">
            <article
              className={`h-[62vh] w-full overflow-y-auto rounded-2xl border border-red-100 bg-white px-4 py-5 text-slate-900 shadow-inner transition duration-200 md:h-[66vh] md:px-7 md:py-6 ${styles.readingArticle} ${
                phase === "paused" ? "select-none blur-sm" : ""
              }`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
            >
              <h2 className={`mb-4 text-[1.35em] font-black text-red-700 ${styles.readingTitle}`}>{selectedText.title}</h2>
              <p className="whitespace-pre-line">{selectedText.text}</p>
            </article>
            {phase === "paused" ? (
              <div className={`absolute inset-0 flex items-center justify-center rounded-2xl bg-white/65 px-4 text-center backdrop-blur-[2px] ${styles.pausedOverlay}`}>
                <p className={`max-w-md rounded-2xl border border-red-100 bg-white/95 px-5 py-4 text-sm font-bold text-red-700 shadow-sm ${styles.pausedText}`}>
                  Çalışma duraklatıldı. Devam Et düğmesine basınca kaldığın yerden devam edeceksin.
                </p>
              </div>
            ) : null}
          </div>
        </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className={themeRootClassName}>
        <section className={`idil-card mx-auto w-full max-w-5xl p-4 md:p-6 ${styles.resultCardOverride}`}>
          <h2 className="text-2xl font-bold">Okuma Hızı Testi Sonucu</h2>
          <p className={`mt-1 text-sm text-[var(--muted)] ${styles.resultMuted}`}>Okuma süresi ve okuma hızı kaydedildi.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Okuma Hızı</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.readingSpeedWpm}</p>
              <p className={`text-xs text-slate-500 ${styles.resultStatLabel}`}>kelime/dk</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Süre</p>
              <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{formatDuration(result.readingDurationSeconds)}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
              <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Kelime</p>
              <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{result.totalWords}</p>
            </article>
          </div>

          <div className={`mt-5 rounded-2xl border border-red-100 bg-white p-4 ${styles.resultDetailCard}`}>
            <h3 className={`font-extrabold text-red-700 ${styles.resultDetailHeading}`}>Okuma Bilgileri</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <p>Metin: <span className="text-slate-900">{result.textTitle}</span></p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={resetToReady}>
              Tekrar Ölç
            </button>
            <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={resetToReady}>
              Başka Metin Seç
            </button>
            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              style={TOUCH_STYLE}
              onClick={() => router.push("/sonuc?exerciseType=reading-speed-test")}
            >
              Ortak Sonuç Ekranı
            </button>
            <div className="flex justify-end">
              <ExerciseNavigationControls />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
