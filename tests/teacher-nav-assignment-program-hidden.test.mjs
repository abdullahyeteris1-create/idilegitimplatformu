import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  ASSIGNMENT_PROGRAM_HREF,
  SHOW_ASSIGNMENT_PROGRAM,
  TEACHER_NAV_GROUPS,
  TEACHER_NAV_ITEMS,
} from "../src/lib/constants/teacherNavigation.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const DASHBOARD_PAGE_PATH = "src/app/ogretmen/idil-panel/page.tsx";
const NAV_CONSTANTS_PATH = "src/lib/constants/teacherNavigation.ts";

// ---------------------------------------------------------------------------
// A. Sabit ve nav filtresi
// ---------------------------------------------------------------------------

test("SHOW_ASSIGNMENT_PROGRAM su an false - Odev Programi kasitli olarak gizli", () => {
  assert.equal(SHOW_ASSIGNMENT_PROGRAM, false);
  assert.equal(ASSIGNMENT_PROGRAM_HREF, "/ogretmen/idil-panel/odev-programi");
});

test("1) SHOW_ASSIGNMENT_PROGRAM=false iken TEACHER_NAV_ITEMS icinde Odev Programi (eski) yok", () => {
  const hrefs = TEACHER_NAV_ITEMS.map((item) => item.href);
  assert.ok(!hrefs.includes(ASSIGNMENT_PROGRAM_HREF));
});

test("3) Egitim Programlari navigasyonda gormeye devam ediyor (diger ozellikler etkilenmiyor)", () => {
  const hrefs = TEACHER_NAV_ITEMS.map((item) => item.href);
  assert.ok(hrefs.includes("/ogretmen/idil-panel/egitim-programlari"));
  assert.ok(hrefs.includes("/ogretmen/idil-panel/ogrenci-programlari"));
});

test("4) /ogretmen/idil-panel/odevler navigasyonda gorunmeye devam ediyor - farkli/ayri ozellik, karistirilmadi", () => {
  const hrefs = TEACHER_NAV_ITEMS.map((item) => item.href);
  assert.ok(hrefs.includes("/ogretmen/idil-panel/odevler"));
});

test("gruplu teacher navigation tekil route'larla flatten edilir ve aktif moduller korunur", () => {
  const groupedItems = TEACHER_NAV_GROUPS.flatMap((group) => group.items);
  const hrefs = TEACHER_NAV_ITEMS.map((item) => item.href);
  const groupedHrefs = groupedItems.map((item) => item.href);

  assert.deepEqual(hrefs, groupedHrefs);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.ok(hrefs.includes("/ogretmen/idil-panel/oyun-odalari"));
  assert.ok(hrefs.includes("/ogretmen/idil-panel/egitim-programlari"));
  assert.ok(hrefs.includes("/ogretmen/idil-panel/odevler"));
  assert.ok(!hrefs.includes(ASSIGNMENT_PROGRAM_HREF));
});

test("gorunurluk karari tek kaynaktan (ASSIGNMENT_PROGRAM_HREF) yonetiliyor, baska yerde ayrica hardcode edilmemis", async () => {
  const source = await read(NAV_CONSTANTS_PATH);
  const hardcodedOccurrences = source.match(/"\/ogretmen\/idil-panel\/odev-programi"/g) ?? [];
  // Yalniz ASSIGNMENT_PROGRAM_HREF tanimindaki tek bir literal olmali; nav
  // dizisindeki giris ASSIGNMENT_PROGRAM_HREF degiskenine referans veriyor.
  assert.equal(hardcodedOccurrences.length, 1);
});

// ---------------------------------------------------------------------------
// B. Dashboard karti
// ---------------------------------------------------------------------------

test("2) Dashboard kartlarinda render'a giden liste (visibleModuleCards) eski Odev Programi hrefini icermez", async () => {
  const source = await read(DASHBOARD_PAGE_PATH);

  assert.match(
    source,
    /const visibleModuleCards = MODULE_CARDS\.filter\(\s*\n\s*\(module\) => SHOW_ASSIGNMENT_PROGRAM \|\| module\.href !== ASSIGNMENT_PROGRAM_HREF,\s*\n\s*\);/,
  );
  assert.match(source, /\{visibleModuleCards\.map\(\(module\) => \(/);
  assert.doesNotMatch(source, /\{MODULE_CARDS\.map\(\(module\) => \(/);
});

test("MODULE_CARDS statik dizisinde 'Odev Programi' objesi SILINMEDI - yalniz render listesi filtreleniyor", async () => {
  const source = await read(DASHBOARD_PAGE_PATH);

  const cardsStart = source.indexOf("const MODULE_CARDS: ModuleCard[] = [");
  const cardsEnd = source.indexOf("\n];", cardsStart);
  const cardsBlock = source.slice(cardsStart, cardsEnd);

  // Kartin varligini href uzerinden dogruluyoruz: baslik kullaniciya gorunen
  // metin oldugu icin degisebilir (ASCII "Odev Programi" -> "Odev Programi"
  // duzeltmesinde oldugu gibi), href ise kararli kimliktir. Bu testin amaci
  // objenin SILINMEDIGINI dogrulamak, yazimini sabitlemek degil.
  assert.match(cardsBlock, /href: "\/ogretmen\/idil-panel\/odev-programi",/);
  assert.match(cardsBlock, /title: "Ödev Programı",/);
});

test("dashboard sayfasi SHOW_ASSIGNMENT_PROGRAM/ASSIGNMENT_PROGRAM_HREF'i teacherNavigation.ts'ten import ediyor (tekrar hardcode etmiyor)", async () => {
  const source = await read(DASHBOARD_PAGE_PATH);
  assert.match(
    source,
    /import \{\s*\n\s*ASSIGNMENT_PROGRAM_HREF,\s*\n\s*SHOW_ASSIGNMENT_PROGRAM,\s*\n\s*TEACHER_NAV_ITEMS,\s*\n\s*\} from "@\/lib\/constants\/teacherNavigation";/,
  );
});

// ---------------------------------------------------------------------------
// C. Korunan kaynaklar - route/API/migration/veri silinmedi
// ---------------------------------------------------------------------------

test("5) Assignment-program route ve API dosyalari dosya sisteminde hala mevcut (silinmedi)", async () => {
  const paths = [
    "src/app/ogretmen/idil-panel/odev-programi/page.tsx",
    "src/app/ogretmen/idil-panel/odev-programi/TemplateLibraryClient.tsx",
    "src/app/api/admin/assignment-program/template-library/route.ts",
    "src/app/api/admin/assignment-program/template-library/[templateId]/route.ts",
    "src/app/api/admin/assignment-program/template-library/[templateId]/duplicate/route.ts",
    "src/app/api/admin/assignment-program/template-library/[templateId]/slots/route.ts",
    "src/app/api/admin/assignment-program/students/route.ts",
    "src/app/api/admin/assignment-program/programs/route.ts",
  ];

  for (const relativePath of paths) {
    await assert.doesNotReject(
      access(new URL(`../${relativePath}`, import.meta.url)),
      `${relativePath} silinmemis olmali`,
    );
  }
});

test("assignment-program migration'lari hala mevcut (silinmedi)", async () => {
  const paths = [
    "supabase/migrations/20260723090000_create_student_assignment_program_system.sql",
    "supabase/migrations/20260724100000_create_student_assignment_program_rpc.sql",
    "supabase/migrations/20260725120000_complete_student_assignment_program_task_rpc.sql",
  ];

  for (const relativePath of paths) {
    await assert.doesNotReject(access(new URL(`../${relativePath}`, import.meta.url)));
  }
});

test("6) /ogretmen/idil-panel/odevler route dosyasi degismedi, ayri bir ozellik olarak duruyor", async () => {
  await assert.doesNotReject(
    access(new URL("../src/app/ogretmen/idil-panel/odevler/page.tsx", import.meta.url)),
  );
  const source = await read("src/app/ogretmen/idil-panel/odevler/page.tsx");
  assert.doesNotMatch(source, /assignment-program/);
});

test("ogrenci paneli TodaysProgramTasksCard dosyasi ve assignment-program API cagrilari degismedi", async () => {
  const source = await read(
    "src/components/student-panel-preview/TodaysProgramTasksCard.tsx",
  );
  assert.match(source, /\/api\/student\/assignment-program\/today/);
});

// ---------------------------------------------------------------------------
// D. Dogrudan route erisimi acik kaliyor
// ---------------------------------------------------------------------------

test("7) odev-programi route'unda erisimi engelleyen bir redirect/guard eklenmedi - yalniz TeacherOnly (mevcut, degismemis) korumasi var", async () => {
  const source = await read("src/app/ogretmen/idil-panel/odev-programi/page.tsx");
  assert.doesNotMatch(source, /notFound\(\)/);
  assert.doesNotMatch(source, /redirect\(["'`]\/ogretmen\/idil-panel["'`]\)/);
});
