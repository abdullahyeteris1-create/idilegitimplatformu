import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

const paths = {
  page: "src/app/ogretmen/ogrenciler/[studentId]/page.tsx",
  client: "src/components/teacher-panel/TeacherStudentDetailClient.tsx",
  adapter: "src/lib/teachers/studentTrackingRepository.ts",
  repository: "src/lib/paragraph-exercises/paragraphStudentAnalyticsRepository.ts",
  wrapper: "src/components/teacher-panel/TeacherParagraphAnalysis.tsx",
  view: "src/components/teacher-panel/TeacherParagraphDevelopmentView.tsx",
};

test("teacher adapter delegates canonical analytics without gating historical results", async () => {
  const [adapter, repository] = await Promise.all([read(paths.adapter), read(paths.repository)]);

  assert.match(adapter, /loadTeacherParagraphAnalytics\([\s\S]*loadParagraphStudentAnalyticsForVerifiedStudent\(authorizedStudentId, client\)/);
  assert.doesNotMatch(repository, /paragraph_exercises_enabled|paragraphExercisesEnabled/);
  assert.match(repository, /\.eq\("student_id", verifiedStudentId\)/);
  assert.match(repository, /\.eq\("exercise_type", "paragraph"\)/);
});

test("server page authenticates and authorizes before loading analytics for canonical profile identity", async () => {
  const page = await read(paths.page);
  const auth = page.indexOf("await requireTeacherSession()");
  const validation = page.indexOf("isTeacherStudentId(studentId)");
  const detail = page.indexOf("await getTeacherStudentDetail(studentId)");
  const analytics = page.indexOf("loadTeacherParagraphAnalytics(detail.profile.studentId)");

  assert.ok(auth >= 0 && validation > auth && detail > validation && analytics > detail);
  assert.doesNotMatch(page, /loadTeacherParagraphAnalytics\(studentId\)/);
  assert.match(page, /<TeacherStudentDetailClient detail=\{detail\} paragraphAnalysis=\{paragraphAnalysis \?\? undefined\} \/>/);
});

test("client passes canonical analysis through without a browser analytics request", async () => {
  const client = await read(paths.client);

  assert.match(client, /TeacherStudentDetailClient\(\{ detail, paragraphAnalysis \}/);
  assert.match(client, /<TeacherParagraphAnalysis results=\{detail\.results\} paragraphAnalysis=\{paragraphAnalysis\} \/>/);
  assert.doesNotMatch(client, /fetch\([^)]*paragraph|createClient|SUPABASE_SERVICE_ROLE/is);
});

test("wrapper prefers canonical analysis, preserves fallback, and renders only the new view", async () => {
  const wrapper = await read(paths.wrapper);

  assert.match(wrapper, /paragraphAnalysis \?\? buildParagraphAnalysis\(results \?\? \[\]\)/);
  assert.match(wrapper, /<TeacherParagraphDevelopmentView analysis=\{analysis\} \/>/);
  assert.doesNotMatch(wrapper, /PanelCard|title="Paragraf Analizi"|aria-label="Paragraf Analizi"/);
});

test("development view exposes required copy, canonical trend states, and low-data states", async () => {
  const view = await read(paths.view);

  for (const text of [
    "Paragraf Gelişim Analizi",
    "Çözülen Soru",
    "Doğru",
    "Başarı Oranı",
    "Ortalama Cevap Süresi",
    "Tamamlanan Çalışma",
    "Başarı Gelişimi",
    "Beceri Alanları",
    "En Güçlü Alan",
    "Gelişim Alanı",
    "Son 5 çalışma",
    "Henüz veri yok",
    "Henüz yeterli veri yok.",
    "Öğrencinin henüz tamamlanmış paragraf çalışması bulunmuyor.",
  ]) {
    assert.ok(view.includes(text), `missing visible copy: ${text}`);
  }

  for (const status of ["improving", "stable", "needs_attention", "insufficient"]) {
    assert.match(view, new RegExp(`\\b${status}:`));
  }
  assert.match(view, /analysis\.trend\.status/);
  assert.match(view, /analysis\.categories\.map/);
  assert.match(view, /analysis\.strongestCategory/);
  assert.match(view, /analysis\.needsImprovementCategory/);
});

test("recent sessions are newest-first and limited to five", async () => {
  const view = await read(paths.view);

  assert.match(view, /analysis\.sessions\.slice\(-10\)/);
  assert.match(view, /sessions\.slice\(\)\.reverse\(\)\.slice\(0, 5\)/);
  assert.match(view, /recentSessions\.map/);
});

test("teacher development presentation does not expose raw answer or comparison data", async () => {
  const [wrapper, view] = await Promise.all([read(paths.wrapper), read(paths.view)]);
  const presentation = `${wrapper}\n${view}`;

  assert.doesNotMatch(presentation, /questionId|selectedIndex|submission_key|details\s*\.|JSON\.stringify/);
  assert.doesNotMatch(presentation, /ranking|percentile|student-vs-student|öğrenci karşılaştır/is);
  assert.doesNotMatch(view, /fetch\(|createClient|supabase/i);
  assert.match(view, /averageResponseTimeMs/);
  assert.match(view, /accuracy/);
  assert.doesNotMatch(view, /speed.*accuracy|accuracy.*speed/i);
});

test("access-status UI is supported in isolation but is not wired into the analytics wrapper", async () => {
  const [wrapper, view] = await Promise.all([read(paths.wrapper), read(paths.view)]);

  assert.match(view, /paragraphExercisesEnabled\?: boolean \| null/);
  assert.match(view, /paragraphExercisesEnabled === false/);
  assert.ok(view.includes("Paragraf çalışmaları şu anda kapalı."));
  assert.doesNotMatch(wrapper, /paragraphExercisesEnabled/);
});

test("new view contains valid UTF-8 copy without replacement or control characters", async () => {
  const view = await read(paths.view);

  assert.doesNotMatch(view, /\uFFFD/u);
  assert.doesNotMatch(view, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u);
});
