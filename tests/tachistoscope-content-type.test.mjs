import assert from "node:assert/strict";
import test from "node:test";

import { generateTachistoscopeContent } from "../src/lib/exercise-engine/tachistoscopeContent.ts";

const fixedRandom = () => 0;

test("harf secildiginde yalniz harf uretir", () => {
  const content = generateTachistoscopeContent(8, "letter", undefined, fixedRandom);
  assert.match(content, /^[A-ZÇĞİÖŞÜ]+$/u);
  assert.equal(content.length, 8);
});

test("rakam secildiginde yalniz rakam uretir", () => {
  const content = generateTachistoscopeContent(8, "number", undefined, fixedRandom);
  assert.match(content, /^\d+$/);
  assert.equal(content.length, 8);
});

test("harften rakama geciste yeni tur rakam uretir", () => {
  const letterRound = generateTachistoscopeContent(5, "letter", undefined, fixedRandom);
  const numberRound = generateTachistoscopeContent(5, "number", letterRound, fixedRandom);
  assert.match(letterRound, /^[A-ZÇĞİÖŞÜ]+$/u);
  assert.match(numberRound, /^\d+$/);
});

test("rakamdan harfe geciste yeni tur harf uretir", () => {
  const numberRound = generateTachistoscopeContent(5, "number", undefined, fixedRandom);
  const letterRound = generateTachistoscopeContent(5, "letter", numberRound, fixedRandom);
  assert.match(numberRound, /^\d+$/);
  assert.match(letterRound, /^[A-ZÇĞİÖŞÜ]+$/u);
});

test("ayni icerik turunde uretim turu ve seviye uzunlugu korunur", () => {
  const firstRound = generateTachistoscopeContent(4, "number", undefined, () => 0.1);
  const nextRound = generateTachistoscopeContent(4, "number", firstRound, () => 0.9);
  assert.match(firstRound, /^\d{4}$/);
  assert.match(nextRound, /^\d{4}$/);
  assert.notEqual(nextRound, firstRound);
});

test("karisik tur mevcut harf ve rakam karakter havuzunu kullanir", () => {
  const samples = [0, 0.99];
  const content = generateTachistoscopeContent(2, "mixed", undefined, () => samples.shift() ?? 0);
  assert.match(content, /^[A-ZÇĞİÖŞÜ0-9]+$/u);
  assert.match(content, /[A-ZÇĞİÖŞÜ]/u);
  assert.match(content, /\d/);
});

test("aktif oyunda tur ayarlari degisince yeni tur hemen baslatilir", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../src/components/exercises/TachistoscopeExerciseClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ speedMs: nextSpeedMs \}\)/);
  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ level: nextLevel \}\)/);
  assert.match(source, /if \(phase === "play"\) startNextRound\(\{ contentType: nextContentType \}\)/);
  assert.match(
    source,
    /generateTachistoscopeContent\(normalizedLevel, settings\.contentType, currentRound\?\.expected\)/,
  );
});
