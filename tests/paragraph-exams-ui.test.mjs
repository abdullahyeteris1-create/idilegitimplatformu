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
  for (const text of ["Yayınla", "Öğretmen cevaplarını göster", "sourceQuestionId", "Snapshot olarak ekle", "Kopyala", "Arşivle"]) assert.match(source, new RegExp(text));
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
