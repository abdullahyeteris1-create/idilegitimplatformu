import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";
import {
  getExerciseSettingsSchema,
  validateExerciseSettingsValue,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const TYPES_PATH = "src/lib/education-programs/types.ts";

// 1) Katalog kaydi
test("1) gruplama-calismasi exerciseCatalog'da slug/route/resultExerciseType/supportsLevel ile dogru kayitlidir", () => {
  const definition = getEducationProgramExercise("gruplama-calismasi");

  assert.ok(definition, "gruplama-calismasi exerciseCatalog'da bulunmali");
  assert.equal(definition.title, "Gruplama Çalışması");
  assert.equal(definition.resultExerciseType, "grouping-reading");
  assert.equal(definition.supportsLevel, false);
  assert.equal("levelMin" in definition, false);
  assert.equal("levelMax" in definition, false);
  assert.equal(definition.defaultDurationSeconds, 300);
  assert.equal(definition.settingsSchemaVersion, 1);
});

// 2) Route katalogu
test("2) gruplama-calismasi route kataloginda dogru route ile kayitlidir", () => {
  assert.equal(
    resolveEducationProgramExerciseRoute("gruplama-calismasi"),
    "/egzersizler/gruplama-calismasi",
  );
});

// 3-4) supportsLevel false / resultExerciseType dogru
test("3-4) gruplama-calismasi supportsLevel:false ve resultExerciseType:grouping-reading ile tutarli", () => {
  const definition = getEducationProgramExercise("gruplama-calismasi");
  assert.equal(definition.supportsLevel, false);
  assert.equal(definition.resultExerciseType, "grouping-reading");
});

// 5) Settings semasi gercek client degerleriyle uyumlu
test("5) gruplama-calismasi semasi gercek client alanlariyla eslesir: groupSize, speedMode, customMilliseconds, customWordsPerMinute", () => {
  const schema = getExerciseSettingsSchema("gruplama-calismasi");
  assert.ok(schema);
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(
    Object.keys(fieldsByKey).sort(),
    ["customMilliseconds", "customWordsPerMinute", "groupSize", "speedMode"],
  );

  assert.deepEqual(fieldsByKey.groupSize.options, [2, 3, 4, 5]);
  assert.equal(fieldsByKey.groupSize.defaultValue, 2, "gercek client varsayilani 2'dir (GroupingExerciseClient.tsx)");

  assert.deepEqual(fieldsByKey.speedMode.options, ["milliseconds", "wordsPerMinute"]);
  assert.equal(fieldsByKey.speedMode.defaultValue, "milliseconds");

  // customMilliseconds/customWordsPerMinute Gruplama'da GERCEK birer serbest
  // sayisal input'tur (Blok Okuma'daki gibi) - bu yuzden buradaki options
  // listeleri kurasyon degerlerdir, gercek bir <select> secim listesi degil.
  assert.deepEqual(
    fieldsByKey.customMilliseconds.options,
    [
      ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
      1100,
      2000,
      5000,
    ],
  );
  assert.equal(fieldsByKey.customMilliseconds.defaultValue, 500);

  // customWordsPerMinute artik sabit secenek listesi degil, serbest bir tam
  // sayi araligidir (bagimsiz ekrandaki serbest Kelime/Dakika girisiyle uyumlu).
  assert.equal(fieldsByKey.customWordsPerMinute.type, "integer-range");
  assert.equal(fieldsByKey.customWordsPerMinute.min, 1);
  assert.equal(fieldsByKey.customWordsPerMinute.max, 2000);
  assert.equal(fieldsByKey.customWordsPerMinute.step, 1);
  assert.equal(fieldsByKey.customWordsPerMinute.defaultValue, 300);
  assert.equal("options" in fieldsByKey.customWordsPerMinute, false);
});

// 6) hangi alanlarin teacher setting oldugu
test("6) yalniz groupSize/speedMode/customMilliseconds/customWordsPerMinute teacher setting'tir - displayMode/scrollMode/fontSize DEGIL", () => {
  const schema = getExerciseSettingsSchema("gruplama-calismasi");
  const keys = schema.fields.map((field) => field.key);

  assert.ok(keys.includes("groupSize"));
  assert.ok(keys.includes("speedMode"));
  assert.ok(keys.includes("customMilliseconds"));
  assert.ok(keys.includes("customWordsPerMinute"));
  assert.equal(keys.length, 4);
});

// 7) fontSize/text/category settings disinda + 8) displayMode/scrollMode karari
test("7-8) gruplama-calismasi semasina fontSize/displayMode/scrollMode/textId/category/durationSeconds/initialLevel/completedTextCount/cumulativeActiveSeconds eklenmedi", () => {
  const schema = getExerciseSettingsSchema("gruplama-calismasi");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  for (const excludedKey of [
    "fontSize",
    "displayMode",
    "scrollMode",
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

test("gecersiz degerler sessizce atlanir, gecerliler kabul edilir", () => {
  const schema = getExerciseSettingsSchema("gruplama-calismasi");

  const cleaned = validateExerciseSettingsValue(schema, {
    groupSize: 3,
    speedMode: "wordsPerMinute",
    customMilliseconds: 999_999,
    customWordsPerMinute: 400,
    fontSize: 20,
    displayMode: "fade",
    textId: "hack-id",
  });

  assert.deepEqual(cleaned, { groupSize: 3, speedMode: "wordsPerMinute", customWordsPerMinute: 400 });
  assert.equal("customMilliseconds" in cleaned, false);
  assert.equal("fontSize" in cleaned, false);
  assert.equal("displayMode" in cleaned, false);
  assert.equal("textId" in cleaned, false);
});

test("GroupingReadingTaskSettings mevcut *TaskSettings deseniyle tanimlanir, displayMode/scrollMode icermez", async () => {
  const source = await read(TYPES_PATH);

  assert.match(source, /export type GroupingReadingTaskSettings = \{/);
  assert.match(source, /groupSize\?: 2 \| 3 \| 4 \| 5;/);
  assert.match(source, /speedMode\?: "milliseconds" \| "wordsPerMinute";/);
  assert.match(source, /customMilliseconds\?: 50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 350 \| 400 \| 450 \| 500 \| 550 \| 600 \| 650 \| 700 \| 750 \| 800 \| 850 \| 900 \| 950 \| 1000 \| 1100 \| 2000 \| 5000;/);
  assert.match(source, /customWordsPerMinute\?: 100 \| 150 \| 200 \| 250 \| 300 \| 400 \| 500 \| 600 \| 800 \| 1000;/);

  const typeStart = source.indexOf("export type GroupingReadingTaskSettings = {");
  const typeEnd = source.indexOf("};", typeStart);
  const typeBody = source.slice(typeStart, typeEnd);
  assert.doesNotMatch(typeBody, /displayMode/);
  assert.doesNotMatch(typeBody, /scrollMode/);
  assert.doesNotMatch(typeBody, /fontSize/);
});

test("Template Editor: gruplama-calismasi:speedMode icin Turkce etiket eklendi", async () => {
  const source = await read("src/components/education-programs/EducationProgramTemplateEditor.tsx");

  assert.match(
    source,
    /"gruplama-calismasi:speedMode": \{ milliseconds: "Atlama Hızı \(ms\)", wordsPerMinute: "Okuma Hızı \(kelime\/dk\)" \},/,
  );
});

test("Template Editor: displayMode/scrollMode icin etiket eklenmedi (bu turda ogretmen ayari degil)", async () => {
  const source = await read("src/components/education-programs/EducationProgramTemplateEditor.tsx");

  assert.doesNotMatch(source, /"gruplama-calismasi:displayMode"/);
  assert.doesNotMatch(source, /"gruplama-calismasi:scrollMode"/);
});
