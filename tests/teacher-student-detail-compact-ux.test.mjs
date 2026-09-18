import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/teacher-panel/TeacherStudentDetailClient.tsx", import.meta.url),
  "utf8",
);

test("detail-heavy sections start collapsed with local-only state", () => {
  for (const state of [
    "programExpanded",
    "performanceDetailsExpanded",
    "activitiesExpanded",
    "readingTestsExpanded",
    "resultsExpanded",
    "showAllResults",
  ]) {
    assert.match(source, new RegExp(`const \\[${state}, set[A-Z][A-Za-z]+\\] = useState\\(false\\)`));
  }
});

test("program keeps a useful summary visible and gates the existing day UI", () => {
  assert.match(source, /completedDays}\/\{programProgressDetail\.totalDays} gün/);
  assert.match(source, /completedTasks}\/\{programProgressDetail\.totalTasks} görev/);
  assert.match(source, /overallProgressPercent} tamamlandı/);
  assert.match(source, /Sonraki görev:/);
  assert.match(source, /showLabel="Programı Gör"/);
  assert.match(source, /hideLabel="Programı Gizle"/);
  assert.match(source, /\{programExpanded \? \([\s\S]*programProgressDetail\.days\.map/);
});

test("performance KPIs remain visible while charts and recent details collapse", () => {
  assert.match(source, /detailsExpanded: boolean/);
  assert.match(source, /Kayıt[\s\S]*Son değer[\s\S]*En yüksek[\s\S]*Ortalama/);
  assert.match(source, /\{detailsExpanded \? \([\s\S]*<PerformanceBars/);
  assert.match(source, /showLabel="Detayları Gör"/);
});

test("activity and reading histories are compact but retain their existing collections", () => {
  assert.match(source, /\{activitiesExpanded \? \([\s\S]*detail\.activityFeed\.map/);
  assert.match(source, /\{readingTestsExpanded \? \([\s\S]*readingStats\.recordsNewestFirst\.map/);
  assert.match(source, /showLabel="Son Aktiviteleri Gör"/);
  assert.match(source, /showLabel="Okuma Testlerini Gör"/);
  assert.match(source, /overflow-x-auto/);
});

test("result history opens with newest five and can reveal every result", () => {
  assert.match(source, /const visibleResults = showAllResults \? sortedResults : sortedResults\.slice\(0, 5\)/);
  assert.equal(source.match(/visibleResults\.map/g)?.length, 2);
  assert.match(source, /showLabel="Sonuçları Gör"/);
  assert.match(source, /Tüm Sonuçları Göster/);
  assert.match(source, /Yalnızca Son 5 Sonucu Göster/);
  assert.match(source, /if \(resultsExpanded\) setShowAllResults\(false\)/);
});

test("full result data remains available to Excel export", () => {
  assert.match(source, /downloadResultsXlsx\(sortedResults,/);
  assert.doesNotMatch(source, /downloadResultsXlsx\(visibleResults,/);
});

test("disclosure controls expose state and keyboard focus", () => {
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /aria-controls=\{controls\}/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /min-h-11/);
});

test("paragraph analytics stays integrated and outside compact disclosure gates", () => {
  const paragraphIndex = source.indexOf("<TeacherParagraphAnalysis");
  const activityIndex = source.indexOf('title="Son Aktiviteler"');
  assert.ok(paragraphIndex > -1);
  assert.ok(activityIndex > paragraphIndex);
  assert.match(source, /<TeacherParagraphAnalysis results=\{detail\.results\} paragraphAnalysis=\{paragraphAnalysis\} \/>/);
});

test("compact UX adds no data loading or backend client dependency", () => {
  assert.equal(source.match(/fetch\(/g)?.length, 1, "only the existing delete request should remain");
  assert.doesNotMatch(source, /createClient|supabase|Repository/);
});
