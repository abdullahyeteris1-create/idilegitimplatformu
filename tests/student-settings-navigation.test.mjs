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
    /label: "Ayarlar", icon: "settings", href: "\/ogrenci\/profil"/,
  );
  assert.match(
    panelSource,
    /<Link href="\/ogrenci\/profil" className=\{styles\.profileMenuLink\}>[\s\S]*Ayarlar<\/Link>/,
  );
  assert.match(panelSource, /navItems\.map/);
});

test("profil menü bağlantısı mevcut profil akışını korur", () => {
  assert.match(panelSource, /StudentPanelPreview/);
  assert.match(panelSource, /onLogout/);
  assert.match(panelSource, /href="\/ogrenci\/profil"/);
});
