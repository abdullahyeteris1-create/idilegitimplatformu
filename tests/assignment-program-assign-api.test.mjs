import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mapAssignmentProgramRpcError } from "../src/lib/assignments/assignmentProgramErrors.ts";

const STUDENTS_ROUTE_URL = new URL(
  "../src/app/api/admin/assignment-program/students/route.ts",
  import.meta.url,
);
const PROGRAMS_ROUTE_URL = new URL(
  "../src/app/api/admin/assignment-program/programs/route.ts",
  import.meta.url,
);

async function readStudentsRoute() {
  return readFile(STUDENTS_ROUTE_URL, "utf8");
}

async function readProgramsRoute() {
  return readFile(PROGRAMS_ROUTE_URL, "utf8");
}

// ============================================================================
// mapAssignmentProgramRpcError - saf, RPC'ye/DB'ye baglanmayan testler.
// Kodlar supabase/migrations/20260724100000_create_student_assignment_program_rpc.sql
// dosyasindan birebir alinmistir (tahmin edilmemistir).
// ============================================================================

test("ASSIGNMENT_ACTIVE_PROGRAM_EXISTS -> 409", () => {
  const result = mapAssignmentProgramRpcError("ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: Ogrencinin zaten aktif bir programi var.");
  assert.equal(result.status, 409);
  assert.ok(result.message.length > 0);
});

test("ASSIGNMENT_STUDENT_NOT_FOUND -> 404", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_STUDENT_NOT_FOUND: Ogrenci bulunamadi.").status, 404);
});

test("ASSIGNMENT_STUDENT_INACTIVE -> 400", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_STUDENT_INACTIVE: Ogrenci pasif durumda.").status, 400);
});

test("ASSIGNMENT_TEMPLATE_NOT_FOUND -> 404", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_TEMPLATE_NOT_FOUND: Sablon bulunamadi.").status, 404);
});

test("ASSIGNMENT_TEMPLATE_INACTIVE -> 400", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_TEMPLATE_INACTIVE: Sablon pasif durumda.").status, 400);
});

test("ASSIGNMENT_CLASS_GROUP_MISMATCH -> 400", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_CLASS_GROUP_MISMATCH: uyusmuyor.").status, 400);
});

test("ASSIGNMENT_TEMPLATE_INVALID -> 400", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_TEMPLATE_INVALID: gecersiz.").status, 400);
});

test("ASSIGNMENT_INVALID_INPUT -> 400", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_INVALID_INPUT: gecersiz girdi.").status, 400);
});

test("ASSIGNMENT_INVALID_DAYS -> 500 (sunucu-uretimi hatasi, kullanici hatasi degil)", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_INVALID_DAYS: p_days gecersiz.").status, 500);
});

test("ASSIGNMENT_INVALID_TASK -> 500", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_INVALID_TASK: gecersiz gorev.").status, 500);
});

test("ASSIGNMENT_EXERCISE_NOT_ALLOWED -> 500", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_EXERCISE_NOT_ALLOWED: izin verilmiyor.").status, 500);
});

test("ASSIGNMENT_TASK_SNAPSHOT_MISMATCH -> 409", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_TASK_SNAPSHOT_MISMATCH: uyusmuyor.").status, 409);
});

test("ASSIGNMENT_INSERT_COUNT_MISMATCH -> 500", () => {
  assert.equal(mapAssignmentProgramRpcError("ASSIGNMENT_INSERT_COUNT_MISMATCH: sayi uyusmuyor.").status, 500);
});

test("bilinmeyen bir kod guvenli varsayilana (500 + genel mesaj) duser", () => {
  const result = mapAssignmentProgramRpcError("SOME_UNKNOWN_POSTGRES_ERROR: baska bir sey.");
  assert.equal(result.status, 500);
  assert.ok(result.message.length > 0);
});

test("iki nokta ust uste icermeyen ham mesaj da guvenli varsayilana duser (ham metin sizdirilmaz)", () => {
  const result = mapAssignmentProgramRpcError("duplicate key value violates unique constraint");
  assert.equal(result.status, 500);
  assert.doesNotMatch(result.message, /duplicate key/i);
});

test("hicbir esleme sonucu ham SQL/constraint metni icermez", () => {
  const rawMessages = [
    "ASSIGNMENT_ACTIVE_PROGRAM_EXISTS: Ogrencinin zaten aktif bir programi var (unique constraint devreye girdi).",
    "ASSIGNMENT_TASK_SNAPSHOT_MISMATCH: takistoskop icin gonderilen degerler sablon ayariyla uyusmuyor (gun 3, sira 2).",
  ];
  for (const raw of rawMessages) {
    const result = mapAssignmentProgramRpcError(raw);
    assert.doesNotMatch(result.message, /constraint|gun \d|sira \d/i);
  }
});

// ============================================================================
// GET /api/admin/assignment-program/students - statik kaynak testleri.
// ============================================================================

test("GET students route admin oturumunu server tarafinda dogruluyor", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /isAdminSessionValid/);
  assert.match(source, /401/);
});

test("GET students route yalniz service-role server client kullaniyor, baska bir Supabase client yok", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /getSupabaseServerClient/);
  assert.doesNotMatch(source, /createClient\(/);
});

test("GET students route yalniz aktif (is_active=true ve status=active) ogrencileri filtreliyor", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /\.eq\("is_active",\s*true\)/);
  assert.match(source, /\.eq\("status",\s*"active"\)/);
});

test("GET students route minimal alanlari seciyor, hassas alan (parent_email, phone, password vb.) yok", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /select\("id, name, education_level, is_active, status"\)/);
  assert.doesNotMatch(source, /parent_email|phone|password|birth_date/);
});

test("GET students route hicbir yazma islemi (insert/update/upsert/delete) icermiyor", async () => {
  const source = await readStudentsRoute();
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test("GET students route eski gunluk odev tablosuna dokunmuyor (daily_assignment)", async () => {
  const source = await readStudentsRoute();
  assert.doesNotMatch(source, /daily_assignment/i);
});

// ============================================================================
// GET /api/admin/assignment-program/students - aktif program isaretleme.
// Ogrenci, aktif bir programi olsa bile listeden ELENMEZ; yalniz
// hasActiveProgram/activeProgramId alanlariyla isaretlenir (UI bunu kullanarak
// gri/disabled gosterir). API tarafindaki asil guvenlik agi (409, RPC) ayri.
// ============================================================================

test("GET students route ikinci, ayri bir sorguyla student_assignment_programs tablosunu okuyor", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /student_assignment_programs/);
  assert.match(source, /\.eq\("status",\s*"active"\)/);
  assert.match(source, /\.in\("student_id",\s*studentIds\)/);
});

test("GET students route yalniz status='active' kayitlari aktif program olarak sayiyor (draft/completed/cancelled degil)", async () => {
  const source = await readStudentsRoute();
  const activeProgramsQueryMatch = source.match(
    /from\(STUDENT_ASSIGNMENT_PROGRAMS_TABLE\)[\s\S]*?\.in\("student_id",\s*studentIds\);/,
  );
  assert.ok(activeProgramsQueryMatch, "student_assignment_programs sorgusu bulunamali");
  assert.match(activeProgramsQueryMatch[0], /\.eq\("status",\s*"active"\)/);
  assert.doesNotMatch(activeProgramsQueryMatch[0], /"draft"|"completed"|"cancelled"/);
});

test("GET students route yaniti her ogrenci icin hasActiveProgram (boolean) ve activeProgramId (string|null) iceriyor", async () => {
  const source = await readStudentsRoute();
  assert.match(source, /hasActiveProgram:\s*boolean/);
  assert.match(source, /activeProgramId:\s*string \| null/);
  assert.match(source, /hasActiveProgram:\s*activeProgramId !== null/);
});

test("GET students route aktif program sorgusunda da hicbir yazma islemi yok", async () => {
  const source = await readStudentsRoute();
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

// ============================================================================
// POST /api/admin/assignment-program/programs - statik kaynak testleri.
// ============================================================================

test("POST programs route admin oturumunu server tarafinda dogruluyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /isAdminSessionValid/);
  assert.match(source, /401/);
});

test("POST programs route client govdesinden yalniz studentId/templateId/generationSeed okuyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /body\.studentId/);
  assert.match(source, /body\.templateId/);
  assert.match(source, /body\.generationSeed/);

  // Client'in gonderebilecegi ama ASLA okunmamasi gereken "nihai" alanlar:
  assert.doesNotMatch(source, /body\.classGroup/);
  assert.doesNotMatch(source, /body\.templateSnapshot/);
  assert.doesNotMatch(source, /body\.template_snapshot/);
  assert.doesNotMatch(source, /body\.pDays/);
  assert.doesNotMatch(source, /body\.p_days/);
  assert.doesNotMatch(source, /body\.days/);
  assert.doesNotMatch(source, /body\.assignedBy/);
  assert.doesNotMatch(source, /body\.assigned_by/);
});

test("POST programs route class_group'u yalniz mapEducationLevelToClassGroup ile ogrencinin education_level'inden turetiyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /mapEducationLevelToClassGroup/);
  assert.match(source, /studentRow\.education_level/);
});

test("POST programs route mevcut generateProgramPreview fonksiyonunu yeniden kullaniyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /generateProgramPreview/);
});

test("POST programs route assigned_by icin sabit bir literal kullaniyor, client'tan okumuyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /ASSIGNED_BY_VALUE\s*=\s*"teacher"/);
  assert.match(source, /p_assigned_by:\s*ASSIGNED_BY_VALUE/);
});

test("POST programs route RPC'yi tam olarak 7 gercek parametre adiyla cagiriyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /supabase\.rpc\("create_student_assignment_program",/);
  for (const paramName of [
    "p_student_id",
    "p_template_id",
    "p_class_group",
    "p_generation_seed",
    "p_template_snapshot",
    "p_days",
    "p_assigned_by",
  ]) {
    assert.match(source, new RegExp(`${paramName}:`), `${paramName} RPC cagrisinda bulunmali`);
  }
});

test("POST programs route RPC hatalarini mapAssignmentProgramRpcError ile esliyor, ham hatayi client'a dondurmuyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /mapAssignmentProgramRpcError/);
  // rpcError.message yalniz console.error (sunucu loglari) icinde ve
  // mapAssignmentProgramRpcError'a girdi olarak gecebilir - ama dogrudan
  // errorResponse/NextResponse.json ile client'a asla donmemelidir.
  assert.doesNotMatch(source, /errorResponse\(\s*rpcError\.message/);
  assert.doesNotMatch(source, /NextResponse\.json\([^)]*rpcError\.message/s);
});

test("POST programs route yalniz service-role server client kullaniyor", async () => {
  const source = await readProgramsRoute();
  assert.match(source, /getSupabaseServerClient/);
  assert.doesNotMatch(source, /createClient\(/);
});

test("POST programs route daily_assignments/exercise_results tablolarina hic dokunmuyor", async () => {
  const source = await readProgramsRoute();
  assert.doesNotMatch(source, /daily_assignment|exercise_results/i);
});
