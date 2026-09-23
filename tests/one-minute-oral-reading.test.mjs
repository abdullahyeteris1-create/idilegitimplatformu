import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateComprehensionScore,
  calculateCorrectWords,
  calculateWordsRead,
  countReadingWords,
  getRemainingSeconds,
  isTimerFinished,
  ONE_MINUTE_SECONDS,
  validateReadingErrors,
} from "../src/lib/one-minute-reading/metrics.ts";
import { getTextsForGrade, ONE_MINUTE_READING_TEXTS } from "../src/lib/one-minute-reading/content.ts";

test("timer uses elapsed timestamps and finishes at exactly 60 seconds", () => {
  assert.equal(ONE_MINUTE_SECONDS, 60);
  assert.equal(getRemainingSeconds(1_000, 1_000), 60);
  assert.equal(getRemainingSeconds(1_000, 59_001), 2);
  assert.equal(getRemainingSeconds(1_000, 60_999), 1);
  assert.equal(getRemainingSeconds(1_000, 61_000), 0);
  assert.equal(isTimerFinished(1_000, 60_999), false);
  assert.equal(isTimerFinished(1_000, 61_000), true);
});

test("Turkish punctuation, apostrophes and paragraph breaks count as words", () => {
  assert.equal(countReadingWords("Çocuklar, güzel bir gün! Öğretmen'in kitabı."), 6);
  assert.equal(countReadingWords("Birinci paragraf.\n\nİkinci paragraf; üç kelime."), 6);
  assert.equal(countReadingWords("kitap, geldi. çocuklar!"), 3);
});

test("last-word selection maps to the number of words read", () => {
  assert.equal(calculateWordsRead(null, 40), 0);
  assert.equal(calculateWordsRead(0, 40), 1);
  assert.equal(calculateWordsRead(17, 40), 18);
  assert.equal(calculateWordsRead(999, 40), 40);
});

test("reading errors are clamped and correct words are calculated", () => {
  assert.equal(validateReadingErrors(-2, 20), 0);
  assert.equal(validateReadingErrors(25, 20), 20);
  assert.equal(validateReadingErrors(4.9, 20), 4);
  assert.equal(calculateCorrectWords(86, 4), 82);
  assert.equal(calculateCorrectWords(5, 12), 0);
});

test("comprehension score is rounded to a percentage", () => {
  assert.equal(calculateComprehensionScore(2, 3), 67);
  assert.equal(calculateComprehensionScore(3, 3), 100);
  assert.equal(calculateComprehensionScore(0, 0), 0);
});

test("content has two original passages for each initial grade", () => {
  assert.equal(ONE_MINUTE_READING_TEXTS.length, 8);
  for (const grade of [1, 2, 3, 4]) assert.equal(getTextsForGrade(grade).length, 2);
  assert.ok(ONE_MINUTE_READING_TEXTS.every((text) => text.comprehensionQuestions.length >= 2));
});

test("V1 does not depend on microphone, speech recognition or recording APIs", async () => {
  const source = await readFile(new URL("../src/app/egzersizler/bir-dakika-sesli-okuma/OneMinuteOralReadingClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /navigator\.mediaDevices|SpeechRecognition|webkitSpeechRecognition|MediaRecorder/);
});
