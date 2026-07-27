import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EDITOR_PATH = "src/components/education-programs/EducationProgramTemplateEditor.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// 3) Template editor bu iki calisma icin sure alani gostermiyor mu?
test("3) DURATIONLESS_TASK_PLACEHOLDER_SECONDS sabiti tanimlidir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /const DURATIONLESS_TASK_PLACEHOLDER_SECONDS = 60;/);
});

test("3) supportsDuration:false olan calismalar icin gorunur sure input'u yerine gizli input render edilir", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(
    source,
    /definition && definition\.supportsDuration === false \? \(/,
  );
  assert.match(
    source,
    /<input\s*\n\s*type="hidden"\s*\n\s*name=\{`task-\$\{orderNumber\}-durationSeconds`\}\s*\n\s*value=\{DURATIONLESS_TASK_PLACEHOLDER_SECONDS\}\s*\n\s*\/>/,
  );
  assert.match(source, /Bu çalışmada süre yok/);
});

test("3) createDrafts ve handleExerciseChange supportsDuration:false icin durationSeconds'i bos string yapar", async () => {
  const source = await read(EDITOR_PATH);

  const createDraftsStart = source.indexOf("function createDrafts(");
  const createDraftsEnd = source.indexOf("\n}", createDraftsStart);
  const createDraftsBody = source.slice(createDraftsStart, createDraftsEnd);
  assert.match(createDraftsBody, /definition\?\.supportsDuration === false\s*\n\s*\? ""/);

  const handleExerciseChangeStart = source.indexOf("const handleExerciseChange = ");
  const handleExerciseChangeEnd = source.indexOf("};", handleExerciseChangeStart);
  const handleExerciseChangeBody = source.slice(handleExerciseChangeStart, handleExerciseChangeEnd);
  assert.match(handleExerciseChangeBody, /definition\?\.supportsDuration === false\s*\n\s*\? ""/);
});

test("3) buildDayFormData (gun-degistirme otomatik kaydi) supportsDuration:false icin placeholder gonderir - bos string GONDERMEZ", async () => {
  const source = await read(EDITOR_PATH);

  const buildStart = source.indexOf("function buildDayFormData(");
  const buildEnd = source.indexOf("\n}", buildStart);
  const buildBody = source.slice(buildStart, buildEnd);

  assert.match(
    buildBody,
    /definition\?\.supportsDuration === false\s*\n\s*\? String\(DURATIONLESS_TASK_PLACEHOLDER_SECONDS\)\s*\n\s*: slot\.durationSeconds,/,
  );
  // Regresyon guard: bu fonksiyon artik dogrudan slot.durationSeconds'i
  // kosulsuz gondermemeli (eski hatali davranis - bkz. plan dosyasindaki
  // Plan ajani bulgusu).
  assert.doesNotMatch(buildBody, /formData\.set\(`\$\{prefix\}-durationSeconds`, slot\.durationSeconds\);/);
});

test("startingLevel icin mevcut supportsLevel deseni degismedi (regresyon guard)", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /disabled=\{!definition\?\.supportsLevel\}/);
  assert.match(source, /Bu egzersizde seviye yok/);
});
