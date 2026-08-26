import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CHAIN_OPERATION_ANSWER_DELAY_MS,
  CHAIN_OPERATION_DEFAULT_ROUNDS,
  CHAIN_OPERATION_LEVEL_CONFIG,
  CHAIN_OPERATION_MIN_START_MS,
  CHAIN_OPERATION_ROUND_OPTIONS,
  CHAIN_OPERATION_SPEED_CONFIG,
  createChainOperationStats,
  generateChainOperationRound,
  getChainOperationInitialDisplayMs,
  getChainOperationNextLabel,
  getChainOperationPoints,
  getChainOperationProgress,
  parseChainOperationAnswer,
  resolveChainOperationAnswer,
} from "../src/lib/exercises/chainOperation.ts";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

test("referans seviye ayarlari 3/4/5/6 islemi ve operand araliklarini korur", () => {
  assert.deepEqual(CHAIN_OPERATION_LEVEL_CONFIG.beginner, { label: "Başlangıç", steps: 3, start: [5, 20], add: [1, 9], sub: [1, 8], points: 100 });
  assert.deepEqual(CHAIN_OPERATION_LEVEL_CONFIG.advanced, { label: "İleri", steps: 4, start: [10, 30], add: [2, 15], sub: [2, 12], points: 120 });
  assert.deepEqual(CHAIN_OPERATION_LEVEL_CONFIG.master, { label: "Usta", steps: 5, start: [10, 40], add: [3, 18], sub: [3, 15], points: 140 });
  assert.deepEqual(CHAIN_OPERATION_LEVEL_CONFIG.expert, { label: "Uzman", steps: 6, start: [15, 50], add: [4, 22], sub: [4, 18], points: 160 });
});

test("hiz, tur ve cevap acilis zamanlamalari referansla aynidir", () => {
  assert.deepEqual(CHAIN_OPERATION_ROUND_OPTIONS, [5, 10, 15]);
  assert.equal(CHAIN_OPERATION_DEFAULT_ROUNDS, 10);
  assert.equal(CHAIN_OPERATION_SPEED_CONFIG.relaxed.milliseconds, 1800);
  assert.equal(CHAIN_OPERATION_SPEED_CONFIG.normal.milliseconds, 1200);
  assert.equal(CHAIN_OPERATION_SPEED_CONFIG.fast.milliseconds, 800);
  assert.equal(CHAIN_OPERATION_MIN_START_MS, 1300);
  assert.equal(getChainOperationInitialDisplayMs("relaxed"), 1800);
  assert.equal(getChainOperationInitialDisplayMs("normal"), 1300);
  assert.equal(getChainOperationInitialDisplayMs("fast"), 1300);
  assert.equal(CHAIN_OPERATION_ANSWER_DELAY_MS, 350);
});

test("generator referans adimlarini, araliklari ve negatif olmayan ara sonuclari uretir", () => {
  for (const [level, config] of Object.entries(CHAIN_OPERATION_LEVEL_CONFIG)) {
    const random = seededRandom(4100 + config.steps);
    for (let roundNumber = 0; roundNumber < 500; roundNumber += 1) {
      const round = generateChainOperationRound(level, random);
      assert.ok(round.start >= config.start[0] && round.start <= config.start[1]);
      assert.equal(round.steps.length, config.steps);
      let expected = round.start;
      for (const step of round.steps) {
        const range = step.operation === "+" ? config.add : config.sub;
        assert.ok(step.number >= range[0] && step.number <= range[1]);
        expected += step.operation === "+" ? step.number : -step.number;
        assert.equal(step.value, expected);
        assert.ok(step.value >= 0, "ara sonuc negatif olmamali");
      }
      assert.equal(round.answer, expected);
    }
  }
});

test("progress her gosterilen adimda currentStep / totalSteps formulunu kullanir", () => {
  assert.equal(getChainOperationProgress(0, 4), 0);
  assert.equal(getChainOperationProgress(1, 4), 25);
  assert.equal(getChainOperationProgress(3, 4), 75);
  assert.equal(getChainOperationProgress(4, 4), 100);
  assert.equal(getChainOperationProgress(8, 4), 100);
});

test("puan, seri, en iyi seri ve yanlista seri sifirlama referansla aynidir", () => {
  assert.deepEqual(["beginner", "advanced", "master", "expert"].map(getChainOperationPoints), [100, 120, 140, 160]);
  const first = resolveChainOperationAnswer(createChainOperationStats(), "beginner", 12, 12);
  assert.deepEqual(first, { correct: 1, wrong: 0, score: 100, streak: 1, bestStreak: 1 });
  const second = resolveChainOperationAnswer(first, "expert", 31, 31);
  assert.deepEqual(second, { correct: 2, wrong: 0, score: 260, streak: 2, bestStreak: 2 });
  const wrong = resolveChainOperationAnswer(second, "master", 9, 8);
  assert.deepEqual(wrong, { correct: 2, wrong: 1, score: 260, streak: 0, bestStreak: 2 });
});

test("bos ve gecersiz input mesajlari ile sayi parse davranisi referansi korur", () => {
  assert.deepEqual(parseChainOperationAnswer("  "), { value: null, error: "Önce cevabını yaz." });
  assert.deepEqual(parseChainOperationAnswer("abc"), { value: null, error: "Geçerli bir sayı yaz." });
  assert.deepEqual(parseChainOperationAnswer("12,5"), { value: 12.5, error: null });
  assert.deepEqual(parseChainOperationAnswer("-4"), { value: -4, error: null });
});

test("sonraki tur, son tur ve replay reset davranislari sabittir", () => {
  assert.equal(getChainOperationNextLabel(4, 5), "Sonraki Tur →");
  assert.equal(getChainOperationNextLabel(5, 5), "Sonuçları Gör →");
  assert.deepEqual(createChainOperationStats(), { correct: 0, wrong: 0, score: 0, streak: 0, bestStreak: 0 });
});

test("production UI sequence cleanup, klavye, duplicate koruma, sonuc ve secure save entegrasyonunu icerir", async () => {
  const source = await readFile("src/app/egzersizler/mental-aritmetik/ChainOperationGameClient.tsx", "utf8");
  const css = await readFile("src/app/egzersizler/mental-aritmetik/chainOperationGame.module.css", "utf8");
  assert.match(source, /phase === "answer" &&/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /roundResolved\.current/);
  assert.match(source, /nextLocked\.current/);
  assert.match(source, /sequenceToken\.current/);
  assert.match(source, /cancelSequence\(\)/);
  assert.match(source, /Doğru! 🎉 Sonuç/);
  assert.match(source, /Doğru sonuç.*Zincir:/s);
  assert.match(source, /getChainOperationNextLabel\(roundNumber, roundLimit\)/);
  assert.match(source, /Zincir tamamlandı!/);
  assert.match(source, /Tekrar Oyna/);
  assert.match(source, /Ayarları Değiştir/);
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(source, /submissionKey: `mental-mental-arithmetic-chain-/);
  assert.match(source, /programTaskId: educationProgramLaunch\?\.taskId/);
  assert.match(source, /href="\/sonuc"/);
  assert.match(css, /\.focusBox/);
  assert.match(css, /transition: width 180ms/);
  assert.match(css, /@media\(max-width: 820px\)/);
  assert.match(css, /@media\(max-width: 640px\)/);
  assert.match(css, /@media\(prefers-reduced-motion: reduce\)/);
});
