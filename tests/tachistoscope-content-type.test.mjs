import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { generateTachistoscopeContent } from "../src/lib/exercise-engine/tachistoscopeContent.ts";
import { TACHISTOSCOPE_WORDS_BY_LEVEL } from "../src/lib/exercise-engine/tachistoscopeWords.ts";

const fixedRandom = () => 0;
const upperCasePool = (level) =>
  TACHISTOSCOPE_WORDS_BY_LEVEL[level].map((word) => word.toLocaleUpperCase("tr-TR"));

test("harf secildiginde cikti mevcut kayitli kelime havuzundan gelir", () => {
  const content = generateTachistoscopeContent(
    5,
    "letter",
    TACHISTOSCOPE_WORDS_BY_LEVEL,
    undefined,
    fixedRandom,
  );

  assert.ok(upperCasePool(5).includes(content));
  assert.equal(content, upperCasePool(5)[0]);
});

test("harf secimi anlamsiz karakter dizisi yerine havuzdaki kelimeyi dondurur", () => {
  const content = generateTachistoscopeContent(
    8,
    "letter",
    TACHISTOSCOPE_WORDS_BY_LEVEL,
    undefined,
    () => 0.5,
  );

  assert.ok(upperCasePool(8).includes(content));
});

test("rakam secildiginde yalniz rakam ve seviye uzunlugunda icerik gelir", () => {
  const content = generateTachistoscopeContent(
    8,
    "number",
    TACHISTOSCOPE_WORDS_BY_LEVEL,
    undefined,
    fixedRandom,
  );

  assert.match(content, /^\d{8}$/);
});

test("harften rakama geciste yeni tur rakam uretir", () => {
  const wordRound = generateTachistoscopeContent(5, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, undefined, fixedRandom);
  const numberRound = generateTachistoscopeContent(5, "number", TACHISTOSCOPE_WORDS_BY_LEVEL, wordRound, fixedRandom);

  assert.ok(upperCasePool(5).includes(wordRound));
  assert.match(numberRound, /^\d{5}$/);
});

test("rakamdan harfe geciste tekrar kayitli kelime havuzuna doner", () => {
  const numberRound = generateTachistoscopeContent(5, "number", TACHISTOSCOPE_WORDS_BY_LEVEL, undefined, fixedRandom);
  const wordRound = generateTachistoscopeContent(5, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, numberRound, fixedRandom);

  assert.match(numberRound, /^\d{5}$/);
  assert.ok(upperCasePool(5).includes(wordRound));
});

test("karisik tur harf ve rakam karakter havuzunu kullanmayi surdurur", () => {
  const samples = [0, 0.99];
  const content = generateTachistoscopeContent(
    2,
    "mixed",
    TACHISTOSCOPE_WORDS_BY_LEVEL,
    undefined,
    () => samples.shift() ?? 0,
  );

  assert.match(content, /^[A-ZÇĞİÖŞÜ0-9]+$/u);
  assert.match(content, /[A-ZÇĞİÖŞÜ]/u);
  assert.match(content, /\d/);
});

test("seviye degisiminde harf secimi yeni seviyenin kelime havuzunu korur", () => {
  const levelFourWord = generateTachistoscopeContent(4, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, undefined, fixedRandom);
  const levelFiveWord = generateTachistoscopeContent(5, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, levelFourWord, fixedRandom);

  assert.ok(upperCasePool(4).includes(levelFourWord));
  assert.ok(upperCasePool(5).includes(levelFiveWord));
});

test("hiz degisiminde harf secimi ayni kelime havuzunu korur", () => {
  const firstWord = generateTachistoscopeContent(5, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, undefined, () => 0);
  const nextWord = generateTachistoscopeContent(5, "letter", TACHISTOSCOPE_WORDS_BY_LEVEL, firstWord, () => 0.99);

  assert.ok(upperCasePool(5).includes(firstWord));
  assert.ok(upperCasePool(5).includes(nextWord));
  assert.notEqual(nextWord, firstWord);
});

test("aktif oyunda ayar degisiklikleri merkezi ureticiyle yeni tur baslatir", async () => {
  const source = await readFile(
    new URL("../src/components/exercises/TachistoscopeExerciseClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ speedMs: nextSpeedMs \}\)/);
  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ level: nextLevel \}\)/);
  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ contentType: nextContentType \}\)/);
  assert.match(
    source,
    /generateTachistoscopeContent\(\s*normalizedLevel,\s*settings\.contentType,\s*tachistoscopeWords,\s*currentRound\?\.expected,?\s*\)/,
  );
});
