import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("teacher paragraph exam routes are guarded and present", () => {
  for (const file of [
    "src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/page.tsx",
    "src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/yeni/page.tsx",
    "src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/[examId]/page.tsx",
    "src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/[examId]/onizleme/page.tsx",
  ]) assert.match(read(file), /requireTeacherSession/);
});

test("teacher UI uses existing admin APIs and no direct Supabase client", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  assert.match(source, /api\/admin\/paragraph-exams/);
  assert.match(source, /api\/admin\/paragraph-questions/);
  assert.doesNotMatch(source, /supabase\/client/);
});

test("publish preview and snapshot controls are represented", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  for (const text of ["Yayınla", "Öğretmen cevaplarını göster", "sourceQuestionId", "Denemeye Ekle", "Kopyala", "Arşivle"]) assert.match(source, new RegExp(text));
});

test("editor separates create state from persisted status actions", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  assert.match(source, /{detail && <ExamHeader/);
  assert.match(source, /createMode && !detail/);
  assert.match(source, /Önizle/);
  assert.match(source, /Çoğalt/);
  assert.match(source, /exam.status === "published".*Arşivle/);
  assert.doesNotMatch(source, /focus:border-red-500/);
  assert.match(source, /focus:border-slate-400/);
});

test("manual question form requires content and starts without a correct answer", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  assert.match(source, /correctOption: ""/);
  assert.match(source, /Doğru cevabı seçin/);
  assert.match(source, /function validateQuestion/);
  for (const message of ["Soru metni zorunludur.", "Seçenek", "String.fromCharCode(65 + index)", "Doğru seçeneği seçin."]) assert.match(source, new RegExp(message.replace(/[().+]/g, "\\$&")));
  assert.match(source, /Object\.keys\(validationErrors\)\.length > 0.*return/);
  assert.ok(source.indexOf("Object.keys(validationErrors)") < source.indexOf('"/api/admin/paragraph-exams/" + examId + "/questions"'));
});

test("manual question edit mode preserves the existing answer and passage labels stay short", () => {
  const source = read("src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx");
  assert.match(source, /correctOption: question\.correctOption/);
  assert.match(source, /passage\.label\?\.trim\(\) \|\| "Pasaj " \+ passage\.position/);
  assert.match(source, /\+ Yeni Soru/);
  assert.match(source, /Soru Bankasından/);
  assert.doesNotMatch(source, /\+ Manuel soru/);
  assert.doesNotMatch(source, /Soru bankasından kopya/);
});
test("performance migration is additive and contains only requested indexes", () => {
  const sql = read("supabase/migrations/20260918110000_add_paragraph_exam_fk_indexes.sql");
  assert.match(sql, /create index if not exists paragraph_exam_answers_question_idx/);
  assert.match(sql, /create index if not exists paragraph_exam_questions_passage_exam_idx/);
  assert.match(sql, /create index if not exists paragraph_exam_questions_source_idx/);
  assert.doesNotMatch(sql, /drop|truncate|delete|update|alter table/i);
});

test("content-management module links to paragraph exams", () => {
  assert.match(read("src/lib/content-management/modules.ts"), /paragraf-denemeleri/);
});
