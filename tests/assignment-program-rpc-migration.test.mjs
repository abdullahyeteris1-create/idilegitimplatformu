import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Bu dosya yalniz STATIK bir guvence saglar - migration'in gercek Supabase
// uzerinde calisip calismadigini DOGRULAMAZ (Docker/CLI bu ortamda mevcut
// degil). Gercek SQL/RPC davranisi yalniz gercek bir Supabase baglantisiyla
// (integration test veya manuel Dashboard dogrulamasi) test edilebilir.

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260724100000_create_student_assignment_program_rpc.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

// TEST 1
test("template_snapshot kolonu nullable olarak ekleniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /add column if not exists template_snapshot jsonb/i);
});

// TEST 2
test("template_snapshot icin JSON object CHECK constraint'i var", async () => {
  const sql = await readMigration();
  assert.match(sql, /jsonb_typeof\(template_snapshot\)\s*=\s*'object'/i);
});

// TEST 3
test("RPC security definer olarak tanimlaniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /security definer/i);
});

// TEST 4
test("search_path public, pg_temp olarak pinleniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /set search_path = public, pg_temp/i);
});

// TEST 5
test("PUBLIC/anon/authenticated icin REVOKE ALL var", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /revoke all on function public\.create_student_assignment_program\([^)]*\) from public;/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.create_student_assignment_program\([^)]*\) from anon;/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.create_student_assignment_program\([^)]*\) from authenticated;/i,
  );
});

// TEST 6
test("service_role icin GRANT EXECUTE var", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /grant execute on function public\.create_student_assignment_program\([^)]*\) to service_role;/i,
  );
});

// TEST 7
test("ayni ogrenci icin advisory lock kullaniliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /pg_advisory_xact_lock\(/i);
});

// TEST 8
test("aktif program kontrolu ve ilgili hata kodu var", async () => {
  const sql = await readMigration();
  assert.match(sql, /ASSIGNMENT_ACTIVE_PROGRAM_EXISTS/);
});

// TEST 9
test("p_days tam 20 eleman olarak dogrulaniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /jsonb_array_length\(p_days\)\s*<>\s*20/);
});

// TEST 10
test("her gun icin tam 5 gorev dogrulaniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /jsonb_array_length\(v_day\s*->\s*'tasks'\)\s*<>\s*5/);
});

// TEST 11
test("6 kesin yasakli + 6 hazir olmayan slug blocklist'te yer aliyor", async () => {
  const sql = await readMigration();
  const bannedSlugs = [
    "goz-calismasi",
    "parcali-resim-kelime",
    "kelime-tahmin",
    "adam-asmaca",
    "gorsel-puzzle",
    "dikkat-labirenti",
  ];
  const notReadySlugs = [
    "okuma-hizi-testi",
    "blok-okuma",
    "gruplama-calismasi",
    "golgeleme",
    "odakli-okuma",
    "anlama-testi",
  ];
  for (const slug of [...bannedSlugs, ...notReadySlugs]) {
    assert.match(sql, new RegExp(`'${slug}'`), `${slug} disallowed listede olmali`);
  }
});

// TEST 12
test("sablon ayarlariyla (program_class_exercise_settings) capraz kontrol var", async () => {
  const sql = await readMigration();
  assert.match(sql, /from public\.program_class_exercise_settings/i);
  assert.match(sql, /ASSIGNMENT_TASK_SNAPSHOT_MISMATCH/);
});

// TEST 13
test("program dogrudan status='active' olarak olusturuluyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /'active',\s*20,\s*5,\s*0,/);
});

// TEST 14-17
test("gun 1 ve gun 1 gorevleri available, digerleri locked olacak sekilde AYNI case-when deseni iki kez (gun + gorev) kullaniliyor", async () => {
  const sql = await readMigration();
  const matches = sql.match(/case when v_day_number = 1 then 'available' else 'locked' end/g) ?? [];
  assert.equal(matches.length, 2, "hem gun satiri hem gorev satiri icin ayni desen kullanilmali");
});

// TEST 18
test("toplam 20 gun / 100 gorev icin son insert-sayisi dogrulamasi var", async () => {
  const sql = await readMigration();
  assert.match(sql, /ASSIGNMENT_INSERT_COUNT_MISMATCH/);
  assert.match(sql, /v_day_count\s*<>\s*20\s*or\s*v_task_count\s*<>\s*100/);
});

// TEST 19
test("migration dosyasi RPC'yi hicbir yerde CAGIRMIYOR - yalniz taniml(an)iyor/yetkilendiriliyor", async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /select\s+public\.create_student_assignment_program\(/i);
  assert.doesNotMatch(sql, /perform\s+public\.create_student_assignment_program\(/i);
  assert.doesNotMatch(sql, /from\s+create_student_assignment_program\(/i);
});

// TEST 20
test("daily_assignments/daily_assignment_items yalniz yorum satirlarinda (-- veya COMMENT ON FUNCTION metni icinde) geciyor, hicbir DDL/DML hedefi degil", async () => {
  const sql = await readMigration();
  const lines = sql.split("\n");
  for (const line of lines) {
    if (/daily_assignment/i.test(line)) {
      const trimmed = line.trim();
      // "--" satir yorumu VEYA "comment on function ... is '...'" govdesindeki
      // tek tirnakli aciklama metni (satir "'" ile basliyor) - ikisi de gercek
      // bir DDL/DML hedefi degil, yalniz belgeleme metnidir.
      const isDocumentationOnly = trimmed.startsWith("--") || trimmed.startsWith("'");
      assert.ok(isDocumentationOnly, `"${trimmed}" bir yorum/aciklama satiri olmali, DDL/DML hedefi olmamali`);
    }
  }
});
