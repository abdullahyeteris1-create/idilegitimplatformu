import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeDelayMs,
  normalizePositiveNumber,
  normalizeReadingSpeed,
  wordsPerMinuteToDelay,
} from "../src/lib/exercises/timing.ts";

const ROOT = new URL("../", import.meta.url);
const EXERCISE_COMPONENTS = [
  "src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx",
  "src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx",
  "src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx",
  "src/app/egzersizler/odakli-okuma/FocusedReadingExerciseClient.tsx",
];

test("WPM değerlerini kelime sayısına göre milisaniyeye çevirir", () => {
  const expectedSingleWordDelays = new Map([
    [50, 1200],
    [100, 600],
    [250, 240],
    [500, 120],
    [1000, 60],
  ]);

  for (const [wordsPerMinute, expectedDelay] of expectedSingleWordDelays) {
    assert.equal(wordsPerMinuteToDelay(wordsPerMinute), expectedDelay);
  }

  assert.equal(wordsPerMinuteToDelay(50, 4), 4800);
  assert.equal(wordsPerMinuteToDelay(120, 3), 1500);
});

test("milisaniye değerlerini WPM hesabına sokmadan korur", () => {
  for (const delay of [100, 300, 500, 1100, 2000, 5000]) {
    assert.equal(normalizeDelayMs(delay), delay);
  }
});

test("geçersiz ve sınır dışı değerleri güvenli aralığa çeker", () => {
  assert.equal(normalizePositiveNumber(Number.NaN, 7), 7);
  assert.equal(normalizeDelayMs(Number.POSITIVE_INFINITY), 1000);
  assert.equal(normalizeDelayMs(-1), 1000);
  assert.equal(normalizeDelayMs(10), 50);
  assert.equal(normalizeReadingSpeed("50", 150, 50, 1000), 50);
  assert.equal(normalizeReadingSpeed(5000, 150, 50, 1000), 1000);
});

test("dört metin akışı ortak timer hook'unu kullanır", async () => {
  for (const relativePath of EXERCISE_COMPONENTS) {
    const source = await readFile(new URL(relativePath, ROOT), "utf8");
    assert.match(source, /useExerciseTimer\s*\(/, relativePath);
  }
});
