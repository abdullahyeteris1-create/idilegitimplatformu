export type MentalLevel = "beginner" | "advanced" | "master" | "expert";
export const MENTAL_LEVEL_LABELS: Record<MentalLevel, string> = { beginner: "Başlangıç", advanced: "İleri", master: "Usta", expert: "Uzman" };
export function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function shuffle<T>(items: T[]): T[] { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = randomInt(0, i); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function clampPercent(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
