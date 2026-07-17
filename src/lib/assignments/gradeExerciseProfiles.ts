import type { EducationLevel } from "@/lib/assignments/educationLevels";

type ExerciseAssignmentProfile = {
  level?: number;
  speedMs?: number;
  wordsPerMinute?: number;
  durationMinutes?: number;
  targetCorrect?: number;
  targetScore?: number;
  targetSuccessRate?: number;
  difficulty?: "easy" | "medium" | "hard";
  wordLength?: number;
  groupSize?: number;
  contentType?: string;
  questionCount?: number;
};

type EducationExerciseProfiles = Record<
  EducationLevel,
  Record<string, ExerciseAssignmentProfile>
>;

export const GRADE_EXERCISE_PROFILES: EducationExerciseProfiles = {
  primary_1: {
    "takistoskop": { level: 1, speedMs: 1100, durationMinutes: 4, targetCorrect: 8, contentType: "kisa_kelime" },
    "blok-okuma": { level: 1, wordsPerMinute: 35, durationMinutes: 4, groupSize: 1 },
    "gruplama-calismasi": { level: 1, wordsPerMinute: 30, durationMinutes: 4, groupSize: 2 },
    "golgeleme": { wordsPerMinute: 35, durationMinutes: 4 },
    "odakli-okuma": { wordsPerMinute: 35, durationMinutes: 4 },
    "cift-tarafli-odak": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "kare-gorme-alani": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "harf-rakam-sayma": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "ayni-olani-yakala": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "dikkat-labirenti": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "benzer-kelimeler": { level: 1, durationMinutes: 4, difficulty: "easy" },
    "sayi-tablosu": { level: 1 },
    "goz-kaslari": { level: 1, durationMinutes: 3 },
    "goz-calismasi": { level: 1, durationMinutes: 3 },
    "goz-beyin": { durationMinutes: 3, speedMs: 1100 },
    "goz-egzersizleri-kolonlar": { durationMinutes: 3, speedMs: 1100 },
    "kelime-tahmin": { wordLength: 3, targetCorrect: 4 },
    "kelime-bulma": { level: 1, durationMinutes: 4 },
    "kart-hafiza": { level: 1, durationMinutes: 4 },
    "kart-eslestirme": { level: 1, durationMinutes: 4 },
    "parcali-resim-kelime": { level: 1, durationMinutes: 4 },
    "adam-asmaca": { wordLength: 3, targetCorrect: 4 },
    "gorsel-puzzle": { level: 1, durationMinutes: 4 },
    "anlama-testi": { targetSuccessRate: 65, questionCount: 4 },
  },
  primary_2: {
    "takistoskop": { level: 1, speedMs: 850, durationMinutes: 5, targetCorrect: 8 },
    "blok-okuma": { wordsPerMinute: 50, durationMinutes: 5, groupSize: 2 },
    "gruplama-calismasi": { wordsPerMinute: 45, durationMinutes: 5, groupSize: 2 },
    "golgeleme": { wordsPerMinute: 50, durationMinutes: 5 },
    "odakli-okuma": { wordsPerMinute: 50, durationMinutes: 5 },
    "cift-tarafli-odak": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "kare-gorme-alani": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "harf-rakam-sayma": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "ayni-olani-yakala": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "dikkat-labirenti": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "benzer-kelimeler": { level: 1, durationMinutes: 5, difficulty: "easy" },
    "sayi-tablosu": { level: 2 },
    "goz-kaslari": { level: 1, durationMinutes: 4 },
    "goz-calismasi": { level: 1, durationMinutes: 4 },
    "goz-beyin": { durationMinutes: 4, speedMs: 900 },
    "goz-egzersizleri-kolonlar": { durationMinutes: 4, speedMs: 900 },
    "kelime-tahmin": { wordLength: 4 },
    "anlama-testi": { targetSuccessRate: 70, questionCount: 4 },
  },
  primary_3: {
    "sayi-tablosu": { level: 3 },
    "takistoskop": { level: 2, speedMs: 650, durationMinutes: 6, targetCorrect: 10 },
    "blok-okuma": { wordsPerMinute: 75, durationMinutes: 6, groupSize: 2 },
    "gruplama-calismasi": { wordsPerMinute: 70, durationMinutes: 6, groupSize: 3 },
    "golgeleme": { wordsPerMinute: 75, durationMinutes: 6 },
    "odakli-okuma": { wordsPerMinute: 75, durationMinutes: 6 },
    "anlama-testi": { targetSuccessRate: 75, questionCount: 5 },
  },
  primary_4: {
    "sayi-tablosu": { level: 3 },
    "takistoskop": { level: 2, speedMs: 500, durationMinutes: 6, targetCorrect: 10 },
    "blok-okuma": { wordsPerMinute: 100, durationMinutes: 7, groupSize: 3 },
    "gruplama-calismasi": { wordsPerMinute: 95, durationMinutes: 7, groupSize: 3 },
    "golgeleme": { wordsPerMinute: 100, durationMinutes: 7 },
    "odakli-okuma": { wordsPerMinute: 100, durationMinutes: 7 },
    "anlama-testi": { targetSuccessRate: 75, questionCount: 5 },
  },
  middle_5_6: {
    "sayi-tablosu": { level: 4 },
    "takistoskop": { level: 3, speedMs: 400, durationMinutes: 7, targetCorrect: 10 },
    "blok-okuma": { wordsPerMinute: 140, durationMinutes: 8, groupSize: 3 },
    "gruplama-calismasi": { wordsPerMinute: 130, durationMinutes: 8, groupSize: 4 },
    "golgeleme": { wordsPerMinute: 140, durationMinutes: 8 },
    "odakli-okuma": { wordsPerMinute: 140, durationMinutes: 8 },
    "anlama-testi": { targetSuccessRate: 80, questionCount: 7 },
  },
  middle_7_8: {
    "sayi-tablosu": { level: 5 },
    "takistoskop": { level: 4, speedMs: 300, durationMinutes: 8, targetCorrect: 10 },
    "blok-okuma": { wordsPerMinute: 180, durationMinutes: 8, groupSize: 4 },
    "gruplama-calismasi": { wordsPerMinute: 170, durationMinutes: 8, groupSize: 4 },
    "golgeleme": { wordsPerMinute: 180, durationMinutes: 8 },
    "odakli-okuma": { wordsPerMinute: 180, durationMinutes: 8 },
    "anlama-testi": { targetSuccessRate: 80, questionCount: 8 },
  },
  high_school: {
    "sayi-tablosu": { level: 6 },
    "takistoskop": { level: 5, speedMs: 220, durationMinutes: 8, targetCorrect: 12 },
    "blok-okuma": { wordsPerMinute: 230, durationMinutes: 10, groupSize: 4 },
    "gruplama-calismasi": { wordsPerMinute: 220, durationMinutes: 10, groupSize: 5 },
    "golgeleme": { wordsPerMinute: 230, durationMinutes: 10 },
    "odakli-okuma": { wordsPerMinute: 230, durationMinutes: 10 },
    "kelime-tahmin": { wordLength: 7 },
    "anlama-testi": { targetSuccessRate: 85, questionCount: 10 },
  },
  adult: {
    "sayi-tablosu": { level: 6 },
    "takistoskop": { level: 4, speedMs: 250, durationMinutes: 8, targetCorrect: 12 },
    "blok-okuma": { wordsPerMinute: 220, durationMinutes: 10, groupSize: 4 },
    "gruplama-calismasi": { wordsPerMinute: 210, durationMinutes: 10, groupSize: 5 },
    "golgeleme": { wordsPerMinute: 220, durationMinutes: 10 },
    "odakli-okuma": { wordsPerMinute: 220, durationMinutes: 10 },
    "kelime-tahmin": { wordLength: 7 },
    "anlama-testi": { targetSuccessRate: 80, questionCount: 10 },
  },
};

export type { EducationExerciseProfiles, ExerciseAssignmentProfile };
