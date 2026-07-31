import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL(
  "../src/components/exercises/similar-words-theme.module.css",
  import.meta.url,
);
const clientPath = new URL(
  "../src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
  import.meta.url,
);

test("Benzer Kelimeler normal kutulari beyaz ve koyu metin kullanir", async () => {
  const css = await readFile(cssPath, "utf8");
  const boxBlock = css.slice(css.indexOf(".box {"), css.indexOf(".box:hover"));
  const wordBlock = css.slice(css.indexOf(".boxWord {"), css.indexOf("/* ---- result screen"));

  assert.match(boxBlock, /background:\s*#ffffff/);
  assert.match(boxBlock, /color:\s*#0f172a/);
  assert.match(boxBlock, /border:\s*1px solid #cbd5e1/);
  assert.match(wordBlock, /\.boxWord \{[\s\S]*color:\s*#0f172a/);
  assert.doesNotMatch(boxBlock, /linear-gradient/);
});

test("Benzer Kelimeler dogru/yanlis feedback siniflerini korur", async () => {
  const css = await readFile(cssPath, "utf8");
  const client = await readFile(clientPath, "utf8");

  assert.match(client, /swStyles\.boxCorrect/);
  assert.match(client, /swStyles\.boxWrong/);
  assert.match(css, /\.boxCorrect \{[\s\S]*background:[\s\S]*var\(--sw-green\)/);
  assert.match(css, /\.boxWrong \{[\s\S]*background:[\s\S]*var\(--sw-pink\)/);
});
