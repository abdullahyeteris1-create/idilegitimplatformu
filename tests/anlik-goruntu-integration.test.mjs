import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ANLIK_GORUNTU_LEVELS,
  ANLIK_GORUNTU_ROUNDS_PER_LEVEL,
  ANLIK_GORUNTU_SPEEDS,
  ANLIK_GORUNTU_WORDS_BY_LENGTH,
  buildAnlikGoruntuAnswerSlots,
  buildAnlikGoruntuOptions,
  calculateAnlikGoruntuPoints,
  getAnlikGoruntuLetterCount,
  getAnlikGoruntuLevelLetterCount,
  pickAnlikGoruntuTarget,
  resolveAnlikGoruntuCapacity,
  resolveAnlikGoruntuRank,
} from "../src/lib/anlik-goruntu/game.ts";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "../src/lib/assignments/exerciseCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";
import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { CATEGORY_EXERCISE_SLUGS } from "../src/components/exercises-preview/exercisePreviewGroups.ts";

const CLIENT_PATH = new URL("../src/app/egzersizler/anlik-goruntu/AnlikGoruntuExerciseClient.tsx", import.meta.url);

test("anlik-goruntu katalog, route ve result type ile ayni slug'i kullanir", () => {
  const assignment = ASSIGNMENT_EXERCISE_BY_SLUG.get("anlik-goruntu");
  assert.equal(assignment?.route, "/egzersizler/anlik-goruntu");
  assert.equal(assignment?.resultExerciseType, "anlik-goruntu");
  assert.equal(assignment?.category, "attention");
  assert.equal(getEducationProgramExercise("anlik-goruntu")?.resultExerciseType, "anlik-goruntu");
  assert.equal(resolveEducationProgramExerciseRoute("anlik-goruntu"), "/egzersizler/anlik-goruntu");
});

test("egzersiz Goz Algilama (attention) kategorisinde listelenir", () => {
  assert.ok(CATEGORY_EXERCISE_SLUGS.attention.includes("anlik-goruntu"));
});

test("kelime havuzu her seviyede 10 tur icin yeterli ve harf sayilari tutarli", () => {
  assert.equal(ANLIK_GORUNTU_LEVELS.length, 13);

  for (const letterCount of ANLIK_GORUNTU_LEVELS) {
    const words = ANLIK_GORUNTU_WORDS_BY_LENGTH[letterCount];
    assert.ok(words.length >= ANLIK_GORUNTU_ROUNDS_PER_LEVEL, `${letterCount} harf havuzu 10 turu karsilamiyor`);
    assert.equal(new Set(words).size, words.length, `${letterCount} harf havuzunda tekrar eden kelime var`);
    for (const word of words) {
      assert.equal(getAnlikGoruntuLetterCount(word), letterCount, `${word} kelimesi ${letterCount} harf degil`);
    }
  }
});

test("bir seviyenin 10 turunda ayni kelime iki kez hedef olmaz", () => {
  for (let level = 1; level <= ANLIK_GORUNTU_LEVELS.length; level += 1) {
    const used = new Set();
    for (let round = 0; round < ANLIK_GORUNTU_ROUNDS_PER_LEVEL; round += 1) {
      const target = pickAnlikGoruntuTarget(level, used, () => 0.37);
      assert.ok(!used.has(target), `${level}. seviyede ${target} tekrar etti`);
      assert.equal(getAnlikGoruntuLetterCount(target), getAnlikGoruntuLevelLetterCount(level));
      used.add(target);
    }
  }
});

test("siklar 4 benzersiz kelimedir, hedefi icerir ve istenen konuma yerlesir", () => {
  for (let level = 1; level <= ANLIK_GORUNTU_LEVELS.length; level += 1) {
    const letterCount = getAnlikGoruntuLevelLetterCount(level);
    for (const target of ANLIK_GORUNTU_WORDS_BY_LENGTH[letterCount]) {
      for (const slot of [0, 1, 2, 3]) {
        const options = buildAnlikGoruntuOptions(target, level, slot, () => 0.41);
        assert.equal(options.length, 4);
        assert.equal(new Set(options).size, 4, `${target} icin tekrar eden sik uretildi`);
        assert.equal(options[slot], target);
      }
    }
  }
});

test("cevap konumlari 10 turu kapsar ve her konumu en az iki kez kullanir", () => {
  const slots = buildAnlikGoruntuAnswerSlots(() => 0.5);
  assert.equal(slots.length, ANLIK_GORUNTU_ROUNDS_PER_LEVEL);
  for (const slot of [0, 1, 2, 3]) {
    assert.ok(slots.filter((item) => item === slot).length >= 2, `${slot}. konum yeterince kullanilmiyor`);
  }
});

test("hizlar sabittir ve puanlama uzunluk + combo bonusunu uygular", () => {
  assert.equal(ANLIK_GORUNTU_SPEEDS.length, 7);
  assert.equal(ANLIK_GORUNTU_SPEEDS[2].exposureMs, 500);
  assert.equal(calculateAnlikGoruntuPoints(3, 0), 100);
  assert.equal(calculateAnlikGoruntuPoints(3, 2), 120);
  // combo bonusu 50'de tavan yapar
  assert.equal(calculateAnlikGoruntuPoints(3, 9), 150);
  assert.equal(calculateAnlikGoruntuPoints(15, 0), 140);
});

test("algilama kapasitesi yalniz %75+ tamamlanan seviyelerden hesaplanir", () => {
  const stats = [
    { level: 1, letterCount: 3, exposureMs: 500, rounds: 10, correct: 9, wrong: 1, accuracy: 90, averageResponseTimeMs: 800 },
    { level: 2, letterCount: 4, exposureMs: 500, rounds: 10, correct: 8, wrong: 2, accuracy: 80, averageResponseTimeMs: 900 },
    { level: 3, letterCount: 5, exposureMs: 500, rounds: 10, correct: 5, wrong: 5, accuracy: 50, averageResponseTimeMs: 950 },
  ];
  assert.equal(resolveAnlikGoruntuCapacity(stats), 4);
  assert.equal(resolveAnlikGoruntuCapacity([]), 0);
  assert.equal(resolveAnlikGoruntuRank(0), "Çalışmaya Devam 💪");
  assert.equal(resolveAnlikGoruntuRank(14), "Şimşek Göz ⚡");
});

test("client dogru cevabi DOM metadata'si olarak sizdirmaz", async () => {
  const source = await readFile(CLIENT_PATH, "utf8");
  assert.doesNotMatch(source, /data-correct|correctIndex|data-answer|correctAnswer/);
});

test("client sonuclari guvenli akistan kaydeder ve gorev tamamlamasini tetikler", async () => {
  const source = await readFile(CLIENT_PATH, "utf8");
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(source, /completeTaskAfterResultSave/);
  assert.match(source, /exerciseType: RESULT_TYPE/);
  assert.doesNotMatch(source, /\bsaveExerciseResult\b(?!Secure)/);
});

test("client cikis ve egzersizlere donus kontrollerini sunar", async () => {
  const source = await readFile(CLIENT_PATH, "utf8");
  assert.match(source, /ExerciseNavigationControls/);
  assert.match(source, /onExit=\{\(\) => router\.push\("\/egzersizler"\)\}/);
});
