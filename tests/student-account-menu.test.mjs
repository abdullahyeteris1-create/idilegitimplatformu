import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const menuSource = await readFile("src/components/student-panel-preview/StudentAccountMenu.tsx", "utf8");
const panelSource = await readFile("src/components/student-panel-preview/StudentPanelPreview.tsx", "utf8");
const shellSource = await readFile("src/components/exercises-preview/ExercisesCenterShell.tsx", "utf8");
const headerSource = await readFile("src/components/exercises-preview/PreviewHeader.tsx", "utf8");
const sidebarSource = await readFile("src/components/exercises-preview/PreviewSidebar.tsx", "utf8");

test("sağ üst profil butonları ortak StudentAccountMenu'yu açacak erişilebilirlik durumunu taşır", () => {
  assert.match(panelSource, /aria-haspopup="menu"/);
  assert.match(headerSource, /aria-haspopup="menu"/);
  assert.match(shellSource, /<StudentAccountMenu/);
});

test("Ayarlar tıklaması aynı ortak hesap menüsünü açar", () => {
  assert.match(panelSource, /item\.icon === "settings" && onAccountMenu/);
  assert.match(sidebarSource, /item\.icon === "settings" && onAccountMenu/);
  assert.match(shellSource, /onAccountMenu=\{\(\) => setAccountMenuOpen\(true\)\}/);
  assert.match(shellSource, /onNavigate=\{\(\) => setMobileMenuOpen\(false\)\} onAccountMenu=/);
});

test("ortak menü yalnız Profil ve Çıkış Yap seçeneklerini içerir", () => {
  assert.match(menuSource, /href="\/ogrenci\/profil"[^>]*role="menuitem"/);
  assert.match(menuSource, /role="menuitem"[\s\S]*Çıkış Yap/);
  assert.doesNotMatch(menuSource, /Ayarlar/);
  assert.match(menuSource, /role="menu"/);
});

test("Profil route'u ve mevcut güvenli logout helper'ı korunur", () => {
  assert.match(menuSource, /logoutCurrentStudent/);
  assert.match(menuSource, /window\.location\.replace\("\/giris"\)/);
  assert.match(menuSource, /href="\/ogrenci\/profil"/);
  assert.match(panelSource, /await logoutCurrentStudent\(\)/);
  assert.match(shellSource, /await logoutCurrentStudent\(\)/);
});

test("menu Escape ile kapanır ve dış tıklama backdrop üzerinden yakalanır", () => {
  assert.match(menuSource, /event\.key === "Escape"/);
  assert.match(panelSource, /className=\{styles\.panelBackdrop\}/);
  assert.match(shellSource, /className=\{`\$\{panelStyles\.panelBackdrop\}/);
  assert.match(shellSource, /setMobileMenuOpen\(false\); setAccountMenuOpen\(false\)/);
});

test("menü mobilde ekran genişliğine sığan mevcut responsive panel stilini kullanır", async () => {
  const css = await readFile("src/components/student-panel-preview/student-panel-preview.module.css", "utf8");
  assert.match(css, /\.demoPopover\{right:24px;top:82px;width:min\(340px,calc\(100vw - 32px\)\)/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*\.demoPopover\{top:74px;right:14px\}/);
});
