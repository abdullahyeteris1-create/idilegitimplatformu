import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Phase 3A soru bankası modalı filtreli çoklu seçim ve güvenli bulk state sunar", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  for (const text of ["Tüm sınıflar", "Tüm kategoriler", "Tüm zorluklar", "Tümünü seç", "Seçimi temizle", "Seçilenleri Denemeye Ekle", "Denemeye Ekle", "Soruyu incele", "Detayları göster"]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /useState<Set<string>>/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /className=\{"rounded-xl border p-3 transition " \+ \(isSelected/);
  assert.match(source, /disabled=\{isBulkAdding \|\| selectedIds\.size === 0\}/);
  assert.match(source, /onBulkAdd/);
  assert.match(source, /setIsBulkAdding\(true\)/);
  assert.match(source, /for \(const item of items\)/);
  assert.match(source, /sourceQuestionId: item\.id/);
  assert.match(source, /normalizePassage\(passage\.passageText\) === normalizePassage\(item\.paragraph\)/);
});

test("Phase 3A detay açılımı öğretmen cevaplarını ve beş seçeneği gösterir", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  for (const text of ["Paragraf", "Soru", "Seçenekler", "Doğru cevap:", "Açıklama"]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /item\.options\.map/);
  assert.doesNotMatch(source, /Snapshot olarak ekle/);
  assert.doesNotMatch(source, /snapshot olarak kopyalanır/);
});