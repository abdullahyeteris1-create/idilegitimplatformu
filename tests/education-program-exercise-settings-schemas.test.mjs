import assert from "node:assert/strict";
import test from "node:test";

import {
  getExerciseSettingsSchema,
  pickEducationProgramSettingOption,
  readExerciseSettingsFromFormData,
  validateExerciseSettingsValue,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";

test("eye-columns, word-finding, square-vision, ayni-olani-yakala, benzer-kelimeler, takistoskop, harf-rakam-sayma, hafiza-gelistirme, kart-eslestirme icin sema tanimlidir", () => {
  assert.ok(getExerciseSettingsSchema("goz-egzersizleri-kolonlar"));
  assert.ok(getExerciseSettingsSchema("kelime-bulma"));
  assert.ok(getExerciseSettingsSchema("kare-gorme-alani"));
  assert.ok(getExerciseSettingsSchema("ayni-olani-yakala"));
  assert.ok(getExerciseSettingsSchema("benzer-kelimeler"));
  assert.ok(getExerciseSettingsSchema("takistoskop"));
  assert.ok(getExerciseSettingsSchema("harf-rakam-sayma"));
  assert.ok(getExerciseSettingsSchema("hafiza-gelistirme"));
  assert.ok(getExerciseSettingsSchema("kart-eslestirme"));
  assert.equal(getExerciseSettingsSchema("bilinmeyen-slug"), undefined);
});

test("kart-eslestirme semasi client'in gercek alanlariyla birebir eslesir (pairCount/theme haric)", () => {
  const schema = getExerciseSettingsSchema("kart-eslestirme");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["flipBackDelayMs", "previewDurationMs"]);
  assert.deepEqual(fieldsByKey.previewDurationMs.options, [2000, 3000, 4000, 5000, 7000, 10000]);
  assert.equal(fieldsByKey.previewDurationMs.defaultValue, 4000);
  assert.deepEqual(fieldsByKey.flipBackDelayMs.options, [500, 750, 1000, 1250, 1500, 2000]);
  assert.equal(fieldsByKey.flipBackDelayMs.defaultValue, 1000);
  assert.equal("pairCount" in fieldsByKey, false);
  assert.equal("totalCards" in fieldsByKey, false);
  assert.equal("theme" in fieldsByKey, false);
  assert.equal("startLevel" in fieldsByKey, false);
  assert.equal("durationSeconds" in fieldsByKey, false);
});

test("kart-eslestirme icin gecerli degerler kabul edilir, tahmine dayali pairCount/theme alanlari yazilmaz", () => {
  const schema = getExerciseSettingsSchema("kart-eslestirme");
  const cleaned = validateExerciseSettingsValue(schema, {
    previewDurationMs: 7000,
    flipBackDelayMs: 1500,
    pairCount: 8,
    theme: "Canlı Çocuk Görselleri",
  });

  assert.deepEqual(cleaned, { previewDurationMs: 7000, flipBackDelayMs: 1500 });
  assert.equal("pairCount" in cleaned, false);
  assert.equal("theme" in cleaned, false);
});

test("hafiza-gelistirme semasi client'in gercek alanlariyla birebir eslesir (fontSize haric)", () => {
  const schema = getExerciseSettingsSchema("hafiza-gelistirme");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["displayMs", "gridLayout"]);
  assert.deepEqual(fieldsByKey.gridLayout.options, ["5x5", "5x10", "10x10"]);
  assert.equal(fieldsByKey.gridLayout.defaultValue, "5x5");
  assert.deepEqual(fieldsByKey.displayMs.options, [500, 750, 1000, 1500, 2000]);
  assert.equal(fieldsByKey.displayMs.defaultValue, 1000);
  assert.equal("fontSize" in fieldsByKey, false);
  assert.equal("level" in fieldsByKey, false);
  assert.equal("durationSeconds" in fieldsByKey, false);
});

test("hafiza-gelistirme icin gecerli degerler kabul edilir, tahmine dayali fontSize alani yazilmaz", () => {
  const schema = getExerciseSettingsSchema("hafiza-gelistirme");
  const cleaned = validateExerciseSettingsValue(schema, {
    gridLayout: "10x10",
    displayMs: 500,
    fontSize: 24,
  });

  assert.deepEqual(cleaned, { gridLayout: "10x10", displayMs: 500 });
  assert.equal("fontSize" in cleaned, false);
});

test("takistoskop semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("takistoskop");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["contentType", "speedMs", "workMode"]);
  assert.deepEqual(
    fieldsByKey.speedMs.options,
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  );
  assert.equal(fieldsByKey.speedMs.defaultValue, 300);
  assert.deepEqual(fieldsByKey.workMode.options, ["automatic", "manual"]);
  assert.equal(fieldsByKey.workMode.defaultValue, "manual");
  assert.deepEqual(fieldsByKey.contentType.options, ["letter", "number", "mixed"]);
  assert.equal(fieldsByKey.contentType.defaultValue, "letter");
});

test("harf-rakam-sayma semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("harf-rakam-sayma");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["difficulty", "mode", "speedSeconds"]);
  assert.deepEqual(fieldsByKey.mode.options, ["letters", "numbers", "mixed"]);
  assert.equal(fieldsByKey.mode.defaultValue, "letters");
  assert.deepEqual(fieldsByKey.difficulty.options, ["normal", "hard"]);
  assert.equal(fieldsByKey.difficulty.defaultValue, "normal");
  assert.deepEqual(
    fieldsByKey.speedSeconds.options,
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  );
  assert.equal(fieldsByKey.speedSeconds.defaultValue, 8);
});

test("eye-columns semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("goz-egzersizleri-kolonlar");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["columnCount", "flowDirection", "jumpSpeed"]);
  assert.deepEqual(fieldsByKey.jumpSpeed.options, [
    50, 100, 150, 200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
  ]);
  assert.equal(fieldsByKey.jumpSpeed.defaultValue, 1000);
  assert.deepEqual(fieldsByKey.columnCount.options, [3, 4, 5, 6, 7]);
  assert.equal(fieldsByKey.columnCount.defaultValue, 5);
  assert.deepEqual(fieldsByKey.flowDirection.options, ["column", "row"]);
  assert.equal(fieldsByKey.flowDirection.defaultValue, "column");
});

test("word-finding semasi client'in gercek alaniyla eslesir", () => {
  const schema = getExerciseSettingsSchema("kelime-bulma");
  assert.equal(schema.fields.length, 1);
  assert.equal(schema.fields[0].key, "targetWordsPerText");
  assert.deepEqual(schema.fields[0].options, [3, 4, 5, 6]);
  assert.equal(schema.fields[0].defaultValue, 3);
});

test("square-vision semasi client'in gercek alaniyla eslesir", () => {
  const schema = getExerciseSettingsSchema("kare-gorme-alani");
  assert.equal(schema.fields.length, 1);
  assert.equal(schema.fields[0].key, "gridSize");
  assert.deepEqual(schema.fields[0].options, [7, 9, 11, 13, 15]);
  assert.equal(schema.fields[0].defaultValue, 13);
});

test("ayni-olani-yakala semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("ayni-olani-yakala");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["mode", "speed"]);
  assert.deepEqual(fieldsByKey.mode.options, ["word", "letter", "symbol", "number"]);
  assert.equal(fieldsByKey.mode.defaultValue, "word");
  assert.deepEqual(fieldsByKey.speed.options, [1500, 1000, 750, 500]);
  assert.equal(fieldsByKey.speed.defaultValue, 1000);
});

test("benzer-kelimeler semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("benzer-kelimeler");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["boxCount", "targetDifferentCount"]);
  assert.deepEqual(fieldsByKey.boxCount.options, [12, 16, 20, 24]);
  assert.equal(fieldsByKey.boxCount.defaultValue, 16);
  assert.deepEqual(fieldsByKey.targetDifferentCount.options, [3, 4, 5, 6, 7, 8]);
  assert.equal(fieldsByKey.targetDifferentCount.defaultValue, 4);
});

test("ayni-olani-yakala icin gecerli degerler kabul edilir, desteklenmeyen alan (selectedDuration) yazilmaz", () => {
  const schema = getExerciseSettingsSchema("ayni-olani-yakala");
  const cleaned = validateExerciseSettingsValue(schema, {
    mode: "symbol",
    speed: 500,
    selectedDuration: 90,
  });

  assert.deepEqual(cleaned, { mode: "symbol", speed: 500 });
  assert.equal("selectedDuration" in cleaned, false);
});

test("benzer-kelimeler icin gecersiz secenek disindaki deger sessizce atlanir", () => {
  const schema = getExerciseSettingsSchema("benzer-kelimeler");
  const cleaned = validateExerciseSettingsValue(schema, {
    boxCount: 999,
    targetDifferentCount: 5,
  });

  assert.deepEqual(cleaned, { targetDifferentCount: 5 });
});

test("gecerli degerler kabul edilir", () => {
  const schema = getExerciseSettingsSchema("goz-egzersizleri-kolonlar");
  const cleaned = validateExerciseSettingsValue(schema, {
    jumpSpeed: 2000,
    columnCount: 7,
    flowDirection: "row",
  });

  assert.deepEqual(cleaned, { jumpSpeed: 2000, columnCount: 7, flowDirection: "row" });
});

test("gecersiz durationMinutes benzeri desteklenmeyen alan settings'e yazilmaz", () => {
  const schema = getExerciseSettingsSchema("goz-egzersizleri-kolonlar");
  const cleaned = validateExerciseSettingsValue(schema, {
    durationMinutes: 5,
    jumpSpeed: 1000,
  });

  assert.deepEqual(cleaned, { jumpSpeed: 1000 });
  assert.equal("durationMinutes" in cleaned, false);
});

test("secenekler disindaki gecersiz deger sessizce atlanir (hata firlatilmaz)", () => {
  const schema = getExerciseSettingsSchema("goz-egzersizleri-kolonlar");
  const cleaned = validateExerciseSettingsValue(schema, {
    jumpSpeed: 999999,
    columnCount: 100,
    flowDirection: "diagonal",
  });

  assert.deepEqual(cleaned, {});
});

test("bos settings guvenle {} dondurur", () => {
  const schema = getExerciseSettingsSchema("kelime-bulma");
  assert.deepEqual(validateExerciseSettingsValue(schema, {}), {});
});

test("readExerciseSettingsFromFormData yalniz semadaki alanlari prefix ile okur", () => {
  const schema = getExerciseSettingsSchema("kare-gorme-alani");
  const formData = new FormData();
  formData.set("task-1-settings-gridSize", "9");
  formData.set("task-1-settings-unrelatedField", "hack");

  const cleaned = readExerciseSettingsFromFormData(schema, formData, "task-1-settings-");
  assert.deepEqual(cleaned, { gridSize: 9 });
});

test("pickEducationProgramSettingOption gecerli degeri kullanir", () => {
  const value = pickEducationProgramSettingOption(
    { jumpSpeed: 2500 },
    "jumpSpeed",
    [200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
    1000,
  );
  assert.equal(value, 2500);
});

test("pickEducationProgramSettingOption eksik/gecersiz/undefined settings icin fallback doner (crash olmaz)", () => {
  assert.equal(
    pickEducationProgramSettingOption(undefined, "jumpSpeed", [200, 400], 200),
    200,
  );
  assert.equal(
    pickEducationProgramSettingOption({}, "jumpSpeed", [200, 400], 200),
    200,
  );
  assert.equal(
    pickEducationProgramSettingOption({ jumpSpeed: 999999 }, "jumpSpeed", [200, 400], 200),
    200,
  );
  assert.equal(
    pickEducationProgramSettingOption({ flowDirection: "column" }, "flowDirection", ["column", "row"], "column"),
    "column",
  );
});
