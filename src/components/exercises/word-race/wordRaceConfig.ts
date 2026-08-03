import type { WordRaceCarId } from "./types";

export const WORD_RACE_EXERCISE_SLUG = "kelime-yarisi";
export const WORD_RACE_RESULT_TYPE = "word-race";
export const WORD_RACE_TITLE = "Kelime Yarışı";

export const WORD_RACE_MAX_WRONG = 10;
export const WORD_RACE_LEVEL_TARGET = 10;
export const WORD_RACE_SPEED_TRANSITION_DELAY_MS = 2_000;
export const WORD_RACE_SPEEDS = [5_000, 4_000, 3_000, 2_500, 2_000, 1_500, 1_000] as const;

export const WORD_RACE_LEVELS = [
  { level: 1, lanes: 3, tiers: [0] },
  { level: 2, lanes: 3, tiers: [0, 1] },
  { level: 3, lanes: 4, tiers: [1, 2] },
  { level: 4, lanes: 5, tiers: [2, 3] },
  { level: 5, lanes: 6, tiers: [3, 4] },
] as const;

export const WORD_RACE_CARS: readonly {
  id: WordRaceCarId;
  name: string;
  color: string;
  roof: string;
}[] = [
  { id: "spor", name: "Spor", color: "#ef4444", roof: "#7f1d1d" },
  { id: "viper", name: "Viper", color: "#f97316", roof: "#9a3412" },
  { id: "taksi", name: "Taksi", color: "#eab308", roof: "#854d0e" },
  { id: "polis", name: "Polis", color: "#e2e8f0", roof: "#1e3a8a" },
  { id: "minivan", name: "Minivan", color: "#94a3b8", roof: "#334155" },
];

export const WORD_RACE_WORD_PAIRS: readonly (readonly (readonly [string, string])[])[] = [
  [["masa", "kasa"], ["kalem", "kelam"], ["sarı", "sarıp"], ["yol", "yel"]],
  [["kitap", "hitap"], ["çiçek", "çilek"], ["balon", "salon"], ["kedi", "keçi"]],
  [["merdiven", "merdimen"], ["pencere", "tencere"], ["bardak", "parlak"], ["öğrenci", "öğretici"]],
  [["dikkat", "dikket"], ["çalışma", "çağrışma"], ["görsel", "görevsel"], ["karar", "kadar"]],
  [["odaklanma", "uzaklaşma"], ["süreklilik", "sürükleyiş"], ["algılama", "anlamlandırma"], ["hızlandırma", "hazırlanma"]],
] as const;

export function getWordRaceLevel(level: number) {
  const safeLevel = Math.max(1, Math.min(WORD_RACE_LEVELS.length, Math.round(level)));
  return WORD_RACE_LEVELS[safeLevel - 1];
}

export function isWordRaceSpeed(value: number): value is (typeof WORD_RACE_SPEEDS)[number] {
  return WORD_RACE_SPEEDS.some((speed) => speed === value);
}
