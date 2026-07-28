import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PANEL_URL = new URL("../src/app/ogrenci/page.tsx", import.meta.url);
const BADGES_URL = new URL("../src/app/ogrenci/rozetlerim/page.tsx", import.meta.url);
const COMPONENT_URL = new URL("../src/components/student-panel-preview/StudentPanelPreview.tsx", import.meta.url);
const DATA_URL = new URL("../src/components/student-panel-preview/data.ts", import.meta.url);

async function read(path) {
  return readFile(path, "utf8");
}

test("1-6) ogrenci sayfasi XP snapshot'i tek kez yukuye alir ve karta aktarir", async () => {
  const source = await read(PANEL_URL);

  assert.match(source, /Promise\.all\(\[\s*getStudentProfile\(access\.studentId\),\s*getStudentXpSnapshotByStudentId\(access\.studentId\),\s*\]\)/s);
  assert.match(source, /<StudentPanelPreview[\s\S]*xpSnapshot=\{xpSnapshot\}/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
});

test("7-10) rozetlerim sayfasi var ve gercek route menude kullaniliyor", async () => {
  const pageSource = await read(BADGES_URL);
  const dataSource = await read(DATA_URL);

  assert.match(pageSource, /export default async function StudentBadgesPage\(\)/);
  assert.match(pageSource, /getStudentXpBadges\(xpSnapshot\)/);
  assert.match(pageSource, /Öğrenci Paneline Dön/);
  assert.match(dataSource, /href: "\/ogrenci\/rozetlerim"/);
});

test("11-16) panel kartlari gercek XP snapshot'i kullanir ve placeholder metinler kaldirilir", async () => {
  const source = await read(COMPONENT_URL);

  assert.match(source, /function LevelCard\(\{ compact = false, xpSnapshot \}: \{ compact\?: boolean; xpSnapshot: StudentXpSnapshot \}\)/);
  assert.ok(source.includes("Seviye {xpSnapshot.level}"));
  assert.ok(source.includes('xpSnapshot.totalXp.toLocaleString("tr-TR")'));
  assert.ok(source.includes("Sonraki: {xpSnapshot.nextLevelTitle}"));
  assert.match(source, /function Badges\(\{ xpSnapshot \}: \{ xpSnapshot: StudentXpSnapshot \}\)/);
  assert.ok(source.includes('Link href="/ogrenci/rozetlerim"'));
  assert.doesNotMatch(source, /Seviye sistemi hazırlanıyor/);
  assert.doesNotMatch(source, /Puan ve seviye özelliği/);
});

test("17-20) günlük seri ve özet kartlari sahte XP göstermiyor", async () => {
  const source = await read(COMPONENT_URL);

  assert.doesNotMatch(source, /Bu hafta kazanılan XP/);
  assert.doesNotMatch(source, /\+65 XP/);
  assert.match(source, /Günlük Seri/);
  assert.match(source, /Rozetlerim/);
});
