export type PuzzleImage = {
  id: string;
  title: string;
  src: string;
  fallback: string;
};

export type PuzzleGrid = {
  rows: number;
  cols: number;
};

export type PuzzleTile = {
  id: string;
  imageId: string;
  imageSrc: string;
  fallback: string;
  correctIndex: number;
  currentIndex: number;
  row: number;
  col: number;
};

const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: "apple", title: "Elma", src: "/memory-card-visuals/apple.svg", fallback: "EL" },
  { id: "rocket", title: "Roket", src: "/memory-card-visuals/rocket.svg", fallback: "RK" },
  { id: "lion", title: "Aslan", src: "/memory-card-visuals/lion.svg", fallback: "AS" },
  { id: "turtle", title: "Kaplumbaga", src: "/memory-card-visuals/turtle.svg", fallback: "KP" },
  { id: "rainbow", title: "Gokkusagi", src: "/memory-card-visuals/rainbow.svg", fallback: "GK" },
  { id: "robot", title: "Robot", src: "/memory-card-visuals/robot.svg", fallback: "RB" },
  { id: "unicorn", title: "Tek Boynuzlu At", src: "/memory-card-visuals/unicorn.svg", fallback: "TB" },
  { id: "sun", title: "Gunes", src: "/memory-card-visuals/sun.svg", fallback: "GN" },
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPuzzleImages(): PuzzleImage[] {
  return PUZZLE_IMAGES;
}

export function getGridByLevel(level: number): PuzzleGrid {
  const safeLevel = Math.min(5, Math.max(1, Math.round(level)));
  const grids: PuzzleGrid[] = [
    { rows: 2, cols: 2 },
    { rows: 2, cols: 3 },
    { rows: 3, cols: 3 },
    { rows: 3, cols: 4 },
    { rows: 4, cols: 4 },
  ];

  return grids[safeLevel - 1] ?? grids[0];
}

export function shufflePuzzlePieces<T>(pieces: T[]): T[] {
  const nextPieces = [...pieces];

  for (let index = nextPieces.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextPieces[index], nextPieces[randomIndex]] = [nextPieces[randomIndex], nextPieces[index]];
  }

  return nextPieces;
}

function createShuffledIndexes(total: number): number[] {
  let indexes = Array.from({ length: total }, (_, index) => index);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    indexes = shufflePuzzlePieces(indexes);
    const misplacedCount = indexes.filter((currentIndex, correctIndex) => currentIndex !== correctIndex).length;

    if (misplacedCount >= Math.min(3, total)) {
      return indexes;
    }
  }

  if (total > 1) {
    [indexes[0], indexes[1]] = [indexes[1], indexes[0]];
  }

  return indexes;
}

export function generatePuzzlePieces(image: PuzzleImage, level: number): PuzzleTile[] {
  const grid = getGridByLevel(level);
  const total = grid.rows * grid.cols;
  const shuffledCurrentIndexes = createShuffledIndexes(total);

  return Array.from({ length: total }, (_, correctIndex) => {
    const row = Math.floor(correctIndex / grid.cols);
    const col = correctIndex % grid.cols;

    return {
      id: createId(`${image.id}-${correctIndex}`),
      imageId: image.id,
      imageSrc: image.src,
      fallback: image.fallback,
      correctIndex,
      currentIndex: shuffledCurrentIndexes[correctIndex],
      row,
      col,
    };
  });
}

export function checkPiecePlacement(piece: PuzzleTile): boolean {
  return piece.correctIndex === piece.currentIndex;
}

export function countCorrectlyPlacedPieces(pieces: PuzzleTile[]): number {
  return pieces.filter((piece) => checkPiecePlacement(piece)).length;
}

export function isPuzzleCompleted(pieces: PuzzleTile[]): boolean {
  return pieces.length > 0 && pieces.every((piece) => checkPiecePlacement(piece));
}

export function swapPuzzleTiles(pieces: PuzzleTile[], firstId: string, secondId: string): PuzzleTile[] {
  const firstPiece = pieces.find((piece) => piece.id === firstId);
  const secondPiece = pieces.find((piece) => piece.id === secondId);

  if (!firstPiece || !secondPiece || firstPiece.id === secondPiece.id) {
    return pieces;
  }

  return pieces.map((piece) => {
    if (piece.id === firstPiece.id) {
      return { ...piece, currentIndex: secondPiece.currentIndex };
    }

    if (piece.id === secondPiece.id) {
      return { ...piece, currentIndex: firstPiece.currentIndex };
    }

    return piece;
  });
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
