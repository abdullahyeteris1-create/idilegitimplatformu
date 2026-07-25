import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSIGNMENT_EXERCISE_CATALOG,
  getAssignmentExerciseDefinition,
} from "../src/lib/assignments/assignmentExerciseCatalog.ts";
import {
  MAX_PROGRAM_DAYS,
  TASKS_PER_DAY,
  validateProgramDays,
  validateTemplateSlotInput,
  validateTemplateSlotList,
} from "../src/lib/assignments/templateSlotValidation.ts";

const READY = ASSIGNMENT_EXERCISE_CATALOG.filter((d) => d.integrationStatus === "ready");
const READY_SLUG = READY[0].exerciseSlug;

function slotFor(slug, overrides = {}) {
  const definition = getAssignmentExerciseDefinition(slug);
  return {
    dayNumber: 1,
    taskOrder: 1,
    exerciseSlug: slug,
    startingLevel: definition.supportsLevel ? (definition.levelMin ?? 1) : 1,
    durationSeconds: 300,
    settings: { ...definition.defaultSettings },
    ...overrides,
  };
}

// ============================================================================
// Gun sayisi
// ============================================================================

test("gun sayisi 1..MAX araliginda kabul edilir, disinda reddedilir", () => {
  assert.equal(validateProgramDays(1).ok, true);
  assert.equal(validateProgramDays(20).ok, true);
  assert.equal(validateProgramDays(MAX_PROGRAM_DAYS).ok, true);
  assert.equal(validateProgramDays(0).ok, false);
  assert.equal(validateProgramDays(MAX_PROGRAM_DAYS + 1).ok, false);
  assert.equal(validateProgramDays(3.5).ok, false);
  assert.equal(validateProgramDays("20").ok, false);
});

// ============================================================================
// Tek slot dogrulamasi
// ============================================================================

test("gecerli bir slot kabul edilir ve category SUNUCUDAN turetilir", () => {
  const result = validateTemplateSlotInput(slotFor(READY_SLUG), 20);
  assert.equal(result.ok, true);
  assert.equal(result.value.category, getAssignmentExerciseDefinition(READY_SLUG).category);
});

test("client'in gonderdigi category YOK SAYILIR (katalogdan turetilir)", () => {
  const result = validateTemplateSlotInput(slotFor(READY_SLUG, { category: "uydurma-kategori" }), 20);
  assert.equal(result.ok, true);
  assert.notEqual(result.value.category, "uydurma-kategori");
  assert.equal(result.value.category, getAssignmentExerciseDefinition(READY_SLUG).category);
});

test("hazir olmayan (integrationStatus !== ready) bir egzersiz reddedilir", () => {
  const notReady = ASSIGNMENT_EXERCISE_CATALOG.find((d) => d.integrationStatus !== "ready");
  assert.ok(notReady, "katalogda ready olmayan en az bir kayit olmali");
  const result = validateTemplateSlotInput(slotFor(READY_SLUG, { exerciseSlug: notReady.exerciseSlug }), 20);
  assert.equal(result.ok, false);
});

test("katalogda hic bulunmayan bir slug reddedilir", () => {
  const result = validateTemplateSlotInput(slotFor(READY_SLUG, { exerciseSlug: "olmayan-egzersiz" }), 20);
  assert.equal(result.ok, false);
});

test("kalici olarak yasakli slug'lar reddedilir", () => {
  for (const banned of ["kelime-tahmin", "adam-asmaca", "gorsel-puzzle", "dikkat-labirenti", "goz-calismasi", "parcali-resim-kelime"]) {
    const result = validateTemplateSlotInput(slotFor(READY_SLUG, { exerciseSlug: banned }), 20);
    assert.equal(result.ok, false, `${banned} reddedilmeliydi`);
  }
});

test("gun numarasi sablonun gun sayisini asamaz", () => {
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { dayNumber: 20 }), 20).ok, true);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { dayNumber: 21 }), 20).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { dayNumber: 4 }), 3).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { dayNumber: 0 }), 20).ok, false);
});

test("gorev sirasi 1..5 disinda reddedilir", () => {
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { taskOrder: TASKS_PER_DAY }), 20).ok, true);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { taskOrder: TASKS_PER_DAY + 1 }), 20).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { taskOrder: 0 }), 20).ok, false);
});

test("semada olmayan bir settings anahtari reddedilir", () => {
  const result = validateTemplateSlotInput(
    slotFor(READY_SLUG, { settings: { uydurmaAyar: 5 } }),
    20,
  );
  assert.equal(result.ok, false);
});

test("gecersiz seviye reddedilir", () => {
  const levelled = READY.find((d) => d.supportsLevel && typeof d.levelMax === "number");
  if (!levelled) return;
  assert.equal(validateTemplateSlotInput(slotFor(levelled.exerciseSlug, { startingLevel: levelled.levelMax + 1 }), 20).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(levelled.exerciseSlug, { startingLevel: 0 }), 20).ok, false);
});

test("gecersiz sure reddedilir", () => {
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { durationSeconds: 0 }), 20).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { durationSeconds: -60 }), 20).ok, false);
  assert.equal(validateTemplateSlotInput(slotFor(READY_SLUG, { durationSeconds: 12.5 }), 20).ok, false);
});

// ============================================================================
// Slot listesi dogrulamasi
// ============================================================================

test("ayni gun/sira ikilisi iki kez gonderilemez", () => {
  const result = validateTemplateSlotList(
    [slotFor(READY[0].exerciseSlug), slotFor(READY[1].exerciseSlug, { taskOrder: 1 })],
    20,
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /birden fazla kez/);
});

test("KULLANICI KURALI: ayni gun icinde ayni egzersiz iki kez kullanilamaz", () => {
  const result = validateTemplateSlotList(
    [slotFor(READY_SLUG, { taskOrder: 1 }), slotFor(READY_SLUG, { taskOrder: 2 })],
    20,
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /ayni egzersiz birden fazla kez/i);
});

test("ayni egzersiz FARKLI gunlerde serbestce tekrar edilebilir", () => {
  const result = validateTemplateSlotList(
    [slotFor(READY_SLUG, { dayNumber: 1 }), slotFor(READY_SLUG, { dayNumber: 2 })],
    20,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 2);
});

test("eksik (kismi) slot listesi kabul edilir - sablon birden fazla oturumda doldurulabilir", () => {
  const result = validateTemplateSlotList([slotFor(READY_SLUG)], 20);
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 1);
});

test("bos liste kabul edilir (tum slotlari temizleme)", () => {
  const result = validateTemplateSlotList([], 20);
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 0);
});

test("gun sayisi x 5'ten fazla slot reddedilir", () => {
  const tooMany = Array.from({ length: 11 }, (_, i) =>
    slotFor(READY[i % READY.length].exerciseSlug, {
      dayNumber: Math.floor(i / 5) + 1,
      taskOrder: (i % 5) + 1,
    }),
  );
  const result = validateTemplateSlotList(tooMany, 2);
  assert.equal(result.ok, false);
});

test("dizi olmayan girdi reddedilir", () => {
  assert.equal(validateTemplateSlotList(null, 20).ok, false);
  assert.equal(validateTemplateSlotList({}, 20).ok, false);
  assert.equal(validateTemplateSlotList("slots", 20).ok, false);
});

// ============================================================================
// Migration / RPC statik kaynak kontrolleri
// ============================================================================

const TABLE_MIGRATION_URL = new URL(
  "../supabase/migrations/20260725140000_create_program_template_tasks.sql",
  import.meta.url,
);
const RPC_MIGRATION_URL = new URL(
  "../supabase/migrations/20260725150000_manual_template_program_rpcs.sql",
  import.meta.url,
);

test("program_template_tasks tablosu ayni-gun-ayni-egzersiz tekrarini DB seviyesinde engelliyor", async () => {
  const sql = await readFile(TABLE_MIGRATION_URL, "utf8");
  assert.match(sql, /unique \(template_id, day_number, exercise_slug\)/);
  assert.match(sql, /unique \(template_id, day_number, task_order\)/);
});

test("program_template_tasks tablosu RLS + anon/authenticated revoke iceriyor", async () => {
  const sql = await readFile(TABLE_MIGRATION_URL, "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on public\.program_template_tasks from anon, authenticated/);
});

test("migration mevcut tablolari SILMIYOR, yalniz gun sayisi CHECK'lerini gevsetiyor", async () => {
  const sql = await readFile(TABLE_MIGRATION_URL, "utf8");
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /drop column/i);
  assert.match(sql, /between 1 and 60/);
});

test("yeni RPC'ler service_role-only + search_path pinlenmis", async () => {
  const sql = await readFile(RPC_MIGRATION_URL, "utf8");
  for (const fn of ["replace_program_template_tasks", "create_student_assignment_program_from_template"]) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}`), `${fn} icin grant yok`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from anon`), `${fn} icin anon revoke yok`);
  }
  // Yorum satirlarindaki "security definer" gecislerini saymamak icin yalniz
  // gercek fonksiyon govdelerindeki tanimlar sayilir.
  const declarations = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  assert.equal((declarations.match(/^security definer$/gm) ?? []).length, 2, "iki fonksiyon da security definer olmali");
  assert.equal(
    (declarations.match(/^set search_path = public, pg_temp$/gm) ?? []).length,
    2,
    "iki fonksiyon da search_path pinlemeli",
  );
});

test("atama RPC'si sablonun TAM dolu oldugunu dogruluyor ve sinif grubu esitligi ARAMIYOR", async () => {
  const sql = await readFile(RPC_MIGRATION_URL, "utf8");
  assert.match(sql, /ASSIGNMENT_TEMPLATE_INCOMPLETE/);
  assert.match(sql, /v_program_days \* 5/);
  // Ogrencinin kendi sinifiyla karsilastirma yapilmamali.
  assert.doesNotMatch(sql, /ASSIGNMENT_CLASS_GROUP_MISMATCH/);
  assert.doesNotMatch(sql, /education_level/);
});

test("atama RPC'si gorev verisini client'tan DEGIL program_template_tasks'tan okuyor", async () => {
  const sql = await readFile(RPC_MIGRATION_URL, "utf8");
  const fnBody = sql.slice(sql.indexOf("create or replace function public.create_student_assignment_program_from_template"));
  assert.match(fnBody, /from public\.program_template_tasks/);
  // Fonksiyon imzasinda gorev payload'i parametresi olmamali.
  assert.doesNotMatch(fnBody.slice(0, fnBody.indexOf("as $$")), /p_days|p_tasks|p_slots/);
});
