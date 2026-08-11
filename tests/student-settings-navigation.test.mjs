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
const menuSource = fs.readFileSync(
  "src/components/student-panel-preview/StudentAccountMenu.tsx",
  "utf8",
);

test("öğrenci Ayarlar bağlantısı profil sayfasına gider", () => {
  assert.match(
    navSource,
    /label: "Ayarlar", icon: "settings", href: "\/ogrenci\/profil" \}/,
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
  assert.match(panelSource, /href=\{item\.href\}/);
  assert.match(panelSource, /StudentAccountMenu/);
  assert.match(panelSource, /item\.icon === "settings" && onAccountMenu/);
  assert.match(menuSource, /profileLogout/);
  assert.match(panelSource, /navItems\.map/);
  assert.doesNotMatch(panelSource, /if \(item\.label === "Ayarlar"\)/);
});

test("profil menü bağlantısı mevcut profil akışını korur", () => {
  assert.match(panelSource, /StudentPanelPreview/);
  assert.match(panelSource, /onLogout/);
  assert.match(menuSource, /href="\/ogrenci\/profil"/);
});
