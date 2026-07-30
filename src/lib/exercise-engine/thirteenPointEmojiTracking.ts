export type ThirteenPointPositionId =
  | "center"
  | "inner-north-west"
  | "inner-north-east"
  | "inner-south-east"
  | "inner-south-west"
  | "outer-north-west"
  | "outer-north-east"
  | "outer-south-east"
  | "outer-south-west"
  | "edge-north"
  | "edge-east"
  | "edge-south"
  | "edge-west";

export type ThirteenPointPosition = {
  id: ThirteenPointPositionId;
  x: number;
  y: number;
  group: "center" | "inner" | "outer" | "edge";
};

export type MovementPattern =
  | "sequential"
  | "reverse"
  | "random"
  | "center-out"
  | "outer-center";

export const THIRTEEN_POINT_POSITIONS: readonly ThirteenPointPosition[] = [
  { id: "center", x: 50, y: 50, group: "center" },
  { id: "inner-north-west", x: 34, y: 34, group: "inner" },
  { id: "inner-north-east", x: 66, y: 34, group: "inner" },
  { id: "inner-south-east", x: 66, y: 66, group: "inner" },
  { id: "inner-south-west", x: 34, y: 66, group: "inner" },
  { id: "outer-north-west", x: 12, y: 12, group: "outer" },
  { id: "outer-north-east", x: 88, y: 12, group: "outer" },
  { id: "outer-south-east", x: 88, y: 88, group: "outer" },
  { id: "outer-south-west", x: 12, y: 88, group: "outer" },
  { id: "edge-north", x: 50, y: 12, group: "edge" },
  { id: "edge-east", x: 88, y: 50, group: "edge" },
  { id: "edge-south", x: 50, y: 88, group: "edge" },
  { id: "edge-west", x: 12, y: 50, group: "edge" },
] as const;

export const MOVEMENT_PATTERN_OPTIONS: readonly { value: MovementPattern; label: string }[] = [
  { value: "sequential", label: "Sıralı" },
  { value: "reverse", label: "Ters Sıralı" },
  { value: "random", label: "Rastgele" },
  { value: "center-out", label: "Merkezden Dışa" },
  { value: "outer-center", label: "Dıştan Merkeze" },
];

export const EMOJI_OPTIONS = [
  { value: "⭐", label: "Yıldız" },
  { value: "❤️", label: "Kalp" },
  { value: "🔵", label: "Mavi Daire" },
  { value: "🟢", label: "Yeşil Daire" },
  { value: "🔴", label: "Kırmızı Daire" },
  { value: "🐱", label: "Kedi" },
  { value: "🦋", label: "Kelebek" },
  { value: "🚀", label: "Roket" },
  { value: "⚽", label: "Top" },
  { value: "🍎", label: "Elma" },
  { value: "👁️", label: "Göz" },
  { value: "💎", label: "Elmas" },
] as const;

export const RANDOM_EMOJI_VALUE = "random";
export const SPEED_OPTIONS = [5000, 3000, 2000, 1500, 1000, 700, 450, 300] as const;
export const DURATION_OPTIONS = [30, 60, 120, 180, 300] as const;

const CENTER = THIRTEEN_POINT_POSITIONS[0];
const OUTER = THIRTEEN_POINT_POSITIONS.filter((position) => position.group === "outer");
const CENTER_OUT_SEQUENCE = [
  CENTER,
  THIRTEEN_POINT_POSITIONS[1], OUTER[0],
  THIRTEEN_POINT_POSITIONS[2], OUTER[1],
  THIRTEEN_POINT_POSITIONS[3], OUTER[2],
  THIRTEEN_POINT_POSITIONS[4], OUTER[3],
  THIRTEEN_POINT_POSITIONS[9], THIRTEEN_POINT_POSITIONS[10],
  THIRTEEN_POINT_POSITIONS[11], THIRTEEN_POINT_POSITIONS[12],
];
const OUTER_CENTER_SEQUENCE = [
  OUTER[0], CENTER, OUTER[1], CENTER, OUTER[2], CENTER, OUTER[3], CENTER,
  THIRTEEN_POINT_POSITIONS[9], CENTER, THIRTEEN_POINT_POSITIONS[10], CENTER,
  THIRTEEN_POINT_POSITIONS[11], CENTER, THIRTEEN_POINT_POSITIONS[12], CENTER,
];

export function getPatternSequence(pattern: MovementPattern): readonly ThirteenPointPosition[] {
  if (pattern === "reverse") return [...THIRTEEN_POINT_POSITIONS].reverse();
  if (pattern === "center-out") return CENTER_OUT_SEQUENCE;
  if (pattern === "outer-center") return OUTER_CENTER_SEQUENCE;
  return THIRTEEN_POINT_POSITIONS;
}

export function getNextRandomPositionIndex(currentIndex: number, length: number, random = Math.random): number {
  if (length <= 1) return 0;
  const current = ((currentIndex % length) + length) % length;
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

export function getNextPositionIndex(
  pattern: MovementPattern,
  currentIndex: number,
  random = Math.random,
): number {
  const sequence = getPatternSequence(pattern);
  if (pattern !== "random") return (currentIndex + 1) % sequence.length;
  return getNextRandomPositionIndex(currentIndex, sequence.length, random);
}

export function chooseEmoji(
  mode: "fixed" | "random",
  fixedEmoji: string,
  previousEmoji: string | null,
  random = Math.random,
): string {
  if (mode === "fixed") return fixedEmoji;
  if (EMOJI_OPTIONS.length <= 1) return EMOJI_OPTIONS[0].value;
  const available = EMOJI_OPTIONS.filter((option) => option.value !== previousEmoji);
  return available[Math.floor(random() * available.length)]?.value ?? EMOJI_OPTIONS[0].value;
}

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
