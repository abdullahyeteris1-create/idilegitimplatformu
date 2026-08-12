import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("shadow reading running metrics use the dark semantic surface tokens", async () => {
  const client = await read("src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx");
  const theme = await read("src/components/exercises/shadow-reading-theme.module.css");

  assert.match(client, /styles\.metricGrid/);
  assert.match(client, /styles\.metricCard/);
  assert.match(client, /styles\.readingText/);
  assert.match(client, /styles\.progressMeta/);
  assert.match(client, /styles\.progressTrack/);
  assert.match(theme, /\.darkTheme \.metricCard[\s\S]*background: var\(--sr-panel-2\) !important/);
  assert.match(theme, /\.darkTheme \.readingText[\s\S]*color: var\(--sr-text\) !important/);
  assert.match(theme, /\.darkTheme \.progressMeta[\s\S]*color: var\(--sr-muted\) !important/);
  assert.match(theme, /\.darkTheme \.progressTrack[\s\S]*background: var\(--sr-bg\) !important/);
});

test("shadow reading keeps preparation and running phases on separate themed surfaces", async () => {
  const client = await read("src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx");
  const theme = await read("src/components/exercises/shadow-reading-theme.module.css");

  assert.match(client, /if \(phase === "ready"\)/);
  assert.match(client, /stageClassName=\{`[\s\S]*styles\.stageOverride/);
  assert.match(client, /phase === "running"/);
  assert.match(theme, /\.darkTheme \.stageOverride/);
  assert.match(theme, /\.darkTheme \.readingArea/);
});
