import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const logic = await readFile("src/lib/exercises/vault.ts", "utf8");
const client = await readFile("src/app/egzersizler/mental-aritmetik/VaultGameClient.tsx", "utf8");
const css = await readFile("src/app/egzersizler/mental-aritmetik/vaultGame.module.css", "utf8");

for (const level of ["easy", "medium", "hard", "master"]) assert.match(logic, new RegExp(`${level}:`));
for (const type of ["add", "sub", "mul", "twoStep", "twoStepHard", "divAdd", "mulSub", "sequence", "reverse", "digitLogic"]) assert.match(logic, new RegExp(type));
assert.match(logic, /mode === "logic"\) return \["sequence", "reverse", "digitLogic"\]/);
assert.match(logic, /VAULT_TOTAL_ROUNDS = 10/);
assert.match(logic, /Math\.pow\(ratio, \.72\)/);
assert.match(logic, /streak - 1\) \* 25/);
assert.match(client, /setInterval/);
assert.match(client, /Süre doldu/);
assert.match(client, /roundResolved/);
assert.match(client, /TEKRAR OYNA/);
assert.match(client, /Bitir/);
assert.match(client, /Sonuç kaydedildi/);
assert.match(css, /@keyframes successGlow/);
assert.match(css, /@keyframes correctFlash/);
assert.match(css, /@keyframes wrongShake/);
assert.match(css, /@keyframes particleBurst/);

console.log("mental arithmetic vault parity checks passed");
