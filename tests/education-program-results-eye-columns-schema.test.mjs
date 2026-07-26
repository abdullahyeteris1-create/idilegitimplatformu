import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// DETAIL_SCHEMAS ve validateDetails route.ts icinde export edilmiyor ve
// route.ts agir server-side bagimliliklar (Supabase, Next server modulleri)
// iceriyor; bu yuzden diger route dosyalari icin kullanilan mevcut
// source-contract test kalibi (bkz. tests/education-program-complete-task-route.test.mjs)
// izlenerek regex tabanli dogrulama yapiliyor.
const ROUTE_PATH = "src/app/api/student/results/route.ts";
const CLIENT_PATH =
  "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function extractEyeColumnsSchemaBlock(source) {
  const keyIndex = source.indexOf('"eye-columns": {');
  assert.ok(keyIndex >= 0, '"eye-columns" DETAIL_SCHEMAS icinde bulunmali');
  const blockEnd = source.indexOf("\n  },", keyIndex);
  assert.ok(blockEnd > keyIndex);
  return source.slice(keyIndex, blockEnd);
}

test("DETAIL_SCHEMAS icinde eye-columns semasi tanimli (400 regresyonunun kok nedeni giderildi)", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /const DETAIL_SCHEMAS: Record<string, Record<string, DetailRule>> = \{/);
  assert.match(source, /"eye-columns": \{/);
});

test("gecerli eye-columns payload alan adlari client'in gonderdigi alanlarla birebir eslesir", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(CLIENT_PATH);
  const schemaBlock = extractEyeColumnsSchemaBlock(routeSource);

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map(
    (match) => match[1],
  );

  const detailsBlockStart = clientSource.indexOf("details: {");
  assert.ok(detailsBlockStart >= 0, "client payload'inda details objesi bulunmali");
  const detailsBlockEnd = clientSource.indexOf("},", detailsBlockStart);
  const detailsBlock = clientSource.slice(detailsBlockStart, detailsBlockEnd);
  const clientFields = [...detailsBlock.matchAll(/^\s{8}(\w+)(?:,|:)/gm)].map(
    (match) => match[1],
  );

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "eye-columns semasi client'in gonderdigi tum alanlari kapsamali; eksik alan varsa gecerli sonuc bile 400 ile reddedilir, fazladan alan varsa validateDetails bilinmeyen anahtari reddeder",
  );
});

test("gecersiz durationMinutes (schema disi deger) reddedilir: min 1 max 5 integer siniri", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractEyeColumnsSchemaBlock(source);

  assert.match(
    schemaBlock,
    /durationMinutes: \{ type: "integer", min: 1, max: 5 \}/,
    "ColumnEyeExerciseClient DurationMinutes union tipi (1|2|3|4|5) ile birebir eslesmeli",
  );
});

test("gecersiz columnCount (schema disi deger) reddedilir: min 3 max 7 integer siniri", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractEyeColumnsSchemaBlock(source);

  assert.match(
    schemaBlock,
    /columnCount: \{ type: "integer", min: 3, max: 7 \}/,
    "ColumnEyeExerciseClient ColumnCount union tipi (3|4|5|6|7) ile birebir eslesmeli",
  );
});

test("gecersiz flowDirection (schema disi deger) reddedilir: yalniz column/row kabul edilir", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractEyeColumnsSchemaBlock(source);

  assert.match(
    schemaBlock,
    /flowDirection: \{ type: "string", values: \["column", "row"\] \}/,
  );
});

test("eye-columns semasi wildcard veya genel kabul icermez, her alan acikca tiplenmis", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractEyeColumnsSchemaBlock(source);

  assert.doesNotMatch(schemaBlock, /"eye-columns":\s*\{\s*\}/);
  assert.match(
    schemaBlock,
    /jumpSpeed: \{ type: "integer", min: 200, max: 5_000 \}/,
  );
  assert.match(
    schemaBlock,
    /intervalMs: \{ type: "integer", min: 200, max: 5_000 \}/,
  );
  assert.match(
    schemaBlock,
    /completedSteps: \{ type: "integer", min: 0, max: 100_000 \}/,
  );
  assert.match(
    schemaBlock,
    /totalSteps: \{ type: "integer", min: 0, max: 100_000 \}/,
  );
  assert.match(
    schemaBlock,
    /visibleWordCount: \{ type: "integer", min: 0, max: 1_000 \}/,
  );
  assert.match(schemaBlock, /allWordsUnique: \{ type: "boolean" \}/);
});

test("diger egzersiz semalari (square-vision) degistirilmedi", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(
    source,
    /"square-vision": \{\s*durationMinutes: \{ type: "integer", min: 1, max: 360 \},\s*gridSize: \{ type: "integer", min: 2, max: 20 \},\s*level: \{ type: "integer", min: 1, max: 20 \},\s*soundEnabled: \{ type: "boolean" \},\s*answeredCount: \{ type: "integer", min: 0, max: 100_000 \},\s*\},/,
  );
});
