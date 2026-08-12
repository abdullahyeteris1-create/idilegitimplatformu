import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

test("exercise theme tokens cover the shared fullscreen shell and fullscreen mode", async () => {
  const globals = await read("src/app/globals.css");
  const stage = await read("src/components/exercises/FixedExerciseStage.tsx");
  const shell = await read("src/components/exercises/FullscreenExerciseShell.tsx");

  for (const token of ["--exercise-page-bg", "--exercise-surface", "--exercise-text", "--exercise-text-secondary", "--exercise-border"]) {
    assert.match(globals, new RegExp(`${token.replaceAll("-", "\\-")}\\s*:`));
  }
  for (const className of ["exercise-theme-root", "exercise-theme-stage", "exercise-theme-area", "exercise-theme-topbar", "exercise-theme-footer"]) {
    assert.match(stage, new RegExp(className));
  }
  assert.match(shell, /exercise-theme-content/);
  assert.match(shell, /exercise-intro-card/);
});

test("grouping, block reading, and shadow reading provide dark-mode work-surface parity", async () => {
  const [grouping, block, shadow] = await Promise.all([
    read("src/components/exercises/grouping-theme.module.css"),
    read("src/components/exercises/block-reading-theme.module.css"),
    read("src/components/exercises/shadow-reading-theme.module.css"),
  ]);

  for (const source of [grouping, block, shadow]) {
    assert.match(source, /\.darkTheme[\s\S]*\.fixed-exercise-stage__area/);
    assert.match(source, /\.darkTheme[\s\S]*\.stageOverride/);
    assert.match(source, /\.darkTheme[\s\S]*\.text-slate-800/);
    assert.match(source, /\.darkTheme[\s\S]*\.text-slate-950/);
  }
  assert.match(grouping, /\.darkTheme \.readingArea/);
  assert.match(shadow, /\.darkTheme \.readingArea/);
});

test("grouping and shadow clients attach the themed stage and reading surfaces", async () => {
  const grouping = await read("src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx");
  const shadow = await read("src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx");

  assert.match(grouping, /styles\.stageOverride/);
  assert.match(grouping, /styles\.readingArea/);
  assert.match(shadow, /styles\.stageOverride/);
  assert.match(shadow, /styles\.readingArea/);
});
