import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  getExerciseSettingsSchema,
  pickEducationProgramRangeSettingOption,
  readRawExerciseSettingsFromFormData,
  validateExerciseSettingsValue,
  validateExerciseSettingsValueDetailed,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const EDITOR_PATH = "src/components/education-programs/EducationProgramTemplateEditor.tsx";
const VALIDATION_PATH = "src/lib/education-programs/validation.ts";

const RANGE_FIELDS = [
  { slug: "blok-okuma", key: "wordsPerMinute", defaultValue: 150 },
  { slug: "golgeleme", key: "wordsPerMinute", defaultValue: 150 },
  { slug: "gruplama-calismasi", key: "customWordsPerMinute", defaultValue: 300 },
];

// ---------------------------------------------------------------------------
// 1) Sema integer-range tipini destekliyor
// ---------------------------------------------------------------------------

test("1) ExerciseSettingsFieldType 'integer-range' tipini destekler", async () => {
  const source = await read("src/lib/education-programs/exerciseSettingsSchemas.ts");
  assert.match(source, /export type ExerciseSettingsFieldType = "integer" \| "enum" \| "integer-range";/);
  assert.match(source, /export type ExerciseSettingsRangeFieldDef = \{/);
  assert.match(source, /type: "integer-range";\s*\n\s*min: number;\s*\n\s*max: number;\s*\n\s*step\?: number;/);
});

// ---------------------------------------------------------------------------
// 2/3/4) Uc egzersizin hiz alani min=1, max=2000, step=1
// ---------------------------------------------------------------------------

for (const { slug, key, defaultValue } of RANGE_FIELDS) {
  test(`2-4) ${slug} icin ${key} alani type=integer-range, min=1, max=2000, step=1, defaultValue=${defaultValue}`, () => {
    const schema = getExerciseSettingsSchema(slug);
    assert.ok(schema, `${slug} icin sema bulunmali`);
    const field = schema.fields.find((item) => item.key === key);
    assert.ok(field, `${key} alani ${slug} semasinda bulunmali`);

    assert.equal(field.type, "integer-range");
    assert.equal(field.min, 1);
    assert.equal(field.max, 2000);
    assert.equal(field.step, 1);
    assert.equal(field.defaultValue, defaultValue);
    assert.equal("options" in field, false);
  });
}

// ---------------------------------------------------------------------------
// 5) Editor integer-range alanini input type="number" olarak render ediyor
// ---------------------------------------------------------------------------

test("5) Editor integer-range alanini <select> yerine <input type=number> olarak render eder", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /if \(field\.type === "integer-range"\) \{/);
  assert.match(
    source,
    /<input\s*\n\s*type="number"\s*\n\s*name=\{`task-\$\{orderNumber\}-settings-\$\{field\.key\}`\}\s*\n\s*min=\{field\.min\}\s*\n\s*max=\{field\.max\}\s*\n\s*step=\{field\.step \?\? 1\}\s*\n\s*value=\{rawValue\}/,
  );
});

// ---------------------------------------------------------------------------
// 6/7/8) 175 / 225 / 135 kaydediliyor ve runtime'da aynen okunuyor
// ---------------------------------------------------------------------------

test("6) Blok Okuma icin 175 kelime/dakika kaydediliyor ve runtime'da 175 okunuyor", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");
  const cleaned = validateExerciseSettingsValue(schema, { wordsPerMinute: 175 });
  assert.equal(cleaned.wordsPerMinute, 175);

  const runtimeValue = pickEducationProgramRangeSettingOption(
    { wordsPerMinute: 175 },
    "wordsPerMinute",
    1,
    2000,
    150,
  );
  assert.equal(runtimeValue, 175);
});

test("7) Gruplama Çalışması icin 225 kelime/dakika kaydediliyor ve runtime'da 225 okunuyor", () => {
  const schema = getExerciseSettingsSchema("gruplama-calismasi");
  const cleaned = validateExerciseSettingsValue(schema, { customWordsPerMinute: 225 });
  assert.equal(cleaned.customWordsPerMinute, 225);

  const runtimeValue = pickEducationProgramRangeSettingOption(
    { customWordsPerMinute: 225 },
    "customWordsPerMinute",
    1,
    2000,
    300,
  );
  assert.equal(runtimeValue, 225);
});

test("8) Gölgeleme icin 135 kelime/dakika kaydediliyor ve runtime'da 135 okunuyor", () => {
  const schema = getExerciseSettingsSchema("golgeleme");
  const cleaned = validateExerciseSettingsValue(schema, { wordsPerMinute: 135 });
  assert.equal(cleaned.wordsPerMinute, 135);

  const runtimeValue = pickEducationProgramRangeSettingOption(
    { wordsPerMinute: 135 },
    "wordsPerMinute",
    1,
    2000,
    150,
  );
  assert.equal(runtimeValue, 135);
});

test("6-8) FormData -> readRawExerciseSettingsFromFormData -> validateExerciseSettingsValueDetailed tam akisinda 175/225/135 korunur", () => {
  const blockSchema = getExerciseSettingsSchema("blok-okuma");
  const blockFormData = new FormData();
  blockFormData.set("task-1-settings-wordsPerMinute", "175");
  const blockRaw = readRawExerciseSettingsFromFormData(blockSchema, blockFormData, "task-1-settings-");
  const blockResult = validateExerciseSettingsValueDetailed(blockSchema, blockRaw);
  assert.equal(blockResult.settings.wordsPerMinute, 175);
  assert.equal(blockResult.issues.length, 0);

  const groupingSchema = getExerciseSettingsSchema("gruplama-calismasi");
  const groupingFormData = new FormData();
  groupingFormData.set("task-2-settings-customWordsPerMinute", "225");
  const groupingRaw = readRawExerciseSettingsFromFormData(groupingSchema, groupingFormData, "task-2-settings-");
  const groupingResult = validateExerciseSettingsValueDetailed(groupingSchema, groupingRaw);
  assert.equal(groupingResult.settings.customWordsPerMinute, 225);
  assert.equal(groupingResult.issues.length, 0);

  const shadowSchema = getExerciseSettingsSchema("golgeleme");
  const shadowFormData = new FormData();
  shadowFormData.set("task-3-settings-wordsPerMinute", "135");
  const shadowRaw = readRawExerciseSettingsFromFormData(shadowSchema, shadowFormData, "task-3-settings-");
  const shadowResult = validateExerciseSettingsValueDetailed(shadowSchema, shadowRaw);
  assert.equal(shadowResult.settings.wordsPerMinute, 135);
  assert.equal(shadowResult.issues.length, 0);
});

// ---------------------------------------------------------------------------
// 9) Eski 100/150/200 degerleri calisiyor (geriye donuk uyumluluk)
// ---------------------------------------------------------------------------

test("9) eski sabit secenek degerleri (100, 150, 200) hala gecerli kabul edilir", () => {
  for (const legacyValue of [100, 150, 200]) {
    const schema = getExerciseSettingsSchema("blok-okuma");
    const cleaned = validateExerciseSettingsValue(schema, { wordsPerMinute: legacyValue });
    assert.equal(cleaned.wordsPerMinute, legacyValue);

    const runtimeValue = pickEducationProgramRangeSettingOption(
      { wordsPerMinute: legacyValue },
      "wordsPerMinute",
      1,
      2000,
      150,
    );
    assert.equal(runtimeValue, legacyValue);
  }
});

// ---------------------------------------------------------------------------
// 10) Gecersiz degerler reddediliyor: 0, negatif, 2001, ondalikli, NaN, bos
// ---------------------------------------------------------------------------

test("10) 0, negatif, 2001 (araligin ustunde), ondalikli, NaN ve bos deger validateExerciseSettingsValue'da sessizce reddedilir", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");

  for (const invalidValue of [0, -10, 2001, 175.5, "abc", ""]) {
    const cleaned = validateExerciseSettingsValue(schema, { wordsPerMinute: invalidValue });
    assert.equal(
      "wordsPerMinute" in cleaned,
      false,
      `${JSON.stringify(invalidValue)} kabul edilmemeli`,
    );
  }
});

test("10) ayni gecersiz degerler validateExerciseSettingsValueDetailed'da acik bir 'issue' uretir (mevcut form doğrulama mimarisine uygun)", () => {
  const schema = getExerciseSettingsSchema("blok-okuma");

  for (const invalidValue of [0, -10, 2001, 175.5, "abc"]) {
    const result = validateExerciseSettingsValueDetailed(schema, { wordsPerMinute: invalidValue });
    assert.equal("wordsPerMinute" in result.settings, false);
    assert.ok(
      result.issues.some((issue) => issue.field === "wordsPerMinute"),
      `${JSON.stringify(invalidValue)} icin acik bir issue uretilmeli`,
    );
  }

  // Bos deger (alan dokunulmus ama bosaltilmis) de acik bir issue uretmelidir.
  const emptyResult = validateExerciseSettingsValueDetailed(schema, { wordsPerMinute: "" });
  assert.equal("wordsPerMinute" in emptyResult.settings, false);
  assert.ok(emptyResult.issues.some((issue) => issue.field === "wordsPerMinute"));
});

test("10) validation.ts gun/gorev dogrulamasi integer-range hatasini mevcut issues mimarisine (field/message/dayNumber/orderNumber) ekler", async () => {
  const source = await read(VALIDATION_PATH);

  assert.match(
    source,
    /import \{\s*\n\s*getExerciseSettingsSchema,\s*\n\s*validateExerciseSettingsValueDetailed,\s*\n\s*\} from "@\/lib\/education-programs\/exerciseSettingsSchemas";/,
  );
  assert.match(
    source,
    /const settingsResult = validateExerciseSettingsValueDetailed\(settingsSchema, genericSettings \?\? \{\}\);/,
  );
  assert.match(
    source,
    /for \(const settingsIssue of settingsResult\.issues\) \{\s*\n\s*issues\.push\(\{/,
  );
});

// ---------------------------------------------------------------------------
// 11) Gecersiz runtime degeri guvenli varsayilana donuyor
// ---------------------------------------------------------------------------

test("11) pickEducationProgramRangeSettingOption gecersiz/eksik/bozuk kayitli deger icin guvenli varsayilana doner", () => {
  assert.equal(pickEducationProgramRangeSettingOption(undefined, "wordsPerMinute", 1, 2000, 150), 150);
  assert.equal(pickEducationProgramRangeSettingOption({}, "wordsPerMinute", 1, 2000, 150), 150);
  assert.equal(
    pickEducationProgramRangeSettingOption({ wordsPerMinute: 0 }, "wordsPerMinute", 1, 2000, 150),
    150,
  );
  assert.equal(
    pickEducationProgramRangeSettingOption({ wordsPerMinute: -5 }, "wordsPerMinute", 1, 2000, 150),
    150,
  );
  assert.equal(
    pickEducationProgramRangeSettingOption({ wordsPerMinute: 5000 }, "wordsPerMinute", 1, 2000, 150),
    150,
  );
  assert.equal(
    pickEducationProgramRangeSettingOption({ wordsPerMinute: "abc" }, "wordsPerMinute", 1, 2000, 150),
    150,
  );
  assert.equal(
    pickEducationProgramRangeSettingOption({ wordsPerMinute: 175.5 }, "wordsPerMinute", 1, 2000, 150),
    150,
  );
});

// ---------------------------------------------------------------------------
// 12) enum ve secenek tabanli integer alanlar select olarak kaliyor
// ---------------------------------------------------------------------------

test("12) blockSize/speedMode/intervalMs (blok-okuma), groupSize/speedMode/customMilliseconds (gruplama) hala 'integer'/'enum' tipinde ve options tasir", () => {
  const blockSchema = getExerciseSettingsSchema("blok-okuma");
  const blockFieldsByKey = Object.fromEntries(blockSchema.fields.map((field) => [field.key, field]));
  assert.equal(blockFieldsByKey.blockSize.type, "integer");
  assert.deepEqual(blockFieldsByKey.blockSize.options, [1, 2, 3, 4, 5]);
  assert.equal(blockFieldsByKey.speedMode.type, "enum");
  assert.deepEqual(blockFieldsByKey.speedMode.options, ["interval", "wpm"]);
  assert.equal(blockFieldsByKey.intervalMs.type, "integer");
  const sharedSpeedOptions = [
    ...Array.from({ length: 20 }, (_, index) => (index + 1) * 50),
    1100,
    2000,
    5000,
  ];
  assert.deepEqual(blockFieldsByKey.intervalMs.options, sharedSpeedOptions);

  const groupingSchema = getExerciseSettingsSchema("gruplama-calismasi");
  const groupingFieldsByKey = Object.fromEntries(groupingSchema.fields.map((field) => [field.key, field]));
  assert.equal(groupingFieldsByKey.groupSize.type, "integer");
  assert.equal(groupingFieldsByKey.speedMode.type, "enum");
  assert.equal(groupingFieldsByKey.customMilliseconds.type, "integer");
  assert.deepEqual(groupingFieldsByKey.customMilliseconds.options, sharedSpeedOptions);
});

test("12) editor enum/integer alanlar icin hala <select> render eder (integer-range disindaki dal degismedi)", async () => {
  const source = await read(EDITOR_PATH);
  const fieldsBlock = source.slice(
    source.indexOf("settingsSchema.fields.map"),
    source.indexOf("Egzersize özel ayarlar"),
  );
  assert.match(fieldsBlock, /<select/);
  assert.match(fieldsBlock, /field\.options\.map\(\(option\) =>/);
});

// ---------------------------------------------------------------------------
// 13) Diger egzersizlerin ayarlari etkilenmiyor
// ---------------------------------------------------------------------------

test("13) sema tanimli diger 9 egzersizin (integer-range disi) hicbir alani etkilenmedi", () => {
  const untouchedSchemas = [
    ["goz-egzersizleri-kolonlar", "jumpSpeed", [50, 100, 150, 200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]],
    ["kelime-bulma", "targetWordsPerText", [3, 4, 5, 6]],
    ["kare-gorme-alani", "gridSize", [7, 9, 11, 13, 15]],
    ["ayni-olani-yakala", "speed", [1500, 1000, 750, 500]],
    ["benzer-kelimeler", "boxCount", [12, 16, 20, 24]],
    ["takistoskop", "speedMs", [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]],
    ["harf-rakam-sayma", "speedSeconds", [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
    ["hafiza-gelistirme", "displayMs", [500, 750, 1000, 1500, 2000]],
    ["kart-eslestirme", "previewDurationMs", [2000, 3000, 4000, 5000, 7000, 10000]],
  ];

  for (const [slug, key, expectedOptions] of untouchedSchemas) {
    const schema = getExerciseSettingsSchema(slug);
    const field = schema.fields.find((item) => item.key === key);
    assert.equal(field.type, "integer");
    assert.deepEqual(field.options, expectedOptions);
  }
});

// ---------------------------------------------------------------------------
// 14) Bagimsiz egzersiz dosyalari degistirilmedi (yalniz tek okuma satiri haric)
// ---------------------------------------------------------------------------

test("14) uc bagimsiz egzersiz client'inin kendi serbest-giris JSX'i ve commitWordsPerMinuteInput mantigi degismedi", async () => {
  const blockSource = await read("src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx");
  const shadowSource = await read("src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx");
  const groupingSource = await read("src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx");

  for (const source of [blockSource, shadowSource]) {
    assert.match(source, /const commitWordsPerMinuteInput = useCallback/);
    assert.match(source, /"Okuma hızı 1 veya daha büyük bir sayı olmalıdır\."/);
    assert.match(source, /speedMode === "interval" \? \(/);
  }
  assert.match(groupingSource, /"Okuma hızı 1 veya daha büyük bir sayı olmalıdır\."/);

  // Degisen TEK satir: pickEducationProgramSettingOption -> pickEducationProgramRangeSettingOption,
  // yalniz wordsPerMinute/customWordsPerMinute icin. Diger alanlar (blockSize,
  // speedMode, intervalMs, groupSize, customMilliseconds) hala eski fonksiyonu kullanir.
  assert.match(blockSource, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "blockSize"/);
  assert.match(shadowSource, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "blockSize"/);
  assert.match(groupingSource, /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "groupSize"/);
});

// ---------------------------------------------------------------------------
// 15) Migration veya RPC dosyasi eklenmedi
// ---------------------------------------------------------------------------

test("15) bu duzeltme icin yeni bir migration/RPC dosyasi olusturulmadi", async () => {
  const files = await readdir(new URL("../supabase/migrations", import.meta.url));
  const sqlFiles = files.filter((name) => name.endsWith(".sql"));

  // Bir onceki (assign_education_program_template_v1 whitelist senkron)
  // duzeltmesinden bu yana migration sayisi degismedi - bu ozellik tamamen
  // TypeScript/React tarafinda, education_program_template_tasks.settings
  // (jsonb) semasiz oldugundan hicbir DB degisikligi gerekmedi.
  // Phase 1B ve sonraki eklemelerle mevcut toplam sayiyi dogru sekilde 26
  // olarak kontrol ediyoruz.
  // 2026-07-29: cift-tarafli-odak exercise'i icin yeni migration eklendi (27).
  // 2026-07-29: goz-kaslari exercise'i icin yeni migration eklendi (28).
  // 2026-07-30: 13-nokta-emoji-takip whitelist forward migration'i eklendi (29).
  // 2026-07-30: Profilim icin school_name kolonu migration'i eklendi (30).
  // 2026-07-31: Faz 1 parola hash altyapisi icin nullable alanlar eklendi (32).
  // 2026-08-04: kelime-yarisi tam entegrasyonu icin whitelist migration'i eklendi.
  assert.equal(sqlFiles.length, 42);
});

test("15) RPC dosyalarina (assign_education_program_template_v1 dahil) bu duzeltme icin dokunulmadi", async () => {
  const assignRpcSource = await read(
    "supabase/migrations/20260725180000_create_student_education_program_system.sql",
  );
  assert.doesNotMatch(assignRpcSource, /integer-range/);
  assert.doesNotMatch(assignRpcSource, /wordsPerMinute/);
  assert.doesNotMatch(assignRpcSource, /customWordsPerMinute/);
});
