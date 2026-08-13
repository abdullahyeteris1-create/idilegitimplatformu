import type { ExerciseResult } from "@/lib/results/types";

export type WeeklyProgress = {
  activeDays: number;
  durationMinutes: number;
  completedCount: number;
  readingSpeedDelta: number | null;
  comprehensionDelta: number | null;
  trend: number[];
};

export type StudentAchievement = { id: string; title: string; value: string; icon: string };

export type GameScoreSummary = {
  slug: "hafiza-yarisi" | "tatli-dukkani" | "kayip-nesne";
  title: string;
  bestScore: number | null;
  lastPlayed: string | null;
  href: string;
};

const GAME_DEFINITIONS: Array<Omit<GameScoreSummary, "bestScore" | "lastPlayed"> & { types: string[] }> = [
  { slug: "hafiza-yarisi", title: "Hafıza Yarışı", href: "/egzersizler/hafiza-yarisi", types: ["memory-game", "hafiza-yarisi"] },
  { slug: "tatli-dukkani", title: "Tatlı Dükkanı", href: "/egzersizler/tatli-dukkani", types: ["tatli-dukkani"] },
  { slug: "kayip-nesne", title: "Kayıp Nesne", href: "/egzersizler/kayip-nesne", types: ["kayip-nesne"] },
];
const ISTANBUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function detailNumber(result: ExerciseResult, keys: string[]): number | null {
  for (const key of keys) if (finite(result.details?.[key])) return result.details?.[key] as number;
  return null;
}

function resultTime(result: ExerciseResult): number { return new Date(result.date).getTime(); }

function inWindow(result: ExerciseResult, start: number, end: number): boolean {
  const time = resultTime(result);
  return Number.isFinite(time) && time >= start && time <= end;
}

function delta(values: Array<{ time: number; value: number }>): number | null {
  if (values.length < 2) return null;
  values.sort((a, b) => a.time - b.time);
  const difference = Math.round(values[values.length - 1].value - values[0].value);
  return difference === 0 ? 0 : difference;
}

export function getStudentPanelWeeklyProgress(results: ExerciseResult[], now = new Date()): WeeklyProgress {
  const end = now.getTime();
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const recent = results.filter((result) => inWindow(result, start, end));
  const activeDays = new Set(recent.map((result) => ISTANBUL_DATE_FORMATTER.format(new Date(result.date)))).size;
  const speed = recent.flatMap((result) => {
    if (result.exerciseType !== "reading-speed-test") return [];
    const value = detailNumber(result, ["readingSpeedWpm"]);
    return value === null ? [] : [{ time: resultTime(result), value }];
  });
  const comprehension = recent.flatMap((result) => {
    if (result.exerciseType !== "reading-comprehension") return [];
    const value = detailNumber(result, ["comprehensionScore", "successRate"]) ?? (finite(result.successRate) ? result.successRate : null);
    return value === null ? [] : [{ time: resultTime(result), value }];
  });
  const trend = Array.from({ length: 7 }, (_, index) => recent.filter((result) => {
    const time = resultTime(result);
    return time >= start + index * 24 * 60 * 60 * 1000 && time < start + (index + 1) * 24 * 60 * 60 * 1000;
  }).length);
  return {
    activeDays,
    durationMinutes: Math.floor(recent.reduce((sum, result) => sum + (finite(result.durationSeconds) ? Math.max(0, result.durationSeconds) : 0), 0) / 60),
    completedCount: recent.length,
    readingSpeedDelta: delta(speed),
    comprehensionDelta: delta(comprehension),
    trend,
  };
}

export function getStudentPanelAchievements(results: ExerciseResult[], now = new Date()): StudentAchievement[] {
  const start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const recent = results.filter((result) => inWindow(result, start, now.getTime())).sort((a, b) => resultTime(b) - resultTime(a));
  const achievements: StudentAchievement[] = [];
  const push = (achievement: StudentAchievement) => { if (!achievements.some((item) => item.id === achievement.id) && achievements.length < 3) achievements.push(achievement); };
  const speedResults = results.filter((result) => result.exerciseType === "reading-speed-test").flatMap((result) => { const value = detailNumber(result, ["readingSpeedWpm"]); return value === null ? [] : [{ result, value }]; });
  const latestSpeed = recent.find((result) => result.exerciseType === "reading-speed-test");
  if (latestSpeed && speedResults.length && detailNumber(latestSpeed, ["readingSpeedWpm"]) === Math.max(...speedResults.map((item) => item.value))) push({ id: "reading-speed-best", title: "Yeni en yüksek okuma hızı", value: `${Math.round(detailNumber(latestSpeed, ["readingSpeedWpm"]) ?? 0)} kelime/dk`, icon: "📈" });
  const latestPerfect = recent.find((result) => result.exerciseType === "reading-comprehension" && finite(result.successRate) && result.successRate >= 100);
  if (latestPerfect) push({ id: "perfect-comprehension", title: "%100 anlama başarısı", value: "Anlama Testi", icon: "🎯" });
  for (const game of GAME_DEFINITIONS) {
    const gameResults = results.filter((result) => game.types.includes(result.exerciseType));
    const recentGame = recent.find((result) => game.types.includes(result.exerciseType));
    if (recentGame && gameResults.length && recentGame.score === Math.max(...gameResults.map((result) => result.score))) push({ id: `${game.slug}-best`, title: `Yeni ${game.title} rekoru`, value: `${recentGame.score} puan`, icon: "🏆" });
  }
  const latestSuccess = recent.find((result) => finite(result.successRate));
  if (latestSuccess && latestSuccess.successRate >= Math.max(...results.filter((result) => finite(result.successRate)).map((result) => result.successRate))) push({ id: "success-best", title: "Kişisel en iyi başarı oranı", value: `%${Math.round(latestSuccess.successRate)}`, icon: "⭐" });
  return achievements;
}

export function getStudentPanelGameScores(results: ExerciseResult[]): GameScoreSummary[] {
  return GAME_DEFINITIONS.map((game) => {
    const gameResults = results.filter((result) => game.types.includes(result.exerciseType)).sort((a, b) => resultTime(b) - resultTime(a));
    return { slug: game.slug, title: game.title, href: game.href, bestScore: gameResults.length ? Math.max(...gameResults.map((result) => finite(result.score) ? result.score : 0)) : null, lastPlayed: gameResults[0]?.date ?? null };
  });
}
