import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/app/egzersizler/mental-aritmetik/MentalArithmeticGameClient.tsx", "utf8");
const css = await readFile("src/app/egzersizler/mental-aritmetik/mentalArithmetic.module.css", "utf8");
const targetSource = await readFile("src/app/egzersizler/mental-aritmetik/TargetTotalGameClient.tsx", "utf8");
const targetCss = await readFile("src/app/egzersizler/mental-aritmetik/targetTotalGame.module.css", "utf8");

assert.match(source, /CHAIN_SPEED_MS = \{ relaxed: 1800, normal: 1200, fast: 800 \}/);
assert.match(source, /const initial = 1300/);
assert.match(source, /\+ 350/);
assert.match(source, /chainStep/);
assert.match(source, /chainSteps/);
assert.match(source, /setChainStep\(index \+ 1\)/);
assert.match(source, /mode === "shopping"|mode === "budget"/);
assert.match(source, /Toplamı sen hesapla/);
assert.match(source, /mode === "change"/);
assert.match(source, /setSelected\(kind === "market" && mode === "change"/);
assert.match(source, /TargetTotalGameClient/);
assert.match(targetSource, /Doğru kombinasyon/);
assert.match(targetSource, /feedback\?\.good/);
assert.match(targetSource, /Cevapla/);
assert.match(targetCss, /\.numberCardSolution/);
assert.match(targetCss, /\.scoreRing/);
assert.match(css, /\.marketLayout/);
assert.match(css, /\.receipt/);
assert.match(css, /\.chainStage/);
assert.match(css, /@keyframes vaultShake/);
assert.match(css, /@keyframes scoreRise/);

console.log("mental arithmetic prototype parity checks passed");
