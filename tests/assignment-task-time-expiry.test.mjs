import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const COMPLETE_ROUTE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete/route.ts",
  import.meta.url,
);
const CONFIG_ROUTE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/route.ts",
  import.meta.url,
);
const TIMER_URL = new URL("../src/components/assignments/AssignmentTaskTimer.tsx", import.meta.url);
const PROVIDER_URL = new URL("../src/components/assignments/AssignmentTaskProvider.tsx", import.meta.url);
const LAYOUT_URL = new URL("../src/app/egzersizler/layout.tsx", import.meta.url);
const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725160000_task_completion_on_time_expiry.sql",
  import.meta.url,
);

const read = (url) => readFile(url, "utf8");

// ============================================================================
// REGRESYON: sure dolumu (resultId'siz tamamlama) ucdan uca desteklenmeli.
// Bu testler, sayacin "Tebrikler" gostermesine ragmen gorevin `available`
// kalmasina yol acan gercek hatayi (route'un resultId'yi ZORUNLU tutmasi)
// yakalamak icin yazildi.
// ============================================================================

test("complete route resultId'yi ZORUNLU TUTMUYOR (sure dolumu yolu acik)", async () => {
  const source = await read(COMPLETE_ROUTE_URL);
  assert.doesNotMatch(source, /resultId zorunludur/);
  assert.match(source, /isTimeExpiry/);
});

test("complete route sure dolumunda RPC'ye p_result_id: null gonderiyor", async () => {
  const source = await read(COMPLETE_ROUTE_URL);
  assert.match(source, /p_result_id:\s*isTimeExpiry \? null : resultId/);
});

test("complete route sure dolumunda sonuc dogrulamalarini ATLIYOR", async () => {
  const source = await read(COMPLETE_ROUTE_URL);
  // Sonuc sorgusu/sahiplik/egzersiz-turu kontrolleri yalniz gercek sonuc
  // varken calismali - hepsi tek bir `if (!isTimeExpiry)` blogunda olmali.
  assert.match(source, /if \(!isTimeExpiry\) \{[\s\S]*Sonuc bulunamadi[\s\S]*egzersiz turu ile gorev uyusmuyor[\s\S]*?\n  \}/);
});

test("complete route gorev sahipligini HER durumda dogruluyor", async () => {
  const source = await read(COMPLETE_ROUTE_URL);
  assert.match(source, /verifyStudentAccess/);
  assert.match(source, /Bu gorev ogrenciye ait degil/);
  // Sahiplik kontrolu isTimeExpiry blogunun DISINDA kalmali.
  const ownershipIndex = source.indexOf("Bu gorev ogrenciye ait degil");
  const guardIndex = source.indexOf("if (!isTimeExpiry)");
  assert.ok(ownershipIndex < guardIndex, "gorev sahipligi kontrolu sure-dolumu blogundan ONCE olmali");
});

test("RPC sure dolumunu p_result_id NULL'dan turetiyor ve 'time_expired' yaziyor", async () => {
  const sql = await read(MIGRATION_URL);
  assert.match(sql, /case when p_result_id is null then 'time_expired' else 'result_submitted' end/);
  // Imza DEGISMEMELI - overload karmasasi olmasin diye ayni 3 parametre.
  assert.match(sql, /create or replace function public\.complete_student_assignment_program_task\(\s*p_task_id uuid,\s*p_student_id uuid,\s*p_result_id uuid\s*\)/);
});

test("RPC zaten tamamlanmis gorevde gec gelen sure dolumunu HATA saymiyor", async () => {
  const sql = await read(MIGRATION_URL);
  assert.match(sql, /if p_result_id is null or v_task_result_id is not distinct from p_result_id then/);
});

test("RPC yalniz service_role tarafindan calistirilabiliyor", async () => {
  const sql = await read(MIGRATION_URL);
  assert.match(sql, /revoke all on function public\.complete_student_assignment_program_task\(uuid, uuid, uuid\) from anon/);
  assert.match(sql, /grant execute on function public\.complete_student_assignment_program_task\(uuid, uuid, uuid\) to service_role/);
  assert.match(sql, /^security definer$/m);
  assert.match(sql, /^set search_path = public, pg_temp$/m);
});

// ============================================================================
// Sayac davranisi
// ============================================================================

test("sayac sure dolumunda BOS govde ile complete'i cagiriyor", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /\/complete`/);
  assert.match(source, /body: JSON\.stringify\(\{\}\)/);
});

test("sayac tamamlama basarisizligini SESSIZCE yutmuyor", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /setCompletionFailed\(!response\.ok \|\| payload\?\.ok !== true\)/);
  assert.match(source, /Tekrar Dene/);
});

test("sayac kalan sureyi bitis zaman damgasindan hesapliyor (arka plan sekmesi guvenligi)", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /deadlineRef\.current = Date\.now\(\) \+ task\.durationSeconds \* 1000/);
  assert.match(source, /Math\.ceil\(\(deadline - Date\.now\(\)\) \/ 1000\)/);
});

test("sayac dakika:saniye bicimi kullaniyor", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /padStart\(2, "0"\)/);
  assert.match(source, /\$\{minutes[\s\S]*?\}:\$\{seconds/);
});

test("sayac tamamlanma ekraninda istenen mesajlari gosteriyor", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /Tebrikler, bu çalışmayı tamamladınız!/);
  assert.match(source, /Sonraki çalışmaya geçebilirsiniz\./);
});

test("sayac ogrenci calismayi erken bitirdiginde de devreye giriyor", async () => {
  const source = await read(TIMER_URL);
  assert.match(source, /PROGRAM_TASK_COMPLETED_EVENT/);
  assert.match(source, /addEventListener/);
});

// ============================================================================
// Ayar tasima guvenligi
// ============================================================================

test("gorev ayarlari SUNUCUDAN okunuyor, URL'den DEGIL", async () => {
  const provider = await read(PROVIDER_URL);
  // URL yalniz gorev kimligini tasir.
  assert.match(provider, /get\("programTaskId"\)/);
  // Sure/seviye URL'den okunmamali - aksi halde ogrenci degistirebilirdi.
  assert.doesNotMatch(provider, /get\("durationSeconds"\)|get\("currentLevel"\)|get\("settings"\)/);
  assert.match(provider, /\/api\/student\/assignment-program-tasks\//);
});

test("config endpoint'i salt-okunur ve sahiplik dogruluyor", async () => {
  const source = await read(CONFIG_ROUTE_URL);
  assert.match(source, /verifyStudentAccess/);
  assert.match(source, /Bu gorev ogrenciye ait degil/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});

test("sayac ve saglayici TUM egzersizleri saran layout'a bagli", async () => {
  const layout = await read(LAYOUT_URL);
  assert.match(layout, /AssignmentTaskProvider/);
  assert.match(layout, /AssignmentTaskTimer/);
});

test("serbest calisma etkilenmiyor: programTaskId yoksa istek atilmiyor", async () => {
  const provider = await read(PROVIDER_URL);
  assert.match(provider, /if \(!taskId\) return;/);
});
