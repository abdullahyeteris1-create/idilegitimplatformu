import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROUTE_PATH =
  "src/app/api/student/education-program-tasks/[taskId]/complete/route.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("18) route yalniz POST mutation icerir, baska HTTP method export edilmez", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /export async function POST\(/);
  assert.doesNotMatch(source, /export async function GET\(/);
  assert.doesNotMatch(source, /export async function PUT\(/);
  assert.doesNotMatch(source, /export async function DELETE\(/);
  assert.doesNotMatch(source, /export async function PATCH\(/);
});

test("route nodejs runtime kullanir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /export const runtime = "nodejs";/);
});

test("19/20) session yoksa verifyStudentAccess reddi dogrudan HTTP status/mesaji ile donulur", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /const access = await verifyStudentAccess\(request\);/);
  assert.match(source, /if \(!access\.ok\) \{/);
  assert.match(source, /access\.status/);
  assert.match(source, /clearStudentSessionCookie/);
});

test("21) gecersiz UUID formatinda taskId 400 ile reddedilir, repository/RPC hic cagrilmaz", async () => {
  const source = await read(ROUTE_PATH);
  const beforeRepositoryCall = source.split("completeEducationProgramTask(")[0];

  assert.match(source, /isEducationProgramUuid\(taskId\)/);
  assert.match(source, /if \(!isEducationProgramUuid\(taskId\)\) \{\s*return errorResponse\("invalid_task_id", "Geçersiz görev kimliği\.", 400\);/);
  assert.match(beforeRepositoryCall, /isEducationProgramUuid\(taskId\)/);
});

test("22) malformed JSON govdesi 400 doner", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /JSON\.parse\(rawBody\)/);
  assert.match(source, /catch \{\s*return errorResponse\("invalid_request", "Geçersiz istek gövdesi\.", 400\);/);
});

test("23) gecersiz expectedResultExerciseType (bos/uzun/yanlis tip) 400 doner", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(
    source,
    /typeof value !== "string" \|\|\s*!value\.trim\(\) \|\|\s*value\.length > MAX_RESULT_EXERCISE_TYPE_LENGTH/,
  );
});

test("24) beklenmeyen alanlar (orn. studentId) allow-list disi oldugu icin reddedilir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /const ALLOWED_COMPLETE_BODY_KEYS = new Set\(\["expectedResultExerciseType"\]\);/);
  assert.match(
    source,
    /bodyKeys\.some\(\(key\) => !ALLOWED_COMPLETE_BODY_KEYS\.has\(key\)\)/,
  );
  assert.doesNotMatch(source, /payload\.studentId/);
  assert.doesNotMatch(source, /\{\s*\.\.\.payload\s*\}/);
});

test("25/26) repository session studentId ve path taskId ile cagrilir, client govdesinden studentId asla okunmaz", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(
    source,
    /completeEducationProgramTask\(\s*supabase,\s*access\.studentId,\s*taskId,\s*expectedResultExerciseType,?\s*\)/,
  );
  assert.doesNotMatch(source, /body\.studentId/);
  assert.doesNotMatch(source, /payload\.studentId/);
});

test("27) expectedResultExerciseType dogru bicimde repository'ye aktarilir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /let expectedResultExerciseType: string \| undefined;/);
  assert.match(source, /expectedResultExerciseType = value\.trim\(\);/);
});

test("28/29) basari 200, idempotent basari da 200 doner (ayni basari yolu)", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /return jsonNoStore\(\{ success: true, \.\.\.result\.value \}, 200\);/);
  // alreadyCompleted alani result.value icinde zaten tasiniyor - basari
  // yolu tek, idempotent/gercek tamamlama ayrimi outcome/alreadyCompleted
  // alanlariyla anlatiliyor, ayri bir HTTP status yok.
});

test("30-34) domain hata kodlari dogru HTTP status'a eslenir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /task_not_found: 404,/);
  assert.match(source, /unauthorized_task: 403,/);
  assert.match(source, /program_not_active: 409,/);
  assert.match(source, /day_not_available: 409,/);
  assert.match(source, /task_not_in_progress: 409,/);
  assert.match(source, /completion_conflict: 409,/);
  assert.match(source, /exercise_mismatch: 409,/);
  assert.match(source, /completion_failed: 500,/);
});

test("35/36) bilinmeyen hata generic 500 doner, ham DB detayi hicbir response'a tasinmaz", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /const status = HTTP_STATUS_BY_CODE\[result\.code\] \?\? 500;/);
  assert.doesNotMatch(source, /result\.message\.includes/);
  assert.doesNotMatch(source, /error\.details/);
  assert.doesNotMatch(source, /error\.hint/);
  assert.doesNotMatch(source, /SQLSTATE/);
});

test("37) tum response'lar Cache-Control: no-store header'i tasir", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /"Cache-Control": "no-store"/);
  assert.match(
    source,
    /function jsonNoStore\(body: unknown, status: number\) \{\s*return NextResponse\.json\(body, \{ status, headers: \{ "Cache-Control": "no-store" \} \}\);/,
  );
});

test("38) service-role client route icinde server-side olusturulur", async () => {
  const source = await read(ROUTE_PATH);

  assert.match(source, /import \{ getSupabaseServiceRoleClient \} from "@\/lib\/supabase\/server";/);
  assert.match(source, /const supabase = getSupabaseServiceRoleClient\(\);/);
  assert.match(source, /if \(!supabase\) \{\s*return errorResponse\("completion_failed", "Görev tamamlanamadı\.", 500\);/);
});

test("39) Assignment System V2'ye hicbir bagimlilik yoktur", async () => {
  const source = await read(ROUTE_PATH);

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /student_assignment_program/);
});

test("40) egzersiz client dosyalarina veya /sonuc'a hicbir referans yoktur", async () => {
  const source = await read(ROUTE_PATH);

  assert.doesNotMatch(source, /egzersizler\//);
  assert.doesNotMatch(source, /\/sonuc/);
  assert.doesNotMatch(source, /ResultSummaryClient/);
});
