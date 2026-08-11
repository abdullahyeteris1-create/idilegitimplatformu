import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const CHROME_PATH = "src/components/education-programs/EducationProgramExerciseChrome.tsx";
const read = () => readFile(CHROME_PATH, "utf8");

test("EducationProgramExerciseChrome countdown'u yalnızca child running sinyaliyle çalıştırır", async () => {
  const source = await read();

  assert.match(source, /setExerciseRunning/);
  assert.match(source, /if \(!isRunning \|\| remainingSeconds <= 0\) return;/);
  assert.match(source, /setRemainingSeconds\(\(current\) => Math\.max\(0, current - 1\)\)/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /Date\.now\(\)/);
});

test("Chrome duration yoksa countdown render etmez ve tamamlanınca durur", async () => {
  const source = await read();

  assert.match(source, /Number\.isFinite\(launch\.durationSeconds\)/);
  assert.match(source, /isExerciseRunning && !completed/);
});
