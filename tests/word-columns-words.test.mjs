import assert from "node:assert/strict";
import test from "node:test";

import {
  shuffleWordColumnsWords,
  WORD_COLUMNS_WORDS,
} from "../src/lib/exercises/word-columns/wordColumnsWords.ts";

test("Kelime Kolonları havuzu en az 150 benzersiz Türkçe kelime içerir", () => {
  assert.ok(WORD_COLUMNS_WORDS.length >= 150);
  assert.equal(new Set(WORD_COLUMNS_WORDS).size, WORD_COLUMNS_WORDS.length);
  assert.ok(WORD_COLUMNS_WORDS.some((word) => /[çğıöşü]/i.test(word)));
});

test("Kelime Kolonları shuffle Fisher-Yates ile aynı havuzdaki kelimeleri tekrarlamaz", () => {
  const shuffled = shuffleWordColumnsWords(null, () => 0.25);
  assert.equal(shuffled.length, WORD_COLUMNS_WORDS.length);
  assert.deepEqual(new Set(shuffled), new Set(WORD_COLUMNS_WORDS));
});

test("yeni kelime döngüsü önceki grubun son kelimesini arka arkaya getirmez", () => {
  const first = shuffleWordColumnsWords(null, () => 0);
  const next = shuffleWordColumnsWords(first.at(-1), () => 0);

  assert.notEqual(next[0], first.at(-1));
});
