export type XpLevelDefinition = {
  level: number;
  title: string;
  startXp: number;
};

export type StudentXpSnapshot = {
  totalXp: number;
  level: number;
  title: string;
  currentLevelStartXp: number;
  nextLevelXp: number;
  xpWithinLevel: number;
  xpRequiredForLevel: number;
  remainingXp: number;
  progressPercent: number;
  nextLevelTitle: string;
};

const BASE_LEVELS: XpLevelDefinition[] = [
  { level: 1, title: "Yeni Başlayan", startXp: 0 },
  { level: 2, title: "Kitap Dostu", startXp: 100 },
  { level: 3, title: "Kaşif Okuyucu", startXp: 250 },
  { level: 4, title: "Hız Avcısı", startXp: 450 },
  { level: 5, title: "Odak Ustası", startXp: 700 },
  { level: 6, title: "Bilge Okuyucu", startXp: 1000 },
  { level: 7, title: "Okuma Şampiyonu", startXp: 1400 },
  { level: 8, title: "Efsane Okuyucu", startXp: 1900 },
];

const EXTENDED_LEVEL_BASE_START_XP = 2500;
const EXTENDED_LEVEL_BASE_GAP = 700;
const EXTENDED_LEVEL_GAP_STEP = 100;
const PROGRESS_MIN = 0;
const PROGRESS_MAX = 100;
const MAX_LEVEL_GUARD = 10_000;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, Math.round(value)));
}

export function normalizeTotalXp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getLevelStartXp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));

  const baseLevel = BASE_LEVELS.find((item) => item.level === safeLevel);
  if (baseLevel) {
    return baseLevel.startXp;
  }

  if (safeLevel <= 8) {
    return BASE_LEVELS[0].startXp;
  }

  const offset = safeLevel - 9;
  return EXTENDED_LEVEL_BASE_START_XP + (EXTENDED_LEVEL_BASE_GAP * offset) + (EXTENDED_LEVEL_GAP_STEP * offset * (offset - 1)) / 2;
}

export function getLevelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level));
  const baseLevel = BASE_LEVELS.find((item) => item.level === safeLevel);

  if (baseLevel) {
    return baseLevel.title;
  }

  return `Efsane Okuyucu • Seviye ${safeLevel}`;
}

export function getLevelDefinition(level: number): XpLevelDefinition {
  const safeLevel = Math.max(1, Math.floor(level));
  return {
    level: safeLevel,
    title: getLevelTitle(safeLevel),
    startXp: getLevelStartXp(safeLevel),
  };
}

export function getLevelForTotalXp(totalXp: number): number {
  const safeTotalXp = normalizeTotalXp(totalXp);
  let level = 1;

  for (let candidate = 1; candidate < MAX_LEVEL_GUARD; candidate += 1) {
    const nextStartXp = getLevelStartXp(candidate + 1);
    if (safeTotalXp < nextStartXp) {
      level = candidate;
      break;
    }

    level = candidate + 1;
  }

  return level;
}

export function getStudentXpSnapshot(totalXp: number): StudentXpSnapshot {
  const safeTotalXp = normalizeTotalXp(totalXp);
  const level = getLevelForTotalXp(safeTotalXp);
  const currentLevelStartXp = getLevelStartXp(level);
  const nextLevelXp = getLevelStartXp(level + 1);
  const xpWithinLevel = Math.max(0, safeTotalXp - currentLevelStartXp);
  const xpRequiredForLevel = Math.max(1, nextLevelXp - currentLevelStartXp);
  const remainingXp = Math.max(0, nextLevelXp - safeTotalXp);
  const progressPercent = clampProgress((xpWithinLevel / xpRequiredForLevel) * 100);

  return {
    totalXp: safeTotalXp,
    level,
    title: getLevelTitle(level),
    currentLevelStartXp,
    nextLevelXp,
    xpWithinLevel,
    xpRequiredForLevel,
    remainingXp,
    progressPercent,
    nextLevelTitle: getLevelTitle(level + 1),
  };
}

export function createDefaultStudentXpSnapshot(): StudentXpSnapshot {
  return getStudentXpSnapshot(0);
}

