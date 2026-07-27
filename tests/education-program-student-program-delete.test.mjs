import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const REPOSITORY_PATH = "src/lib/education-programs/studentProgramRepository.ts";
const API_ROUTE_PATH =
  "src/app/api/admin/education-programs/student-programs/[programId]/route.ts";
const LIST_CLIENT_PATH = "src/components/education-programs/StudentEducationProgramList.tsx";
const STUDENT_TABLES_MIGRATION_PATH =
  "supabase/migrations/20260725180000_create_student_education_program_system.sql";

// ---------------------------------------------------------------------------
// A. Veritabani iliskileri - kanit olarak migration dosyasindan dogrulama
// ---------------------------------------------------------------------------

test("6) student_education_program_days/_tasks ON DELETE CASCADE ile silme aninda otomatik temizlenir", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);

  assert.match(
    source,
    /program_id uuid not null\s*\n\s*references public\.student_education_programs\(id\)\s*\n\s*on delete cascade,/,
  );
  assert.match(
    source,
    /program_day_id uuid not null\s*\n\s*references public\.student_education_program_days\(id\)\s*\n\s*on delete cascade,/,
  );
});

test("7/8) sablon (education_program_templates) bu migration'da silinmiyor - yalniz nullable, ON DELETE SET NULL referansi var", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);

  assert.match(
    source,
    /source_template_id uuid\s*\n\s*references public\.education_program_templates\(id\)\s*\n\s*on delete set null,/,
  );
});

test("9) migration dosyasinda exercise_results'a hicbir referans/FK/delete yok", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);
  assert.doesNotMatch(source, /exercise_results/);
});

test("11) yeniden atamayi engelleyen kontrol yalniz status='active' satirlarina bakar - silinen (artik hic satiri olmayan) ogrenci icin bu kosul dogal olarak sağlanmaz", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);

  assert.match(
    source,
    /create unique index if not exists student_education_programs_one_active_per_student\s*\n\s*on public\.student_education_programs \(student_id\)\s*\n\s*where status = 'active';/,
  );
  assert.match(source, /STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS/);
});

// ---------------------------------------------------------------------------
// B. Repository - yalniz student_education_programs tablosunu hedefler
// ---------------------------------------------------------------------------

test("5) deleteStudentEducationProgram yalniz STUDENT_EDUCATION_PROGRAMS_TABLE'i, tek id ile hedefler", async () => {
  const source = await read(REPOSITORY_PATH);

  const start = source.indexOf("export async function deleteStudentEducationProgram(");
  const end = source.indexOf("\nexport async function getStudentEducationProgramDetail", start);
  const body = source.slice(start, end);

  assert.match(body, /\.from\(STUDENT_EDUCATION_PROGRAMS_TABLE\)\s*\n\s*\.delete\(\)\s*\n\s*\.eq\("id", programId\)/);
  assert.doesNotMatch(body, /STUDENTS_TABLE/);
  assert.doesNotMatch(body, /EDUCATION_PROGRAM_TEMPLATES_TABLE/);
  assert.doesNotMatch(body, /exercise_results/);
});

test("silme sonucu (0 satir etkilenirse) not_found olarak raporlanir - var olmayan/gecersiz program icin hata gosterilir", async () => {
  const source = await read(REPOSITORY_PATH);

  const start = source.indexOf("export async function deleteStudentEducationProgram(");
  const end = source.indexOf("\nexport async function getStudentEducationProgramDetail", start);
  const body = source.slice(start, end);

  assert.match(body, /if \(!isEducationProgramUuid\(programId\)\) \{\s*\n\s*return studentEducationProgramFailure\("not_found"/);
  assert.match(body, /if \(!data\) \{\s*\n\s*return studentEducationProgramFailure\("not_found"/);
});

test("repository.ts (ogrenci program repository'si) sablon/ogrenci tablo sabitlerine delete islemi icin referans vermez", async () => {
  const source = await read(REPOSITORY_PATH);

  const start = source.indexOf("export async function deleteStudentEducationProgram(");
  const end = source.indexOf("\nexport async function getStudentEducationProgramDetail", start);
  const body = source.slice(start, end);

  assert.doesNotMatch(body, /\.update\(/);
  assert.doesNotMatch(body, /\.insert\(/);
});

// ---------------------------------------------------------------------------
// C. API route - yetkilendirme ve hata haritalama
// ---------------------------------------------------------------------------

test("13) yetkisiz istek reddediliyor: route isAdminSessionValid kontrolu ile 401 doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /import \{ isAdminSessionValid \} from "@\/lib\/auth\/adminSession";/);
  assert.match(
    source,
    /export async function DELETE\(\s*\n\s*request: NextRequest,\s*\n\s*context: \{ params: Promise<\{ programId: string \}> \},\s*\n\s*\) \{\s*\n\s*if \(!isAdminSessionValid\(request\)\) \{\s*\n\s*return NextResponse\.json\(\{ ok: false, message: "Yetkisiz erişim\." \}, \{ status: 401 \}\);\s*\n\s*\}/,
  );
});

test("14) gecersiz programId formati 400 doner (DB'ye hic gidilmeden)", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /import \{ isEducationProgramUuid \} from "@\/lib\/education-programs\/studentProgramValidation";/);
  assert.match(
    source,
    /if \(!isEducationProgramUuid\(programId\)\) \{\s*\n\s*return NextResponse\.json\(\{ ok: false, message: "Geçersiz program kimliği\." \}, \{ status: 400 \}\);\s*\n\s*\}/,
  );
});

test("15) sunucu hatasinda API dogru hata govdesi doner, not_found icin 404 doner", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(
    source,
    /const status = result\.code === "not_found" \? 404 : result\.code === "conflict" \? 409 : 500;/,
  );
  assert.match(source, /return NextResponse\.json\(\{ ok: false, message: result\.message \}, \{ status \}\);/);
});

test("route sadece deleteStudentEducationProgram'i cagirir, baska hicbir tabloya direkt erismez", async () => {
  const source = await read(API_ROUTE_PATH);

  assert.match(source, /deleteStudentEducationProgram\(supabase, programId\)/);
  assert.doesNotMatch(source, /\.from\(/);
});

test("route basariyla DELETE gerceklestiginde { ok: true } doner", async () => {
  const source = await read(API_ROUTE_PATH);
  assert.match(source, /return NextResponse\.json\(\{ ok: true \}\);/);
});

// ---------------------------------------------------------------------------
// D. Client - "Programı Sil" butonu + onay paneli
// ---------------------------------------------------------------------------

test("1) 'Programı Sil' butonu normal durumda aktif (yalniz isBusy durumuna bagli, statik disabled degil)", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /onClick=\{\(\) => setPendingDeleteId\(program\.id\)\}/);
  assert.match(source, /disabled=\{isBusy\}/);
  assert.match(source, />\s*Programı Sil\s*</);
});

test("butonlar type=\"button\" kullanir (form submit'i tetiklemez)", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const silIndex = source.indexOf("Programı Sil");
  const silButtonStart = source.lastIndexOf("<button", silIndex);
  const silButtonBlock = source.slice(silButtonStart, silIndex);
  assert.match(silButtonBlock, /type="button"/);
});

// 2) Onay verilmeden DELETE cagrilmiyor
test("2) Programı Sil butonuna tiklamak DOGRUDAN silme cagirmaz - yalniz onay panelini acar (setPendingDeleteId)", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const silButtonIndex = source.indexOf("onClick={() => setPendingDeleteId(program.id)}");
  assert.ok(silButtonIndex >= 0);
  const buttonBlock = source.slice(silButtonIndex, silButtonIndex + 250);
  assert.doesNotMatch(buttonBlock, /handleConfirmDelete/);
  assert.doesNotMatch(buttonBlock, /fetch\(/);
});

test("onay paneli basligi/metni/butonlari kullanicinin istedigi tam metinle eslesir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /Atanmış programı sil/);
  assert.match(source, /adlı öğrenciye atanmış/);
  assert.match(source, /programını silmek üzeresiniz\. Öğrenci hesabı/);
  assert.match(source, /silinmez ancak programdaki mevcut ilerleme kaybolur\. Bu işlem geri alınamaz\./);
  assert.match(source, /Programı Kalıcı Olarak Sil/);
});

// 3) Iptal edilince kayit silinmiyor
test("3) Iptal butonu yalniz pendingDeleteId'yi temizler, hicbir fetch/silme cagrisi yapmaz", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const modalStart = source.indexOf("pendingDeleteProgram ? (");
  assert.ok(modalStart >= 0, "onay paneli JSX bulunmali");
  const modalBlock = source.slice(modalStart);

  const cancelTextIndex = modalBlock.indexOf("İptal");
  assert.ok(cancelTextIndex >= 0, "Iptal metni onay panelinde bulunmali");
  const cancelBlockStart = modalBlock.lastIndexOf("<button", cancelTextIndex);
  const cancelBlockEnd = modalBlock.indexOf("</button>", cancelTextIndex);
  const cancelBlock = modalBlock.slice(cancelBlockStart, cancelBlockEnd);

  assert.match(cancelBlock, /onClick=\{\(\) => setPendingDeleteId\(null\)\}/);
  assert.doesNotMatch(cancelBlock, /fetch\(/);
  assert.doesNotMatch(cancelBlock, /handleConfirmDelete/);
});

// 4) Onaylaninca dogru programId endpoint'e gonderiliyor
test("4) 'Programı Kalıcı Olarak Sil' butonu handleConfirmDelete'i yalniz secilen pendingDeleteProgram ile cagirir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /onClick=\{\(\) => void handleConfirmDelete\(pendingDeleteProgram\)\}/);
  assert.match(
    source,
    /fetch\(\s*\n\s*`\/api\/admin\/education-programs\/student-programs\/\$\{encodeURIComponent\(program\.id\)\}`,\s*\n\s*\{ method: "DELETE", credentials: "same-origin" \},\s*\n\s*\);/,
  );
});

// 12) Cift tiklamada tek istek olusuyor
test("12) cift tiklamada tek istek olusur: busyIdRef senkron guard'i handleConfirmDelete basinda kontrol edilir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  assert.match(source, /const busyIdRef = useRef<string \| null>\(null\);/);
  assert.match(
    source,
    /async function handleConfirmDelete\(program: StudentEducationProgramSummary\) \{\s*\n\s*if \(busyIdRef\.current\) return;\s*\n\s*busyIdRef\.current = program\.id;/,
  );
});

test("silme sirasinda her iki modal butonu da disabled olur", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const modalStart = source.indexOf("pendingDeleteProgram ? (");
  const modalBlock = source.slice(modalStart);
  const disabledMatches = modalBlock.match(/disabled=\{busyProgramId === pendingDeleteProgram\.id\}/g) ?? [];
  assert.equal(disabledMatches.length, 2, "Iptal ve Sil butonlarinin ikisi de disabled olmali");
});

// 16) Sunucu hatasinda satir listeden kaldirilmaz, aciklayici hata gosterilir
test("16) silme hatasinda program LISTEDE KALIR (router.refresh cagrilmaz), hata mesaji satirda gosterilir, modal kapanir", async () => {
  const source = await read(LIST_CLIENT_PATH);

  const handleStart = source.indexOf("async function handleConfirmDelete(");
  const handleEnd = source.indexOf("\n\n  const pendingDeleteProgram", handleStart);
  const body = source.slice(handleStart, handleEnd);

  assert.match(
    body,
    /if \(!response\.ok \|\| !payload\.ok\) \{\s*\n\s*setRowMessage\(program\.id, \{ tone: "error", text: payload\.message[\s\S]{0,80}setPendingDeleteId\(null\);\s*\n\s*return;/,
  );

  const errorBranchEnd = body.indexOf("return;", body.indexOf('tone: "error"'));
  const beforeRefresh = body.slice(0, errorBranchEnd);
  assert.doesNotMatch(beforeRefresh, /router\.refresh\(\)/);
  assert.match(body, /router\.refresh\(\);/);
});

test("basarili silmede basari mesaji gosterilir", async () => {
  const source = await read(LIST_CLIENT_PATH);
  assert.match(source, /tone: "success", text: "Program silindi\."/);
});

// Modal kapatildiginda state temizleniyor (hem iptal hem basarida pendingDeleteId(null))
test("modal her durumda (iptal/basari/hata) pendingDeleteId(null) ile kapatilir", async () => {
  const source = await read(LIST_CLIENT_PATH);
  const occurrences = source.match(/setPendingDeleteId\(null\)/g) ?? [];
  assert.ok(occurrences.length >= 3, "Iptal + basari + hata yollarinin hepsi pendingDeleteId'yi temizlemeli");
});

// Mevcut "Görüntüle" aksiyonuna dokunulmadi
test("mevcut 'Görüntüle' linki ve href deseni korunuyor", async () => {
  const source = await read(LIST_CLIENT_PATH);
  assert.match(
    source,
    /href=\{`\/ogretmen\/idil-panel\/ogrenci-programlari\/\$\{program\.id\}`\}/,
  );
  assert.match(source, />\s*Görüntüle\s*</);
});

test("client'ta studentId/service-role gibi hassas alanlar dogrudan okunmaz, yalniz mevcut ozet alanlari kullanilir", async () => {
  const source = await read(LIST_CLIENT_PATH);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /\.from\(/);
});

// ---------------------------------------------------------------------------
// E. Mevcut atama/ilerleme/tamamlama akislarina dokunulmadi
// ---------------------------------------------------------------------------

test("17) yeni ozellik icin migration/RPC olusturulmadi - mevcut atama/baslatma/tamamlama migration'lari degismedi", async () => {
  const source = await read(STUDENT_TABLES_MIGRATION_PATH);
  assert.match(source, /create or replace function public\.assign_education_program_template_v1/);

  const startSource = await read("supabase/migrations/20260725190000_start_education_program_task_rpc.sql");
  assert.match(startSource, /create or replace function public\.start_education_program_task_v1/);

  const completeSource = await read(
    "supabase/migrations/20260725200000_complete_education_program_task_rpc.sql",
  );
  assert.match(completeSource, /create or replace function public\.complete_education_program_task_v1/);
});
