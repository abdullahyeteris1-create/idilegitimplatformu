import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getStudentPanelRecommendation } from "../src/lib/recommendations/studentPanelRecommendation.ts";

test("öğrenci paneli recommendation aynı gün deterministik ve katalog route kullanır", () => {
  const first = getStudentPanelRecommendation([], new Date("2026-08-13T10:00:00+03:00"));
  const second = getStudentPanelRecommendation([], new Date("2026-08-13T21:00:00+03:00"));
  assert.deepEqual(first, second);
  assert.ok(["hafiza-yarisi", "tatli-dukkani", "kayip-nesne"].includes(first.slug));
  assert.match(first.href, /^\/egzersizler\//);
});

test("ana sayfa gerçek iki kolonlu grid kullanır ve mobilde normal akışa döner", async () => {
  const css = await readFile("src/components/student-panel-preview/student-panel-preview.module.css", "utf8");
  assert.match(css, /\.dashboardThemeShell \.content\{display:grid;grid-template-columns:minmax\(0,1fr\) 300px;column-gap:16px;align-content:start\}/);
  assert.match(css, /\.dashboardThemeShell \.usageGuideCard\{grid-column:1;min-width:0\}/);
  assert.match(css, /\.dashboardThemeShell \.dashboardGrid\{display:contents\}/);
  assert.match(css, /\.dashboardThemeShell \.dashboardGrid>\.rightColumn\{grid-column:2;grid-row:2\/span 3;align-self:start;min-width:0\}/);
  assert.doesNotMatch(css, /margin-top:-421px/);
  assert.match(css, /@media\(max-width:900px\)\{\.dashboardThemeShell \.content\{display:block\}\.dashboardThemeShell \.dashboardGrid\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:12px;margin-top:16px\}/);
});

test("Seviye + recommendation kartÄ± recommendation alanÄ±nÄ± okunabilir tutar", async () => {
  const css = await readFile("src/components/student-panel-preview/student-panel-preview.module.css", "utf8");
  assert.match(css, /\.levelRecommendationHead span[^}]*font-size:11px/);
  assert.match(css, /\.levelRecommendationThumb\{width:46px;height:46px/);
  assert.match(css, /\.levelRecommendationAction\{[^}]*min-height:38px/);
  assert.match(css, /\.levelRecommendationCopy p[^}]*-webkit-line-clamp:2/);
  assert.match(css, /@media\(max-width:360px\)[\s\S]*\.levelRecommendationAction\{[^}]*min-height:36px/);
});

test("son oynanan oyun mümkünse önerilmez", () => {
  const result = { id: "1", exerciseType: "tatli-dukkani", exerciseTitle: "Tatlı Dükkanı", score: 1, successRate: 100, correctCount: 1, wrongCount: 0, durationSeconds: 60, date: "2026-08-12T10:00:00Z" };
  assert.notEqual(getStudentPanelRecommendation([result], new Date("2026-08-13T10:00:00+03:00")).slug, "tatli-dukkani");
});

test("panel Phase 1 gerçek metrikleri ve no-fake XP kararını taşır", async () => {
  const source = await readFile("src/components/student-panel-preview/StudentPanelPreview.tsx", "utf8");
  assert.match(source, /Bugünkü Program/);
  assert.match(source, /Çalışma Süresi/);
  assert.match(source, /Kazanılan XP/);
  assert.match(source, /Bugün için ayrı XP verisi yok/);
  assert.match(source, /levelRecommendation/);
  assert.match(source, /recommendation=\{panelRecommendation\}/);
  assert.match(source, /getStudentPanelRecommendation/);
  assert.match(source, /Kaldığın Yerden Devam Et/);
});
