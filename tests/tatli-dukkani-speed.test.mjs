import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  applyTatliDukkaniSpeed,
  DEFAULT_TATLI_DUKKANI_SPEED,
  TATLI_DUKKANI_SPEEDS,
} from "../src/lib/tatli-dukkani/timing.ts";

test("Tatlı Dükkanı varsayılanı Orta ve beş hız seçeneği mevcut", () => {
  assert.equal(DEFAULT_TATLI_DUKKANI_SPEED, "medium");
  assert.deepEqual(TATLI_DUKKANI_SPEEDS.map((speed) => speed.label), ["Başlangıç", "Rahat", "Orta", "Uzman", "Usta"]);
});

test("hız süreleri Başlangıçtan Ustaya kesin olarak azalır", () => {
  const durations = TATLI_DUKKANI_SPEEDS.map((speed) => applyTatliDukkaniSpeed(600, speed.id));
  assert.deepEqual(durations, [870, 720, 600, 492, 408]);
  assert.ok(durations.every((duration, index) => index === 0 || duration < durations[index - 1]));
});

test("Orta mevcut normal süreyi korur ve hızlı seviyeler oynanabilir minimumu kullanır", () => {
  assert.equal(applyTatliDukkaniSpeed(300, "medium"), 300);
  assert.equal(applyTatliDukkaniSpeed(300, "master"), 204);
});

test("motor aynı level timing scaling ve tek round timer akışını korur", async () => {
  const source = await readFile("src/app/egzersizler/tatli-dukkani/TatliDukkaniExerciseClient.tsx", "utf8");
  assert.match(source, /const LEVELS = \[/);
  assert.match(source, /level >= 9 \? 300 \+ Math\.random\(\) \* 60/);
  assert.match(source, /setInterval\(\(\) =>/);
  assert.match(source, /applyTatliDukkaniSpeed\(config\.time, speed\)/);
  assert.match(source, /\[level, speed\]/);
  assert.match(source, /speedSelector/);
  assert.match(source, /Hız <b>\{getTatliDukkaniSpeed\(speed\)\.label\}<\/b>/);
  assert.doesNotMatch(source, /details: \{[\s\S]*speed \}/);
});
