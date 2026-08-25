import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WORD_FINDING_TEXTS } from "../src/lib/data/wordFindingTexts.ts";
import { createWordFindingRound, normalizeWord } from "../src/lib/exercise-engine/wordFinding.ts";

const clientSource = fs.readFileSync("src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx", "utf8");
const allWords = WORD_FINDING_TEXTS.flatMap((entry) =>
  createWordFindingRound({ text: entry.text, targetCount: Number.MAX_SAFE_INTEGER }).words,
);

test("Kelime Bulma havuzu doğru Türkçe karakterleri ve temiz encoding'i korur", () => {
  assert.equal(WORD_FINDING_TEXTS.length, 4);
  assert.equal(allWords.length, 159);
  assert.equal(allWords.filter((word) => /[ÃÂÄÅ�]/u.test(word.raw)).length, 0);
  assert.equal(allWords.filter((word) => /(?:calisma|ogrenci|ogretmen|egitim|basari|hizli)/iu.test(word.normalized)).length, 0);

  for (const expectedWord of ["çalışma", "öğrenciler", "öğretmenleri", "başarılı"]) {
    assert.ok(allWords.some((word) => word.normalized === expectedWord), `missing word: ${expectedWord}`);
  }
});

test("Kelime Bulma metin kayıtlarında duplicate yoktur ve tekrarlar metin içinde eşsiz hedefe indirgenir", () => {
  assert.equal(new Set(WORD_FINDING_TEXTS.map((entry) => entry.id)).size, WORD_FINDING_TEXTS.length);

  for (const entry of WORD_FINDING_TEXTS) {
    const round = createWordFindingRound({ text: entry.text, targetCount: Number.MAX_SAFE_INTEGER });
    assert.equal(new Set(round.targets.map((word) => word.normalized)).size, round.targets.length);
  }
});

test("Türkçe locale normalizasyonu doğru cevabı ve I/İ ayrımını korur", () => {
  assert.equal(normalizeWord("ÇALIŞMA"), "çalışma");
  assert.equal(normalizeWord("öğrenci,"), "öğrenci");
  assert.notEqual(normalizeWord("IŞIK"), normalizeWord("İŞİK"));
  assert.match(clientSource, /Kelime Bulma Çalışması/);
  assert.doesNotMatch(clientSource, /Kelime Bulma Calismasi|Paragraf icindeki|Egitime Basla/);
});
