import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";
import {
  getExerciseSettingsSchema,
  pickEducationProgramSettingOption,
  validateExerciseSettingsValue,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const TYPES_PATH = "src/lib/education-programs/types.ts";

// 1) Katalog kaydi
test("1) blok-okuma exerciseCatalog'da slug/route/resultExerciseType/supportsLevel ile dogru kayitlidir", () => {
  const definition = getEducationProgramExercise("blok-okuma");

  assert.ok(definition, "blok-okuma exerciseCatalog'da bulunmali");
  assert.equal(definition.title, "Blok Okuma");
  assert.equal(definition.resultExerciseType, "block-reading");
  assert.equal(definition.supportsLevel, false);
  assert.equal("levelMin" in definition, false);
  assert.equal("levelMax" in definition, false);
  assert.equal(definition.defaultDurationSeconds, 300);
  assert.equal(definition.settingsSchemaVersion, 1);
});

// 2) Route katalogu
test("2) blok-okuma route kataloginda dogru route ile kayitlidir", () => {
  assert.equal(resolveEducationProgramExerciseRoute("blok-okuma"), "/egzersizler/blok-okuma");
});

// 3) Settings semasi: blockSize/speedMode/intervalMs/wordsPerMinute
test("3) blok-okuma semasi gercek client alanlariyla eslesir: blockSize, speedMode, intervalMs, wordsPerMinute", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");
  assert.ok(schema);
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(
    Object.keys(fieldsByKey).sort(),
    ["blockSize", "intervalMs", "speedMode", "wordsPerMinute"],
  );

  assert.deepEqual(fieldsByKey.blockSize.options, [1, 2, 3, 4, 5]);
  assert.equal(fieldsByKey.blockSize.defaultValue, 2);

  assert.deepEqual(fieldsByKey.speedMode.options, ["interval", "wpm"]);
  assert.equal(fieldsByKey.speedMode.defaultValue, "interval");

  assert.deepEqual(fieldsByKey.intervalMs.options, [
    ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
    1100,
    2000,
    5000,
  ]);
  assert.equal(fieldsByKey.intervalMs.defaultValue, 500);

  // wordsPerMinute artik sabit secenek listesi degil, serbest bir tam sayi
  // araligidir (bagimsiz ekrandaki serbest Kelime/Dakika girisiyle uyumlu).
  assert.equal(fieldsByKey.wordsPerMinute.type, "integer-range");
  assert.equal(fieldsByKey.wordsPerMinute.min, 1);
  assert.equal(fieldsByKey.wordsPerMinute.max, 2000);
  assert.equal(fieldsByKey.wordsPerMinute.step, 1);
  assert.equal(fieldsByKey.wordsPerMinute.defaultValue, 150);
  assert.equal("options" in fieldsByKey.wordsPerMinute, false);
});

// 4) Semaya kasitli olarak eklenmeyen alanlar
test("4) blok-okuma semasina fontSize/textId/category/durationSeconds/initialLevel/completedTextCount/cumulativeActiveSeconds eklenmedi", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  for (const excludedKey of [
    "fontSize",
    "textId",
    "category",
    "durationSeconds",
    "initialLevel",
    "completedTextCount",
    "cumulativeActiveSeconds",
  ]) {
    assert.equal(excludedKey in fieldsByKey, false, `${excludedKey} semada olmamali`);
  }
});

test("explicit education program blockSize default 2'yi override eder; gecersiz deger defaulta doner", () => {
  const options = [1, 2, 3, 4, 5];
  assert.equal(pickEducationProgramSettingOption({ blockSize: 4 }, "blockSize", options, 2), 4);
  assert.equal(pickEducationProgramSettingOption({ blockSize: 99 }, "blockSize", options, 2), 2);
});

// 5) Gecersiz degerler sessizce atlanir (mevcut validateExerciseSettingsValue davranisi)
test("5) gecersiz blockSize/speedMode/intervalMs/wordsPerMinute degerleri sessizce atlanir, gecerliler kabul edilir", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");

  const cleaned = validateExerciseSettingsValue(schema, {
    blockSize: 3,
    speedMode: "wpm",
    intervalMs: 999_999,
    wordsPerMinute: 200,
    fontSize: 40,
    textId: "hack-id",
  });

  assert.deepEqual(cleaned, { blockSize: 3, speedMode: "wpm", wordsPerMinute: 200 });
  assert.equal("intervalMs" in cleaned, false);
  assert.equal("fontSize" in cleaned, false);
  assert.equal("textId" in cleaned, false);
});

// 6) types.ts doc-only alias
test("6) BlockReadingTaskSettings mevcut *TaskSettings deseniyle tanimlanir", async () => {
  const source = await read(TYPES_PATH);

  assert.match(
    source,
    /export type BlockReadingTaskSettings = \{\s*\n\s*blockSize\?: 1 \| 2 \| 3 \| 4 \| 5;\s*\n\s*speedMode\?: "interval" \| "wpm";\s*\n\s*intervalMs\?: 50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 350 \| 400 \| 450 \| 500 \| 550 \| 600 \| 650 \| 700 \| 750 \| 800 \| 850 \| 900 \| 950 \| 1000 \| 1100 \| 2000 \| 5000;\s*\n\s*wordsPerMinute\?: 50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 400 \| 500;\s*\n\s*\};/,
  );
});

// 7) intervalMs/wordsPerMinute'un kosullu alan olmadigi, ikisinin de her
// zaman semada bulundugu aciklamasi (mevcut mimari sinirlamasi)
test("Template Editor: speedMode enum degerleri icin Turkce etiket eklendi (opsiyonel kucuk polish, sema mimarisi degismedi)", async () => {
  const source = await read("src/components/education-programs/EducationProgramTemplateEditor.tsx");

  assert.match(
    source,
    /"blok-okuma:speedMode": \{ interval: "Atlama Hızı \(ms\)", wpm: "Kelime \/ Dakika" \},/,
  );
});

test("7) sema, intervalMs ve wordsPerMinute'u speedMode'a bagli kosullu alan OLARAK degil, iki bagimsiz alan olarak tanimlar", async () => {
  const source = await read("src/lib/education-programs/exerciseSettingsSchemas.ts");
  const blockReadingIndex = source.indexOf('exerciseSlug: "blok-okuma"');
  assert.ok(blockReadingIndex >= 0);

  assert.match(
    source,
    /intervalMs ve wordsPerMinute ikisi de her zaman semada bulunur/,
  );

  const schema = getExerciseSettingsSchema("blok-okuma");
  const keys = schema.fields.map((field) => field.key);
  assert.ok(keys.includes("intervalMs"));
  assert.ok(keys.includes("wordsPerMinute"));
});
