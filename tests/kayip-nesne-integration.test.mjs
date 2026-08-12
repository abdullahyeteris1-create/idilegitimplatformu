import assert from "node:assert/strict";
import test from "node:test";
import { createKayipNesneRound, generateKayipNesnePositions, getKayipNesneRoundSettings, calculateKayipNesnePoints } from "../src/lib/kayip-nesne/game.ts";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "../src/lib/assignments/exerciseCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";

test("kayip-nesne katalog, route ve result type ile ayni slug'i kullanir", () => {
  const assignment = ASSIGNMENT_EXERCISE_BY_SLUG.get("kayip-nesne");
  assert.equal(assignment?.route, "/egzersizler/kayip-nesne");
  assert.equal(assignment?.resultExerciseType, "kayip-nesne");
  assert.equal(getEducationProgramExercise("kayip-nesne")?.resultExerciseType, "kayip-nesne");
});

test("prototype zorluk ayarlari seviye ilerledikce item sayisini ve hafiza suresini dogru sinirlar", () => {
  assert.deepEqual(getKayipNesneRoundSettings(1, "easy"), { itemCount: 4, memoryTimeSeconds: 8 });
  assert.deepEqual(getKayipNesneRoundSettings(5, "medium"), { itemCount: 8, memoryTimeSeconds: 5 });
  assert.deepEqual(getKayipNesneRoundSettings(10, "hard"), { itemCount: 12, memoryTimeSeconds: 2 });
});

test("her round benzersiz nesne ve benzersiz grid hucreleri uretir", () => {
  const round = createKayipNesneRound(1, "easy", () => 0.42);
  assert.equal(round.items.length, 4);
  assert.equal(new Set(round.items.map((item) => item.id)).size, round.items.length);
  assert.equal(new Set(round.items.map((item) => `${item.x}:${item.y}`)).size, round.items.length);
  assert.ok(round.items.some((item) => item.id === round.targetId));
});

test("box pozisyonlari ayni sayida ve mobilde sifir boyutlu degildir", () => {
  const positions = generateKayipNesnePositions(12, () => 0.5);
  assert.equal(positions.length, 12);
  assert.ok(positions.every(({ x, y }) => x >= 3 && x <= 87 && y >= 5 && y <= 78));
});

test("skor sinirlari ve seri bonusu prototype kuralini korur", () => {
  assert.equal(calculateKayipNesnePoints(0, 0), 600);
  assert.equal(calculateKayipNesnePoints(1200, 3), 560);
});

test("client hedef cevabi data-correct veya raw cevap metadata'si expose etmez", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../src/app/egzersizler/kayip-nesne/KayipNesneExerciseClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data-correct|correctIndex|data-pair-id|correctAnswer/);
});

test("scene zones, target panel ve feedback animasyonlari React/CSS parity'si icin mevcut", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../src/app/egzersizler/kayip-nesne/KayipNesneExerciseClient.tsx", import.meta.url), "utf8");
  const css = await (await import("node:fs/promises")).readFile(new URL("../src/app/egzersizler/kayip-nesne/KayipNesneExerciseClient.module.css", import.meta.url), "utf8");
  for (const token of ["SceneDecor", "decorWindow", "decorSofa", "decorTable", "decorShelf", "decorTree", "decorBench", "blackboard", "targetPanel", "revealTargetId"]) assert.match(source, new RegExp(token));
  for (const token of ["correctPulse", "wrongShake", "objectPop", ".scene", ".box", "aspect-ratio: 4/3"]) assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("memory-to-box gecisi ayni round item slot ve relative koordinatlarini kullanir", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../src/app/egzersizler/kayip-nesne/KayipNesneExerciseClient.tsx", import.meta.url), "utf8");
  assert.match(source, /style=\{\{ left: `\$\{item\.x\}%`, top: `\$\{item\.y\}%` \}\}/);
  assert.match(source, /aria-label=\{`Kutu \$\{item\.slot\}`\}/);
  assert.doesNotMatch(source, /Math\.random\(\)/);
});
