import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navSource = await readFile(
  "src/components/student-panel-preview/data.ts",
  "utf8",
);
const panelSource = await readFile(
  "src/components/student-panel-preview/StudentPanelPreview.tsx",
  "utf8",
);

test("Ana Sayfa öğrenci paneline gider ve Okuma Testlerim hedefini korur", () => {
  assert.match(navSource, /label: "Ana Sayfa", icon: "house", href: "\/ogrenci"/);
  assert.match(navSource, /label: "Okuma Testlerim", icon: "bookOpen", href: "\/ogrenci\/okuma-testlerim"/);
});

test("href içeren öğrenci menüsü logout handler çalıştırmaz, gerçek çıkış korunur", () => {
  assert.match(panelSource, /if \(item\.href\)\s*\{[\s\S]*?<Link href=\{item\.href\}/);
  assert.match(panelSource, /const handleLogout = async \(\) =>/);
  assert.match(panelSource, /await logoutCurrentStudent\(\)/);
  assert.match(panelSource, /onLogout=\{\(\) => void handleLogout\(\)\}/);
});
