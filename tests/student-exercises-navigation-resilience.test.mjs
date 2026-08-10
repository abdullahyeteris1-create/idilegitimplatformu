import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellSource = await readFile("src/components/exercises-preview/ExercisesCenterShell.tsx", "utf8");
const headerSource = await readFile("src/components/exercises-preview/PreviewHeader.tsx", "utf8");
const sidebarSource = await readFile("src/components/exercises-preview/PreviewSidebar.tsx", "utf8");
const dataSource = await readFile("src/components/student-panel-preview/data.ts", "utf8");

test("kategori seçimi URL tabanlı kalır ve aynı kategori için replace çağırmaz", () => {
  assert.match(shellSource, /router\.replace\(`\$\{pathname\}\?\$\{nextParams\.toString\(\)\}`/);
  assert.match(shellSource, /if \(groupId === activeGroupId\) return/);
  assert.match(shellSource, /setMobileMenuOpen\(false\)/);
});

test("egzersiz merkezi idle/BFCache dönüşünde menüyü kapatır", () => {
  assert.match(shellSource, /addEventListener\("pageshow"/);
  assert.match(shellSource, /addEventListener\("focus"/);
  assert.match(shellSource, /visibilitychange/);
  assert.match(shellSource, /panelBackdropOpen/);
});

test("Ayarlar tüm öğrenci navigation kaynaklarında profil route'una gider", () => {
  assert.match(dataSource, /label: "Ayarlar", icon: "settings", href: "\/ogrenci\/profil"/);
  assert.match(shellSource, /profileHref="\/ogrenci\/profil"/);
  assert.match(shellSource, /<Link href="\/ogrenci\/profil" aria-label="Profil">/);
  assert.match(headerSource, /<Link href=\{profileHref\}/);
  assert.match(sidebarSource, /if \(href\)/);
});
