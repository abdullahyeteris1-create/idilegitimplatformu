/**
 * "Moda Hafizasi" gorsel hafiza oyununun saf (React'tan bagimsiz) mantigi.
 *
 * Oyuncuya tam boy bir karakter gosterilir; karakterin uzerindeki bazi
 * parcalarin (ust kiyafet / canta / ayakkabi / sac aksesuari) renkleri
 * hatirlanip yeniden secilir. Bu dosya sadece veri + hesaplama icerir,
 * boylece tests/moda-hafizasi-*.test.mjs icinden dogrudan test edilebilir.
 */

export type FashionSlotId = "top" | "bag" | "shoes" | "accessory";
export type FashionColorFamily = "pembe" | "mor" | "mavi" | "yesil" | "sicak" | "notr";
export type FashionDifficultyId = "baslangic" | "ileri" | "usta" | "uzman";
export type FashionSpeedId = "rahat" | "normal" | "hizli";

export type FashionColor = {
  id: string;
  label: string;
  hex: string;
  family: FashionColorFamily;
  /** Cekirdek 10 renk her seviyede kullanilir; digerleri yalnizca Usta/Uzman seviyesinde devreye girer. */
  core: boolean;
};

/**
 * Ayni aileden renkler (orn. pembe/fusya/gul kurusu) bilerek birbirine yakin
 * secilmistir - Usta ve Uzman seviyelerinde yaniltici secenek olarak kullanilir.
 */
export const FASHION_COLORS: FashionColor[] = [
  { id: "pembe", label: "Pembe", hex: "#FF7EB3", family: "pembe", core: true },
  { id: "fusya", label: "Fuşya", hex: "#E12C86", family: "pembe", core: false },
  { id: "gul-kurusu", label: "Gül Kurusu", hex: "#F2A7BE", family: "pembe", core: false },
  { id: "mor", label: "Mor", hex: "#8B5CF6", family: "mor", core: true },
  { id: "lila", label: "Lila", hex: "#C9AEF8", family: "mor", core: true },
  { id: "menekse", label: "Menekşe", hex: "#6D28D9", family: "mor", core: false },
  { id: "mavi", label: "Mavi", hex: "#3B82F6", family: "mavi", core: true },
  { id: "gok-mavisi", label: "Gök Mavisi", hex: "#7CC7F5", family: "mavi", core: false },
  { id: "lacivert", label: "Lacivert", hex: "#26418F", family: "mavi", core: false },
  { id: "turkuaz", label: "Turkuaz", hex: "#2DD4BF", family: "yesil", core: true },
  { id: "yesil", label: "Yeşil", hex: "#3CBF7E", family: "yesil", core: true },
  { id: "mint", label: "Mint", hex: "#A9E7C6", family: "yesil", core: false },
  { id: "sari", label: "Sarı", hex: "#FBC638", family: "sicak", core: true },
  { id: "turuncu", label: "Turuncu", hex: "#FB8C3C", family: "sicak", core: true },
  { id: "mercan", label: "Mercan", hex: "#FF8A7A", family: "sicak", core: false },
  { id: "kirmizi", label: "Kırmızı", hex: "#EE4444", family: "sicak", core: true },
  { id: "beyaz", label: "Beyaz", hex: "#FFFFFF", family: "notr", core: true },
  { id: "krem", label: "Krem", hex: "#FBEBD3", family: "notr", core: false },
];

const COLOR_BY_ID = new Map(FASHION_COLORS.map((color) => [color.id, color]));

export function getFashionColor(id: string): FashionColor {
  const color = COLOR_BY_ID.get(id);
  if (!color) throw new Error("Bilinmeyen moda rengi: " + id);
  return color;
}

export function getFashionColorHex(id: string | null): string | null {
  return id ? getFashionColor(id).hex : null;
}

/** Baslangic seviyesinde kullanilan, birbirinden acikca ayrilan kucuk palet. */
const BEGINNER_COLOR_IDS = ["pembe", "mor", "mavi", "yesil", "sari", "turuncu", "kirmizi", "beyaz"];

export const FASHION_SLOTS: { id: FashionSlotId; label: string; shortLabel: string; icon: string }[] = [
  { id: "top", label: "Üst Kıyafet", shortLabel: "Üst", icon: "👕" },
  { id: "bag", label: "Çanta", shortLabel: "Çanta", icon: "👜" },
  { id: "shoes", label: "Ayakkabı", shortLabel: "Ayakkabı", icon: "👟" },
  { id: "accessory", label: "Saç Aksesuarı", shortLabel: "Aksesuar", icon: "🎀" },
];

export function getFashionSlot(id: FashionSlotId) {
  const slot = FASHION_SLOTS.find((item) => item.id === id);
  if (!slot) throw new Error("Bilinmeyen moda slotu: " + id);
  return slot;
}

export const HAIR_STYLES = ["duz-uzun", "bob", "at-kuyrugu", "topuz", "orgulu"] as const;
export const TOP_STYLES = ["tisort", "kazak", "elbise", "askili"] as const;
export const BOTTOM_STYLES = ["etek", "pantolon", "sort"] as const;
export const SHOE_STYLES = ["spor", "bot", "babet"] as const;
export const BAG_STYLES = ["sirt", "omuz", "mini"] as const;
export const ACCESSORY_STYLES = ["toka", "tac", "fiyonk", "bant"] as const;

export type HairStyleId = (typeof HAIR_STYLES)[number];
export type TopStyleId = (typeof TOP_STYLES)[number];
export type BottomStyleId = (typeof BOTTOM_STYLES)[number];
export type ShoeStyleId = (typeof SHOE_STYLES)[number];
export type BagStyleId = (typeof BAG_STYLES)[number];
export type AccessoryStyleId = (typeof ACCESSORY_STYLES)[number];

export type SkinTone = { base: string; shade: string };

export const SKIN_TONES: SkinTone[] = [
  { base: "#FFE1CB", shade: "#F0BE9C" },
  { base: "#F8CEA9", shade: "#E0A67D" },
  { base: "#E0A97C", shade: "#C4855A" },
  { base: "#B57A4F", shade: "#94603A" },
];

export const HAIR_COLORS = ["#2F2A36", "#54341F", "#8B5E34", "#C79A4C", "#A2452B"];
export const EYE_COLORS = ["#5C4033", "#2F6F8F", "#4A7C59", "#7A5C3E"];

/**
 * Alt kiyafet hatirlanan parcalardan biri DEGIL; bu yuzden renkleri bilerek
 * cevap paletinin disinda (notr denim/gri tonlari) tutuluyor ki ogrenci
 * yanlislikla alt kiyafeti hatirlamaya calismasin.
 */
export const BOTTOM_COLORS = ["#5B6B8C", "#7A8598", "#4A5568", "#8A7B6B", "#63577A"];

export type FashionDifficulty = {
  id: FashionDifficultyId;
  label: string;
  description: string;
  slots: FashionSlotId[];
  optionCount: number;
  /**
   * Dogru cevapla ayni renk ailesinden kac yaniltici secenek hedeflensin.
   * Ailedeki renk sayisi yetmezse mevcut olanlarin tamami kullanilir
   * (orn. notr ailede yalnizca beyaz + krem var).
   */
  confusableCount: number;
  colorIds: string[];
  /** Hiz ayarindan gelen sureyi carpan katsayi. */
  durationFactor: number;
  /** Tur ilerledikce sure kisalsin mi. */
  ramp: boolean;
};

const CORE_COLOR_IDS = FASHION_COLORS.filter((color) => color.core).map((color) => color.id);
const ALL_COLOR_IDS = FASHION_COLORS.map((color) => color.id);

export const FASHION_DIFFICULTIES: FashionDifficulty[] = [
  {
    id: "baslangic",
    label: "Başlangıç",
    description: "3 parça · az renk · uzun süre",
    slots: ["top", "bag", "shoes"],
    optionCount: 4,
    confusableCount: 0,
    colorIds: BEGINNER_COLOR_IDS,
    durationFactor: 1.25,
    ramp: false,
  },
  {
    id: "ileri",
    label: "İleri",
    description: "4 parça · daha çok renk · normal süre",
    slots: ["top", "bag", "shoes", "accessory"],
    optionCount: 6,
    confusableCount: 0,
    colorIds: CORE_COLOR_IDS,
    durationFactor: 1,
    ramp: false,
  },
  {
    id: "usta",
    label: "Usta",
    description: "4 parça · benzer renkler · kısa süre",
    slots: ["top", "bag", "shoes", "accessory"],
    optionCount: 6,
    confusableCount: 2,
    colorIds: ALL_COLOR_IDS,
    durationFactor: 0.82,
    ramp: false,
  },
  {
    id: "uzman",
    label: "Uzman",
    description: "4 parça · tüm renkler · tur ilerledikçe zorlaşır",
    slots: ["top", "bag", "shoes", "accessory"],
    optionCount: 8,
    confusableCount: 3,
    colorIds: ALL_COLOR_IDS,
    durationFactor: 0.72,
    ramp: true,
  },
];

export function getFashionDifficulty(id: FashionDifficultyId): FashionDifficulty {
  const difficulty = FASHION_DIFFICULTIES.find((item) => item.id === id);
  if (!difficulty) throw new Error("Bilinmeyen zorluk: " + id);
  return difficulty;
}

export type FashionSpeed = { id: FashionSpeedId; label: string; icon: string; baseMs: number };

export const FASHION_SPEEDS: FashionSpeed[] = [
  { id: "rahat", label: "Rahat", icon: "🐢", baseMs: 7000 },
  { id: "normal", label: "Normal", icon: "🚶", baseMs: 5000 },
  { id: "hizli", label: "Hızlı", icon: "⚡", baseMs: 3000 },
];

export function getFashionSpeed(id: FashionSpeedId): FashionSpeed {
  const speed = FASHION_SPEEDS.find((item) => item.id === id);
  if (!speed) throw new Error("Bilinmeyen hiz: " + id);
  return speed;
}

export const FASHION_TOTAL_ROUNDS = 10;
const MIN_MEMORIZE_MS = 1600;
const MAX_MEMORIZE_MS = 12000;

/**
 * Zorluk seviyesi ve hiz ayari birbirinden bagimsiz calisir: hiz temel sureyi,
 * zorluk ise bu sureye uygulanan katsayiyi belirler.
 */
export function getMemorizeDurationMs(
  difficultyId: FashionDifficultyId,
  speedId: FashionSpeedId,
  roundIndex = 0,
): number {
  const difficulty = getFashionDifficulty(difficultyId);
  const speed = getFashionSpeed(speedId);
  let duration = speed.baseMs * difficulty.durationFactor;

  if (difficulty.ramp) {
    duration *= Math.max(0.72, 1 - roundIndex * 0.03);
  }

  const rounded = Math.round(duration / 100) * 100;
  return Math.min(MAX_MEMORIZE_MS, Math.max(MIN_MEMORIZE_MS, rounded));
}

export type FashionLook = {
  hairStyle: HairStyleId;
  hairColor: string;
  skinTone: SkinTone;
  eyeColor: string;
  topStyle: TopStyleId;
  bottomStyle: BottomStyleId | "none";
  bottomColor: string;
  shoeStyle: ShoeStyleId;
  bagStyle: BagStyleId;
  accessoryStyle: AccessoryStyleId | "none";
};

export type FashionSelection = Record<FashionSlotId, string | null>;

export type FashionRound = {
  index: number;
  slots: FashionSlotId[];
  look: FashionLook;
  answer: FashionSelection;
  options: Record<FashionSlotId, string[]>;
  memorizeMs: number;
};

export function createEmptySelection(): FashionSelection {
  return { top: null, bag: null, shoes: null, accessory: null };
}

type RandomFn = () => number;

function pick<T>(items: readonly T[], random: RandomFn): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

/**
 * Bir slot icin renk seceneklerini uretir.
 * - confusableCount > 0 ise dogru cevapla ayni aileden yaniltici renkler
 *   garanti edilir (Usta/Uzman).
 * - confusableCount === 0 ise once farkli ailelerden renk secilir, boylece
 *   dusuk seviyelerde secenekler birbirine karismaz.
 */
export function buildColorOptions(
  answerId: string,
  poolIds: readonly string[],
  optionCount: number,
  confusableCount: number,
  random: RandomFn,
): string[] {
  const pool = poolIds.map(getFashionColor);
  const answer = getFashionColor(answerId);
  const chosen: FashionColor[] = [answer];
  const taken = new Set([answer.id]);

  if (confusableCount > 0) {
    const sameFamily = shuffle(
      pool.filter((color) => color.family === answer.family && !taken.has(color.id)),
      random,
    );
    for (const color of sameFamily) {
      if (chosen.length - 1 >= confusableCount || chosen.length >= optionCount) break;
      chosen.push(color);
      taken.add(color.id);
    }
  } else {
    const usedFamilies = new Set<FashionColorFamily>([answer.family]);
    for (const color of shuffle(pool, random)) {
      if (chosen.length >= optionCount) break;
      if (taken.has(color.id) || usedFamilies.has(color.family)) continue;
      chosen.push(color);
      taken.add(color.id);
      usedFamilies.add(color.family);
    }
  }

  for (const color of shuffle(pool, random)) {
    if (chosen.length >= optionCount) break;
    if (taken.has(color.id)) continue;
    chosen.push(color);
    taken.add(color.id);
  }

  return shuffle(chosen, random).map((color) => color.id);
}

function createLook(slots: readonly FashionSlotId[], random: RandomFn): FashionLook {
  const topStyle = pick(TOP_STYLES, random);
  // Elbise zaten tek parca oldugu icin ayri bir alt kiyafet cizilmez.
  const bottomStyle: BottomStyleId | "none" = topStyle === "elbise" ? "none" : pick(BOTTOM_STYLES, random);

  return {
    hairStyle: pick(HAIR_STYLES, random),
    hairColor: pick(HAIR_COLORS, random),
    skinTone: pick(SKIN_TONES, random),
    eyeColor: pick(EYE_COLORS, random),
    topStyle,
    bottomStyle,
    bottomColor: pick(BOTTOM_COLORS, random),
    shoeStyle: pick(SHOE_STYLES, random),
    bagStyle: pick(BAG_STYLES, random),
    accessoryStyle: slots.includes("accessory") ? pick(ACCESSORY_STYLES, random) : "none",
  };
}

function styleSignature(look: FashionLook): string {
  return [look.hairStyle, look.topStyle, look.bottomStyle, look.shoeStyle, look.bagStyle, look.accessoryStyle].join("|");
}

function isTooSimilar(
  candidate: { answer: FashionSelection; look: FashionLook },
  history: readonly { answer: FashionSelection; look: FashionLook }[],
  slots: readonly FashionSlotId[],
): boolean {
  const recent = history.slice(-3);

  for (let index = 0; index < recent.length; index += 1) {
    const previous = recent[index];
    const isImmediatePrevious = index === recent.length - 1;
    let matching = 0;

    for (const slot of slots) {
      if (previous.answer[slot] && previous.answer[slot] === candidate.answer[slot]) matching += 1;
    }

    if (matching === slots.length) return true;
    if (isImmediatePrevious && matching >= slots.length - 1) return true;
    if (isImmediatePrevious && styleSignature(previous.look) === styleSignature(candidate.look)) return true;
  }

  return false;
}

const MAX_ROUND_ATTEMPTS = 60;

/**
 * Yeni bir tur uretir. history son turlarin kombinasyonlarini icerir; arka
 * arkaya ayni ya da cok benzer kombinasyonlar bu sayede elenir.
 */
export function createFashionRound(params: {
  index: number;
  difficultyId: FashionDifficultyId;
  speedId: FashionSpeedId;
  history?: readonly { answer: FashionSelection; look: FashionLook }[];
  random?: RandomFn;
}): FashionRound {
  const { index, difficultyId, speedId } = params;
  const random = params.random ?? Math.random;
  const history = params.history ?? [];
  const difficulty = getFashionDifficulty(difficultyId);
  const slots = difficulty.slots;

  let candidate: { answer: FashionSelection; look: FashionLook } | null = null;

  for (let attempt = 0; attempt < MAX_ROUND_ATTEMPTS; attempt += 1) {
    const answer = createEmptySelection();
    const used = new Set<string>();

    // Ayni tur icinde her parca farkli renk alir; bu, sonuc ekranindaki
    // karsilastirmanin okunakli kalmasini saglar.
    for (const slot of slots) {
      const available = difficulty.colorIds.filter((colorId) => !used.has(colorId));
      const colorId = pick(available.length > 0 ? available : difficulty.colorIds, random);
      answer[slot] = colorId;
      used.add(colorId);
    }

    candidate = { answer, look: createLook(slots, random) };
    if (!isTooSimilar(candidate, history, slots)) break;
  }

  const resolved = candidate ?? { answer: createEmptySelection(), look: createLook(slots, random) };
  const options: Record<FashionSlotId, string[]> = { top: [], bag: [], shoes: [], accessory: [] };

  for (const slot of slots) {
    const answerId = resolved.answer[slot];
    if (!answerId) continue;
    options[slot] = buildColorOptions(
      answerId,
      difficulty.colorIds,
      difficulty.optionCount,
      difficulty.confusableCount,
      random,
    );
  }

  return {
    index,
    slots: [...slots],
    look: resolved.look,
    answer: resolved.answer,
    options,
    memorizeMs: getMemorizeDurationMs(difficultyId, speedId, index),
  };
}

export const FASHION_MAX_SPEED_BONUS = 15;
const SPEED_BONUS_LIMIT_MS = 20000;

export type FashionRoundResult = {
  slots: FashionSlotId[];
  correctSlots: FashionSlotId[];
  wrongSlots: FashionSlotId[];
  correctCount: number;
  totalCount: number;
  baseScore: number;
  speedBonus: number;
  score: number;
  responseMs: number;
};

/**
 * Turu degerlendirir. Hiz bonusu hem dogruluk oraniyla hem de ust sinirla
 * kisitlidir - boylece hizli ama yanlis cevap, yavas ama dogru cevabin onune
 * gecemez.
 */
export function evaluateFashionRound(
  round: FashionRound,
  selection: FashionSelection,
  responseMs: number,
): FashionRoundResult {
  const correctSlots: FashionSlotId[] = [];
  const wrongSlots: FashionSlotId[] = [];

  for (const slot of round.slots) {
    if (selection[slot] && selection[slot] === round.answer[slot]) correctSlots.push(slot);
    else wrongSlots.push(slot);
  }

  const totalCount = round.slots.length;
  const correctCount = correctSlots.length;
  const ratio = totalCount > 0 ? correctCount / totalCount : 0;
  const baseScore = Math.round(100 * ratio);
  const timeFactor = Math.min(1, Math.max(0, (SPEED_BONUS_LIMIT_MS - responseMs) / SPEED_BONUS_LIMIT_MS));
  const speedBonus = Math.round(FASHION_MAX_SPEED_BONUS * ratio * timeFactor);

  return {
    slots: [...round.slots],
    correctSlots,
    wrongSlots,
    correctCount,
    totalCount,
    baseScore,
    speedBonus,
    score: baseScore + speedBonus,
    responseMs,
  };
}

export type FashionGameSummary = {
  totalScore: number;
  correctPieces: number;
  wrongPieces: number;
  totalPieces: number;
  successPercent: number;
  averageResponseMs: number;
  roundsPlayed: number;
};

export function summarizeFashionGame(results: readonly FashionRoundResult[]): FashionGameSummary {
  const totalScore = results.reduce((sum, item) => sum + item.score, 0);
  const correctPieces = results.reduce((sum, item) => sum + item.correctCount, 0);
  const totalPieces = results.reduce((sum, item) => sum + item.totalCount, 0);
  const responseSum = results.reduce((sum, item) => sum + item.responseMs, 0);

  return {
    totalScore,
    correctPieces,
    wrongPieces: totalPieces - correctPieces,
    totalPieces,
    successPercent: totalPieces > 0 ? Math.round((correctPieces / totalPieces) * 100) : 0,
    averageResponseMs: results.length > 0 ? Math.round(responseSum / results.length) : 0,
    roundsPlayed: results.length,
  };
}

export function getFashionPerformanceMessage(successPercent: number): string {
  if (successPercent >= 90) return "Muhteşem bir görsel hafıza!";
  if (successPercent >= 75) return "Harika gidiyorsun!";
  if (successPercent >= 50) return "Biraz daha dikkat, çok iyi olacak!";
  return "Tekrar deneyerek hafızanı güçlendirebilirsin!";
}
