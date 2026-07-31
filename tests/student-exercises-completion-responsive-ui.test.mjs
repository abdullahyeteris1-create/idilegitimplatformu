import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const colorMatchSource = fs.readFileSync(
  "src/app/egzersizler/renk-uyumu/RenkUyumuExerciseClient.tsx",
  "utf8",
);
const newCardSource = fs.readFileSync(
  "src/app/egzersizler/yeni-karti-bul/NewCardMemoryExerciseClient.tsx",
  "utf8",
);

for (const [name, source] of [
  ["Renk Uyumu", colorMatchSource],
  ["Yeni Kartı Bul", newCardSource],
]) {
  test(`${name} aktif akışta tekil Bitir ve sonuç dönüşü sunar`, () => {
    assert.match(source, /Egzersizlere Dön/);
    assert.match(source, /href="\/egzersizler"/);
    assert.match(source, /Bitir/);
    assert.match(source, /completionStartedRef/);
    assert.match(source, /if \(completionStartedRef\.current\) return/);
  });

  test(`${name} normal viewport taşmasını içeride yönetir`, () => {
    assert.match(source, /min-h-\[100dvh\]/);
    assert.match(source, /max-h-\[calc\(100dvh-1rem\)\]/);
    assert.match(source, /overflow-y-auto/);
  });
}
