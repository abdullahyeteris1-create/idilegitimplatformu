import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseDocxFile, parseParagraphExamText, validateImportCreateInput } from "../src/lib/paragraph-exams/importer.ts";
import { normalizeQuestionOptions } from "../src/lib/paragraph-exams/validation.ts";

function textXml(text) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return "<w:p><w:r><w:t>" + escaped + "</w:t></w:r></w:p>";
}
function makeDocxFromBodyXml(bodyXml) {
  const xml = "<?xml version=\"1.0\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>" + bodyXml + "</w:body></w:document>";
  const name = Buffer.from("word/document.xml");
  const data = Buffer.from(xml);
  const local = Buffer.alloc(30 + name.length + data.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12); local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  name.copy(local, 30); data.copy(local, 30 + name.length);
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8); central.writeUInt16LE(0, 10); central.writeUInt16LE(0, 12); central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32);
  central.writeUInt32LE(0, 42); name.copy(central, 46);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, eocd]);
}
function makeDocx(text) {
  return makeDocxFromBodyXml(text.split("\n").map(textXml).join(""));
}
function makeWordRunBreakDocx() {
  const optionXml = ["A) Alpha", "B) Bravo", "C) Charlie", "D) Delta"].map((line, index) =>
    "<w:r>" + (index > 0 ? "<w:br/>" : "") + "<w:t>" + line + "</w:t></w:r>").join("");
  return makeDocxFromBodyXml([
    textXml("1. Soru"),
    textXml("Bu paragraf metni Word run ve line-break sırasını test etmek için yeterince uzundur."),
    textXml("Bu soru için doğru seçenek hangisidir?"),
    "<w:p>" + optionXml + "</w:p>",
    textXml("CEVAP ANAHTARI"),
    textXml("1 B"),
  ].join(""));
}
const variants = ["1. Soru", "2.Soru", "Soru 3.", "4) Soru", "5. Soru", "6. Soru", "7. Soru", "8. Soru", "9. Soru", "10. Soru", "11. Soru", "12. Soru", "13. Soru", "14. Soru", "15. Soru", "16. Soru", "17. Soru", "18. Soru", "19. Soru", "20. Soru"];
const letters = ["A", "B", "C", "D", "E"];
const fixture = variants.flatMap((start, index) => [
  start,
  "Türkçe paragraf " + (index + 1) + " (I) üzerinde _____ önemli bir açıklama içerir.",
  "Bu paragrafın ana düşüncesi nedir?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  ...(index === 4 ? ["E: Beşinci seçenek"] : []),
]).concat(["CEVAP ANAHTARI", ...Array.from({ length: 20 }, (_, index) => (index + 1) + " " + (index === 4 ? "E" : letters[index % 4]))]).join("\n");

test("DOCX importer parses 20-question reference-shaped fixture and maps answer key by number", async () => {
  const preview = parseParagraphExamText(fixture, "yeni-deneme.docx");
  assert.equal(preview.questionCount, 20);
  assert.equal(preview.answerCount, 20);
  assert.equal(preview.questions[0].options.length, 4);
  assert.equal(preview.questions[4].options.length, 5);
  assert.equal(preview.questions[4].correctOption, 4);
  assert.equal(preview.questions[0].correctOption, 0);
  assert.match(preview.questions[0].passageText, /\(I\)/u);
  assert.match(preview.questions[0].passageText, /_____/u);
  assert.equal(preview.questions[0].status, "ready");
  const buffer = makeDocx(fixture);
  const fromDocx = await parseDocxFile({ name: "yeni-deneme.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: buffer.length, arrayBuffer: async () => buffer });
  assert.equal(fromDocx.questionCount, 20);
  assert.equal(fromDocx.questions[4].options.length, 5);
});

test("Word run line-breaks preserve option label/content order and answer label", async () => {
  const buffer = makeWordRunBreakDocx();
  const preview = await parseDocxFile({
    name: "word-run-breaks.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: buffer.length,
    arrayBuffer: async () => buffer,
  });
  assert.deepEqual(preview.questions[0].options, ["Alpha", "Bravo", "Charlie", "Delta"]);
  assert.equal(preview.questions[0].answerLetter, "B");
  assert.equal(preview.questions[0].correctOption, 1);
  assert.equal(preview.questions[0].status, "ready");
});

test("parser marks missing/invalid answers, missing D, duplicate numbers and uncertain split", () => {
  const missing = parseParagraphExamText("1. Soru\nParagraf metni burada yeterince uzun.\nBu soru nedir?\nA) A\nB) B\nC) C\nD) D");
  assert.equal(missing.questions[0].correctOption, null);
  assert.equal(missing.questions[0].status, "review");
  const invalid = parseParagraphExamText("1. Soru\nParagraf metni burada yeterince uzun.\nBu soru nedir?\nA) A\nB) B\nC) C\nD) D\nCEVAP ANAHTARI\n1 F");
  assert.equal(invalid.questions[0].correctOption, null);
  assert.ok(invalid.questions[0].warnings.some((item) => item.code === "invalid_answer"));
  const missingD = parseParagraphExamText("1. Soru\nParagraf metni burada yeterince uzun.\nBu soru nedir?\nA) A\nB) B\nC) C\nE) E\nCEVAP ANAHTARI\n1 A");
  assert.equal(missingD.questions[0].status, "error");
  const duplicate = parseParagraphExamText("1. Soru\nUzun paragraf metni burada bulunur.\nBu soru nedir?\nA) A\nB) B\nC) C\nD) D\n1) Soru\nİkinci uzun paragraf metni burada bulunur.\nBu soru nedir?\nA) A\nB) B\nC) C\nD) D\nCEVAP ANAHTARI\n1 A");
  assert.ok(duplicate.questions.every((item) => item.warnings.some((warning) => warning.code === "duplicate_question_number")));
  const uncertain = parseParagraphExamText("1. Soru\nTek satırda kısa olmayan paragraf ve kök\nA) A\nB) B\nC) C\nD) D\nCEVAP ANAHTARI\n1 A");
  assert.ok(uncertain.questions[0].warnings.some((item) => item.code === "question_stem_uncertain"));
});

test("server create validation accepts four options, rejects E as correct when absent, and accepts E when present", () => {
  const base = { exam: { title: "İçe aktarılan deneme", gradeBand: "8", durationSeconds: 2400 }, questions: [{
    passageText: "Bu paragraf metni en az on karakter uzunluğundadır.",
    questionText: "Bu sorunun doğru cevabı hangisidir?",
    options: ["A", "B", "C", "D"], correctOption: 3, explanation: "Açıklama", category: "main_idea", difficulty: "medium",
  }] };
  assert.equal(validateImportCreateInput(base).ok, true);
  assert.equal(validateImportCreateInput({ ...base, questions: [{ ...base.questions[0], correctOption: 4 }] }).ok, false);
  assert.equal(validateImportCreateInput({ ...base, questions: [{ ...base.questions[0], options: ["A", "B", "C", "D", "E"], correctOption: 4 }] }).ok, true);
  assert.equal(validateImportCreateInput({ ...base, questions: [{ ...base.questions[0], options: ["A", "B", "C", "D", "   "], correctOption: 3 }] }).ok, true);
  const importerSource = readFileSync(new URL("../src/lib/paragraph-exams/importer.ts", import.meta.url), "utf8");
  assert.equal(importerSource.includes("supabase"), false);
});
test("malformed, oversized and macro-enabled uploads are rejected before parsing", async () => {
  const malformed = { name: "bad.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 4, arrayBuffer: async () => Buffer.from("bad!") };
  await assert.rejects(() => parseDocxFile(malformed), /DOCX/i);
  const oversized = { name: "large.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 10 * 1024 * 1024 + 1, arrayBuffer: async () => Buffer.alloc(0) };
  await assert.rejects(() => parseDocxFile(oversized), /10 MB/u);
  const macro = { name: "macro.docm", type: "application/vnd.ms-word.document.macroEnabled.12", size: 0, arrayBuffer: async () => Buffer.alloc(0) };
  await assert.rejects(() => parseDocxFile(macro), /docx|docm/iu);
});

test("existing DTO, preview/player/review and autosave paths keep option count authoritative", () => {
  assert.equal(normalizeQuestionOptions(["A", "B", "C", "D", "   "])?.length, 4);
  assert.equal(normalizeQuestionOptions(["A", "B", "C", "D", "E"])?.length, 5);
  const studentRepository = readFileSync(new URL("../src/lib/paragraph-exams/studentRepository.ts", import.meta.url), "utf8");
  assert.match(studentRepository, /selectedOption >= optionCount/u);
  const teacherPreview = readFileSync(new URL("../src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx", import.meta.url), "utf8");
  assert.match(teacherPreview, /question\.options\.map/u);
  const studentUi = readFileSync(new URL("../src/app/ogrenci/paragraf-denemeleri/StudentParagraphExamsClient.tsx", import.meta.url), "utf8");
  assert.match(studentUi, /question\.options\.map/u);
  assert.match(studentUi, /review\.options\.map/u);
});

test("import creation compensates all partial writes when question creation fails", async () => {
  const { createImportedDraftExam } = await import("../src/lib/paragraph-exams/repository.ts");
  const rows = { exams: [], passages: [], questions: [] };
  let cleanupCalls = 0;
  let questionCalls = 0;
  const dependencies = {
    createExam: async () => { rows.exams.push("exam"); return { id: "exam-1" }; },
    upsertPassage: async (_examId, _passageId, input) => { const id = "passage-" + (rows.passages.length + 1); rows.passages.push({ id, ...input }); return { id }; },
    upsertQuestion: async (_examId, _questionId, input) => { questionCalls += 1; if (questionCalls === 2) throw new Error("question failure"); rows.questions.push(input); return { id: "question-1" }; },
    deleteExam: async () => { cleanupCalls += 1; rows.exams.length = 0; rows.passages.length = 0; rows.questions.length = 0; },
  };
  const question = { passageText: "Bu test paragrafı yeterince uzundur.", questionText: "Hangisidir?", options: ["A", "B", "C", "D"], correctOption: 0, explanation: "Açıklama", category: "main_idea", difficulty: "medium", position: 1 };
  await assert.rejects(() => createImportedDraftExam({ title: "Test", gradeBand: "8", durationSeconds: 600 }, [question, { ...question, position: 2 }], "test", dependencies), /question failure/u);
  assert.equal(cleanupCalls, 1);
  assert.deepEqual(rows, { exams: [], passages: [], questions: [] });
});
