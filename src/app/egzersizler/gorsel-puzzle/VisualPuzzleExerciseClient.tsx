"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import {
  calculateNet,
  calculateScore,
  calculateSuccessRate,
  countCorrectlyPlacedPieces,
  generatePuzzlePieces,
  getGridByLevel,
  getNextLevel,
  getPuzzleImages,
  isPuzzleCompleted,
  shouldLevelUp,
  swapPuzzleTiles,
  type PuzzleImage,
  type PuzzleTile,
} from "@/lib/exercise-engine/visualPuzzle";
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
import styles from "@/components/exercises/visual-puzzle-theme.module.css";

type ExercisePhase = "setup" | "ready" | "playing" | "paused" | "completed";
type FeedbackTone = "ok" | "bad" | "info";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

type VisualPuzzleResult = {
  correctCount: number;
  wrongCount: number;
  totalMoves: number;
  net: number;
  score: number;
  successRate: number;
  reachedLevel: number;
  elapsedSeconds: number;
  levelUpCount: number;
  completedRounds: number;
  imageChangeCount: number;
};

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];
const PUZZLE_IMAGES = getPuzzleImages();

const ACTION_BUTTON_CLASS =
  "relative z-50 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-4 text-base font-bold text-white shadow-md shadow-red-200 transition active:scale-[0.98] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60";

const TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getFeedbackClass(tone: FeedbackTone): string {
  if (tone === "ok") {
    return `border-green-200 bg-green-50 text-green-800 ${styles.feedbackOk}`;
  }

  if (tone === "bad") {
    return `border-red-200 bg-red-50 text-red-800 ${styles.feedbackBad}`;
  }

  return `border-blue-200 bg-blue-50 text-blue-800 ${styles.feedbackInfo}`;
}

function getImageById(imageId: string): PuzzleImage {
  return PUZZLE_IMAGES.find((image) => image.id === imageId) ?? PUZZLE_IMAGES[0];
}

function getTileBackgroundStyle(tile: PuzzleTile, rows: number, cols: number): CSSProperties {
  const x = cols <= 1 ? 0 : (tile.col / (cols - 1)) * 100;
  const y = rows <= 1 ? 0 : (tile.row / (rows - 1)) * 100;

  return {
    backgroundImage: `url(${tile.imageSrc})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: "no-repeat",
  };
}

export function VisualPuzzleExerciseClient() {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");
  const timerRef = useRef<number | null>(null);
  const feedbackRef = useRef<number | null>(null);
  const hasSavedResultRef = useRef(false);

  const [phase, setPhase] = useState<ExercisePhase>("setup");
  const [startLevel, setStartLevel] = useState(1);
  const [level, setLevel] = useState(1);
  const [selectedImageId, setSelectedImageId] = useState(PUZZLE_IMAGES[0].id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [helpMode, setHelpMode] = useState(true);
  const [tiles, setTiles] = useState<PuzzleTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [levelCorrectCount, setLevelCorrectCount] = useState(0);
  const [levelWrongCount, setLevelWrongCount] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [completedImages, setCompletedImages] = useState<string[]>([]);
  const [imageChangeCount, setImageChangeCount] = useState(0);
  const [usedImageTitles, setUsedImageTitles] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [changedTileIds, setChangedTileIds] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [result, setResult] = useState<VisualPuzzleResult | null>(null);

  const selectedImage = PUZZLE_IMAGES[currentImageIndex] ?? getImageById(selectedImageId);
  const grid = getGridByLevel(level);
  const startGrid = getGridByLevel(startLevel);
  const totalPieces = grid.rows * grid.cols;
  const correctPlacedCount = countCorrectlyPlacedPieces(tiles);
  const net = calculateNet(levelCorrectCount, levelWrongCount);

  const orderedTiles = useMemo(() => {
    return [...tiles].sort((a, b) => a.currentIndex - b.currentIndex);
  }, [tiles]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackRef.current !== null) {
      window.clearTimeout(feedbackRef.current);
      feedbackRef.current = null;
    }
  }, []);

  const createPuzzle = useCallback((nextLevel: number, imageIndex = currentImageIndex) => {
    const safeImageIndex = imageIndex >= 0 && imageIndex < PUZZLE_IMAGES.length ? imageIndex : 0;
    const image = PUZZLE_IMAGES[safeImageIndex] ?? PUZZLE_IMAGES[0];
    setCurrentImageIndex(safeImageIndex);
    setSelectedImageId(image.id);
    setTiles(generatePuzzlePieces(image, nextLevel));
    setSelectedTileId(null);
    setChangedTileIds([]);
    setIsResolving(false);
  }, [currentImageIndex]);

  const resetToReady = useCallback((nextStartLevel = startLevel, imageIndex = currentImageIndex) => {
    clearTimer();
    clearFeedbackTimer();
    hasSavedResultRef.current = false;
    setLevel(nextStartLevel);
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setTotalMoves(0);
    setLevelUpCount(0);
    setCompletedRounds(0);
    setCompletedImages([]);
    setImageChangeCount(0);
    setUsedImageTitles([]);
    setFeedback(null);
    setResult(null);
    createPuzzle(nextStartLevel, imageIndex);
    setPhase("ready");
  }, [clearFeedbackTimer, clearTimer, createPuzzle, currentImageIndex, startLevel]);

  const handleIntroStart = () => {
    resetToReady();
  };

  const handleStart = () => {
    hasSavedResultRef.current = false;
    setLevel(startLevel);
    setElapsedSeconds(0);
    setCorrectCount(0);
    setWrongCount(0);
    setLevelCorrectCount(0);
    setLevelWrongCount(0);
    setTotalMoves(0);
    setLevelUpCount(0);
    setCompletedRounds(0);
    setCompletedImages([]);
    setImageChangeCount(0);
    setUsedImageTitles([selectedImage.title]);
    setFeedback(null);
    setResult(null);
    createPuzzle(startLevel, currentImageIndex);
    setPhase("playing");
  };

  const getNextImageIndex = useCallback((fromIndex: number) => {
    if (PUZZLE_IMAGES.length <= 1) {
      return fromIndex;
    }

    return (fromIndex + 1) % PUZZLE_IMAGES.length;
  }, []);

  const scheduleNewPuzzle = useCallback((nextLevel: number, message: string, tone: FeedbackTone = "info", nextImageIndex = getNextImageIndex(currentImageIndex)) => {
    const nextImage = PUZZLE_IMAGES[nextImageIndex] ?? PUZZLE_IMAGES[0];
    setIsResolving(true);
    setFeedback({ tone, message });
    feedbackRef.current = window.setTimeout(() => {
      createPuzzle(nextLevel, nextImageIndex);
      setImageChangeCount((prev) => prev + 1);
      setUsedImageTitles((prev) => [...prev, nextImage.title]);
      setFeedback({ tone: "info", message: `Yeni gorsel: ${nextImage.title}` });
      setIsResolving(false);
      feedbackRef.current = window.setTimeout(() => {
        setFeedback(null);
      }, 900);
    }, 1200);
  }, [createPuzzle, currentImageIndex, getNextImageIndex]);

  const handleTileClick = (tile: PuzzleTile) => {
    if (phase !== "playing" || isResolving) {
      return;
    }

    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const beforeCorrect = countCorrectlyPlacedPieces(tiles);
    const swappedTiles = swapPuzzleTiles(tiles, selectedTileId, tile.id);
    const afterCorrect = countCorrectlyPlacedPieces(swappedTiles);
    const nextTotalMoves = totalMoves + 1;
    const moveHelped = afterCorrect > beforeCorrect;
    const nextCorrect = correctCount + (moveHelped ? 1 : 0);
    const nextWrong = wrongCount + (moveHelped ? 0 : 1);
    const nextLevelCorrect = levelCorrectCount + (moveHelped ? 1 : 0);
    const nextLevelWrong = levelWrongCount + (moveHelped ? 0 : 1);
    const nextNet = calculateNet(nextLevelCorrect, nextLevelWrong);
    const completed = isPuzzleCompleted(swappedTiles);
    const selectedTile = tiles.find((item) => item.id === selectedTileId);
    const changedIds = selectedTile ? [selectedTile.id, tile.id] : [tile.id];

    clearFeedbackTimer();
    setTiles(swappedTiles);
    setSelectedTileId(null);
    setChangedTileIds(changedIds);
    setTotalMoves(nextTotalMoves);
    setCorrectCount(nextCorrect);
    setWrongCount(nextWrong);
    setLevelCorrectCount(nextLevelCorrect);
    setLevelWrongCount(nextLevelWrong);
    setFeedback({
      tone: moveHelped ? "ok" : "bad",
      message: moveHelped ? "Iyi hamle! Resim tamamlanmaya yaklasti." : "Bu hamle resmi ilerletmedi. Tekrar dene.",
    });

    feedbackRef.current = window.setTimeout(() => {
      setChangedTileIds([]);

      if (shouldLevelUp(nextNet)) {
        const upgradedLevel = getNextLevel(level);
        const didLevelUp = upgradedLevel > level;
        const nextImageIndex = getNextImageIndex(currentImageIndex);
        setLevel(upgradedLevel);
        setLevelCorrectCount(0);
        setLevelWrongCount(0);
        setLevelUpCount((prev) => prev + (didLevelUp ? 1 : 0));
        if (completed) {
          setCompletedRounds((prev) => prev + 1);
          setCompletedImages((prev) => [...prev, selectedImage.title]);
        }
        scheduleNewPuzzle(
          upgradedLevel,
          didLevelUp ? `Tebrikler! Seviye ${upgradedLevel}'ye gectin. Yeni resim geliyor...` : "Tebrikler! En yuksek seviyede devam ediyorsun. Yeni resim geliyor...",
          "info",
          nextImageIndex,
        );
        return;
      }

      if (completed) {
        setCompletedRounds((prev) => prev + 1);
        setCompletedImages((prev) => [...prev, selectedImage.title]);
        scheduleNewPuzzle(level, "Tebrikler! Puzzle tamamlandi. Yeni resim hazirlaniyor...", "ok", getNextImageIndex(currentImageIndex));
        return;
      }

      setFeedback(null);
    }, 700);
  };

  useEffect(() => {
    if (phase !== "playing") {
      clearTimer();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearTimer();
  }, [clearTimer, phase]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearFeedbackTimer();
    };
  }, [clearFeedbackTimer, clearTimer]);

  const handlePause = () => {
    if (phase !== "playing" || isResolving) {
      return;
    }

    clearTimer();
    clearFeedbackTimer();
    setChangedTileIds([]);
    setIsResolving(false);
    setPhase("paused");
  };

  const handleResume = () => {
    if (phase !== "paused") {
      return;
    }

    setPhase("playing");
  };

  const finishExercise = () => {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    clearTimer();
    clearFeedbackTimer();

    const durationSeconds = Math.max(1, elapsedSeconds);
    const score = calculateScore(correctCount, wrongCount);
    const successRate = calculateSuccessRate(correctCount, wrongCount);
    const finalNet = calculateNet(levelCorrectCount, levelWrongCount);
    const student = getCurrentStudent();

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "visual-puzzle",
      exerciseTitle: "Gorsel Puzzle Calismasi",
      durationSeconds,
      correctCount,
      wrongCount,
      score,
      successRate,
      details: {
        startLevel,
        reachedLevel: level,
        gridRows: grid.rows,
        gridCols: grid.cols,
        totalPieces,
        totalMoves,
        correctMoves: correctCount,
        wrongMoves: wrongCount,
        net: finalNet,
        elapsedSeconds: durationSeconds,
        levelUpCount,
        completedRounds,
        completedImages,
        imageChangeCount,
        lastImageTitle: selectedImage.title,
        usedImageTitles,
        selectedImage: selectedImage.title,
        helpMode,
        scoreRule: "correctCount * 10 - wrongCount * 5",
        maxLevel: 5,
      },
    });

    setResult({
      correctCount,
      wrongCount,
      totalMoves,
      net: finalNet,
      score,
      successRate,
      reachedLevel: level,
      elapsedSeconds: durationSeconds,
      levelUpCount,
      completedRounds,
      imageChangeCount,
    });
    setPhase("completed");
  };

  const handleStartLevelChange = (nextLevel: number) => {
    setStartLevel(nextLevel);
    resetToReady(nextLevel, currentImageIndex);
  };

  const handleImageChange = (imageId: string) => {
    const imageIndex = PUZZLE_IMAGES.findIndex((image) => image.id === imageId);
    const nextImageIndex = imageIndex >= 0 ? imageIndex : 0;
    setSelectedImageId(imageId);
    setCurrentImageIndex(nextImageIndex);
    resetToReady(startLevel, nextImageIndex);
  };

  const stats = [
    { label: "Dogru", value: levelCorrectCount, tone: "ok" as const },
    { label: "Yanlis", value: levelWrongCount, tone: "bad" as const },
    { label: "Net", value: net, tone: "brand" as const },
    { label: "Seviye", value: level },
    { label: "Hamle", value: totalMoves },
    { label: "Tamamlanma", value: `${correctPlacedCount}/${totalPieces}` },
    { label: "Sure", value: formatElapsed(elapsedSeconds), tone: "brand" as const },
  ];

  const footerControls = (
    <div className="grid gap-2 lg:grid-cols-9">
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Seviye</span>
        <select value={startLevel} onChange={(event) => handleStartLevelChange(Number(event.target.value))} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {LEVEL_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Gorsel</span>
        <select value={selectedImageId} onChange={(event) => handleImageChange(event.target.value)} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          {PUZZLE_IMAGES.map((image) => (
            <option key={image.id} value={image.id}>{image.title}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${styles.settingsLabel}`}>Yardim</span>
        <select value={helpMode ? "on" : "off"} onChange={(event) => setHelpMode(event.target.value === "on")} className={`${FULLSCREEN_SELECT_CLASS} ${styles.selectOverride}`}>
          <option value="on">Acik</option>
          <option value="off">Kapali</option>
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-3 lg:col-span-5">
        {phase === "ready" ? (
          <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleStart}>
            Baslat
          </button>
        ) : (
          <>
            {phase === "paused" ? (
              <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handleResume}>
                Devam Et
              </button>
            ) : (
              <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={handlePause} disabled={phase !== "playing" || isResolving}>
                Duraklat
              </button>
            )}
            <button type="button" className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={() => resetToReady()}>
              Yeniden Baslat
            </button>
            <button type="button" className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} ${styles.primaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE} onClick={finishExercise}>
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
          title="Gorsel Puzzle Calismasi"
          description="Karismis kareleri birbiriyle degistirerek resmi tamamla; gorsel dikkatini, parca-butun algini ve odagini gelistir."
          buttonLabel="Egitime Basla"
          onStart={handleIntroStart}
        />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={themeRootClassName}>
      <FullscreenExerciseShell
        title="Gorsel Puzzle Calismasi"
        subtitle="Hazirlik modu"
        stats={stats}
        stageClassName="fx-slide-up flex min-h-[340px] w-full flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/92 px-4 py-5 text-center shadow-[0_14px_42px_rgba(185,28,28,0.1)] backdrop-blur md:min-h-[420px]"
        footer={footerControls}
      >
        <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700 ${styles.introEyebrow}`}>Hazirlik</p>
        <h2 className={`mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl ${styles.introTitle}`}>Resmi incele, hazir olunca baslat.</h2>
        <p className={`mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 md:text-base ${styles.introBody}`}>
          Baslat dediginde bu gorsel {startGrid.cols}x{startGrid.rows} kareye ayrilip karistirilacak. Iki kare secerek yerlerini degistireceksin.
        </p>

        <div className="mt-5 grid w-full max-w-4xl gap-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
          <div
            className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
            style={{ aspectRatio: `${startGrid.cols} / ${startGrid.rows}` }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${selectedImage.src})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}
              aria-label={selectedImage.title}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-left md:grid-cols-1">
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-3 ${styles.infoTile}`}>
              <p className={`text-xs font-bold text-slate-500 ${styles.infoTileLabel}`}>Grid</p>
              <p className={`mt-1 text-2xl font-black text-red-700 ${styles.infoTileValue}`}>{startGrid.cols}x{startGrid.rows}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-3 ${styles.infoTile}`}>
              <p className={`text-xs font-bold text-slate-500 ${styles.infoTileLabel}`}>Parca</p>
              <p className={`mt-1 text-2xl font-black text-red-700 ${styles.infoTileValue}`}>{startGrid.rows * startGrid.cols}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-3 ${styles.infoTile}`}>
              <p className={`text-xs font-bold text-slate-500 ${styles.infoTileLabel}`}>Gorsel</p>
              <p className={`mt-1 text-lg font-black text-red-700 ${styles.infoTileValue}`}>{selectedImage.title}</p>
            </article>
            <article className={`rounded-2xl border border-red-100 bg-red-50 p-3 ${styles.infoTile}`}>
              <p className={`text-xs font-bold text-slate-500 ${styles.infoTileLabel}`}>Hedef Net</p>
              <p className={`mt-1 text-2xl font-black text-red-700 ${styles.infoTileValue}`}>10</p>
            </article>
          </div>
        </div>
      </FullscreenExerciseShell>
      </div>
    );
  }

  if (phase === "completed" && result) {
    return (
      <div className={themeRootClassName}>
      <section className={`idil-card mx-auto w-full max-w-5xl p-4 md:p-6 ${styles.resultCardOverride}`}>
        <h2 className={`text-2xl font-bold ${styles.resultTitle}`}>Gorsel Puzzle Sonucu</h2>
        <p className={`mt-1 text-sm text-[var(--muted)] ${styles.resultMuted}`}>Calisma sonucu kaydedildi.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Puan</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--brand)]">{result.score}</p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Basari</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{result.successRate}%</p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Net</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{result.net}</p>
          </article>
          <article className={`rounded-2xl border border-red-100 bg-red-50 p-4 text-center ${styles.resultStatTile}`}>
            <p className={`text-xs uppercase tracking-[0.1em] text-slate-500 ${styles.resultStatLabel}`}>Sure</p>
            <p className={`mt-2 text-3xl font-extrabold text-slate-900 ${styles.resultStatValue}`}>{formatElapsed(result.elapsedSeconds)}</p>
          </article>
        </div>

        <div className={`mt-6 rounded-2xl border border-red-100 bg-white p-4 text-sm font-semibold ${styles.resultDetailCard}`}>
          <p>Ulasilan Seviye: <span className="text-slate-900">{result.reachedLevel}</span></p>
          <p className="mt-1">Toplam Hamle: <span className="text-slate-900">{result.totalMoves}</span></p>
          <p className="mt-1">Dogru Hamle: <span className="text-[var(--ok)]">{result.correctCount}</span></p>
          <p className="mt-1">Yanlis Hamle: <span className="text-[var(--bad)]">{result.wrongCount}</span></p>
          <p className="mt-1">Tamamlanan Puzzle: <span className="text-slate-900">{result.completedRounds}</span></p>
          <p className="mt-1">Seviye Atlama: <span className="text-slate-900">{result.levelUpCount}</span></p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" className={ACTION_BUTTON_CLASS} style={TOUCH_STYLE} onClick={() => resetToReady()}>
            Yeniden Baslat
          </button>
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            style={TOUCH_STYLE}
            onClick={() => router.push(`/sonuc?exerciseType=visual-puzzle&correct=${result.correctCount}&wrong=${result.wrongCount}&successRate=${result.successRate}&score=${result.score}`)}
          >
            Ortak Sonuc Ekrani
          </button>
          <div className="flex justify-end sm:col-span-3">
            <ExerciseNavigationControls />
          </div>
        </div>
      </section>
      </div>
    );
  }

  return (
    <div className={themeRootClassName}>
    <FullscreenExerciseShell
      title="Gorsel Puzzle Calismasi"
      subtitle={phase === "paused" ? "Duraklatildi" : "Iki kare secerek yerlerini degistir."}
      stats={stats}
      finishButton={
        <button type="button" onClick={finishExercise} className={`min-h-[44px] rounded-full border border-red-200 bg-white/95 px-4 text-sm font-bold text-red-700 shadow-sm shadow-red-100/70 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md ${styles.secondaryButtonOverride}`} style={FULLSCREEN_TOUCH_STYLE}>
          Bitir
        </button>
      }
      stageClassName="fx-slide-up flex min-h-[430px] w-full flex-col rounded-3xl border border-white/80 bg-white/94 p-3 text-center shadow-[0_14px_42px_rgba(185,28,28,0.11)] backdrop-blur md:min-h-[500px] md:p-4 lg:min-h-[540px]"
      footer={footerControls}
    >
      <div className="flex w-full flex-1 flex-col gap-3">
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left ${styles.instructionBanner}`}>
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.16em] text-red-700 ${styles.instructionEyebrow}`}>YONERGE</p>
            <p className={`mt-1 text-xl font-black text-slate-950 md:text-2xl ${styles.instructionTitle}`}>Iki kare secerek yerlerini degistir.</p>
            <p className={`mt-1 text-sm font-semibold text-slate-500 ${styles.instructionBody}`}>Resmi tamamlamak icin karisan kareleri dogru siraya getir.</p>
          </div>
          {helpMode ? (
            <div className={`flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2 text-left shadow-sm ${styles.helpPreview}`}>
              <div
                className="h-16 w-20 overflow-hidden rounded-xl border border-red-100 bg-white"
                style={{
                  backgroundImage: `url(${selectedImage.src})`,
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div>
                <p className={`text-xs font-bold text-slate-500 ${styles.helpPreviewLabel}`}>Orijinal Gorsel</p>
                <p className={`text-sm font-black text-red-700 ${styles.helpPreviewValue}`}>{selectedImage.title}</p>
              </div>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${getFeedbackClass(feedback.tone)}`}>
            {feedback.message}
          </div>
        ) : null}

        <div className={`relative flex flex-1 items-center justify-center rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f0_100%)] p-2 shadow-inner md:p-4 ${phase === "paused" ? "blur-sm" : ""}`}>
          <div
            className="grid w-full max-w-[640px] overflow-hidden rounded-[22px] border-4 border-white bg-white shadow-[0_18px_42px_rgba(15,23,42,0.15)]"
            style={{
              aspectRatio: `${grid.cols} / ${grid.rows}`,
              gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
              gap: "3px",
            }}
          >
            {orderedTiles.map((tile) => {
              const isSelected = selectedTileId === tile.id;
              const isCorrect = tile.correctIndex === tile.currentIndex;
              const isChanged = changedTileIds.includes(tile.id);

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClick(tile)}
                  disabled={phase !== "playing" || isResolving}
                  className={`relative min-h-[64px] overflow-hidden bg-white transition duration-200 active:scale-[0.98] disabled:cursor-default ${
                    isSelected ? "z-10 scale-[1.03] ring-4 ring-sky-400 shadow-[0_0_24px_rgba(14,165,233,0.45)]" : ""
                  } ${isChanged ? "animate-pulse" : ""} ${isCorrect ? "outline outline-1 outline-green-300/70" : ""}`}
                  style={{ ...FULLSCREEN_TOUCH_STYLE, ...getTileBackgroundStyle(tile, grid.rows, grid.cols) }}
                  aria-label={`Puzzle karesi ${tile.correctIndex + 1}`}
                >
                  <span className="absolute inset-0 bg-white/0 transition hover:bg-white/10" />
                </button>
              );
            })}
          </div>

          {phase === "paused" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[26px] bg-white/60 backdrop-blur-[2px]">
              <p className="rounded-2xl border border-red-100 bg-white px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
                Duraklatildi. Devam Et ile puzzle kaldigi yerden surer.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </FullscreenExerciseShell>
    </div>
  );
}
