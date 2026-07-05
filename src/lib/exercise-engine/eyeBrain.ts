export type EyeBrainSymbol = {
  id: string;
  label: string;
  file: string;
  emoji: string;
};

export type EyeBrainPosition = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

export type EyeBrainSymbolPlacement = EyeBrainSymbol & EyeBrainPosition;

const EYE_BRAIN_SYMBOLS: EyeBrainSymbol[] = [
  { id: "yellow-star", label: "Sari Yildiz", file: "/eye-symbols/yellow-star.svg", emoji: "⭐" },
  { id: "red-circle", label: "Kirmizi Daire", file: "/eye-symbols/red-circle.svg", emoji: "🔴" },
  { id: "blue-diamond", label: "Mavi Elmas", file: "/eye-symbols/blue-diamond.svg", emoji: "🔵" },
  { id: "green-triangle", label: "Yesil Ucgen", file: "/eye-symbols/green-triangle.svg", emoji: "🟢" },
  { id: "purple-heart", label: "Mor Kalp", file: "/eye-symbols/purple-heart.svg", emoji: "❤️" },
  { id: "orange-square", label: "Turuncu Kare", file: "/eye-symbols/orange-square.svg", emoji: "🟡" },
  { id: "bee", label: "Ari", file: "/eye-symbols/bee.svg", emoji: "🐝" },
  { id: "turtle", label: "Kaplumbaga", file: "/eye-symbols/turtle.svg", emoji: "🐢" },
  { id: "lion", label: "Aslan", file: "/eye-symbols/lion.svg", emoji: "🦁" },
  { id: "butterfly", label: "Kelebek", file: "/eye-symbols/pink-flower.svg", emoji: "🦋" },
  { id: "rocket", label: "Roket", file: "/eye-symbols/rocket.svg", emoji: "🚀" },
  { id: "rainbow", label: "Gokkusagi", file: "/eye-symbols/rainbow.svg", emoji: "🌈" },
  { id: "eye", label: "Goz", file: "/eye-symbols/eye.svg", emoji: "👁️" },
  { id: "target", label: "Hedef", file: "/eye-symbols/target.svg", emoji: "🎯" },
  { id: "sun", label: "Gunes", file: "/eye-symbols/sun.svg", emoji: "☀️" },
  { id: "moon", label: "Ay", file: "/eye-symbols/moon.svg", emoji: "🌙" },
];

const SPEED_OPTIONS = [1000, 1250, 1500, 1750, 2000, 2250, 2500] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: EyeBrainPosition, b: EyeBrainPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function createPosition(existing: EyeBrainPosition[] = []): EyeBrainPosition {
  let candidate: EyeBrainPosition = {
    x: 8 + Math.random() * 84,
    y: 12 + Math.random() * 70,
    rotate: -12 + Math.random() * 24,
    scale: 0.92 + Math.random() * 0.18,
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const isOverlapping = existing.some((item) => distance(item, candidate) < 10);
    if (!isOverlapping) {
      return candidate;
    }

    candidate = {
      x: 8 + Math.random() * 84,
      y: 12 + Math.random() * 70,
      rotate: -12 + Math.random() * 24,
      scale: 0.92 + Math.random() * 0.18,
    };
  }

  return candidate;
}

export function getEyeBrainSymbols(): EyeBrainSymbol[] {
  return [...EYE_BRAIN_SYMBOLS];
}

export function getRandomPosition(existing: EyeBrainPosition[] = []): EyeBrainPosition {
  const nextPosition = createPosition(existing);

  return {
    x: clamp(nextPosition.x, 8, 92),
    y: clamp(nextPosition.y, 12, 82),
    rotate: nextPosition.rotate,
    scale: nextPosition.scale,
  };
}

export function generateSymbolPositions(count: number): EyeBrainPosition[] {
  const safeCount = Math.max(0, Math.floor(count));
  const positions: EyeBrainPosition[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    positions.push(getRandomPosition(positions));
  }

  return positions;
}

export function shuffleSymbolPositions(symbols: EyeBrainSymbol[]): EyeBrainSymbolPlacement[] {
  const positions = generateSymbolPositions(symbols.length);

  return symbols.map((symbol, index) => ({
    ...symbol,
    ...positions[index],
  }));
}

export function getSpeedOptions(): number[] {
  return [...SPEED_OPTIONS];
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}