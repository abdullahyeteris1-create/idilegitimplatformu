import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess, type StudentAccessFailure } from "@/lib/auth/verifyStudentAccess";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { getAssignmentItemById, getDailyAssignmentById } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordStudentResultAndAwardXp, getStudentXpSnapshotByStudentId } from "@/lib/xp/xpRepository";
import { exerciseTypeAwardsXp, getExerciseXpAward, getExerciseXpEventType } from "@/lib/xp/xpPolicy";
import { recordStudentResultWithoutXp } from "@/lib/results/secureResultRepository";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const IDENTITY_QUERY_KEYS = new Set(["studentid", "student_id", "username", "studentname", "student_name"]);
const FORBIDDEN_BODY_KEYS = new Set(["studentid", "student_id", "studentname", "student_name", "username", "userid", "user_id"]);
const ALLOWED_BODY_KEYS = new Set([
  "exerciseType",
  "exerciseTitle",
  "score",
  "successRate",
  "correct",
  "wrong",
  "correctCount",
  "wrongCount",
  "durationSeconds",
  "date",
  "completedAt",
  "submissionKey",
  "assignmentItemId",
  "details",
]);
const MAX_SCORE = 1_000_000;
const MAX_ANSWER_COUNT = 100_000;
const MAX_DURATION_SECONDS = 21_600;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_DETAILS_BYTES = 8 * 1024;
const FORBIDDEN_DETAIL_KEYS = new Set([
  "__proto__", "constructor", "prototype",
  "duration_seconds",
  "assignmentitemid", "assignment_item_id",
  "studentid", "student_id", "resultid", "id",
]);

type DetailRule = {
  type: "boolean" | "integer" | "number" | "string";
  min?: number;
  max?: number;
  maxLength?: number;
  values?: readonly string[];
};

const DETAIL_SCHEMAS: Record<string, Record<string, DetailRule>> = {
  tachistoscope: {
    speedMs: { type: "integer", min: 50, max: 5_000 },
    level: { type: "integer", min: 1, max: 15 },
    contentType: { type: "string", values: ["letter", "number", "mixed"] },
    mode: { type: "string", values: ["automatic", "manual"] },
    net: { type: "integer", min: -100_000, max: 100_000 },
    reachedLevel: { type: "integer", min: 1, max: 15 },
    autoLevelUpCount: { type: "integer", min: 0, max: 15 },
  },
  "similar-words": {
    boxCount: { type: "integer", min: 1, max: 100 },
    targetDifferentCount: { type: "integer", min: 0, max: 100 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    totalClicks: { type: "integer", min: 0, max: 100_000 },
    scoreRule: { type: "string", maxLength: 120 },
  },
  "word-race": {
    // "attention": 2026-08-04 oncesi kayitlar; guncel kategori "word-games".
    category: { type: "string", values: ["attention", "word-games"] },
    reachedLevel: { type: "integer", min: 1, max: 5 },
    reachedSpeedMs: { type: "integer", min: 1_000, max: 5_000 },
    startingLevel: { type: "integer", min: 1, max: 5 },
    startingSpeedMs: { type: "integer", min: 1_000, max: 5_000 },
    carId: { type: "string", values: ["spor", "viper", "taksi", "polis", "minivan"] },
    completionReason: { type: "string", values: ["wrong_limit", "all_levels_completed", "user_exit"] },
    completedSpeedTiers: { type: "integer", min: 0, max: 7 },
    maxWrong: { type: "integer", min: 10, max: 10 },
    lanes: { type: "integer", min: 2, max: 8 },
  },
  "word-finding": {
    targetWordsPerText: { type: "integer", min: 1, max: 100 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    totalClicks: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    scoreRule: { type: "string", maxLength: 120 },
  },
  "catch-same": {
    category: { type: "string", maxLength: 80 },
    reason: { type: "string", values: ["finished", "manual"] },
    mode: { type: "string", values: ["word", "letter", "symbol", "number"] },
    speed: { type: "integer", min: 50, max: 10_000 },
    selectedDuration: { type: "integer", min: 1, max: 21_600 },
    wrong: { type: "integer", min: 0, max: 100_000 },
    missed: { type: "integer", min: 0, max: 100_000 },
    roundCount: { type: "integer", min: 0, max: 100_000 },
  },
  "letter-number-counting-focus": {
    mode: { type: "string", values: ["letters", "numbers", "mixed"] },
    startLevel: { type: "integer", min: 1, max: 4 },
    reachedLevel: { type: "integer", min: 1, max: 4 },
    difficulty: { type: "string", values: ["normal", "hard"] },
    speedSeconds: { type: "number", min: 0.1, max: 60 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    correctCount: { type: "integer", min: 0, max: 100_000 },
    wrongCount: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    unansweredCount: { type: "integer", min: 0, max: 100_000 },
    levelUpCount: { type: "integer", min: 0, max: 4 },
    scoreRule: { type: "string", maxLength: 120 },
    maxLevel: { type: "integer", min: 1, max: 4 },
  },
  "square-vision": {
    durationMinutes: { type: "integer", min: 1, max: 360 },
    gridSize: { type: "integer", min: 2, max: 20 },
    level: { type: "integer", min: 1, max: 20 },
    soundEnabled: { type: "boolean" },
    answeredCount: { type: "integer", min: 0, max: 100_000 },
  },
  "eye-columns": {
    durationMinutes: { type: "integer", min: 1, max: 5 },
    jumpSpeed: { type: "integer", min: 50, max: 5_000 },
    intervalMs: { type: "integer", min: 50, max: 5_000 },
    columnCount: { type: "integer", min: 3, max: 7 },
    flowDirection: { type: "string", values: ["column", "row"] },
    completedSteps: { type: "integer", min: 0, max: 100_000 },
    totalSteps: { type: "integer", min: 0, max: 100_000 },
    visibleWordCount: { type: "integer", min: 0, max: 1_000 },
    allWordsUnique: { type: "boolean" },
  },
  "reading-speed-test": {
    textId: { type: "string", maxLength: 128 },
    textTitle: { type: "string", maxLength: 160 },
    wordCount: { type: "integer", min: 0, max: 1_000_000 },
    readingSpeedWpm: { type: "number", min: 0, max: 1_000_000 },
    category: { type: "string", maxLength: 120 },
    readingLevel: { type: "string", maxLength: 120 },
    totalCharacters: { type: "integer", min: 0, max: 10_000_000 },
    fontSize: { type: "integer", min: 12, max: 28 },
    pausedCount: { type: "integer", min: 0, max: 100_000 },
    totalPausedSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    completedAt: { type: "string", maxLength: 40 },
  },
  "thirteen-point-emoji-tracking": {
    durationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    speed: { type: "integer", min: 300, max: 5_000 },
    jumpCount: { type: "integer", min: 0, max: 100_000 },
    emoji: { type: "string", maxLength: 8 },
    emojiMode: { type: "string", values: ["fixed", "random"] },
    movementPattern: { type: "string", values: ["sequential", "reverse", "random", "center-out", "outer-center"] },
    soundEnabled: { type: "boolean" },
  },
  "growing-shapes-hexagon": {
    durationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    speedMode: { type: "string", values: ["fixed", "variable"] },
    jumpDurationMs: { type: "integer", min: 100, max: 1000 },
    jumpEndDurationMs: { type: "integer", min: 50, max: 300 },
    clearMode: { type: "string", values: ["without-clearing", "with-clearing"] },
    showMetronome: { type: "boolean" },
    showFocusPoint: { type: "boolean" },
    showCorners: { type: "boolean" },
    shapesDisplayed: { type: "integer", min: 0, max: 100_000 },
    completedCycles: { type: "integer", min: 0, max: 100_000 },
    averageJumpDurationMs: { type: "integer", min: 50, max: 5_000 },
    reason: { type: "string", values: ["natural", "manual"] },
  },
  // --- XP kazandirmayan turler (bkz. src/lib/xp/xpPolicy.ts) ---
  hangman: {
    category: { type: "string", maxLength: 80 },
    reason: { type: "string", values: ["completed", "manual"] },
    status: { type: "string", values: ["won", "lost"] },
    maxWrongGuesses: { type: "integer", min: 1, max: 40 },
    // "Egzersizi Bitir" akisinda kalan tum yanlis harfler eklendigi icin
    // negatif deger normaldir.
    remaining: { type: "integer", min: -60, max: 40 },
    guessedLetters: { type: "string", maxLength: 120 },
  },
  "word-guess": {
    category: { type: "string", maxLength: 80 },
    status: { type: "string", values: ["playing", "won", "lost"] },
    reason: { type: "string", values: ["completed", "manual"] },
    wordLength: { type: "integer", min: 4, max: 9 },
    maxAttempts: { type: "integer", min: 1, max: 20 },
    attemptsUsed: { type: "integer", min: 0, max: 20 },
    guessedWords: { type: "string", maxLength: 200 },
  },
  "attention-maze": {
    startLevel: { type: "integer", min: 1, max: 5 },
    reachedLevel: { type: "integer", min: 1, max: 5 },
    selectedDuration: { type: "integer", min: 1, max: 120 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    correctCount: { type: "integer", min: 0, max: 100_000 },
    wrongCount: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    levelNet: { type: "integer", min: -100_000, max: 100_000 },
    levelUpCount: { type: "integer", min: 0, max: 5 },
    maxLevel: { type: "integer", min: 1, max: 5 },
    scoreRule: { type: "string", maxLength: 120 },
  },
  "visual-puzzle": {
    startLevel: { type: "integer", min: 1, max: 5 },
    reachedLevel: { type: "integer", min: 1, max: 5 },
    gridRows: { type: "integer", min: 2, max: 4 },
    gridCols: { type: "integer", min: 2, max: 4 },
    totalPieces: { type: "integer", min: 4, max: 16 },
    totalMoves: { type: "integer", min: 0, max: 100_000 },
    correctMoves: { type: "integer", min: 0, max: 100_000 },
    wrongMoves: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    elapsedSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    levelUpCount: { type: "integer", min: 0, max: 5 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    completedImages: { type: "string", maxLength: 200 },
    imageChangeCount: { type: "integer", min: 0, max: 100_000 },
    lastImageTitle: { type: "string", maxLength: 160 },
    usedImageTitles: { type: "string", maxLength: 200 },
    selectedImage: { type: "string", maxLength: 160 },
    helpMode: { type: "boolean" },
    scoreRule: { type: "string", maxLength: 120 },
    maxLevel: { type: "integer", min: 1, max: 5 },
  },
  "focused-reading": {
    category: { type: "string", maxLength: 80 },
    textTitle: { type: "string", maxLength: 160 },
    totalWords: { type: "integer", min: 0, max: 1_000_000 },
    totalCharacters: { type: "integer", min: 0, max: 10_000_000 },
    blockSize: { type: "integer", min: 1, max: 5 },
    speedMode: { type: "string", values: ["interval", "wpm"] },
    intervalMs: { type: "integer", min: 50, max: 60_000 },
    wordsPerMinute: { type: "integer", min: 1, max: 10_000 },
    fontSize: { type: "integer", min: 20, max: 56 },
    completedBlocks: { type: "integer", min: 0, max: 1_000_000 },
    totalBlocks: { type: "integer", min: 0, max: 1_000_000 },
    progressPercent: { type: "integer", min: 0, max: 100 },
    completedPercent: { type: "integer", min: 0, max: 100 },
    // Gercek sure degil, metin uzunlugu x atlama hizindan turetilen TAHMIN;
    // uzun metin + yavas hizda 6 saatlik gercek-sure tavanini asabilir.
    estimatedDurationSeconds: { type: "integer", min: 0, max: 10_000_000 },
    actualDurationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
  },
  "color-match": {},
  "memory-game": {
    gridRows: { type: "integer", min: 5, max: 10 },
    gridCols: { type: "integer", min: 5, max: 10 },
    totalBoxes: { type: "integer", min: 25, max: 100 },
    gridLabel: { type: "string", values: ["5 x 5", "5 x 10", "10 x 10"] },
    reachedLevel: { type: "integer", min: 2, max: 10 },
    levelCorrectCount: { type: "integer", min: 0, max: 100_000 },
    levelWrongCount: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    displayMs: { type: "integer", min: 500, max: 2_000 },
    levelUpCount: { type: "integer", min: 0, max: 10 },
    roundNumber: { type: "integer", min: 1, max: 100_000 },
    rule: { type: "string", maxLength: 200 },
  },
  "card-matching": {
    startLevel: { type: "integer", min: 1, max: 5 },
    reachedLevel: { type: "integer", min: 1, max: 5 },
    pairCount: { type: "integer", min: 4, max: 12 },
    totalCards: { type: "integer", min: 8, max: 24 },
    totalMoves: { type: "integer", min: 0, max: 100_000 },
    correctMatches: { type: "integer", min: 0, max: 100_000 },
    wrongMatches: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    elapsedSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    levelUpCount: { type: "integer", min: 0, max: 5 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    previewDurationMs: { type: "integer", min: 2_000, max: 10_000 },
    flipBackDelayMs: { type: "integer", min: 500, max: 2_000 },
    theme: { type: "string", values: ["Canlı Çocuk Görselleri"] },
    scoreRule: { type: "string", maxLength: 120 },
    maxLevel: { type: "integer", min: 1, max: 5 },
  },
  "tatli-dukkani": {
    reachedLevel: { type: "integer", min: 1, max: 10 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    totalCorrect: { type: "integer", min: 0, max: 100_000 },
    maxCombo: { type: "integer", min: 0, max: 100_000 },
    livesRemaining: { type: "integer", min: 0, max: 3 },
    completionReason: { type: "string", values: ["game-over", "manual"] },
  },
  "kayip-nesne": {
    reachedLevel: { type: "integer", min: 1, max: 1000 },
    totalRounds: { type: "integer", min: 1, max: 100000 },
    totalCorrect: { type: "integer", min: 0, max: 100000 },
    maxStreak: { type: "integer", min: 0, max: 100000 },
    livesRemaining: { type: "integer", min: 0, max: 3 },
    completionReason: { type: "string", values: ["game-over", "manual"] },
  },
  "saray-dedektifi": {
    mode: { type: "string", values: ["baslangic", "gelisen", "ileri", "usta", "uzman"] },
    speed: { type: "string", values: ["rahat", "normal", "hizli", "cokhizli"] },
    completedCases: { type: "integer", min: 0, max: 1000 },
    totalQuestions: { type: "integer", min: 1, max: 100000 },
    totalCorrect: { type: "integer", min: 0, max: 100000 },
    livesRemaining: { type: "integer", min: 0, max: 10 },
    completionReason: { type: "string", values: ["game-over", "completed"] },
  },
  "cevresel-gorus": {
    startLevel: { type: "integer", min: 1, max: 5 },
    reachedLevel: { type: "integer", min: 1, max: 5 },
    completedLevels: { type: "integer", min: 0, max: 5 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    totalCorrect: { type: "integer", min: 0, max: 100_000 },
    maxCombo: { type: "integer", min: 0, max: 100_000 },
    leftAccuracy: { type: "integer", min: 0, max: 100 },
    rightAccuracy: { type: "integer", min: 0, max: 100 },
    maxReliableLevel: { type: "integer", min: 0, max: 5 },
    maxReliableDistancePercent: { type: "integer", min: 0, max: 100 },
    averageResponseTimeMs: { type: "integer", min: 0, max: 600_000 },
    completionReason: { type: "string", values: ["completed", "game-over"] },
  },
  "anlik-goruntu": {
    speed: { type: "string", values: ["beginner", "comfortable", "normal", "fast", "very-fast", "expert", "master"] },
    exposureMs: { type: "integer", min: 10, max: 5_000 },
    startLevel: { type: "integer", min: 1, max: 13 },
    reachedLevel: { type: "integer", min: 1, max: 13 },
    completedLevels: { type: "integer", min: 0, max: 13 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    capacityLetterCount: { type: "integer", min: 0, max: 15 },
    maxCombo: { type: "integer", min: 0, max: 100_000 },
    averageResponseTimeMs: { type: "integer", min: 0, max: 600_000 },
  },
  "block-reading": {
    category: { type: "string", maxLength: 80 },
    textTitle: { type: "string", maxLength: 160 },
    totalWords: { type: "integer", min: 0, max: 1_000_000 },
    totalBlocks: { type: "integer", min: 0, max: 1_000_000 },
    blockSize: { type: "integer", min: 1, max: 5 },
    speedMode: { type: "string", values: ["interval", "wpm"] },
    intervalMs: { type: "integer", min: 100, max: 60_000 },
    wordsPerMinute: { type: "integer", min: 1, max: 10_000 },
    fontSize: { type: "integer", min: 24, max: 56 },
    // Egitim Programi coklu-metin biriken sure modeli icin eklendi (bkz.
    // BlockReadingExerciseClient.tsx) - completedTextCount yalniz sonuna
    // kadar tamamlanan metinleri sayar, yarida birakilanlari saymaz.
    completedTextCount: { type: "integer", min: 0, max: 1_000 },
    assignedDurationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    cumulativeActiveSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    lastTextId: { type: "string", maxLength: 128 },
  },
  "shadow-reading": {
    category: { type: "string", maxLength: 80 },
    textTitle: { type: "string", maxLength: 160 },
    totalWords: { type: "integer", min: 0, max: 1_000_000 },
    totalCharacters: { type: "integer", min: 0, max: 10_000_000 },
    blockSize: { type: "integer", min: 1, max: 5 },
    speedMode: { type: "string", values: ["interval", "wpm"] },
    intervalMs: { type: "integer", min: 50, max: 5_000 },
    wordsPerMinute: { type: "integer", min: 1, max: 10_000 },
    fontSize: { type: "integer", min: 12, max: 28 },
    completedBlocks: { type: "integer", min: 0, max: 1_000_000 },
    totalBlocks: { type: "integer", min: 0, max: 1_000_000 },
    progressPercent: { type: "integer", min: 0, max: 100 },
    completedPercent: { type: "integer", min: 0, max: 100 },
    estimatedDurationSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    actualDurationSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    // Egitim Programi coklu-metin biriken sure modeli icin eklendi (bkz.
    // ShadowReadingExerciseClient.tsx) - completedTextCount yalniz sonuna
    // kadar tamamlanan metinleri sayar, yarida birakilanlari saymaz.
    completedTextCount: { type: "integer", min: 0, max: 1_000 },
    assignedDurationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    cumulativeActiveSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    lastTextId: { type: "string", maxLength: 128 },
  },
  "grouping-reading": {
    category: { type: "string", maxLength: 80 },
    textTitle: { type: "string", maxLength: 160 },
    groupSize: { type: "integer", min: 2, max: 5 },
    speedMode: { type: "string", values: ["milliseconds", "wordsPerMinute"] },
    intervalMs: { type: "integer", min: 1, max: 600_000 },
    customMilliseconds: { type: "integer", min: 50, max: 10_000 },
    customWordsPerMinute: { type: "integer", min: 1, max: 10_000 },
    fontSize: { type: "integer", min: 14, max: 28 },
    displayMode: { type: "string", values: ["keep", "fade"] },
    scrollMode: { type: "string", values: ["line", "page"] },
    totalWords: { type: "integer", min: 0, max: 1_000_000 },
    totalCharacters: { type: "integer", min: 0, max: 10_000_000 },
    completedGroups: { type: "integer", min: 0, max: 1_000_000 },
    totalGroups: { type: "integer", min: 0, max: 1_000_000 },
    estimatedWordsPerMinute: { type: "integer", min: 0, max: 1_000_000 },
    // Egitim Programi coklu-metin biriken sure modeli icin eklendi (bkz.
    // GroupingExerciseClient.tsx) - completedTextCount yalniz sonuna kadar
    // tamamlanan metinleri sayar, yarida birakilanlari saymaz.
    completedTextCount: { type: "integer", min: 0, max: 1_000 },
    assignedDurationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    cumulativeActiveSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    lastTextId: { type: "string", maxLength: 128 },
  },
  // Anlama Testi ve Okuma Hizi Testi sure/cumulative kavrami OLMAYAN sinama
  // tipi calismalardir - Egitim Programi'na entegrasyonlari yalniz secure
  // kayit + gorev tamamlama ile sinirlidir, bu yuzden burada
  // completedTextCount/assignedDurationSeconds/cumulativeActiveSeconds/
  // lastTextId gibi coklu-metin alanlari YOKTUR (bkz.
  // ReadingComprehensionTestClient.tsx gercek details payload'i).
  "reading-comprehension": {
    category: { type: "string", maxLength: 120 },
    textTitle: { type: "string", maxLength: 160 },
    totalWords: { type: "integer", min: 0, max: 1_000_000 },
    totalCharacters: { type: "integer", min: 0, max: 10_000_000 },
    readingDurationSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    readingSpeedWpm: { type: "number", min: 0, max: 1_000_000 },
    totalQuestions: { type: "integer", min: 0, max: 100_000 },
    correctAnswers: { type: "integer", min: 0, max: 100_000 },
    wrongAnswers: { type: "integer", min: 0, max: 100_000 },
    emptyAnswers: { type: "integer", min: 0, max: 100_000 },
    comprehensionScore: { type: "integer", min: 0, max: 100 },
    fontSize: { type: "integer", min: 12, max: 28 },
    pausedCount: { type: "integer", min: 0, max: 100_000 },
    totalPausedSeconds: { type: "integer", min: 0, max: MAX_DURATION_SECONDS },
    activeReadingSeconds: { type: "integer", min: 1, max: MAX_DURATION_SECONDS },
    completedAt: { type: "string", maxLength: 40 },
  },
  "mental-arithmetic-target-total": { level: { type: "string", values: ["beginner", "advanced", "master", "expert"] }, speed: { type: "string", values: ["relaxed", "normal", "fast"] }, totalRounds: { type: "integer", min: 0, max: 100000 }, averageAnswerSeconds: { type: "number", min: 0, max: 21600 }, completionReason: { type: "string", values: ["manual", "natural"] } },
  "mental-arithmetic-chain": { level: { type: "string", values: ["beginner", "advanced", "master", "expert"] }, totalRounds: { type: "integer", min: 0, max: 100000 }, bestStreak: { type: "integer", min: 0, max: 100000 }, averageAnswerSeconds: { type: "number", min: 0, max: 21600 }, completionReason: { type: "string", values: ["manual", "natural"] } },
  "mental-arithmetic-market": { level: { type: "string", values: ["beginner", "advanced", "master", "expert"] }, mode: { type: "string", values: ["shopping", "change", "budget"] }, totalRounds: { type: "integer", min: 0, max: 100000 }, averageAnswerSeconds: { type: "number", min: 0, max: 21600 }, completionReason: { type: "string", values: ["manual", "natural"] } },
  "mental-arithmetic-vault": { level: { type: "string", values: ["beginner", "advanced", "master", "expert"] }, speed: { type: "string", values: ["relaxed", "normal", "fast"] }, mode: { type: "string", values: ["mixed-operation", "logic-code"] }, digits: { type: "integer", min: 2, max: 4 }, totalRounds: { type: "integer", min: 0, max: 100000 }, bestStreak: { type: "integer", min: 0, max: 100000 }, averageAnswerSeconds: { type: "number", min: 0, max: 21600 }, completionReason: { type: "string", values: ["manual", "natural"] } },
  "two-side-focus": { totalRounds: { type: "integer", min: 0, max: 100000 }, levels: { type: "string", maxLength: 6000 } },
};

type ValidatedResultBody = {
  exerciseType: string;
  exerciseTitle: string;
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  completedAt: string;
  submissionKey: string;
  assignmentItemId: string | null;
  details: Record<string, string | number | boolean>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function studentAccessFailureResponse(access: StudentAccessFailure) {
  const response = jsonResponse({ message: access.message }, access.status);
  if (access.clearSessionCookie) {
    clearStudentSessionCookie(response);
  }
  return response;
}

function hasClientIdentityParameter(request: NextRequest): boolean {
  return [...request.nextUrl.searchParams.keys()]
    .some((key) => IDENTITY_QUERY_KEYS.has(key.trim().toLowerCase()));
}

function toFiniteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateDetails(exerciseType: string, value: unknown): Record<string, string | number | boolean> | null {
  if (value === undefined) return {};
  if (!isPlainObject(value)) return null;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_DETAILS_BYTES) return null;

  const schema = DETAIL_SCHEMAS[exerciseType];
  if (!schema) return null;

  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (FORBIDDEN_DETAIL_KEYS.has(key.toLowerCase())) return null;
    const rule = schema[key];
    if (!rule) return null;

    if (rule.type === "boolean") {
      if (typeof raw !== "boolean") return null;
      cleaned[key] = raw;
      continue;
    }
    if (rule.type === "string") {
      if (typeof raw !== "string" || raw.length > (rule.maxLength ?? 120)) return null;
      if (rule.values && !rule.values.includes(raw)) return null;
      cleaned[key] = raw;
      continue;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    if (rule.type === "integer" && !Number.isInteger(raw)) return null;
    if (rule.min !== undefined && raw < rule.min) return null;
    if (rule.max !== undefined && raw > rule.max) return null;
    cleaned[key] = raw;
  }

  return cleaned;
}

function parseBoundedNumber(value: unknown, maximum: number, integer: boolean): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    return null;
  }

  if (integer && !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function parseScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < -MAX_SCORE || value > MAX_SCORE) {
    return null;
  }
  return value;
}

function parseAnswerCount(body: Record<string, unknown>, primaryKey: "correctCount" | "wrongCount", aliasKey: "correct" | "wrong"): number | null {
  const primary = body[primaryKey];
  const alias = body[aliasKey];
  if (primary !== undefined && alias !== undefined && primary !== alias) {
    return null;
  }

  return parseBoundedNumber(primary ?? alias, MAX_ANSWER_COUNT, true);
}

function parseCompletedAt(body: Record<string, unknown>): string | null {
  const candidates = [body.completedAt, body.date].filter((value) => value !== undefined && value !== null);
  if (candidates.length === 0 || candidates.some((value) => typeof value !== "string" || !value.trim())) {
    return null;
  }

  const timestamps = candidates.map((value) => new Date(value as string).getTime());
  if (timestamps.some((timestamp) => !Number.isFinite(timestamp) || timestamp > Date.now() + MAX_FUTURE_CLOCK_SKEW_MS)) {
    return null;
  }

  return new Date(timestamps[0]).toISOString();
}

function parseSubmissionKey(body: Record<string, unknown>): string | null {
  const value = toOptionalString(body.submissionKey);
  if (!value || value.length > 160) {
    return null;
  }

  return value;
}

function validateResultBody(value: unknown): ValidatedResultBody | null {
  if (!isPlainObject(value)) return null;

  const keys = Object.keys(value);
  if (keys.some((key) => FORBIDDEN_BODY_KEYS.has(key.trim().toLowerCase()))) return null;
  if (keys.some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;

  const exerciseType = typeof value.exerciseType === "string" ? value.exerciseType.trim() : "";
  if (!exerciseType || exerciseType.length > 64 || !/^[a-z0-9-]+$/.test(exerciseType)) return null;

  const exerciseTitle = typeof value.exerciseTitle === "string" ? value.exerciseTitle.trim() : "";
  if (exerciseTitle.length > 160) return null;

  const score = parseScore(value.score);
  const successRate = parseBoundedNumber(value.successRate, 100, false);
  const correctCount = parseAnswerCount(value, "correctCount", "correct");
  const wrongCount = parseAnswerCount(value, "wrongCount", "wrong");
  const rawDuration = parseBoundedNumber(value.durationSeconds, MAX_DURATION_SECONDS, false);
  const completedAt = parseCompletedAt(value);
  const submissionKey = parseSubmissionKey(value);
  const details = validateDetails(exerciseType, value.details);
  if (score === null || successRate === null || correctCount === null || wrongCount === null || rawDuration === null || completedAt === null || submissionKey === null || details === null) {
    return null;
  }

  let assignmentItemId: string | null = null;
  if (value.assignmentItemId !== undefined && value.assignmentItemId !== null && value.assignmentItemId !== "") {
    if (typeof value.assignmentItemId !== "string" || !value.assignmentItemId.trim() || value.assignmentItemId.trim().length > 128) {
      return null;
    }
    assignmentItemId = value.assignmentItemId.trim();
  }

  return {
    exerciseType,
    exerciseTitle: exerciseTitle || "Egzersiz",
    score,
    successRate,
    correctCount,
    wrongCount,
    durationSeconds: Math.round(rawDuration),
    completedAt,
    submissionKey,
    assignmentItemId,
    details,
  };
}

function hasServiceRoleConfiguration(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE?.trim());
}

function mapResult(row: Record<string, unknown>, studentId: string) {
  const completedAt = toOptionalString(row.completed_at) ?? toOptionalString(row.created_at) ?? "";
  const createdAt = toOptionalString(row.created_at) ?? completedAt;
  const correctCount = toFiniteNumber(row.correct_count);
  const wrongCount = toFiniteNumber(row.wrong_count);
  const details = typeof row.details === "object" && row.details !== null
    ? row.details as Record<string, unknown>
    : null;
  const assignmentItemId = toOptionalString(row.assignment_item_id)
    ?? toOptionalString(details?.assignmentItemId)
    ?? toOptionalString(details?.assignment_item_id);

  return {
    id: String(row.id ?? ""),
    studentId,
    exerciseType: String(row.exercise_type ?? ""),
    exerciseTitle: String(row.exercise_title ?? "Egzersiz"),
    score: toFiniteNumber(row.score),
    correct: correctCount,
    wrong: wrongCount,
    correctCount,
    wrongCount,
    successRate: toFiniteNumber(row.success_rate),
    durationSeconds: toFiniteNumber(row.duration_seconds ?? details?.durationSeconds),
    date: completedAt,
    createdAt,
    completedAt,
    assignmentItemId,
    details,
  };
}

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    return studentAccessFailureResponse(access);
  }

  if (hasClientIdentityParameter(request)) {
    return jsonResponse({ message: "Öğrenci kimliği istek parametresi olarak kabul edilmez." }, 400);
  }

  if (!hasServiceRoleConfiguration()) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  try {
    const { data, error } = await supabase
      .from(RESULTS_TABLE)
      .select("id,student_id,exercise_type,exercise_title,correct_count,wrong_count,score,success_rate,details,completed_at,created_at")
      .eq("student_id", access.studentId)
      .order("completed_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      return jsonResponse({ message: "Sonuçlar şu anda yüklenemiyor." }, 500);
    }

    const results = data
      .filter((row) => String(row.student_id ?? "") === access.studentId)
      .map((row) => mapResult(row as Record<string, unknown>, access.studentId));

    return jsonResponse({ results });
  } catch {
    return jsonResponse({ message: "Sonuçlar şu anda yüklenemiyor." }, 500);
  }
}

export async function POST(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    return studentAccessFailureResponse(access);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ message: "Geçersiz sonuç verisi." }, 400);
  }

  const body = validateResultBody(rawBody);
  if (!body) {
    return jsonResponse({ message: "Geçersiz sonuç verisi." }, 400);
  }

  if (!hasServiceRoleConfiguration()) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  try {
    const { data: student, error: studentError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username")
      .eq("id", access.studentId)
      .maybeSingle();

    if (studentError) {
      return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
    }

    const studentName = typeof student?.name === "string" ? student.name.trim() : "";
    const username = typeof student?.username === "string" ? student.username.trim() : "";
    if (!student || String(student.id) !== access.studentId || !studentName) {
      return jsonResponse({ message: "Öğrenci bulunamadı." }, 404);
    }

    if (body.assignmentItemId) {
      const item = await getAssignmentItemById(supabase, body.assignmentItemId);
      if (!item) {
        return jsonResponse({ message: "Ödev adımı bulunamadı." }, 404);
      }

      const assignment = await getDailyAssignmentById(supabase, item.assignmentId);
      if (!assignment) {
        return jsonResponse({ message: "Ödev bulunamadı." }, 404);
      }

      if (item.studentId !== access.studentId || assignment.studentId !== access.studentId) {
        return jsonResponse({ message: "Bu ödev adımı öğrenciye ait değil." }, 403);
      }

      const exerciseDefinition = ASSIGNMENT_EXERCISE_BY_SLUG.get(item.exerciseSlug);
      if (!exerciseDefinition || exerciseDefinition.resultExerciseType !== body.exerciseType) {
        return jsonResponse({ message: "Egzersiz türü ödev adımıyla uyuşmuyor." }, 409);
      }
      // Mevcut ürün davranışı korunur: tamamlanmış bir item için tekrar çalışma sonucu kaydedilebilir.
    }

    const details = {
      ...body.details,
      durationSeconds: body.durationSeconds,
      ...(body.assignmentItemId ? { assignmentItemId: body.assignmentItemId } : {}),
    };
    // XP politikasi MERKEZI: bkz. src/lib/xp/xpPolicy.ts. XP kazandirmayan
    // turler ayni endpoint, ayni oturum dogrulamasi, ayni validation ve ayni
    // submission_key idempotency'siyle kaydedilir; yalniz XP tarafina hicbir
    // yazma yapilmaz.
    if (!exerciseTypeAwardsXp(body.exerciseType)) {
      const recordedWithoutXp = await recordStudentResultWithoutXp(supabase, {
        studentId: access.studentId,
        studentName,
        username: username || access.username,
        exerciseType: body.exerciseType,
        exerciseTitle: body.exerciseTitle,
        score: body.score,
        successRate: body.successRate,
        correctCount: body.correctCount,
        wrongCount: body.wrongCount,
        completedAt: body.completedAt,
        submissionKey: body.submissionKey,
        details,
      });

      if (!recordedWithoutXp) {
        return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
      }

      const snapshot = await getStudentXpSnapshotByStudentId(access.studentId);

      return jsonResponse(
        {
          success: true,
          result: mapResult(recordedWithoutXp.resultRow, access.studentId),
          replayed: recordedWithoutXp.replayed,
          reward: {
            eventType: getExerciseXpEventType(body.exerciseType),
            awardedXp: getExerciseXpAward(body.exerciseType) ?? 0,
            currentTotalXp: snapshot.totalXp,
            replayed: recordedWithoutXp.replayed,
            rewardKey: `result:${body.submissionKey}`,
          },
        },
        recordedWithoutXp.replayed ? 200 : 201,
      );
    }

    const recorded = await recordStudentResultAndAwardXp(supabase, {
      studentId: access.studentId,
      studentName,
      username: username || access.username,
      exerciseType: body.exerciseType,
      exerciseTitle: body.exerciseTitle,
      score: body.score,
      successRate: body.successRate,
      correctCount: body.correctCount,
      wrongCount: body.wrongCount,
      durationSeconds: body.durationSeconds,
      completedAt: body.completedAt,
      submissionKey: body.submissionKey,
      details,
    });

    if (!recorded) {
      return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
    }

    return jsonResponse(
      {
        success: true,
        result: mapResult(recorded.resultRow, access.studentId),
        replayed: recorded.replayed,
        reward: {
          eventType: getExerciseXpEventType(body.exerciseType),
          awardedXp: recorded.xpAwarded,
          currentTotalXp: recorded.totalXp,
          replayed: recorded.replayed,
          rewardKey: `result:${body.submissionKey}`,
        },
      },
      recorded.replayed ? 200 : 201,
    );
  } catch {
    return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
  }
}
