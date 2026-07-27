import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const FIX_MIGRATION_PATH =
  "supabase/migrations/20260728020000_sync_assign_education_program_template_exercise_whitelist.sql";
const ORIGINAL_MIGRATION_PATH =
  "supabase/migrations/20260725180000_create_student_education_program_system.sql";
const EXERCISE_CATALOG_PATH = "src/lib/education-programs/exerciseCatalog.ts";
const EDITOR_PATH = "src/components/education-programs/EducationProgramTemplateEditor.tsx";

// Bug: "Şablon eksik veya geçersiz." (STUDENT_EDUCATION_TEMPLATE_INVALID)
// yayinlanmis/aktif/gecerli gun-gorev sayisina sahip bir sablon atanirken
// olusuyordu, cunku assign_education_program_template_v1'in exercise_slug
// beyaz listesi (20260725180000) yalniz ilk yazildigindaki 9 egzersizi
// iceriyordu; sonradan exerciseCatalog.ts'e eklenen 5 egzersiz (blok-okuma,
// golgeleme, gruplama-calismasi, anlama-testi, okuma-hizi-testi) hic
// eklenmemisti. Bu testler duzeltmenin var oldugunu ve iki kaynagin
// (SQL whitelist <-> JS katalog) senkron kaldigini dogrular - ileride
// kataloga yeni bir egzersiz eklenip whitelist guncellenmezse bu test
// kirmizi olmalidir.

function extractCatalogSlugs(catalogSource) {
  return [...catalogSource.matchAll(/slug: "([a-z0-9-]+)",/g)].map((match) => match[1]);
}

function extractWhitelistSlugs(migrationSource) {
  // lastIndexOf: dosyanin baslik yorumu da (dokumantasyon amacli) ayni
  // ifadeyi metin olarak icerir - gercek SQL kodu daima sonda gelir.
  const start = migrationSource.lastIndexOf("t.exercise_slug not in (");
  const end = migrationSource.indexOf(")", start);
  const block = migrationSource.slice(start, end);
  return [...block.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);
}

test("duzeltme migration'i mevcut ve assign_education_program_template_v1'i create or replace ile yeniden tanimlar", async () => {
  const source = await read(FIX_MIGRATION_PATH);
  assert.match(source, /create or replace function public\.assign_education_program_template_v1/);
});

test("exerciseCatalog.ts'teki TUM egzersiz slug'lari duzeltme migration'inin whitelist'inde bulunur", async () => {
  const catalogSource = await read(EXERCISE_CATALOG_PATH);
  const fixSource = await read(FIX_MIGRATION_PATH);

  const catalogSlugs = extractCatalogSlugs(catalogSource);
  assert.ok(catalogSlugs.length >= 14, "katalogda en az 14 egzersiz beklenir");

  const whitelistSlugs = extractWhitelistSlugs(fixSource);
  for (const slug of catalogSlugs) {
    assert.ok(
      whitelistSlugs.includes(slug),
      `'${slug}' exerciseCatalog.ts'te var ama assign RPC whitelist'inde eksik - regresyon!`,
    );
  }
});

test("5 yeni egzersiz (blok-okuma, golgeleme, gruplama-calismasi, anlama-testi, okuma-hizi-testi) whitelist'e eklendi", async () => {
  const source = await read(FIX_MIGRATION_PATH);

  for (const slug of [
    "blok-okuma",
    "golgeleme",
    "gruplama-calismasi",
    "anlama-testi",
    "okuma-hizi-testi",
  ]) {
    assert.match(source, new RegExp(`'${slug}',?\\n`));
  }
});

test("orijinal 9 egzersiz de whitelist'te korunuyor (geriye donuk uyumluluk)", async () => {
  const source = await read(FIX_MIGRATION_PATH);

  for (const slug of [
    "kare-gorme-alani",
    "ayni-olani-yakala",
    "benzer-kelimeler",
    "kelime-bulma",
    "goz-egzersizleri-kolonlar",
    "takistoskop",
    "harf-rakam-sayma",
    "hafiza-gelistirme",
    "kart-eslestirme",
  ]) {
    assert.match(source, new RegExp(`'${slug}',?\\n`));
  }
});

test("diger tum guard'lar (gun sayisi, gun basina 5 gorev, duration/settings) degismeden korunuyor", async () => {
  const source = await read(FIX_MIGRATION_PATH);

  assert.match(source, /if v_template\.day_count < 1 or v_template\.day_count > 60 then/);
  assert.match(
    source,
    /having count\(t\.id\) <> 5\s*\n\s*or count\(distinct t\.order_number\) <> 5/,
  );
  assert.match(source, /t\.duration_seconds is null\s*\n\s*or t\.duration_seconds <= 0/);
  assert.match(source, /jsonb_typeof\(t\.settings\) <> 'object'/);
});

test("fonksiyon imzasi ve service_role-only yetki deseni degismedi", async () => {
  const source = await read(FIX_MIGRATION_PATH);

  assert.match(
    source,
    /create or replace function public\.assign_education_program_template_v1\(\s*\n\s*p_student_id uuid,\s*\n\s*p_template_id uuid,/,
  );
  assert.match(
    source,
    /revoke all on function public\.assign_education_program_template_v1\(\s*\n\s*uuid, uuid, text, text, text, text\s*\n\s*\) from public;/,
  );
  assert.match(
    source,
    /grant execute on function public\.assign_education_program_template_v1\(\s*\n\s*uuid, uuid, text, text, text, text\s*\n\s*\) to service_role;/,
  );
});

test("bu migration ogrenci silme/duplicate ozelliklerine ait dosyalara dokunmaz", async () => {
  const source = await read(FIX_MIGRATION_PATH);
  assert.doesNotMatch(source, /duplicate_education_program_template_v1/);
  assert.doesNotMatch(source, /delete from/i);
});

test("orijinal 20260725180000 migration'i degistirilmedi (yalniz create or replace ile yeni migration eklendi)", async () => {
  const source = await read(ORIGINAL_MIGRATION_PATH);
  // Orijinal dosya hala eski 9-slug'lik whitelist'i icerir - bu dosya
  // degistirilmedi, duzeltme YENI bir migration olarak eklendi.
  assert.doesNotMatch(source, /'blok-okuma'/);
  assert.doesNotMatch(source, /'anlama-testi'/);
});

// supportsDuration:false gorevlerin duration_seconds icin her zaman gecerli
// bir yer tutucu deger gonderdigini dogrular - bu, arastirma sirasinda ikinci
// bir olasi neden olarak incelenip zaten dogru ele alindigi tespit edilen bir
// davranistir; regresyona karsi acik bir assertion olarak eklendi.
test("supportsDuration:false gorevler (Anlama Testi, Okuma Hizi Testi) icin editor DURATIONLESS_TASK_PLACEHOLDER_SECONDS gonderir (duration_seconds hicbir zaman 0/null olmaz)", async () => {
  const source = await read(EDITOR_PATH);

  assert.match(source, /const DURATIONLESS_TASK_PLACEHOLDER_SECONDS = 60;/);
  assert.match(
    source,
    /definition\?\.supportsDuration === false\s*\n\s*\? String\(DURATIONLESS_TASK_PLACEHOLDER_SECONDS\)/,
  );
  assert.match(
    source,
    /definition && definition\.supportsDuration === false \? \(\s*\n\s*<>\s*\n\s*<input\s*\n\s*type="hidden"\s*\n\s*name=\{`task-\$\{orderNumber\}-durationSeconds`\}\s*\n\s*value=\{DURATIONLESS_TASK_PLACEHOLDER_SECONDS\}/,
  );
});
