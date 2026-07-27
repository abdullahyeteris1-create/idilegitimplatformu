import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROUTE_PATH = "src/app/api/student/results/route.ts";
const COMPREHENSION_CLIENT_PATH = "src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx";
const SPEED_TEST_CLIENT_PATH = "src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx";

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

  const staticFields = [...detailsBlock.matchAll(/^\s{8}(\w+)(?:,|:)/gm)].map((match) => match[1]);
  // reading-speed-test client'i icinde "readingLevel" kosullu bir spread
  // (`...(selectedText.readingLevel ? { readingLevel: ... } : {})`) ile
  // gonderilir - yukaridaki satir-basi regex'i bunu yakalamaz, ayrica
  // yakalanir.
  const spreadFields = [...detailsBlock.matchAll(/\{ (\w+): /g)].map((match) => match[1]);
  return [...new Set([...staticFields, ...spreadFields])];
}

// 7) Result API whitelist bu iki testin gercek payload alanlarini kabul ediyor mu?
test("DETAIL_SCHEMAS icinde reading-comprehension semasi tanimlidir", async () => {
  const source = await read(ROUTE_PATH);
  assert.match(source, /"reading-comprehension": \{/);
});

test("reading-comprehension semasi client'in gonderdigi TUM alanlarla birebir eslesir (eksik/fazla alan yok)", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(COMPREHENSION_CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"reading-comprehension"');

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);

  assert.deepEqual(
    [...schemaFields].sort(),
    [...clientFields].sort(),
    "reading-comprehension semasi client'in gonderdigi tum alanlari kapsamali; eksik alan varsa gecerli sonuc bile 400 ile reddedilir",
  );
});

test("reading-comprehension semasindaki alanlar dogru tip/aralikla tanimlanmis", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"reading-comprehension"');

  assert.match(schemaBlock, /category: \{ type: "string", maxLength: 120 \}/);
  assert.match(schemaBlock, /textTitle: \{ type: "string", maxLength: 160 \}/);
  assert.match(schemaBlock, /totalWords: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /totalCharacters: \{ type: "integer", min: 0, max: 10_000_000 \}/);
  assert.match(schemaBlock, /readingDurationSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /readingSpeedWpm: \{ type: "number", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /totalQuestions: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /correctAnswers: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /wrongAnswers: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /emptyAnswers: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /comprehensionScore: \{ type: "integer", min: 0, max: 100 \}/);
  assert.match(schemaBlock, /fontSize: \{ type: "integer", min: 12, max: 28 \}/);
  assert.match(schemaBlock, /pausedCount: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /totalPausedSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /activeReadingSeconds: \{ type: "integer", min: 1, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /completedAt: \{ type: "string", maxLength: 40 \}/);
});

test("reading-comprehension semasinda coklu-metin alanlari (completedTextCount vb.) YOK - bu calisma suresiz bir sinamadir", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"reading-comprehension"');

  for (const forbiddenField of [
    "completedTextCount",
    "assignedDurationSeconds",
    "cumulativeActiveSeconds",
    "lastTextId",
  ]) {
    assert.doesNotMatch(schemaBlock, new RegExp(`\\b${forbiddenField}:`));
  }
});

test("bilinmeyen/tahmine dayali alan whitelist'e eklenmedi, validateDetails bilinmeyen alani hala reddediyor", async () => {
  const source = await read(ROUTE_PATH);
  const schemaBlock = extractSchemaBlock(source, '"reading-comprehension"');

  for (const forbiddenField of ["textContent", "text", "content", "body", "questions"]) {
    assert.doesNotMatch(schemaBlock, new RegExp(`\\b${forbiddenField}:`));
  }

  assert.match(source, /function validateDetails\(/);
  assert.match(source, /const rule = schema\[key\];\s*\n\s*if \(!rule\) return null;/);
  assert.match(source, /const schema = DETAIL_SCHEMAS\[exerciseType\];\s*\n\s*if \(!schema\) return null;/);
});

// reading-speed-test zaten mevcuttu ve client payload'iyla uyumluydu - bu
// turda hic degismedi (regresyon guard).
test("reading-speed-test semasi bu turda degismedi ve client'in gerçek payload alanlariyla hala birebir eslesir", async () => {
  const routeSource = await read(ROUTE_PATH);
  const clientSource = await read(SPEED_TEST_CLIENT_PATH);
  const schemaBlock = extractSchemaBlock(routeSource, '"reading-speed-test"');

  assert.match(schemaBlock, /textId: \{ type: "string", maxLength: 128 \}/);
  assert.match(schemaBlock, /textTitle: \{ type: "string", maxLength: 160 \}/);
  assert.match(schemaBlock, /wordCount: \{ type: "integer", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /readingSpeedWpm: \{ type: "number", min: 0, max: 1_000_000 \}/);
  assert.match(schemaBlock, /category: \{ type: "string", maxLength: 120 \}/);
  assert.match(schemaBlock, /readingLevel: \{ type: "string", maxLength: 120 \}/);
  assert.match(schemaBlock, /totalCharacters: \{ type: "integer", min: 0, max: 10_000_000 \}/);
  assert.match(schemaBlock, /fontSize: \{ type: "integer", min: 12, max: 28 \}/);
  assert.match(schemaBlock, /pausedCount: \{ type: "integer", min: 0, max: 100_000 \}/);
  assert.match(schemaBlock, /totalPausedSeconds: \{ type: "integer", min: 0, max: MAX_DURATION_SECONDS \}/);
  assert.match(schemaBlock, /completedAt: \{ type: "string", maxLength: 40 \}/);

  const schemaFields = [...schemaBlock.matchAll(/^\s{4}(\w+): \{/gm)].map((match) => match[1]);
  const clientFields = extractClientDetailsFields(clientSource);
  assert.deepEqual([...schemaFields].sort(), [...clientFields].sort());
});

test("daha once calisan diger DETAIL_SCHEMAS girdileri (block-reading, shadow-reading, grouping-reading, memory-game, card-matching) bu turda degistirilmedi", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /"block-reading": \{/);
  assert.match(source, /"shadow-reading": \{/);
  assert.match(source, /"grouping-reading": \{/);
  assert.match(source, /"memory-game": \{/);
  assert.match(source, /"card-matching": \{/);
});
