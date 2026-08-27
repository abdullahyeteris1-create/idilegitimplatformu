import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync("src/app/egzersizler/mental-aritmetik/VaultGameClient.tsx", "utf8");
const css = fs.readFileSync("src/app/egzersizler/mental-aritmetik/vaultGame.module.css", "utf8");

for (const marker of ["treasureChest", "chestLid", "unlocking", "v6Banner", "treasureInside", "treasureGlow", "v6Ring", "coinRain", "smokeWrap", "goldPile"]) {
  assert.match(client, new RegExp(`styles\\.${marker}`), `missing client marker: ${marker}`);
}
for (const marker of ["v6anticipate", "v6lid 1.55s", "v6treasure 1.25s .78s", "v6glow 1.8s .62s", "v6ring 1.2s .78s", "v6banner 1.45s 1.3s", "rainCoin", "smokePuff", "heavyShake", "prefers-reduced-motion"]) {
  assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing CSS marker: ${marker}`);
}
assert.match(client, /setCoinRain\(Array\.from\(\{ length: 36 \}/);
assert.match(client, /setSmoke\(Array\.from\(\{ length: 8 \}/);
assert.match(client, /timedOut \? 1500 : 3400/);
console.log("mental arithmetic vault V6 parity checks passed");
