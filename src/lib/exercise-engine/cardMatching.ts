export type CardVisual = {
  id: string;
  title: string;
  src: string;
  fallback: string;
};

export type MatchingCard = {
  id: string;
  visualId: string;
  title: string;
  src: string;
  fallback: string;
  isMatched: boolean;
};

const CARD_VISUALS: CardVisual[] = [
  { id: "apple", title: "Elma", src: "/memory-card-visuals/apple.svg", fallback: "EL" },
  { id: "banana", title: "Muz", src: "/memory-card-visuals/banana.svg", fallback: "MZ" },
  { id: "strawberry", title: "Cilek", src: "/memory-card-visuals/strawberry.svg", fallback: "CL" },
  { id: "watermelon", title: "Karpuz", src: "/memory-card-visuals/watermelon.svg", fallback: "KP" },
  { id: "car", title: "Araba", src: "/memory-card-visuals/car.svg", fallback: "AR" },
  { id: "rocket", title: "Roket", src: "/memory-card-visuals/rocket.svg", fallback: "RK" },
  { id: "train", title: "Tren", src: "/memory-card-visuals/train.svg", fallback: "TR" },
  { id: "plane", title: "Ucak", src: "/memory-card-visuals/plane.svg", fallback: "UC" },
  { id: "cat", title: "Kedi", src: "/memory-card-visuals/cat.svg", fallback: "KD" },
  { id: "dog", title: "Kopek", src: "/memory-card-visuals/dog.svg", fallback: "KO" },
  { id: "sun", title: "Gunes", src: "/memory-card-visuals/sun.svg", fallback: "GN" },
  { id: "star", title: "Yildiz", src: "/memory-card-visuals/star.svg", fallback: "YZ" },
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCardVisuals(): CardVisual[] {
  return CARD_VISUALS;
}

export function shuffleCards<T>(cards: T[]): T[] {
  const nextCards = [...cards];

  for (let index = nextCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextCards[index], nextCards[randomIndex]] = [nextCards[randomIndex], nextCards[index]];
  }

  return nextCards;
}

export function getPairCountByLevel(level: number): number {
  const safeLevel = Math.min(5, Math.max(1, Math.round(level)));
  return [4, 6, 8, 10, 12][safeLevel - 1] ?? 4;
}

export function generateCardDeck(level: number): MatchingCard[] {
  const pairCount = getPairCountByLevel(level);
  const selectedVisuals = shuffleCards(getCardVisuals()).slice(0, pairCount);
  const cards = selectedVisuals.flatMap((visual) => [
    {
      id: createId(`${visual.id}-a`),
      visualId: visual.id,
      title: visual.title,
      src: visual.src,
      fallback: visual.fallback,
      isMatched: false,
    },
    {
      id: createId(`${visual.id}-b`),
      visualId: visual.id,
      title: visual.title,
      src: visual.src,
      fallback: visual.fallback,
      isMatched: false,
    },
  ]);

  return shuffleCards(cards);
}

export function calculateNet(correctCount: number, wrongCount: number): number {
  return correctCount - wrongCount;
}

export function shouldLevelUp(net: number): boolean {
  return net >= 10;
}

export function getNextLevel(level: number): number {
  return Math.min(5, level + 1);
}

export function calculateScore(correctCount: number, wrongCount: number): number {
  return Math.max(0, correctCount * 10 - wrongCount * 5);
}

export function calculateSuccessRate(correctCount: number, wrongCount: number): number {
  const totalMoves = correctCount + wrongCount;
  return totalMoves === 0 ? 0 : Math.round((correctCount / totalMoves) * 100);
}
