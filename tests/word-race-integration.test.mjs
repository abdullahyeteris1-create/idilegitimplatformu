import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  WORD_RACE_LEVELS,
  WORD_RACE_MAX_WRONG,
  WORD_RACE_SPEEDS,
} from "../src/components/exercises/word-race/wordRaceConfig.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Kelime Yarisi Odaklanma katalogunda standart route ile kayitli", async () => {
  const [catalog, center] = await Promise.all([
    read("src/lib/assignments/exerciseCatalog.ts"),
    read("src/app/egzersizler/ExercisesCenterClient.tsx"),
  ]);
  assert.match(catalog, /slug: "kelime-yarisi"/);
  assert.match(catalog, /route: "\/egzersizler\/kelime-yarisi"/);
  assert.match(catalog, /category: "attention"/);
  assert.match(center, /title: "Kelime Yarışı"/);
  assert.match(center, /href: "\/egzersizler\/kelime-yarisi"/);
});

test("seviye, serit, hiz ve toplam yanlis kurallari prototiple ayni", () => {
  assert.deepEqual(WORD_RACE_LEVELS.map((level) => level.lanes), [3, 3, 4, 5, 6]);
  assert.deepEqual([...WORD_RACE_SPEEDS], [5000, 4000, 3000, 2500, 2000, 1500, 1000]);
  assert.equal(WORD_RACE_MAX_WRONG, 10);
});

test("Canvas motoru tek RAF kullanir ve tum kaynaklari destroy sirasinda temizler", async () => {
  const source = await read("src/components/exercises/word-race/wordRaceEngine.ts");
  assert.match(source, /this\.animationFrameId = window\.requestAnimationFrame\(this\.loop\)/);
  assert.match(source, /window\.cancelAnimationFrame\(this\.animationFrameId\)/);
  assert.match(source, /this\.resizeObserver\?\.disconnect\(\)/);
  assert.match(source, /removeEventListener\("keydown"/);
  assert.match(source, /window\.clearTimeout\(this\.transitionTimerId\)/);
});

test("kelime karti olculeri gate uretiminde saklanir ve cizimde perspektif scale uygulanmaz", async () => {
  const source = await read("src/components/exercises/word-race/wordRaceEngine.ts");
  assert.match(source, /commonMetrics: this\.measureCard\(common, this\.state\.lanes\)/);
  assert.match(source, /const metrics = isOdd \? gate\.oddMetrics : gate\.commonMetrics/);
  assert.doesNotMatch(source, /context\.scale\(/);
});

test("sonuc guvenli ve idempotent platform akisiyla kaydedilir", async () => {
  const source = await read("src/components/exercises/word-race/WordRaceGame.tsx");
  assert.match(source, /saveExerciseResultSecure\(payload\)/);
  assert.match(source, /completeTaskAfterResultSave\(\)/);
  assert.match(source, /saveInFlightRef\.current \|\| saveCompletedRef\.current/);
  assert.doesNotMatch(source, /\bstudentId\b/);
  assert.doesNotMatch(source, /\bsaveExerciseResult\b(?!Secure)/);
});
