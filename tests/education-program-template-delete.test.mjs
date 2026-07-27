import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const REPOSITORY_PATH = "src/lib/education-programs/repository.ts";
const API_ROUTE_PATH = "src/app/api/admin/education-programs/templates/[templateId]/route.ts";
const LIST_CLIENT_PATH = "src/components/education-programs/EducationProgramTemplateList.tsx";
const TEMPLATE_TABLES_MIGRATION_PATH = "supabase/migrations/20260725170000_create_education_program_template_system.sql";
const STUDENT_TABLES_MIGRATION_PATH = "supabase/migrations/20260725180000_create_student_education_program_system.sql";

// ---------------------------------------------------------------------------
// A. Veritabani iliskileri - kanit olarak migration dosyalarindan dogrulama
// ---------------------------------------------------------------------------

test("template gunleri/gorevleri ON DELETE CASCADE ile silme aninda otomatik temizlenir", async () => {
  const source = await read(TEMPLATE_TABLES_MIGRATION_PATH);

  assert.match(
    source,
    /template_id uuid not null\s*\n\s*references public\.education_program_templates\(id\)\s*\n\s*on delete cascade,/,
  );
  assert.match(
    source,
    /template_day_id uuid not null\s*\n\s*references public\.education_program_template_days\(id\)\s*\n\s*on delete cascade,/,
  );
});

test("11) source_template_id ON DELETE SET NULL'dir - onceden atanmis ogrenci programlari sablon silinince BOZULMAZ", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);

  assert.match(
    source,
    /source_template_id uuid\s*\n\s*references public\.education_program_templates\(id\)\s*\n\s*on delete set null,/,
  );
  // Kaynak ad/versiyon ayrica deger olarak saklanir - FK null olsa da program
  // gorunumu bozulmaz.
  assert.match(source, /source_template_version integer not null default 1,/);
  assert.match(source, /source_template_name text not null,/);
});

test("11) ogrenci gun/gorev tablolari template tablolarina hic FK icermez (yalniz deger kopyasi tasir)", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);

  assert.doesNotMatch(source, /references public\.education_program_template_days/);
  assert.doesNotMatch(source, /references public\.education_program_template_tasks/);
});

// ---------------------------------------------------------------------------
// B. Repository - yalniz sablon tablosunu hedefler
// ---------------------------------------------------------------------------

test("10) deleteEducationProgramTemplate yalniz education_program_templates tablosunu, tek id ile hedefler", async () => {
  const source = await read(REPOSITORY_PATH);

  const deleteStart = source.indexOf("export async function deleteEducationProgramTemplate(");
  const deleteEnd = source.indexOf("\nexport async function publishEducationProgramTemplate", deleteStart);
  const body = source.slice(deleteStart, deleteEnd);

  assert.match(body, /\.from\(EDUCATION_PROGRAM_TEMPLATES_TABLE\)\s*\n\s*\.delete\(\)\s*\n\s*\.eq\("id", templateId\)/);
  assert.doesNotMatch(body, /student_education_program/);
  assert.doesNotMatch(body, /exercise_results/);
});

test("silme sonucu (0 satir etkilenirse) not_found olarak raporlanir - var olmayan sablon icin hata gosterilir", async () => {
  const source = await read(REPOSITORY_PATH);

  const deleteStart = source.indexOf("export async function deleteEducationProgramTemplate(");
  const deleteEnd = source.indexOf("\nexport async function publishEducationProgramTemplate", deleteStart);
  const body = source.slice(deleteStart, deleteEnd);

  assert.match(body, /if \(!data\) \{\s*\n\s*return educationProgramFailure\("not_found"/);
});

test("11) repository.ts (sablon repository'si) ogrenci tablolarina hic referans vermez", async () => {
  const source = await read(REPOSITORY_PATH);
  assert.doesNotMatch(source, /student_education_program/);
});

// ---------------------------------------------------------------------------
// C. API route - yetkilendirme
// ---------------------------------------------------------------------------

test("13) yetkisiz istek reddediliyor: delete route isAdminSessionValid kontrolu ile 401 doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /import \{ isAdminSessionValid \} from "@\/lib\/auth\/adminSession";/);
  assert.match(
    source,
    /export async function DELETE\(request: NextRequest, context: \{ params: Promise<\{ templateId: string \}> \}\) \{\s*\n\s*if \(!isAdminSessionValid\(request\)\) \{\s*\n\s*return NextResponse\.json\(\{ ok: false, message: "Yetkisiz erişim\." \}, \{ status: 401 \}\);\s*\n\s*\}/,
  );
});

test("14) sunucu hatasinda API dogru hata govdesi doner, not_found icin 404 doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /const status = result\.code === "not_found" \? 404 : 500;/);
  assert.match(source, /return NextResponse\.json\(\{ ok: false, message: result\.message \}, \{ status \}\);/);
});

test("route sadece deleteEducationProgramTemplate'i cagirir, baska hicbir tabloya direkt erismez", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /deleteEducationProgramTemplate\(supabase, templateId\)/);
  assert.doesNotMatch(source, /\.from\(/);
});

// ---------------------------------------------------------------------------
// D. Client - Sil butonu + onay paneli
// ---------------------------------------------------------------------------

test("2) Sil butonu artik statik disabled degil - isBusy durumuna baglidir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.doesNotMatch(source, /disabled\s*\n\s*title="Silme sonraki fazda etkinlestirilecek\."/);
  assert.match(source, /onClick=\{\(\) => setPendingDeleteId\(template\.id\)\}/);
});

// 8) Silme onaysız gerçekleşmiyor
test("8) Sil butonuna tiklamak DOGRUDAN silme cagirmaz - yalniz onay panelini acar (setPendingDeleteId)", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const silButtonIndex = source.indexOf('onClick={() => setPendingDeleteId(template.id)}');
  assert.ok(silButtonIndex >= 0);
  // "Sil" butonunun onClick'i handleConfirmDelete/fetch cagirmaz.
  const buttonBlock = source.slice(silButtonIndex, silButtonIndex + 200);
  assert.doesNotMatch(buttonBlock, /handleConfirmDelete/);
  assert.doesNotMatch(buttonBlock, /fetch\(/);
});

test("onay paneli basligi/metni/butonlari kullanicinin istedigi tam metinle eslesir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /Program şablonunu sil/);
  assert.match(
    source,
    /adlı program şablonunu silmek üzeresiniz\. Bu işlem geri alınamaz\./,
  );
  assert.match(source, /Bu şablon şu anda yayında\./);
  assert.match(source, /İptal/);
  assert.match(source, /Kalıcı Olarak Sil/);
});

test("yayindaki sablon uyarisi yalniz status==='published' oldugunda gosterilir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /\{pendingDeleteTemplate\.status === "published" \? \(/);
  const conditionIndex = source.indexOf('{pendingDeleteTemplate.status === "published" ? (');
  const warningIndex = source.indexOf("Bu şablon şu anda yayında.");
  assert.ok(conditionIndex >= 0 && warningIndex > conditionIndex, "uyari metni kosulun icinde olmali");
  assert.ok(warningIndex - conditionIndex < 200, "uyari metni kosula yakin olmali");
});

// 9) İptal edilince kayıt silinmiyor
test("9) Iptal butonu yalniz pendingDeleteId'yi temizler, hicbir fetch/silme cagrisi yapmaz", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const cancelTextIndex = source.indexOf("İptal");
  assert.ok(cancelTextIndex >= 0, "Iptal metni bulunmali");
  const cancelBlockStart = source.lastIndexOf("<button", cancelTextIndex);
  const cancelBlockEnd = source.indexOf("</button>", cancelTextIndex);
  const cancelBlock = source.slice(cancelBlockStart, cancelBlockEnd);

  assert.match(cancelBlock, /onClick=\{\(\) => setPendingDeleteId\(null\)\}/);
  assert.doesNotMatch(cancelBlock, /fetch\(/);
  assert.doesNotMatch(cancelBlock, /handleConfirmDelete/);
});

// 10) Onaylanınca yalnız seçilen template ve alt kayıtları siliniyor
test("10) 'Kalici Olarak Sil' butonu handleConfirmDelete'i yalniz secilen pendingDeleteTemplate ile cagirir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /onClick=\{\(\) => void handleConfirmDelete\(pendingDeleteTemplate\)\}/);
});

test("12) cift tiklamada tek istek olusur: busyIdRef senkron guard'i handleConfirmDelete basinda kontrol edilir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(
    source,
    /async function handleConfirmDelete\(template: EducationProgramTemplateSummary\) \{\s*\n\s*if \(busyIdRef\.current\) return;\s*\n\s*busyIdRef\.current = template\.id;/,
  );
});

// 14) Hata olursa program ekranda kalmaya devam etsin ve hata mesajı gösterilsin
test("14) silme hatasinda sablon LISTEDE KALIR (router.refresh cagrilmaz), hata mesaji satirda gosterilir, modal kapanir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const handleStart = source.indexOf("async function handleConfirmDelete(");
  const handleEnd = source.indexOf("\n\n  const pendingDeleteTemplate", handleStart);
  const body = source.slice(handleStart, handleEnd);

  assert.match(
    body,
    /if \(!response\.ok \|\| !payload\.ok\) \{\s*\n\s*setRowMessage\(template\.id, \{ tone: "error", text: payload\.message[\s\S]{0,80}setPendingDeleteId\(null\);\s*\n\s*return;/,
  );

  const errorBranchEnd = body.indexOf("return;", body.indexOf('tone: "error"'));
  const beforeRefresh = body.slice(0, errorBranchEnd);
  assert.doesNotMatch(beforeRefresh, /router\.refresh\(\)/);
});

test("client'ta studentId/service-role gibi hassas alanlar okunmaz", async () => {
  const source = await read(LIST_CLIENT_PATH);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /studentId/);
});
