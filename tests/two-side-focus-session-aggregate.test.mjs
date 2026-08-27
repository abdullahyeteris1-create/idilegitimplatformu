import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildTwoSideFocusResultPayload } from "../src/app/egzersizler/cift-tarafli-odak/twoSideFocusDuration.ts";

const clientPath = "src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx";

test("multi-level session finish aggregates every level exactly once", () => {
  const payload = buildTwoSideFocusResultPayload({
    durationSeconds: 97,
    levelBreakdown: [
      { level: 1, correct: 3, wrong: 1, score: 120 },
      { level: 2, correct: 2, wrong: 2, score: 80 },
      { level: 3, correct: 4, wrong: 1, score: 200 },
    ],
  });

  assert.equal(payload.correctCount, 9);
  assert.equal(payload.wrongCount, 4);
  assert.equal(payload.score, 400);
  assert.equal(payload.successRate, Math.round((9 / 13) * 100));
  assert.equal(payload.durationSeconds, 97);
  assert.deepEqual(JSON.parse(payload.details.levels), [
    { level: 1, correct: 3, wrong: 1, score: 120 },
    { level: 2, correct: 2, wrong: 2, score: 80 },
    { level: 3, correct: 4, wrong: 1, score: 200 },
  ]);
});

test("client keeps session aggregate across level changes and duplicate-safe finish paths", async () => {
  const source = await readFile(clientPath, "utf8");
  const resultsRoute = await readFile("src/app/api/student/results/route.ts", "utf8");

  assert.match(source, /sessionLevelsRef/);
  assert.match(source, /recordAnswer\(isCorrect\)/);
  assert.match(source, /recordAnswer\(false\);\s*setWrongCount/);
  assert.match(source, /levelBreakdown: Array\.from\(sessionLevelsRef\.current\.values\(\)\)/);
  assert.match(source, /if \(hasFinalizedRef\.current\) return;/);
  assert.match(source, /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) return;/);
  assert.match(source, /finishExercise\(\)/);
  assert.doesNotMatch(source, /prepareLevel[\s\S]{0,120}accumulatedActiveMsRef\.current = 0/);
  assert.match(resultsRoute, /"two-side-focus": \{ totalRounds:/);
});
