import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// DETAIL_SCHEMAS ve validateDetails route.ts icinde export edilmiyor ve
// route.ts agir server-side bagimliliklar (Supabase, Next server modulleri)
// iceriyor; bu yuzden diger route dosyalari icin kullanilan mevcut
// source-contract test kalibi (bkz. tests/education-program-results-eye-columns-schema.test.mjs)
// izlenerek regex tabanli dogrulama yapiliyor.
const ROUTE_PATH = "src/app/api/student/results/route.ts";
const MEMORY_GAME_CLIENT_PATH =
  "src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx";
const CARD_MATCHING_CLIENT_PATH =
  "src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx";
async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function extractSchemaBlock(source, quotedKey) {
  const keyIndex = source.indexOf(`${quotedKey}: {`);
  assert.ok(keyIndex >= 0, `${quotedKey} DETAIL_SCHEMAS icinde bulunmali`);
  const blockEnd = source.indexOf("\n  },", keyIndex);
  assert.ok(blockEnd > keyIndex);
  return source.slice(keyIndex, blockEnd);
}

function extractClientDetailsFields(clientSource) {
  const detailsBlockStart = clientSource.indexOf("details: {");
  assert.ok(detailsBlockStart >= 0, "client payload'inda details objesi bulunmali");
  const detailsBlockEnd = clientSource.indexOf("},", detailsBlockStart);
  const detailsBlock = clientSource.slice(detailsBlockStart, detailsBlockEnd);
  return [...detailsBlock.matchAll(/^\s{8}(\w+)(?:,|:)/gm)].map((match) => match[1]);
}

test("DETAIL_SCHEMAS icinde memory-game semasi artik bos degil (production 400 regresyonunun kok nedeni giderildi)", async () => {
  const source = await read(ROUTE_PATH);

  assert.doesNotMatch(source, /"memory-game":\s*\{\s*\}/);
  assert.match(source, /"memory-game": \{/);
});

test("DETAIL_SCHEMAS icinde card-matching semasi artik mevcut (onceden hic tanimli degildi)", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /"card-matching": \{/);
});

test("memory-game semasi client'in gonderdigi tum alanlarla birebir eslesir (eksik/fazla alan yok)", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(MEMORY_GAME_CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"memory-game"');

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "memory-game semasi client'in gonderdigi tum alanlari kapsamali; eksik alan varsa gecerli sonuc bile 400 ile reddedilir, fazladan alan varsa validateDetails bilinmeyen anahtari reddeder",
  );
});

test("card-matching semasi client'in gonderdigi tum alanlarla birebir eslesir (eksik/fazla alan yok)", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(CARD_MATCHING_CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"card-matching"');

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "card-matching semasi client'in gonderdigi tum alanlari kapsamali",
  );
});

test("memory-game her alan acikca tiplenmis (gercek client state/degerleriyle uyumlu tip+aralik)", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"memory-game"');

  assert.match(schemaBlock, /gridRows: \{ type: "integer", min: 5, max: 10 \}/);
  assert.match(schemaBlock, /gridCols: \{ type: "integer", min: 5, max: 10 \}/);
  assert.match(schemaBlock, /totalBoxes: \{ type: "integer", min: 25, max: 100 \}/);
  assert.match(
    schemaBlock,
    /gridLabel: \{ type: "string", values: \["5 x 5", "5 x 10", "10 x 10"\] \}/,
  );
  assert.match(schemaBlock, /reachedLevel: \{ type: "integer", min: 2, max: 10 \}/);
  assert.match(schemaBlock, /levelCorrectCount: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /levelWrongCount: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /net: \{ type: "integer", min: -100_000, max: 100_000 \}/);
  assert.match(schemaBlock, /displayMs: \{ type: "integer", min: 500, max: 2_000 \}/);
  assert.match(schemaBlock, /levelUpCount: \{ type: "integer", min: 0, max: 10 \}/);
  assert.match(schemaBlock, /roundNumber: \{ type: "integer", min: 1, max: 100_000 \}/);
  assert.match(schemaBlock, /rule: \{ type: "string", maxLength: 200 \}/);
});

test("card-matching her alan acikca tiplenmis (gercek client state/degerleriyle uyumlu tip+aralik)", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"card-matching"');

  assert.match(schemaBlock, /startLevel: \{ type: "integer", min: 1, max: 5 \}/);
  assert.match(schemaBlock, /reachedLevel: \{ type: "integer", min: 1, max: 5 \}/);
  assert.match(schemaBlock, /pairCount: \{ type: "integer", min: 4, max: 12 \}/);
  assert.match(schemaBlock, /totalCards: \{ type: "integer", min: 8, max: 24 \}/);
  assert.match(schemaBlock, /totalMoves: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /correctMatches: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /wrongMatches: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /net: \{ type: "integer", min: -100_000, max: 100_000 \}/);
  assert.match(schemaBlock, /elapsedSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /levelUpCount: \{ type: "integer", min: 0, max: 5 \}/);
  assert.match(schemaBlock, /completedRounds: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /previewDurationMs: \{ type: "integer", min: 2_000, max: 10_000 \}/);
  assert.match(schemaBlock, /flipBackDelayMs: \{ type: "integer", min: 500, max: 2_000 \}/);
  assert.match(schemaBlock, /theme: \{ type: "string", values: \["Canlı Çocuk Görselleri"\] \}/);
  assert.match(schemaBlock, /scoreRule: \{ type: "string", maxLength: 120 \}/);
  assert.match(schemaBlock, /maxLevel: \{ type: "integer", min: 1, max: 5 \}/);
});

test("bilinmeyen/tahmine dayali alan whitelist'e eklenmedi (yalniz gercek payload alanlari kabul edilir)", async () => {
  const source = await read(ROUTE_PATH);
  const memoryGameBlock = extractSchemaBlock(source, '"memory-game"');
  const cardMatchingBlock = extractSchemaBlock(source, '"card-matching"');

  for (const guessedField of ["fontSize", "soundEnabled", "gridLayout", "difficulty", "mode"]) {
    assert.doesNotMatch(
      memoryGameBlock,
      new RegExp(`\\b${guessedField}:`),
      `memory-game semasi tahmine dayali/gorsel-tercih alani icermemeli: ${guessedField}`,
    );
  }

  for (const guessedField of ["cardTheme", "gridSize", "difficulty", "soundEnabled"]) {
    assert.doesNotMatch(
      cardMatchingBlock,
      new RegExp(`\\b${guessedField}:`),
      `card-matching semasi tahmine dayali alan icermemeli: ${guessedField}`,
    );
  }
});

test("validateDetails mimarisi degismedi: bilinmeyen alan icin hala tum istegi reddeden (!rule return null) davranis mevcut", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /function validateDetails\(/);
  assert.match(source, /const rule = schema\[key\];\s*\n\s*if \(!rule\) return null;/);
  assert.match(source, /const schema = DETAIL_SCHEMAS\[exerciseType\];\s*\n\s*if \(!schema\) return null;/);
});

test("exerciseType degerleri client payload'i ile birebir eslesir: memory-game / card-matching", async () => {
  const memoryClient = await read(MEMORY_GAME_CLIENT_PATH);
  const cardClient = await read(CARD_MATCHING_CLIENT_PATH);

  assert.match(memoryClient, /exerciseType: "memory-game",/);
  assert.match(cardClient, /exerciseType: "card-matching",/);
});

test("daha once calisan diger 8 DETAIL_SCHEMAS girdisi (color-match haric) degismedi", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(
    source,
    /tachistoscope: \{\s*speedMs: \{ type: "integer", min: 50, max: 5_000 \},\s*level: \{ type: "integer", min: 1, max: 15 \},\s*contentType: \{ type: "string", values: \["letter", "number", "mixed"\] \},\s*mode: \{ type: "string", values: \["automatic", "manual"\] \},\s*net: \{ type: "integer", min: -100_000, max: 100_000 \},\s*reachedLevel: \{ type: "integer", min: 1, max: 15 \},\s*autoLevelUpCount: \{ type: "integer", min: 0, max: 15 \},\s*\},/,
  );
  assert.match(
    source,
    /"letter-number-counting-focus": \{\s*mode: \{ type: "string", values: \["letters", "numbers", "mixed"\] \},\s*startLevel: \{ type: "integer", min: 1, max: 4 \},\s*reachedLevel: \{ type: "integer", min: 1, max: 4 \},\s*difficulty: \{ type: "string", values: \["normal", "hard"\] \},\s*speedSeconds: \{ type: "number", min: 0\.1, max: 60 \},\s*totalRounds: \{ type: "integer", min: 0, max: 100_000 \},\s*correctCount: \{ type: "integer", min: 0, max: 100_000 \},\s*wrongCount: \{ type: "integer", min: 0, max: 100_000 \},\s*net: \{ type: "integer", min: -100_000, max: 100_000 \},\s*unansweredCount: \{ type: "integer", min: 0, max: 100_000 \},\s*levelUpCount: \{ type: "integer", min: 0, max: 4 \},\s*scoreRule: \{ type: "string", maxLength: 120 \},\s*maxLevel: \{ type: "integer", min: 1, max: 4 \},\s*\},/,
  );
  assert.match(
    source,
    /"square-vision": \{\s*durationMinutes: \{ type: "integer", min: 1, max: 360 \},\s*gridSize: \{ type: "integer", min: 2, max: 20 \},\s*level: \{ type: "integer", min: 1, max: 20 \},\s*soundEnabled: \{ type: "boolean" \},\s*answeredCount: \{ type: "integer", min: 0, max: 100_000 \},\s*\},/,
  );
  assert.match(source, /"color-match": \{\},/);
});

