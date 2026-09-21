import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveResultTiming,
  formatAverageSecondsPerQuestion,
  formatDuration,
} from "../src/lib/paragraph-exams/resultTiming.ts";

test("formats total duration naturally in seconds, minutes, and hours", () => {
  assert.equal(formatDuration(45), "45 sn");
  assert.equal(formatDuration(125), "2 dk 5 sn");
  assert.equal(formatDuration(365), "6 dk 5 sn");
  assert.equal(formatDuration(3725), "1 sa 2 dk 5 sn");
  assert.equal(formatDuration(0), "0 sn");
});

test("formats average time with Turkish decimal rounding and natural long durations", () => {
  assert.equal(formatAverageSecondsPerQuestion(18.25), "18,3 sn");
  assert.equal(formatAverageSecondsPerQuestion(20), "20 sn");
  assert.equal(formatAverageSecondsPerQuestion(7.04), "7 sn");
  assert.equal(formatAverageSecondsPerQuestion(75), "1 dk 15 sn");
});

test("derives average from the actual question count instead of a hard-coded exam size", () => {
  assert.deepEqual(deriveResultTiming(365, 20), {
    durationSeconds: 365,
    totalQuestions: 20,
    averageSecondsPerQuestion: 18.25,
  });
  assert.deepEqual(deriveResultTiming(365, 5), {
    durationSeconds: 365,
    totalQuestions: 5,
    averageSecondsPerQuestion: 73,
  });
});

test("missing duration, invalid duration, and zero questions use safe fallbacks", () => {
  assert.deepEqual(deriveResultTiming(null, 20), {
    durationSeconds: null,
    totalQuestions: 20,
    averageSecondsPerQuestion: null,
  });
  assert.deepEqual(deriveResultTiming(Number.NaN, 20), {
    durationSeconds: null,
    totalQuestions: 20,
    averageSecondsPerQuestion: null,
  });
  assert.deepEqual(deriveResultTiming(365, 0), {
    durationSeconds: 365,
    totalQuestions: 0,
    averageSecondsPerQuestion: null,
  });
  assert.equal(formatDuration(null), "\u2014");
  assert.equal(formatAverageSecondsPerQuestion(null), "\u2014");
});