import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const navSource = fs.readFileSync(
  "src/components/student-panel-preview/data.ts",
  "utf8",
);
const panelSource = fs.readFileSync(
  "src/components/student-panel-preview/StudentPanelPreview.tsx",
  "utf8",
);

test("öğrenci Ayarlar bağlantısı profil sayfasına gider", () => {
  assert.match(
    navSource,
    /label: "Ayarlar", icon: "settings" \}/,
  );
  assert.match(
    navSource,
    /label: "Okuma Testlerim", icon: "bookOpen", href: "\/ogrenci\/okuma-testlerim"/,
  );
  assert.match(
    navSource,
    /label: "Ana Sayfa", icon: "house", href: "\/ogrenci"/,
  );
  assert.match(
    panelSource,
    /function AccountMenuPopover/,
  );
  assert.match(panelSource, /AccountMenuTrigger/);
  assert.match(panelSource, /aria-haspopup="menu"/);
  assert.match(panelSource, /student-account-menu/);
  assert.match(panelSource, /<Link href="\/ogrenci\/profil" className=\{styles\.profileMenuLink\}[^>]*>[\s\S]*Profilim<\/Link>/);
  assert.match(panelSource, /profileLogout/);
  assert.match(panelSource, /navItems\.map/);
});

test("profil menü bağlantısı mevcut profil akışını korur", () => {
  assert.match(panelSource, /StudentPanelPreview/);
  assert.match(panelSource, /onLogout/);
  assert.match(panelSource, /href="\/ogrenci\/profil"/);
});
