import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// DETAIL_SCHEMAS route.ts icinden export edilmiyor (agir server-side
// bagimliliklar iceriyor) - mevcut turlerde kurulan source-contract kalibi
// izlenerek regex tabanli dogrulama yapiliyor (bkz.
// tests/education-program-results-memory-card-matching-schema.test.mjs).
const ROUTE_PATH = "src/app/api/student/results/route.ts";
const CLIENT_PATH = "src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx";

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
  const detailsBlockEnd = clientSource.indexOf("\n      },", detailsBlockStart);
  const detailsBlock = clientSource.slice(detailsBlockStart, detailsBlockEnd);

  // completedTextCount/assignedDurationSeconds/cumulativeActiveSeconds/lastTextId
  // sart bagli (isEducationProgramMode) bir spread blogu icinde, daha derin
  // girintiyle gonderiliyor - bu yuzden girinti sayisi sabitlenmez, yalniz
  // en az 6 bosluklu satir basi alan adlari yakalanir.
  return [...detailsBlock.matchAll(/^\s{6,}(\w+)(?:,|:)/gm)].map((match) => match[1]);
}

// 40) DETAIL_SCHEMAS["block-reading"] mevcut
test("40) DETAIL_SCHEMAS icinde block-reading semasi tanimlidir", async () => {
  const source = await read(ROUTE_PATH);
  assert.match(source, /"block-reading": \{/);
});

// 41) Mevcut alanlar client ile birebir eslesir
test("41) block-reading semasi client'in gonderdigi TUM alanlarla birebir eslesir (eksik/fazla alan yok)", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"block-reading"');

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "block-reading semasi client'in gonderdigi tum alanlari kapsamali; eksik alan varsa gecerli sonuc bile 400 ile reddedilir",
  );
});

// 42) Tip/aralik dogrulugu (mevcut alanlar)
test("42) block-reading semasindaki mevcut alanlar dogru tip/aralikla tanimlanmis", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  assert.match(schemaBlock, /category: \{ type: "string", maxLength: 80 \}/);
  assert.match(schemaBlock, /textTitle: \{ type: "string", maxLength: 160 \}/);
  assert.match(schemaBlock, /totalWords: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /totalBlocks: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /blockSize: \{ type: "integer", min: 1, max: 5 \}/);
  assert.match(schemaBlock, /speedMode: \{ type: "string", values: \["interval", "wpm"\] \}/);
  assert.match(schemaBlock, /intervalMs: \{ type: "integer", min: 100, max: 60_000 \}/);
  assert.match(schemaBlock, /wordsPerMinute: \{ type: "integer", min: 1, max: 10_000 \}/);
  assert.match(schemaBlock, /fontSize: \{ type: "integer", min: 24, max: 56 \}/);
});

// 43) Yeni dort alan: completedTextCount
test("43) completedTextCount whitelist'te integer, min 0, sensible max ile tanimli", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  assert.match(schemaBlock, /completedTextCount: \{ type: "integer", min: 0, max: 1_000 \}/);
});

// 44) Yeni dort alan: assignedDurationSeconds
test("44) assignedDurationSeconds whitelist'te integer, min 1, MAX_DURATION_SECONDS ile tutarli max degeriyle tanimli", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  assert.match(schemaBlock, /assignedDurationSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/);
  assert.match(source, /const MAX_DURATION_SECONDS = 21_600;/);
});

// 45) Yeni dort alan: cumulativeActiveSeconds
test("45) cumulativeActiveSeconds whitelist'te integer, min 0, MAX_DURATION_SECONDS ile ayni max degeriyle tanimli", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  assert.match(schemaBlock, /cumulativeActiveSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
});

// 46) Yeni dort alan: lastTextId
test("46) lastTextId whitelist'te string, sensible maxLength ile tanimli", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  assert.match(schemaBlock, /lastTextId: \{ type: "string", maxLength: 128 \}/);
});

// 47) Yasak alanlar whitelist'e eklenmedi + validateDetails mimarisi degismedi
test("47) completedTextIds/full metin icerigi/bilinmeyen alan whitelist'e eklenmedi, validateDetails bilinmeyen alani hala reddediyor", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"block-reading"');

  for (const forbiddenField of ["completedTextIds", "textContent", "text", "content", "body"]) {
    assert.doesNotMatch(
      schemaBlock,
      new RegExp(`\\b${forbiddenField}:`),
      `block-reading semasi ${forbiddenField} icermemeli`,
    );
  }

  assert.match(source, /function validateDetails\(/);
  assert.match(source, /const rule = schema\[key\];\s*\n\s*if \(!rule\) return null;/);
  assert.match(source, /const schema = DETAIL_SCHEMAS\[exerciseType\];\s*\n\s*if \(!schema\) return null;/);
});

test("daha once calisan diger DETAIL_SCHEMAS girdileri (memory-game, card-matching) bu turda degistirilmedi", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /"memory-game": \{/);
  assert.match(source, /"card-matching": \{/);
});
