import assert from "node:assert/strict";
import test from "node:test";

import {
  getExerciseSettingsSchema,
  pickEducationProgramSettingOption,
  readExerciseSettingsFromFormData,
  validateExerciseSettingsValue,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";

test("yalniz eye-columns, word-finding, square-vision icin sema tanimlidir", () => {
  assert.ok(getExerciseSettingsSchema("goz-egzersizleri-kolonlar"));
  assert.ok(getExerciseSettingsSchema("kelime-bulma"));
  assert.ok(getExerciseSettingsSchema("kare-gorme-alani"));
  assert.equal(getExerciseSettingsSchema("ayni-olani-yakala"), undefined);
  assert.equal(getExerciseSettingsSchema("takistoskop"), undefined);
  assert.equal(getExerciseSettingsSchema("bilinmeyen-slug"), undefined);
});

test("eye-columns semasi client'in gercek alanlariyla birebir eslesir", () => {
  const schema = getExerciseSettingsSchema("goz-egzersizleri-kolonlar");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["columnCount", "flowDirection", "jumpSpeed"]);
  assert.deepEqual(fieldsByKey.jumpSpeed.options, [
    200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
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
