import { randomInt } from "@/lib/exercises/mentalArithmetic";

export type VaultLevel = "easy" | "medium" | "hard" | "master";
export type VaultMode = "mixed" | "logic";
export type VaultTime = 0 | 20 | 10;
export type VaultQuestionType = "add" | "sub" | "mul" | "twoStep" | "twoStepHard" | "divAdd" | "mulSub" | "sequence" | "reverse" | "digitLogic";
export type VaultQuestion = { answer: string; question: string; hint: string; type: VaultQuestionType };

export const VAULT_LEVEL_CONFIG: Record<VaultLevel, { label: string; base: number; maxSpeed: number }> = {
  easy: { label: "Başlangıç", base: 100, maxSpeed: 220 },
  medium: { label: "Orta", base: 140, maxSpeed: 280 },
  hard: { label: "Zor", base: 190, maxSpeed: 360 },
  master: { label: "Usta", base: 250, maxSpeed: 450 },
};
export const VAULT_DIGITS = [2, 3, 4] as const;
export const VAULT_TIMES: VaultTime[] = [0, 20, 10];
export const VAULT_TOTAL_ROUNDS = 10;

function pad(value: number, digits: number): string { return String(value).padStart(digits, "0"); }
function minForDigits(digits: number): number { return 10 ** (digits - 1); }
function maxForDigits(digits: number): number { return 10 ** digits - 1; }

export function getVaultTypePool(level: VaultLevel, mode: VaultMode): VaultQuestionType[] {
  if (mode === "logic") return ["sequence", "reverse", "digitLogic"];
  if (level === "easy") return ["add", "sub"];
  if (level === "medium") return ["add", "sub", "mul", "twoStep"];
  if (level === "hard") return ["twoStep", "divAdd", "mulSub", "sequence"];
  return ["twoStepHard", "divAdd", "mulSub", "sequence", "digitLogic"];
}

export function generateVaultQuestion(level: VaultLevel, digits: number, mode: VaultMode, attempts = 0): VaultQuestion {
  if (attempts > 200) { const fallbackType = getVaultTypePool(level, mode)[0]; return { answer: pad(minForDigits(digits), digits), question: `${minForDigits(digits)} + 0 = ?`, hint: "İşlemi zihninden çöz ve sonucu şifre olarak gir.", type: fallbackType }; }
  const min = minForDigits(digits); const max = maxForDigits(digits); const type = getVaultTypePool(level, mode)[randomInt(0, getVaultTypePool(level, mode).length - 1)];
  let answer = 0; let question = ""; let hint = "İşlemi zihninden çöz ve sonucu şifre olarak gir.";
  if (type === "add") { answer = randomInt(min, max); const a = randomInt(Math.max(1, Math.floor(answer * .25)), Math.max(2, Math.floor(answer * .75))); const b = answer - a; if (b < 0) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} + ${b} = ?`; }
  else if (type === "sub") { answer = randomInt(min, max); const b = randomInt(2, Math.max(3, Math.min(max - answer, Math.floor(max * .35)))); const a = answer + b; if (a > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} − ${b} = ?`; }
  else if (type === "mul") { const a = randomInt(2, digits === 2 ? 9 : 20); const b = randomInt(2, digits === 2 ? 9 : 20); answer = a * b; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} × ${b} = ?`; }
  else if (type === "twoStep") { const a = randomInt(5, digits === 2 ? 35 : 180); const b = randomInt(3, digits === 2 ? 25 : 90); const c = randomInt(2, digits === 2 ? 12 : 45); answer = a + b - c; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} + ${b} − ${c} = ?`; }
  else if (type === "twoStepHard") { const a = randomInt(3, 18); const b = randomInt(3, 15); const c = randomInt(5, 80); answer = a * b + c; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `(${a} × ${b}) + ${c} = ?`; hint = "Önce parantez içindeki çarpma işlemini yap."; }
  else if (type === "divAdd") { const b = randomInt(2, 12); const quotient = randomInt(5, digits === 2 ? 30 : 90); const a = b * quotient; const c = randomInt(3, 35); answer = quotient + c; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} ÷ ${b} + ${c} = ?`; hint = "Önce bölme işlemini yap."; }
  else if (type === "mulSub") { const a = randomInt(3, 15); const b = randomInt(3, 12); const c = randomInt(2, 25); answer = a * b - c; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${a} × ${b} − ${c} = ?`; hint = "İşlem önceliğini unutma."; }
  else if (type === "sequence") { const start = randomInt(1, Math.max(9, min)); const step = randomInt(2, digits === 2 ? 9 : 25); answer = start + 4 * step; if (answer < min || answer > max) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `Diziyi tamamla: ${[0, 1, 2, 3].map((i) => start + i * step).join(" → ")} → ?`; hint = "Sayılar arasındaki değişimi bul."; }
  else if (type === "reverse") { answer = randomInt(min, max); const value = pad(answer, digits); if (value.endsWith("0")) return generateVaultQuestion(level, digits, mode, attempts + 1); question = `${value.split("").reverse().join("")} sayısının rakamlarını ters çevir. Şifre nedir?`; hint = "Örneğin 42 → 24."; }
  else { answer = randomInt(min, max); const values = pad(answer, digits).split("").map(Number); const sum = values.reduce((a, b) => a + b, 0); if (digits === 2) { question = `İki haneli şifre: Rakamları toplamı ${sum}, şifre ${answer > 50 ? "50’den büyük" : "50’den küçük"}. Şifreyi bul: ${Math.max(min, answer - 2)}, ${answer}, ${Math.min(max, answer + 3)}`; hint = "Verilen üç adaydan tüm ipuçlarına uyan sayıyı seç."; } else { const first = values[0]; const last = values[values.length - 1]; const decade = Math.floor(answer / 10) * 10; question = `Şifre ${digits} haneli. İlk rakam ${first}, son rakam ${last}, tüm rakamların toplamı ${sum}. Şifre nedir?`; hint = `Ek ipucu: Şifre ${decade} ile ${decade + 9} arasındadır.`; } }
  return { answer: pad(answer, digits), question, hint, type };
}

export function getVaultSpeedScore(level: VaultLevel, time: VaultTime, timeLeftTenths: number, streak: number): { total: number; base: number; speed: number; streak: number; label: string; elapsed: number } {
  const base = VAULT_LEVEL_CONFIG[level].base;
  if (time === 0) return { total: base + 60, base, speed: 60, streak: 0, label: "Rahat", elapsed: 0 };
  const elapsed = time - timeLeftTenths / 10;
  const ratio = Math.max(0, Math.min(1, 1 - elapsed / time));
  const speed = Math.round(VAULT_LEVEL_CONFIG[level].maxSpeed * Math.pow(ratio, .72));
  const label = ratio >= .75 ? "⚡ Şimşek" : ratio >= .5 ? "🚀 Çok Hızlı" : ratio >= .25 ? "✨ Hızlı" : "İyi";
  const streakBonus = Math.max(0, (streak - 1) * 25);
  return { total: base + speed + streakBonus, base, speed, streak: streakBonus, label, elapsed };
}

export function getVaultProgress(round: number, rounds: number): number { return Math.round(Math.min(rounds, Math.max(0, round - 1)) / rounds * 100); }
