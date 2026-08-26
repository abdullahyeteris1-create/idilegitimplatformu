import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  generateTargetTotalRound,
  getTargetTotalPoints,
  getTargetTotalStatus,
  getTargetTotalSummary,
  TARGET_TOTAL_CARD_COUNT,
  TARGET_TOTAL_LEVEL_CONFIG,
  TARGET_TOTAL_SPEED_CONFIG,
  TARGET_TOTAL_TOTAL_ROUNDS,
} from "../src/lib/exercises/targetTotal.ts";

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

test("referans sabitleri 10 tur, 8 kart ve 35/22/suresiz hizlarini korur", () => {
  assert.equal(TARGET_TOTAL_TOTAL_ROUNDS, 10);
  assert.equal(TARGET_TOTAL_CARD_COUNT, 8);
  assert.equal(TARGET_TOTAL_SPEED_CONFIG.relaxed.seconds, null);
  assert.equal(TARGET_TOTAL_SPEED_CONFIG.normal.seconds, 35);
  assert.equal(TARGET_TOTAL_SPEED_CONFIG.fast.seconds, 22);
});

test("seviye target araliklari, parca sayilari ve minimum degerler referansla aynidir", () => {
  assert.deepEqual(TARGET_TOTAL_LEVEL_CONFIG.beginner, { label: "Başlangıç", minTarget: 10, maxTarget: 25, minParts: 2, maxParts: 2, minValue: 2 });
  assert.deepEqual(TARGET_TOTAL_LEVEL_CONFIG.advanced, { label: "İleri", minTarget: 20, maxTarget: 50, minParts: 2, maxParts: 3, minValue: 3 });
  assert.deepEqual(TARGET_TOTAL_LEVEL_CONFIG.master, { label: "Usta", minTarget: 40, maxTarget: 90, minParts: 3, maxParts: 4, minValue: 4 });
  assert.deepEqual(TARGET_TOTAL_LEVEL_CONFIG.expert, { label: "Uzman", minTarget: 70, maxTarget: 150, minParts: 3, maxParts: 5, minValue: 5 });
});

test("uretilen her tur sekiz kartlidir, cozum garantilidir ve seviye kurallarina uyar", () => {
  for (const [level, config] of Object.entries(TARGET_TOTAL_LEVEL_CONFIG)) {
    const random = seededRandom(100 + config.minTarget);
    let previousTarget = null;
    let previousCardSignature = "";
    for (let roundNumber = 1; roundNumber <= 120; roundNumber += 1) {
      const round = generateTargetTotalRound({ level, roundNumber, previousTarget, previousCardSignature, random });
      assert.equal(round.cards.length, 8);
      assert.ok(round.target >= config.minTarget && round.target <= config.maxTarget);
      assert.ok(round.solution.length >= config.minParts && round.solution.length <= config.maxParts);
      assert.ok(round.solution.every((value) => value >= config.minValue));
      assert.equal(round.solution.reduce((sum, value) => sum + value, 0), round.target);
      assert.equal(round.cards.filter((card) => card.isSolution).reduce((sum, card) => sum + card.value, 0), round.target);
      assert.notEqual(round.target, previousTarget, "onceki target tekrar etmemeli");
      assert.notEqual(round.signature, previousCardSignature, "onceki kart signature tekrar etmemeli");
      previousTarget = round.target;
      previousCardSignature = round.signature;
    }
  }
});

test("zaman bonusu referanstaki kalan sure carpi iki formulunu kullanir", () => {
  assert.equal(getTargetTotalPoints(null, 12.4), 100);
  assert.equal(getTargetTotalPoints(35, 10), 150);
  assert.equal(getTargetTotalPoints(22, 21.6), 101);
  assert.equal(getTargetTotalPoints(22, 30), 100);
});

test("secim durum mesajlari hedefe kalan, bulunan ve asilan degeri bildirir", () => {
  assert.equal(getTargetTotalStatus(0, 0, 20), "Henüz kart seçmedin");
  assert.equal(getTargetTotalStatus(1, 12, 20), "Hedefe 8 kaldı");
  assert.equal(getTargetTotalStatus(2, 20, 20), "Hedefi buldun, cevapla!");
  assert.equal(getTargetTotalStatus(3, 24, 20), "Hedefi 4 aştın");
});

test("sonuc istatistikleri basari oranini ve ortalama sureyi hesaplar", () => {
  assert.deepEqual(getTargetTotalSummary(7, 3, [10, 20, 30]), { successRate: 70, averageSeconds: 20 });
  assert.deepEqual(getTargetTotalSummary(0, 0, []), { successRate: 0, averageSeconds: 0 });
});

test("production UI yanlis, timeout, cozum, success ve sonuc ekranlarini icerir", async () => {
  const source = await readFile("src/app/egzersizler/mental-aritmetik/TargetTotalGameClient.tsx", "utf8");
  const css = await readFile("src/app/egzersizler/mental-aritmetik/targetTotalGame.module.css", "utf8");
  assert.match(source, /type: "success"/);
  assert.match(source, /type: "error"/);
  assert.match(source, /type: "timeout"/);
  assert.match(source, /Doğru kombinasyon/);
  assert.match(source, /card\.isSolution/);
  assert.match(source, /Oyun tamamlandı!/);
  assert.match(source, /setInterval\(tick, 200\)/);
  assert.match(source, /roundResolved\.current/);
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(css, /\.numberCardSolution/);
  assert.match(css, /\.feedbackTimeout/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:560px\)/);
});
