export const READING_SPEED_OPTIONS = [
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
  1100,
  2000,
  5000,
] as const;

export type ReadingSpeedMs = (typeof READING_SPEED_OPTIONS)[number];
