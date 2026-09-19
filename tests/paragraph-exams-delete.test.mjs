import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const repository = () => read("src/lib/paragraph-exams/repository.ts");
const route = () => read("src/app/api/admin/paragraph-exams/[examId]/route.ts");
const ui = () => read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");

test("schema prevents exam deletion cascades into passages, questions, and student attempts", () => {
  const sql = read("supabase/migrations/20260918100000_create_paragraph_exams.sql");
  assert.match(sql, /paragraph_exam_passages[\s\S]*?references public\.paragraph_exams\(id\) on delete restrict/u);
  assert.match(sql, /paragraph_exam_questions[\s\S]*?references public\.paragraph_exams\(id\) on delete restrict/u);
  assert.match(sql, /paragraph_exam_attempts[\s\S]*?references public\.paragraph_exams\(id\) on delete restrict/u);
  assert.match(sql, /paragraph_exam_answers[\s\S]*?references public\.paragraph_exam_attempts\(id\) on delete cascade/u);
});

test("safe delete permits only draft exams with no student attempt", () => {
  const source = repository();
  assert.match(source, /export async function deleteExam/);
  assert.match(source, /await getExam\(examId\)/);
  assert.match(source, /exam\.status === "published"/);
  assert.match(source, /Yayınlanmış denemeler doğrudan silinemez\. Önce arşivleyin\./);
  assert.match(source, /from\(ATTEMPTS_TABLE\).*count: "exact", head: true/);
  assert.match(source, /Bu denemeye ait öğrenci kayıtları bulunduğu için deneme silinemez/);
  assert.match(source, /exam\.status === "archived"/);
  assert.match(source, /Arşivlenmiş denemeler kalıcı olarak silinemez/);
  assert.match(source, /from\(QUESTIONS_TABLE\)\.delete\(\)\.eq\("exam_id", examId\)/);
  assert.match(source, /from\(PASSAGES_TABLE\)\.delete\(\)\.eq\("exam_id", examId\)/);
  assert.match(source, /from\(EXAMS_TABLE\)\.delete\(\)\.eq\("id", examId\)/);
});

test("admin delete endpoint rejects unauthenticated, invalid, and missing exams through existing guards", () => {
  const source = route();
  assert.match(source, /export async function DELETE/);
  assert.match(source, /isAdminSessionValid\(request\)/);
  assert.match(source, /if \(!isUuid\(examId\)\)/);
  assert.match(source, /await deleteExam\(examId\)/);
  assert.match(source, /repositoryErrorResponse/);
});

test("teacher delete confirmation is draft-only, locked while deleting, and returns to the list", () => {
  const source = ui();
  assert.match(source, /exam\.status === "draft"/);
  assert.match(source, /Denemeyi silmek istiyor musunuz\?/);
  assert.match(source, /Bu işlem geri alınamaz\./);
  assert.match(source, /Vazgeç/);
  assert.match(source, /Denemeyi Sil/);
  assert.match(source, /const \[deleting, setDeleting\] = useState\(false\)/);
  assert.match(source, /if \(!examId \|\| deleting\) return/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /router\.replace\("\/ogretmen\/icerik-yonetimi\/paragraf-denemeleri"\)/);
  assert.match(source, /router\.refresh\(\)/);
});

test("existing archive action remains available for published exams", () => {
  const source = ui();
  assert.match(source, /exam\.status === "published"/);
  assert.match(source, /Arşivle/);
  assert.match(source, /\/archive/);
});