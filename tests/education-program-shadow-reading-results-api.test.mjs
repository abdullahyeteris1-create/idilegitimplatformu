import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROUTE_PATH = "src/app/api/student/results/route.ts";
const CLIENT_PATH = "src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx";

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
  // girintiyle gonderiliyor - girinti sayisi sabitlenmez, yalniz en az 6
  // bosluklu satir basi alan adlari yakalanir.
  return [...detailsBlock.matchAll(/^\s{6,}(\w+)(?:,|:)/gm)].map((match) => match[1]);
}

// 34) DETAIL_SCHEMAS["shadow-reading"] mevcut
test("DETAIL_SCHEMAS icinde shadow-reading semasi tanimlidir", async () => {
  const source = await read(ROUTE_PATH);
  assert.match(source, /"shadow-reading": \{/);
});

// 34) Mevcut alanlar client ile birebir eslesir
test("34) shadow-reading semasi client'in gonderdigi TUM alanlarla birebir eslesir (eksik/fazla alan yok)", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"shadow-reading"');

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "shadow-reading semasi client'in gonderdigi tum alanlari kapsamali; eksik alan varsa gecerli sonuc bile 400 ile reddedilir",
  );
});

test("shadow-reading semasindaki mevcut alanlar dogru tip/aralikla tanimlanmis", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"shadow-reading"');

  assert.match(schemaBlock, /category: \{ type: "string", maxLength: 80 \}/);
  assert.match(schemaBlock, /textTitle: \{ type: "string", maxLength: 160 \}/);
  assert.match(schemaBlock, /totalWords: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /totalCharacters: \{ type: "integer", min: 0, max: 10_000_000 \}/);
  assert.match(schemaBlock, /blockSize: \{ type: "integer", min: 1, max: 5 \}/);
  assert.match(schemaBlock, /speedMode: \{ type: "string", values: \["interval", "wpm"\] \}/);
  assert.match(schemaBlock, /intervalMs: \{ type: "integer", min: 50, max: 5_000 \}/);
  assert.match(schemaBlock, /wordsPerMinute: \{ type: "integer", min: 1, max: 10_000 \}/);
  assert.match(schemaBlock, /fontSize: \{ type: "integer", min: 12, max: 28 \}/);
  assert.match(schemaBlock, /completedBlocks: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /totalBlocks: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /progressPercent: \{ type: "integer", min: 0, max: 100 \}/);
  assert.match(schemaBlock, /completedPercent: \{ type: "integer", min: 0, max: 100 \}/);
  assert.match(schemaBlock, /estimatedDurationSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /actualDurationSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
});

test("completedTextCount/assignedDurationSeconds/cumulativeActiveSeconds/lastTextId Blok Okuma ile ayni limitlerle tanimli", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"shadow-reading"');

  assert.match(schemaBlock, /completedTextCount: \{ type: "integer", min: 0, max: 1_000 \}/);
  assert.match(schemaBlock, /assignedDurationSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /cumulativeActiveSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /lastTextId: \{ type: "string", maxLength: 128 \}/);
  assert.match(source, /const MAX_DURATION_SECONDS = 21_600;/);
});

// 35) Yasak alanlar whitelist'e eklenmedi + validateDetails mimarisi degismedi
test("35) completedTextIds/full metin icerigi/bilinmeyen alan whitelist'e eklenmedi, validateDetails bilinmeyen alani hala reddediyor", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"shadow-reading"');

  for (const forbiddenField of ["completedTextIds", "textContent", "text", "content", "body"]) {
    assert.doesNotMatch(
      schemaBlock,
      new RegExp(`\\b${forbiddenField}:`),
      `shadow-reading semasi ${forbiddenField} icermemeli`,
    );
  }

  assert.match(source, /function validateDetails\(/);
  assert.match(source, /const rule = schema\[key\];\s*\n\s*if \(!rule\) return null;/);
  assert.match(source, /const schema = DETAIL_SCHEMAS\[exerciseType\];\s*\n\s*if \(!schema\) return null;/);
});

// 36) Diger schemas degismedi
test("36) daha once calisan diger DETAIL_SCHEMAS girdileri (block-reading, memory-game, card-matching) bu turda degistirilmedi", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /"block-reading": \{/);
  assert.match(source, /"memory-game": \{/);
  assert.match(source, /"card-matching": \{/);

  // Blok Okuma semasinin kendisi bu turda hic degismedi.
  const blockReadingBlock = extractSchemaBlock(source, '"block-reading"');
  assert.match(blockReadingBlock, /totalBlocks: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(blockReadingBlock, /lastTextId: \{ type: "string", maxLength: 128 \}/);
});
