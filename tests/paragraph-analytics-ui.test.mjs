import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

test("analytics route uses the existing teacher session guard and dynamic server read", async () => {
  const source = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/analiz/page.tsx");
  assert.match(source, /requireTeacherSession/);
  assert.match(source, /await requireTeacherSession\(\)/);
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /loadParagraphAnalytics/);
});

test("service-role access stays in server repository and result query excludes student PII", async () => {
  const repository = await read("src/lib/paragraph-exercises/paragraphAnalyticsRepository.ts");
  const client = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/analiz/ParagraphAnalyticsClient.tsx");
  assert.match(repository, /getSupabaseServiceRoleClient/);
  assert.match(repository, /select\(RESULT_FIELDS\)/);
  assert.match(repository, /const RESULT_FIELDS = "student_id,details"/);
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE|createClient|student_name|username|email|phone/u);
  assert.doesNotMatch(client, /studentId/);
});

test("content management entry-point links to the read-only analytics flow", async () => {
  const modules = await read("src/lib/content-management/modules.ts");
  const management = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/page.tsx");
  assert.match(modules, /id: "paragraph-questions"/);
  assert.match(modules, /performans analizini yönetin/);
  assert.match(management, /Performans Analizi/);
  assert.match(management, /\/ogretmen\/icerik-yonetimi\/paragraf-sorulari\/analiz/);
});

test("small-sample warning and responsive table contracts are present", async () => {
  const client = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/analiz/ParagraphAnalyticsClient.tsx");
  const analytics = await read("src/lib/paragraph-exercises/paragraphAnalytics.ts");
  assert.match(client, /analyzableQuestionCount === 0/);
  assert.match(client, /Henüz sınırlı öğrenci verisi bulunuyor/);
  assert.match(client, /overflow-x-auto/);
  assert.match(client, /sm:grid-cols-2/);
  assert.match(analytics, /"high-school": "Lise"/);
  assert.doesNotMatch(client, /high-school/);
});