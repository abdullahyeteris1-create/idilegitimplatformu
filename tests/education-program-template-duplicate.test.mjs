import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { generateDuplicateTemplateName } from "../src/lib/education-programs/repository.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const REPOSITORY_PATH = "src/lib/education-programs/repository.ts";
const MIGRATION_PATH = "supabase/migrations/20260728010000_duplicate_education_program_template_rpc.sql";
const API_ROUTE_PATH = "src/app/api/admin/education-programs/templates/[templateId]/duplicate/route.ts";
const LIST_CLIENT_PATH = "src/components/education-programs/EducationProgramTemplateList.tsx";

// ---------------------------------------------------------------------------
// A. generateDuplicateTemplateName - saf fonksiyon, gercek cagrilarla test
// ---------------------------------------------------------------------------

test("1) ilk kopyalamada 'Ad - Kopya' uretilir (cakisma yok)", () => {
  assert.equal(generateDuplicateTemplateName([], "3. Sinif Programi"), "3. Sinif Programi - Kopya");
  assert.equal(
    generateDuplicateTemplateName(["Baska Program"], "3. Sinif Programi"),
    "3. Sinif Programi - Kopya",
  );
});

// 7) Aynı isim durumunda Kopya 2/Kopya 3 adı doğru üretiliyor
test("7) 'Ad - Kopya' zaten varsa 'Ad - Kopya 2' uretilir", () => {
  const existing = ["3. Sinif Programi", "3. Sinif Programi - Kopya"];
  assert.equal(generateDuplicateTemplateName(existing, "3. Sinif Programi"), "3. Sinif Programi - Kopya 2");
});

test("7) 'Ad - Kopya' ve 'Ad - Kopya 2' varsa 'Ad - Kopya 3' uretilir", () => {
  const existing = ["3. Sinif Programi", "3. Sinif Programi - Kopya", "3. Sinif Programi - Kopya 2"];
  assert.equal(generateDuplicateTemplateName(existing, "3. Sinif Programi"), "3. Sinif Programi - Kopya 3");
});

test("7) ara siradaki bosluk (Kopya 2 yokken Kopya 3 varsa) ilk BOS olan Kopya 2'yi doldurur", () => {
  const existing = ["3. Sinif Programi", "3. Sinif Programi - Kopya", "3. Sinif Programi - Kopya 3"];
  assert.equal(generateDuplicateTemplateName(existing, "3. Sinif Programi"), "3. Sinif Programi - Kopya 2");
});

test("uzun isimlerde uretilen ad 120 karakteri asmaz (DB name_check siniri)", () => {
  const longName = "A".repeat(150);
  const result = generateDuplicateTemplateName([], longName);
  assert.ok(result.length <= 120, `beklenen <=120, gercek ${result.length}`);
  assert.match(result, / - Kopya$/);
});

test("bosluklu isimler trim edilerek karsilastirilir (ayni ad farkli bosluklarla cakisma sayilir)", () => {
  const existing = ["Program A - Kopya"];
  assert.equal(generateDuplicateTemplateName(existing, "Program A"), "Program A - Kopya 2");
});

// ---------------------------------------------------------------------------
// B. Migration RPC - source-contract dogrulama
// ---------------------------------------------------------------------------

test("3/4/6) duplicate RPC'si yeni sablonu HER ZAMAN 'draft' statusu ve version 1 ile olusturur, kaynagi guncellemez", async () => {
  const source = await read(MIGRATION_PATH);

  assert.match(source, /create or replace function public\.duplicate_education_program_template_v1/);
  assert.match(source, /'draft',\s*\n\s*true,\s*\n\s*1,/);
  // Kaynak sablona hicbir update/delete komutu calistirilmaz - yalniz select.
  assert.doesNotMatch(source, /update public\.education_program_templates/);
  assert.doesNotMatch(source, /delete from public\.education_program_templates/i);
});

test("3) yeni sablon icin ayri bir id uretilir (gen_random_uuid varsayilan sutun degeri kullanilir, id kopyalanmaz)", async () => {
  const source = await read(MIGRATION_PATH);

  assert.doesNotMatch(source, /insert into public\.education_program_templates \([^)]*\bid\b/);
  assert.match(source, /returning id into v_new_template_id;/);
});

test("5) gunler ve gorevler (settings dahil) deger olarak eksiksiz kopyalanir", async () => {
  const source = await read(MIGRATION_PATH);

  assert.match(
    source,
    /insert into public\.education_program_template_days \(\s*\n\s*template_id,\s*\n\s*day_number,\s*\n\s*title,\s*\n\s*description\s*\n\s*\)/,
  );
  assert.match(source, /source_task\.settings\b/);
  assert.match(source, /source_task\.duration_seconds,/);
  assert.match(source, /source_task\.starting_level,/);
  assert.match(source, /source_task\.settings_schema_version,/);
  // Satir sayisi dogrulamasi (assign_education_program_template_v1'deki ayni desen).
  assert.match(source, /EDUCATION_PROGRAM_TEMPLATE_DUPLICATE_COUNT_MISMATCH/);
});

test("11) migration ogrenci snapshot tablolarina (student_education_program*) hic dokunmaz", async () => {
  const source = await read(MIGRATION_PATH);
  assert.doesNotMatch(source, /student_education_program/);
});

test("13) RPC yalniz service_role'e execute yetkisi verir, anon/authenticated/public'ten geri alinir", async () => {
  const source = await read(MIGRATION_PATH);

  assert.match(source, /revoke all on function public\.duplicate_education_program_template_v1\(\s*\n\s*uuid, text, text\s*\n\s*\) from public;/);
  assert.match(source, /from anon;/);
  assert.match(source, /from authenticated;/);
  assert.match(source, /grant execute on function public\.duplicate_education_program_template_v1\(\s*\n\s*uuid, text, text\s*\n\s*\) to service_role;/);
  assert.match(source, /security definer/);
});

// ---------------------------------------------------------------------------
// C. Repository - kapsam ve dogru cagri desenleri
// ---------------------------------------------------------------------------

test("repository.ts duplicateEducationProgramTemplate cakismasiz ismi RPC'den ONCE hesaplar ve parametre olarak gecirir", async () => {
  const source = await read(REPOSITORY_PATH);

  assert.match(source, /export function generateDuplicateTemplateName\(/);
  assert.match(source, /export async function duplicateEducationProgramTemplate\(/);
  assert.match(source, /const newName = generateDuplicateTemplateName\(existingNames, sourceRow\.name\);/);
  assert.match(
    source,
    /supabase\.rpc\(\s*\n\s*"duplicate_education_program_template_v1",\s*\n\s*\{\s*\n\s*p_source_template_id: templateId,\s*\n\s*p_new_name: newName,/,
  );
});

test("6) repository.ts kaynak sablona hicbir insert/update/delete uygulamaz - yalniz okur", async () => {
  const source = await read(REPOSITORY_PATH);

  const duplicateStart = source.indexOf("export async function duplicateEducationProgramTemplate(");
  const duplicateEnd = source.indexOf("\n// Kalici (hard) silme", duplicateStart);
  const body = source.slice(duplicateStart, duplicateEnd);

  assert.doesNotMatch(body, /\.update\(/);
  assert.doesNotMatch(body, /\.delete\(/);
  assert.match(body, /\.select\("id,name"\)/);
});

test("11) repository.ts (sablon repository'si) ogrenci tablolarina hic referans vermez", async () => {
  const source = await read(REPOSITORY_PATH);
  assert.doesNotMatch(source, /student_education_program/);
});

// ---------------------------------------------------------------------------
// D. API route - yetkilendirme ve hata haritalama
// ---------------------------------------------------------------------------

test("13) yetkisiz istek reddediliyor: duplicate route isAdminSessionValid kontrolu ile 401 doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /import \{ isAdminSessionValid \} from "@\/lib\/auth\/adminSession";/);
  assert.match(
    source,
    /if \(!isAdminSessionValid\(request\)\) \{\s*\n\s*return NextResponse\.json\(\{ ok: false, message: "Yetkisiz erişim\." \}, \{ status: 401 \}\);\s*\n\s*\}/,
  );
});

test("14) sunucu hatasinda API dogru hata govdesi doner (ok:false + message), 500/404 ayrimi yapar", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /const status = result\.code === "not_found" \? 404 : 500;/);
  assert.match(source, /return NextResponse\.json\(\{ ok: false, message: result\.message \}, \{ status \}\);/);
});

test("duplicate route basariyla POST /duplicate uzerinden calisir ve yeni templateId'yi doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /export async function POST\(/);
  assert.match(source, /duplicateEducationProgramTemplate\(supabase, templateId, createdBy\)/);
  assert.match(source, /return NextResponse\.json\(\{ ok: true, templateId: result\.value\.templateId \}, \{ status: 201 \}\);/);
});

// ---------------------------------------------------------------------------
// E. Client (EducationProgramTemplateList.tsx) - Kopyala butonu
// ---------------------------------------------------------------------------

test("1) Kopyala butonu artik statik disabled degil - isBusy durumuna baglidir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.doesNotMatch(source, /disabled\s*\n\s*title="Kopyalama sonraki fazda etkinlestirilecek\."/);
  assert.match(source, /onClick=\{\(\) => void handleDuplicate\(template\)\}/);
  assert.match(source, /disabled=\{isBusy\}/);
});

test("12) cift tiklamada tek istek olusur: busyIdRef senkron guard'i handleDuplicate basinda kontrol edilir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /const busyIdRef = useRef<string \| null>\(null\);/);
  assert.match(
    source,
    /async function handleDuplicate\(template: EducationProgramTemplateSummary\) \{\s*\n\s*if \(busyIdRef\.current\) return;\s*\n\s*busyIdRef\.current = template\.id;/,
  );
});

test("14) kopyalama hatasinda liste yenilenmez (router.refresh yalniz basari yolunda cagrilir), hata satirda gosterilir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const handleStart = source.indexOf("async function handleDuplicate(");
  const handleEnd = source.indexOf("\n  async function handleConfirmDelete", handleStart);
  const body = source.slice(handleStart, handleEnd);

  assert.match(body, /if \(!response\.ok \|\| !payload\.ok\) \{\s*\n\s*setRowMessage\(template\.id, \{ tone: "error", text: payload\.message/);
  const errorBranchEnd = body.indexOf("return;", body.indexOf('tone: "error"'));
  const beforeRefresh = body.slice(0, errorBranchEnd);
  assert.doesNotMatch(beforeRefresh, /router\.refresh\(\)/);
  assert.match(body, /router\.refresh\(\);/);
});

test("client'ta studentId/service-role gibi hassas alanlar okunmaz", async () => {
  const source = await read(LIST_CLIENT_PATH);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /studentId/);
});
