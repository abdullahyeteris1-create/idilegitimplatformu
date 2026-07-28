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
test("1) golgeleme exerciseCatalog'da slug/route/resultExerciseType/supportsLevel ile dogru kayitlidir", () => {
  const definition = getEducationProgramExercise("golgeleme");

  assert.ok(definition, "golgeleme exerciseCatalog'da bulunmali");
  assert.equal(definition.title, "Gölgeleme");
  assert.equal(definition.resultExerciseType, "shadow-reading");
  assert.equal(definition.supportsLevel, false);
  assert.equal("levelMin" in definition, false);
  assert.equal("levelMax" in definition, false);
  assert.equal(definition.defaultDurationSeconds, 300);
  assert.equal(definition.settingsSchemaVersion, 1);
});

// 2) Route katalogu
test("2) golgeleme route kataloginda dogru route ile kayitlidir", () => {
  assert.equal(resolveEducationProgramExerciseRoute("golgeleme"), "/egzersizler/golgeleme");
});

// 3) supportsLevel false / 4) resultExerciseType dogru (yukaridaki testte de kapsandi)
test("3-4) golgeleme supportsLevel:false ve resultExerciseType:shadow-reading ile katalogda tutarli", () => {
  const definition = getEducationProgramExercise("golgeleme");
  assert.equal(definition.supportsLevel, false);
  assert.equal(definition.resultExerciseType, "shadow-reading");
});

// 5) Settings semasi: blockSize/speedMode/intervalMs/wordsPerMinute
test("5) golgeleme semasi gercek client alanlariyla eslesir: blockSize, speedMode, intervalMs, wordsPerMinute", () => {
  const schema = getExerciseSettingsSchema("golgeleme");
  assert.ok(schema);
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(
    Object.keys(fieldsByKey).sort(),
    ["blockSize", "intervalMs", "speedMode", "wordsPerMinute"],
  );

  assert.deepEqual(fieldsByKey.blockSize.options, [1, 2, 3, 4, 5]);
  assert.equal(fieldsByKey.blockSize.defaultValue, 2, "gercek client varsayilani 2'dir (Blok Okuma'nin 3'unden farkli)");

  assert.deepEqual(fieldsByKey.speedMode.options, ["interval", "wpm"]);
  assert.equal(fieldsByKey.speedMode.defaultValue, "interval");

  // intervalMs Golgeleme'de GERCEK bir <select> secim listesidir (client'ta
  // serbest sayisal input degil) - JUMP_SPEED_OPTIONS ile birebir ayni: 20
  // adet 50'ser artan deger (50..1000) + 1100, 2000, 5000.
  const expectedIntervalOptions = [
    ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
    1100,
    2000,
    5000,
  ];
  assert.deepEqual(fieldsByKey.intervalMs.options, expectedIntervalOptions);
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

// 6) fontSize/textId/category/durationSeconds/initialLevel disinda tutulmasi
test("6) golgeleme semasina fontSize/textId/category/durationSeconds/initialLevel/completedTextCount/cumulativeActiveSeconds eklenmedi", () => {
  const schema = getExerciseSettingsSchema("golgeleme");
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

test("gecersiz blockSize/speedMode/intervalMs/wordsPerMinute degerleri sessizce atlanir, gecerliler kabul edilir", () => {
  const schema = getExerciseSettingsSchema("golgeleme");

  const cleaned = validateExerciseSettingsValue(schema, {
    blockSize: 2,
    speedMode: "wpm",
    intervalMs: 999_999,
    wordsPerMinute: 200,
    fontSize: 20,
    textId: "hack-id",
  });

  assert.deepEqual(cleaned, { blockSize: 2, speedMode: "wpm", wordsPerMinute: 200 });
  assert.equal("intervalMs" in cleaned, false);
  assert.equal("fontSize" in cleaned, false);
  assert.equal("textId" in cleaned, false);
});

test("ShadowReadingTaskSettings mevcut *TaskSettings deseniyle tanimlanir", async () => {
  const source = await read(TYPES_PATH);

  assert.match(source, /export type ShadowReadingTaskSettings = \{/);
  assert.match(source, /blockSize\?: 1 \| 2 \| 3 \| 4 \| 5;/);
  assert.match(source, /speedMode\?: "interval" \| "wpm";/);
  assert.match(source, /wordsPerMinute\?: 50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 400 \| 500;/);
});

test("Template Editor: golgeleme:speedMode icin Turkce etiket eklendi (Blok Okuma'daki gibi ayri anahtar)", async () => {
  const source = await read("src/components/education-programs/EducationProgramTemplateEditor.tsx");

  assert.match(
    source,
    /"golgeleme:speedMode": \{ interval: "Atlama Hızı \(ms\)", wpm: "Kelime \/ Dakika" \},/,
  );
});
