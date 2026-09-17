import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile("src/app/ogrenci/paragraf-analizim/page.tsx", "utf8");
const view = await readFile("src/app/ogrenci/paragraf-analizim/StudentParagraphAnalyticsView.tsx", "utf8");
const dashboard = await readFile("src/app/ogrenci/page.tsx", "utf8");
const panel = await readFile("src/components/student-panel-preview/StudentPanelPreview.tsx", "utf8");

test("student analytics route is a server-only verified-identity flow", () => {
  assert.match(page, /requireParagraphExerciseAccess\(\)/);
  assert.match(page, /loadParagraphStudentAnalyticsForVerifiedStudent\(access\.studentId\)/);
  assert.ok(page.indexOf("const access = await requireParagraphExerciseAccess()") < page.indexOf("const analysis = await loadParagraphStudentAnalyticsForVerifiedStudent"));
  assert.doesNotMatch(page, /searchParams|studentId.*query|localStorage|use client/i);
});

test("dashboard entry point is strictly boolean feature-flagged", () => {
  assert.match(dashboard, /showParagraphAnalyticsCard=\{access\.paragraphExercisesEnabled === true\}/);
  assert.match(panel, /showParagraphAnalyticsCard\?: boolean/);
  assert.match(panel, /showParagraphAnalyticsCard \? <ParagraphAnalyticsCard \/> : null/);
  assert.match(panel, /href="\/ogrenci\/paragraf-analizim"/);
});

test("presentation includes the required supportive, low-data-safe sections", () => {
  for (const text of ["Paragraf Analizim", "Başarı Oranı", "Çözülen Soru", "Ortalama Cevap Süresi", "Tamamlanan Çalışma", "Başarı Gelişimim", "Becerilerim", "En Güçlü Alanım", "Bu Hafta Odaklan", "Son Çalışmalarım", "Henüz veri yok", "İlk çalışmayı başlat"]) {
    assert.match(view, new RegExp(text));
  }
  assert.match(view, /slice\(-10\)/);
  assert.match(view, /slice\(-5\)/);
  assert.match(view, /role="img"/);
  assert.doesNotMatch(view, /ranking|sıralama|raw|ham cevap|studentId|source/);
  assert.doesNotMatch(view, /use client|fetch\(|localStorage/);
});

test("presentation hides invalid timing and invalid dates behind the unavailable marker", () => {
  assert.match(view, /Number\.isFinite\(date\.getTime\(\)\) \? dateFormatter\.format\(date\) : "—"/);
  assert.match(view, /value === null \|\| !Number\.isFinite\(value\).*return "—"/);
});
