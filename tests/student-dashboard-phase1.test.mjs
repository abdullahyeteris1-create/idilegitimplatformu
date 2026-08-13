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
  assert.match(source, /BUGÜN SANA ÖNERİYORUM/);
  assert.match(source, /getStudentPanelRecommendation/);
  assert.match(source, /Kaldığın Yerden Devam Et/);
});
