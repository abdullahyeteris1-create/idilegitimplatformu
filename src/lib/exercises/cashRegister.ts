import { randomInt, shuffle } from "@/lib/exercises/mentalArithmetic";

export type CashRegisterLevel = "beginner" | "advanced" | "master" | "expert";
export type CashRegisterMode = "shopping" | "change" | "budget";

export type CashRegisterProduct = { id: number; name: string; emoji: string; base: number; price: number };
export type CashRegisterRound = {
  items: CashRegisterProduct[];
  targetIds: number[];
  answer: number;
  mode: CashRegisterMode;
  targetNames: string;
  payment?: number;
  budget?: number;
};

export const CASH_REGISTER_LEVEL_CONFIG: Record<CashRegisterLevel, { label: string; min: number; max: number; items: number; targetCount: [number, number] }> = {
  beginner: { label: "Başlangıç", min: 3, max: 25, items: 6, targetCount: [2, 3] },
  advanced: { label: "İleri", min: 5, max: 50, items: 8, targetCount: [2, 4] },
  master: { label: "Usta", min: 8, max: 80, items: 8, targetCount: [3, 5] },
  expert: { label: "Uzman", min: 10, max: 120, items: 10, targetCount: [3, 6] },
};

export const CASH_REGISTER_TOTAL_ROUNDS = 10;
export const CASH_REGISTER_PAYMENT_OPTIONS = [10, 20, 50, 100, 200, 500] as const;

export const CASH_REGISTER_CATALOG = [
  ["Elma", "🍎", 7], ["Muz", "🍌", 8], ["Ekmek", "🍞", 12], ["Süt", "🥛", 15],
  ["Peynir", "🧀", 24], ["Yumurta", "🥚", 18], ["Meyve Suyu", "🧃", 14], ["Çikolata", "🍫", 11],
  ["Kurabiye", "🍪", 9], ["Su", "💧", 5], ["Havuç", "🥕", 6], ["Domates", "🍅", 7],
  ["Makarna", "🍝", 16], ["Dondurma", "🍦", 10], ["Kek", "🧁", 13], ["Bal", "🍯", 22],
  ["Patates", "🥔", 8], ["Çilek", "🍓", 17],
] as const;

export function generateCashRegisterItems(level: CashRegisterLevel): CashRegisterProduct[] {
  const config = CASH_REGISTER_LEVEL_CONFIG[level];
  return shuffle([...CASH_REGISTER_CATALOG]).slice(0, config.items).map(([name, emoji, base], id) => {
    const delta = level === "beginner" ? randomInt(-2, 2)
      : level === "advanced" ? randomInt(0, 15)
        : level === "master" ? randomInt(-4, 18)
          : randomInt(-5, 35);
    const multiplier = level === "master" ? 2 : level === "expert" ? 3 : 1;
    const raw = base * multiplier + delta;
    return { id, name, emoji, base, price: Math.max(config.min, Math.min(config.max, Math.round(raw))) };
  });
}

export function createCashRegisterRound(level: CashRegisterLevel, mode: CashRegisterMode): CashRegisterRound {
  const config = CASH_REGISTER_LEVEL_CONFIG[level];
  const items = generateCashRegisterItems(level);
  const count = randomInt(config.targetCount[0], config.targetCount[1]);
  const targetItems = shuffle(items).slice(0, count);
  const targetIds = targetItems.map((item) => item.id);
  const total = targetItems.reduce((sum, item) => sum + item.price, 0);
  const targetNames = targetItems.map((item) => `${item.emoji} ${item.name}`).join("  •  ");

  if (mode === "change") {
    const threshold = total + Math.max(5, Math.ceil(total * 0.15));
    const payment = CASH_REGISTER_PAYMENT_OPTIONS.find((value) => value >= threshold)
      ?? Math.ceil((total + 50) / 100) * 100;
    return { items, targetIds, targetNames, mode, payment, answer: payment - total };
  }

  if (mode === "budget") {
    const extras = items.filter((item) => !targetIds.includes(item.id)).map((item) => item.price);
    const margin = extras.length ? Math.max(1, Math.min(...extras) - 1) : 3;
    const budget = total + Math.min(margin, randomInt(2, 8));
    return { items, targetIds, targetNames, mode, budget, answer: total };
  }

  return { items, targetIds, targetNames, mode, answer: total };
}

export function getCashRegisterBasketTotal(items: CashRegisterProduct[], selectedIds: number[]): number {
  return items.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
}

export function cashRegisterSelectionCorrect(selectedIds: number[], targetIds: number[]): boolean {
  const selected = [...selectedIds].sort((a, b) => a - b);
  const target = [...targetIds].sort((a, b) => a - b);
  return selected.length === target.length && selected.every((id, index) => id === target[index]);
}

export function getCashRegisterPrompt(round: CashRegisterRound): { title: string; text: string; answerLabel: string } {
  if (round.mode === "change") return {
    title: `Müşteri ${round.payment} TL verdi`,
    text: `${round.targetNames}. Kasada kaç TL para üstü vermelisin?`,
    answerLabel: "Para üstü kaç TL?",
  };
  if (round.mode === "budget") return {
    title: `Bütçen: ${round.budget} TL`,
    text: `Listede verilen ürünleri bütçeyi aşmadan sepete ekle: ${round.targetNames}.`,
    answerLabel: "Sepet toplamını yaz",
  };
  return {
    title: "Alışveriş listesini tamamla",
    text: `${round.targetNames} ürünlerini sepete ekle ve toplam fiyatı yaz.`,
    answerLabel: "Toplam kaç TL?",
  };
}
