import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSarayDedektifiDeck,
  calculateSarayDedektifiPoints,
  createSarayDedektifiQuestions,
  getSarayDedektifiStoryDurationMs,
  resolveSarayDedektifiRank,
  SARAY_DEDEKTIFI_CASES,
  SARAY_DEDEKTIFI_MODES,
} from "../src/lib/saray-dedektifi/game.ts";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "../src/lib/assignments/exerciseCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";
import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";

const CLIENT_PATH = new URL("../src/app/egzersizler/saray-dedektifi/SarayDedektifiExerciseClient.tsx", import.meta.url);

test("saray-dedektifi katalog, route ve result type ile ayni slug'i kullanir", () => {
  const assignment = ASSIGNMENT_EXERCISE_BY_SLUG.get("saray-dedektifi");
  assert.equal(assignment?.route, "/egzersizler/saray-dedektifi");
  assert.equal(assignment?.resultExerciseType, "saray-dedektifi");
  assert.equal(assignment?.category, "attention");
  assert.equal(getEducationProgramExercise("saray-dedektifi")?.resultExerciseType, "saray-dedektifi");
  assert.equal(resolveEducationProgramExerciseRoute("saray-dedektifi"), "/egzersizler/saray-dedektifi");
});

test("her mod icin deste tur sayisini karsilar ve ayni dosya iki kez gelmez", () => {
  for (const mode of SARAY_DEDEKTIFI_MODES) {
    const deck = buildSarayDedektifiDeck(mode.id, () => 0.42);
    assert.equal(deck.length, mode.rounds, `${mode.id} icin ${mode.rounds} dosya beklenir`);
    assert.equal(new Set(deck.map((item) => item.id)).size, deck.length, `${mode.id} destesinde tekrar eden dosya var`);
    assert.ok(deck.every((item) => mode.tiers.includes(item.tier)), `${mode.id} destesi mod tier'lari disina cikti`);
  }
});

test("sorular mod secenek sayisini korur, dogru cevabi icerir ve secenekler tekrarsizdir", () => {
  for (const mode of SARAY_DEDEKTIFI_MODES) {
    for (const caseFile of SARAY_DEDEKTIFI_CASES.filter((item) => mode.tiers.includes(item.tier))) {
      const questions = createSarayDedektifiQuestions(caseFile, mode.id, () => 0.31);
      assert.ok(questions.length > 0 && questions.length <= mode.questions);
      for (const question of questions) {
        assert.equal(question.options.length, mode.options);
        assert.equal(new Set(question.options).size, mode.options);
        assert.ok(question.options.includes(question.correct));
      }
    }
  }
});

test("okuma suresi hiz carpani ile olceklenir", () => {
  assert.equal(getSarayDedektifiStoryDurationMs("baslangic", "normal"), 8500);
  assert.equal(getSarayDedektifiStoryDurationMs("baslangic", "rahat"), 16150);
  assert.equal(getSarayDedektifiStoryDurationMs("uzman", "cokhizli"), 5400);
});

test("puan ve rutbe prototip kuralini korur", () => {
  assert.equal(calculateSarayDedektifiPoints("baslangic"), 120);
  assert.equal(calculateSarayDedektifiPoints("uzman"), 180);
  assert.equal(resolveSarayDedektifiRank(95), "Saray Başdedektifi 👑");
  assert.equal(resolveSarayDedektifiRank(0), "Dedektif Adayı 🧩");
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
