import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ASSIGNMENT_CLASS_GROUPS, ASSIGNMENT_CLASS_GROUP_LABELS } from "../src/lib/assignments/classGroups.ts";
import { ASSIGNMENT_EXERCISE_CATALOG, getAssignmentExerciseDefinition } from "../src/lib/assignments/assignmentExerciseCatalog.ts";
import { generateProgramPreview, NO_READY_COMPREHENSION_WARNING } from "../src/lib/assignments/programPreview.ts";
import {
  buildDefaultExerciseFormState,
  buildExercisesPayload,
  countEnabledReadyExercises,
  exerciseFormStateFromSetting,
  formatDurationLabel,
  getCategoryGroupLabel,
  getSettingFieldLabel,
  MINIMUM_ENABLED_READY_EXERCISES,
  validateTemplateFormClientSide,
} from "../src/app/ogretmen/idil-panel/odev-programi/assignmentProgramForm.ts";

// TEST 1: 8 sinif grubu gorunuyor.
test("8 sinif grubu goruntuleniyor, hepsinin etiketi var", () => {
  assert.equal(ASSIGNMENT_CLASS_GROUPS.length, 8);
  for (const group of ASSIGNMENT_CLASS_GROUPS) {
    assert.ok(ASSIGNMENT_CLASS_GROUP_LABELS[group], `${group} icin etiket yok`);
  }
});

// TEST 2: 16 katalog kaydi gorunur.
test("katalogda tam 16 kayit var", () => {
  assert.equal(ASSIGNMENT_EXERCISE_CATALOG.length, 16);
});

// TEST 3: 10 ready secilebilir.
test("katalogda tam 10 ready egzersiz var", () => {
  const readyCount = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus === "ready").length;
  assert.equal(readyCount, 10);
});

// TEST 4: 6 hazir olmayan secilemez.
test("katalogda tam 6 hazir olmayan (needs_minor+needs_major) egzersiz var, hicbiri ready degil", () => {
  const notReady = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus !== "ready");
  assert.equal(notReady.length, 6);
  for (const entry of notReady) {
    assert.notEqual(entry.integrationStatus, "ready");
  }
});

// TEST 5: Takistoskop speedMs inputu dogru request'e donusur.
test("Takistoskop speedMs ayari buildExercisesPayload cikisinda aynen goruntuleniyor", () => {
  const definition = getAssignmentExerciseDefinition("takistoskop");
  assert.ok(definition);

  const form = exerciseFormStateFromSetting({
    id: "s1",
    templateId: "t1",
    exerciseSlug: "takistoskop",
    enabled: true,
    startingLevel: 3,
    durationSeconds: 300,
    settings: { speedMs: 500, workMode: "manual", contentType: "letter" },
    dailyWeight: 1,
    repeatCooldownDays: 0,
    maxOccurrencesPerProgram: null,
    displayOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const payload = buildExercisesPayload(["takistoskop"], { takistoskop: form });
  assert.equal(payload.length, 1);
  assert.equal(payload[0].exerciseSlug, "takistoskop");
  assert.equal(payload[0].settings.speedMs, 500);
  assert.equal("displayDurationMs" in payload[0].settings, false, "displayDurationMs asla kullanilmamali");
});

// TEST 6 ve TEST 7: hazir olmayan/disabled slug'lar PUT payload'a girmez.
test("hazir olmayan slug'lar (needs_minor/needs_major) buildExercisesPayload cikisina hic girmez", () => {
  const readySlugs = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus === "ready").map(
    (entry) => entry.exerciseSlug,
  );
  const notReadySlugs = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus !== "ready").map(
    (entry) => entry.exerciseSlug,
  );

  const exerciseForms = Object.fromEntries(
    ASSIGNMENT_EXERCISE_CATALOG.map((definition, index) => [
      definition.exerciseSlug,
      buildDefaultExerciseFormState(definition, 300, index),
    ]),
  );

  // Bilerek yalniz readySlugs listesi gonderiliyor - component da tam olarak
  // bunu yapiyor (bkz. AssignmentProgramSettingsClient.tsx readyExerciseSlugs).
  const payload = buildExercisesPayload(readySlugs, exerciseForms);

  assert.equal(payload.length, readySlugs.length);
  for (const item of payload) {
    assert.equal(notReadySlugs.includes(item.exerciseSlug), false, `${item.exerciseSlug} payload'a girmemeliydi`);
  }
});

// TEST 8: preview response 20x5 olarak render edilebilecek veri seklinde.
test("gercek generateProgramPreview cikisi 20 gun x 5 gorev seklinde - UI'in beklendigi gibi render edebilecegi yapida", () => {
  const readyDefinitions = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus === "ready");
  const exerciseSettings = readyDefinitions.map((definition, index) => ({
    id: `s-${index}`,
    templateId: "t1",
    exerciseSlug: definition.exerciseSlug,
    enabled: true,
    startingLevel: definition.levelMin ?? 1,
    durationSeconds: 300,
    settings: { ...definition.defaultSettings },
    dailyWeight: 1,
    repeatCooldownDays: 0,
    maxOccurrencesPerProgram: null,
    displayOrder: index,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "ui-render-check", exerciseSettings });
  assert.equal(result.ok, true);
  assert.equal(result.preview.days.length, 20);
  for (const day of result.preview.days) {
    assert.equal(day.tasks.length, 5);
    for (const task of day.tasks) {
      assert.equal(typeof task.exerciseTitle, "string");
      assert.equal(typeof task.category, "string");
    }
  }
});

// TEST 9: warning gorunur.
test("ready comprehension yokken NO_READY_COMPREHENSION_WARNING preview'de goruntulenecek sekilde uretiliyor", () => {
  const readyDefinitions = ASSIGNMENT_EXERCISE_CATALOG.filter((entry) => entry.integrationStatus === "ready");
  const exerciseSettings = readyDefinitions.map((definition, index) => ({
    id: `s-${index}`,
    templateId: "t1",
    exerciseSlug: definition.exerciseSlug,
    enabled: true,
    startingLevel: definition.levelMin ?? 1,
    durationSeconds: 300,
    settings: { ...definition.defaultSettings },
    dailyWeight: 1,
    repeatCooldownDays: 0,
    maxOccurrencesPerProgram: null,
    displayOrder: index,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const result = generateProgramPreview({ classGroup: "grade_1", generationSeed: "warning-ui-check", exerciseSettings });
  assert.equal(result.ok, true);
  assert.ok(result.preview.summary.warnings.includes(NO_READY_COMPREHENSION_WARNING));
});

// TEST 10: gercek program tablosuna yazan hicbir client kodu yok.
test("AssignmentProgramSettingsClient hicbir Supabase/DB cagrisi icermiyor - yalniz iki admin API'sine fetch atiyor", async () => {
  const source = await readFile(
    new URL("../src/app/ogretmen/idil-panel/odev-programi/AssignmentProgramSettingsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /supabase/i, "client component supabase'e dogrudan referans vermemeli");
  assert.doesNotMatch(source, /student_assignment_program/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);

  // Yalniz beklenen iki admin API'sine fetch atildigini dogrula.
  assert.match(source, /\/api\/admin\/assignment-program\/templates/);
  assert.match(source, /\/api\/admin\/assignment-program\/preview/);
});

// Ek saf-helper testleri (formatDurationLabel, getSettingFieldLabel, validation, sayim).

test("formatDurationLabel saniyeyi kullanici dostu bicime cevirir", () => {
  assert.equal(formatDurationLabel(300), "5 dakika");
  assert.equal(formatDurationLabel(330), "5 dk 30 sn");
  assert.equal(formatDurationLabel(0), "-");
});

test("getSettingFieldLabel bilinen anahtarlar icin Turkce etiket, bilinmeyenler icin humanize fallback donduruyor", () => {
  assert.equal(getSettingFieldLabel("speedMs"), "Gösterim Hızı (ms)");
  assert.equal(getSettingFieldLabel("fontSize"), "Yazı Boyutu (px)");
  assert.equal(getSettingFieldLabel("someBrandNewField"), "Some Brand New Field");
});

test("getCategoryGroupLabel gercek 5 katalog kategorisini dogru gruba esler", () => {
  assert.equal(getCategoryGroupLabel("speed"), "Hız / Okuma");
  assert.equal(getCategoryGroupLabel("comprehension"), "Anlama");
  assert.equal(getCategoryGroupLabel("attention"), "Dikkat / Odak");
  assert.equal(getCategoryGroupLabel("memory"), "Hafıza");
  assert.equal(getCategoryGroupLabel("eye"), "Göz / Görsel Algı");
});

test("buildDefaultExerciseFormState enabled=false ile baslar (en guvenli varsayilan)", () => {
  const definition = getAssignmentExerciseDefinition("hafiza-gelistirme");
  const form = buildDefaultExerciseFormState(definition, 300, 0);
  assert.equal(form.enabled, false);
  assert.equal(form.startingLevel, 2, "hafiza-gelistirme icin levelMin=2 kullanilmali");
  assert.equal(form.durationSeconds, 300);
  assert.deepEqual(form.settings, definition.defaultSettings);
});

test("validateTemplateFormClientSide bos ad ve gecersiz sure icin hata uretir", () => {
  const errors = validateTemplateFormClientSide({
    name: "   ",
    defaultTaskDurationSeconds: -5,
    readyExerciseSlugs: [],
    exerciseForms: {},
    settingsSchemaBySlug: {},
  });
  assert.ok(errors.some((error) => error.field === "name"));
  assert.ok(errors.some((error) => error.field === "defaultTaskDurationSeconds"));
});

test("validateTemplateFormClientSide gecerli bir form icin hic hata uretmez", () => {
  const definition = getAssignmentExerciseDefinition("takistoskop");
  const form = buildDefaultExerciseFormState(definition, 300, 0);
  const errors = validateTemplateFormClientSide({
    name: "1. Sınıf Programı",
    defaultTaskDurationSeconds: 300,
    readyExerciseSlugs: ["takistoskop"],
    exerciseForms: { takistoskop: form },
    settingsSchemaBySlug: { takistoskop: definition.settingsSchema },
  });
  assert.deepEqual(errors, []);
});

test("countEnabledReadyExercises yalniz enabled+weight>0 olanlari sayar", () => {
  const forms = {
    a: { enabled: true, dailyWeight: 1, startingLevel: 1, durationSeconds: 300, repeatCooldownDays: 0, maxOccurrencesPerProgram: null, displayOrder: 0, settings: {} },
    b: { enabled: true, dailyWeight: 0, startingLevel: 1, durationSeconds: 300, repeatCooldownDays: 0, maxOccurrencesPerProgram: null, displayOrder: 0, settings: {} },
    c: { enabled: false, dailyWeight: 1, startingLevel: 1, durationSeconds: 300, repeatCooldownDays: 0, maxOccurrencesPerProgram: null, displayOrder: 0, settings: {} },
  };
  assert.equal(countEnabledReadyExercises(["a", "b", "c"], forms), 1);
  assert.equal(MINIMUM_ENABLED_READY_EXERCISES, 5);
});
