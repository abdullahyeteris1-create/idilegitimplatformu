export const TATLI_DUKKANI_SPEEDS = [
  { id: "beginner", label: "Başlangıç", multiplier: 1.45 },
  { id: "relaxed", label: "Rahat", multiplier: 1.2 },
  { id: "medium", label: "Orta", multiplier: 1 },
  { id: "expert", label: "Uzman", multiplier: 0.82 },
  { id: "master", label: "Usta", multiplier: 0.68 },
] as const;

export type TatliDukkaniSpeedId = (typeof TATLI_DUKKANI_SPEEDS)[number]["id"];

export const DEFAULT_TATLI_DUKKANI_SPEED: TatliDukkaniSpeedId = "medium";

// The original engine clamps the normal tempo at 300ms. A lower bound is
// needed only after applying a faster speed, so late levels remain playable
// while preserving the original 300ms floor for Orta.
export const TATLI_DUKKANI_SPEED_MIN_MS = 180;

export function getTatliDukkaniSpeed(id: TatliDukkaniSpeedId) {
  return TATLI_DUKKANI_SPEEDS.find((speed) => speed.id === id) ?? TATLI_DUKKANI_SPEEDS[2];
}

export function applyTatliDukkaniSpeed(baseTimeMs: number, speedId: TatliDukkaniSpeedId): number {
  const speed = getTatliDukkaniSpeed(speedId);
  return Math.max(TATLI_DUKKANI_SPEED_MIN_MS, Math.round(baseTimeMs * speed.multiplier));
}
