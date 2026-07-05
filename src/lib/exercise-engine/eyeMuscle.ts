export type EyeMuscleLevel = 1 | 2 | 3 | 4 | 5;
export type EyeMuscleSpeedMs = 100 | 150 | 200 | 250 | 300 | 350 | 400 | 450 | 500;

export type MovementPattern =
  | "perimeter-corners"
  | "perimeter-segments"
  | "diagonal-center"
  | "horizontal-scan"
  | "vertical-scan";

export type EyeSymbolOption = {
  id: string;
  label: string;
  file: string;
};

export type SymbolPositionOptions = {
  level: EyeMuscleLevel;
  pointIndex: number;
};

export type SymbolPosition = {
  xPercent: number;
  yPercent: number;
};

const EDGE_LOW = 8;
const EDGE_MID = 50;
const EDGE_HIGH = 92;

export const EYE_SYMBOL_OPTIONS: EyeSymbolOption[] = [
  { id: "red-circle", label: "Kirmizi Daire", file: "/eye-symbols/red-circle.svg" },
  { id: "blue-diamond", label: "Mavi Elmas", file: "/eye-symbols/blue-diamond.svg" },
  { id: "green-triangle", label: "Yesil Ucgen", file: "/eye-symbols/green-triangle.svg" },
  { id: "yellow-star", label: "Sari Yildiz", file: "/eye-symbols/yellow-star.svg" },
  { id: "purple-heart", label: "Mor Kalp", file: "/eye-symbols/purple-heart.svg" },
  { id: "orange-square", label: "Turuncu Kare", file: "/eye-symbols/orange-square.svg" },
  { id: "black-dot", label: "Siyah Nokta", file: "/eye-symbols/black-dot.svg" },
  { id: "teal-hexagon", label: "Turkuaz Altigen", file: "/eye-symbols/teal-hexagon.svg" },
  { id: "pink-flower", label: "Pembe Cicek", file: "/eye-symbols/pink-flower.svg" },
  { id: "cyan-plus", label: "Camgobegi Arti", file: "/eye-symbols/cyan-plus.svg" },
  { id: "target", label: "Hedef", file: "/eye-symbols/target.svg" },
  { id: "lightning", label: "Simsek", file: "/eye-symbols/lightning.svg" },
  { id: "eye", label: "Goz", file: "/eye-symbols/eye.svg" },
  { id: "moon", label: "Ay", file: "/eye-symbols/moon.svg" },
  { id: "sun", label: "Gunes", file: "/eye-symbols/sun.svg" },
  { id: "spiral", label: "Spiral", file: "/eye-symbols/spiral.svg" },
  { id: "clover", label: "Yonca", file: "/eye-symbols/clover.svg" },
  { id: "arrow", label: "Ok", file: "/eye-symbols/arrow.svg" },
  { id: "ring", label: "Halka", file: "/eye-symbols/ring.svg" },
  { id: "check", label: "Tik", file: "/eye-symbols/check.svg" },
];

export const EYE_MUSCLE_SPEED_OPTIONS: EyeMuscleSpeedMs[] = [100, 150, 200, 250, 300, 350, 400, 450, 500];
export const EYE_MUSCLE_LEVEL_OPTIONS: EyeMuscleLevel[] = [1, 2, 3, 4, 5];

const LEVEL_POINTS: Record<EyeMuscleLevel, SymbolPosition[]> = {
  1: [
    { xPercent: EDGE_LOW, yPercent: EDGE_LOW },
    { xPercent: EDGE_HIGH, yPercent: EDGE_LOW },
    { xPercent: EDGE_HIGH, yPercent: EDGE_HIGH },
    { xPercent: EDGE_LOW, yPercent: EDGE_HIGH },
    { xPercent: EDGE_LOW, yPercent: EDGE_LOW },
  ],
  2: [
    { xPercent: EDGE_LOW, yPercent: EDGE_LOW },
    { xPercent: EDGE_LOW, yPercent: EDGE_MID },
    { xPercent: EDGE_LOW, yPercent: EDGE_HIGH },
    { xPercent: EDGE_MID, yPercent: EDGE_HIGH },
    { xPercent: EDGE_HIGH, yPercent: EDGE_HIGH },
    { xPercent: EDGE_HIGH, yPercent: EDGE_MID },
    { xPercent: EDGE_HIGH, yPercent: EDGE_LOW },
    { xPercent: EDGE_MID, yPercent: EDGE_LOW },
    { xPercent: EDGE_LOW, yPercent: EDGE_LOW },
  ],
  3: [
    { xPercent: EDGE_LOW, yPercent: EDGE_LOW },
    { xPercent: EDGE_MID, yPercent: EDGE_MID },
    { xPercent: EDGE_HIGH, yPercent: EDGE_HIGH },
    { xPercent: EDGE_MID, yPercent: EDGE_MID },
    { xPercent: EDGE_LOW, yPercent: EDGE_HIGH },
    { xPercent: EDGE_MID, yPercent: EDGE_MID },
    { xPercent: EDGE_HIGH, yPercent: EDGE_LOW },
    { xPercent: EDGE_MID, yPercent: EDGE_MID },
  ],
  4: [
    { xPercent: EDGE_LOW, yPercent: 12 },
    { xPercent: EDGE_HIGH, yPercent: 12 },
    { xPercent: EDGE_HIGH, yPercent: 31 },
    { xPercent: EDGE_LOW, yPercent: 31 },
    { xPercent: EDGE_LOW, yPercent: 50 },
    { xPercent: EDGE_HIGH, yPercent: 50 },
    { xPercent: EDGE_HIGH, yPercent: 69 },
    { xPercent: EDGE_LOW, yPercent: 69 },
    { xPercent: EDGE_LOW, yPercent: 88 },
    { xPercent: EDGE_HIGH, yPercent: 88 },
  ],
  5: [
    { xPercent: 12, yPercent: EDGE_LOW },
    { xPercent: 12, yPercent: EDGE_HIGH },
    { xPercent: 31, yPercent: EDGE_HIGH },
    { xPercent: 31, yPercent: EDGE_LOW },
    { xPercent: 50, yPercent: EDGE_LOW },
    { xPercent: 50, yPercent: EDGE_HIGH },
    { xPercent: 69, yPercent: EDGE_HIGH },
    { xPercent: 69, yPercent: EDGE_LOW },
    { xPercent: 88, yPercent: EDGE_LOW },
    { xPercent: 88, yPercent: EDGE_HIGH },
  ],
};

export function getSymbolOptions(): EyeSymbolOption[] {
  return EYE_SYMBOL_OPTIONS;
}

export function getSymbolById(symbolId: string): EyeSymbolOption {
  return EYE_SYMBOL_OPTIONS.find((symbol) => symbol.id === symbolId) ?? EYE_SYMBOL_OPTIONS[0];
}

export function getRandomSymbol(currentSymbolId?: string): EyeSymbolOption {
  const options = EYE_SYMBOL_OPTIONS.filter((symbol) => symbol.id !== currentSymbolId);
  const pool = options.length > 0 ? options : EYE_SYMBOL_OPTIONS;

  return pool[Math.floor(Math.random() * pool.length)] ?? EYE_SYMBOL_OPTIONS[0];
}

export function getMovementPatternByLevel(level: EyeMuscleLevel): MovementPattern {
  if (level === 1) {
    return "perimeter-corners";
  }

  if (level === 2) {
    return "perimeter-segments";
  }

  if (level === 3) {
    return "diagonal-center";
  }

  if (level === 4) {
    return "horizontal-scan";
  }

  return "vertical-scan";
}

export function getMovementPatternLabel(pattern: MovementPattern): string {
  if (pattern === "perimeter-corners") {
    return "Cevre - koseler";
  }

  if (pattern === "perimeter-segments") {
    return "Cevre - parcali kenarlar";
  }

  if (pattern === "diagonal-center") {
    return "Capraz ve merkez";
  }

  if (pattern === "horizontal-scan") {
    return "Yatay tarama";
  }

  return "Dikey tarama";
}

export function getLevelFromElapsed(
  elapsedSeconds: number,
  startLevel: EyeMuscleLevel,
  levelAnchorSeconds = 0,
): EyeMuscleLevel {
  const elapsedSinceAnchor = Math.max(0, elapsedSeconds - levelAnchorSeconds);

  return Math.min(5, startLevel + Math.floor(elapsedSinceAnchor / 60)) as EyeMuscleLevel;
}

export function getAutomaticLevelChangeCount(completedSeconds: number, startLevel: EyeMuscleLevel): number {
  const safeSeconds = Math.max(0, Math.floor(completedSeconds));
  const reachedLevel = getLevelFromElapsed(safeSeconds, startLevel);

  return Math.max(0, reachedLevel - startLevel);
}

export function getMovementPointsByLevel(level: EyeMuscleLevel): SymbolPosition[] {
  return LEVEL_POINTS[level];
}

export function calculateSymbolPosition(options: SymbolPositionOptions): SymbolPosition {
  const points = LEVEL_POINTS[options.level];
  const safeIndex = ((options.pointIndex % points.length) + points.length) % points.length;

  return points[safeIndex] ?? points[0];
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
