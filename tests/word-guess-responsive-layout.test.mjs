import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientPath = new URL(
  "../src/app/egzersizler/kelime-tahmin/WordGuessExerciseClient.tsx",
  import.meta.url,
);
const cssPath = new URL(
  "../src/components/exercises/word-guess-theme.module.css",
  import.meta.url,
);

test("Kelime Tahmin grid'i dikey viewport'a duyarlı hücre boyutu kullanır", async () => {
  const css = await readFile(cssPath, "utf8");
  const cellBlock = css.slice(css.indexOf(".guessCell {"), css.indexOf(".keyboard {"));

  assert.match(cellBlock, /clamp\(2rem, min\(10vw, 5\.2dvh\), 3\.5rem\)/);
  assert.doesNotMatch(cellBlock, /calc\(\(100dvh - 430px\) \/ 6\)/);
});

test("Kelime Tahmin klavye ve oyun alanı alt taşmayı kesmez", async () => {
  const client = await readFile(clientPath, "utf8");
  const css = await readFile(cssPath, "utf8");

  assert.match(client, /flex h-full w-full flex-col items-center justify-center gap-1 overflow-y-auto/);
  assert.match(client, /max-w-3xl flex-col items-center gap-1 overflow-y-auto/);
  assert.match(css, /\.themeRoot :global\(\.fixed-exercise-stage__area > div\) \{[\s\S]*overflow-y: auto/);
  assert.match(css, /\.keySubmitButton \{[\s\S]*min-height: clamp\(2rem, 4\.7dvh, 2\.5rem\) !important/);
});

test("Kelime Tahmin 6 satırlık grid, Türkçe klavye ve Gir butonunu korur", async () => {
  const client = await readFile(clientPath, "utf8");

  assert.match(client, /const MAX_ATTEMPTS = 6/);
  assert.match(client, /TURKISH_ALPHABET\.slice\(0, 10\)/);
  assert.match(client, /TURKISH_ALPHABET\.slice\(10, 20\)/);
  assert.match(client, /TURKISH_ALPHABET\.slice\(20\)/);
  assert.match(client, />\s*Gir\s*</);
});
