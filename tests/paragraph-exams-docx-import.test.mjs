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

test("shared marker smoke test", () => {
  const input = [
    "7, 8, 9 ve 10. sorular aşağıdaki metinlere göre cevaplanacaktır.",
    "Ortak veri metni burada yeterince uzun ve korunmalıdır.",
    "7. Bu soru nedir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "8. Bu soru nedir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "9. Bu soru nedir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "10. Bu soru nedir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "CEVAP ANAHTARI", "7 A 8 A 9 A 10 A",
  ].join(String.fromCharCode(10));
  const preview = parseParagraphExamText(input);
  assert.deepEqual(preview.sharedGroups[0].questionNumbers, [7, 8, 9, 10]);
  assert.equal(new Set(preview.questions.map((question) => question.sharedGroupId)).size, 1);
  assert.deepEqual(preview.questions[0].options, ["Bir", "İki", "Üç", "Dört"]);
});
test("shared passage groups preserve content, options, answer keys, and independent questions", () => {
  const input = [
    "6. Bağımsız soru", "Bağımsız paragraf metni burada yeterince uzun ve anlamlıdır.", "Bu paragrafın ana düşüncesi nedir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "7, 8, 9 ve 10. sorular aşağıdaki metinlere göre cevaplanacaktır.",
    "A. Mersin sanayi ve liman verileriyle tanıtılır.", "B. Antalya turizm ve nüfus verileriyle tanıtılır.", "C. İzmir ticaret ve kültür verileriyle tanıtılır.",
    "7. Bu şehirlerin ortak özelliği nedir?", "A) En büyük geliri sanayi sektöründen elde etmeleri", "B) Uluslararası organizasyonlara ev sahipliği yapmaları", "C) Turizmin gelişmiş olması", "D) Deniz kıyısında yer almaları",
    "8. Verilen bilgilere göre hangisi söylenebilir?", "A) I.", "B) II.", "C) III.", "D) IV.",
    "9. Bu metinlerden hangisine ulaşılamaz?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "10. Metinlerin ortak sonucu hangisidir?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "15 ve 16. sorular aşağıdaki verilere göre cevaplanacaktır.",
    "Kişiler: Ayşe, Berk ve Ceren.", "Yerleştirme kuralları: Her kişi panoda farklı yere yerleştirilir.", "Pano layout bilgisi: Dört sıra ve iki sütun vardır.",
    "15. Buna göre hangisi kesinlikle doğrudur?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "16. Yukarıdaki pano yerleştirme verilerine göre hangisi doğrudur?", "A) Bir", "B) İki", "C) Üç", "D) Dört",
    "CEVAP ANAHTARI", "6 A 7 A 8 C 9 D 10 D 15 D 16 B",
  ].join(String.fromCharCode(10));
  const preview = parseParagraphExamText(input);
  assert.equal(preview.questionCount, 7);
  assert.equal(preview.answerCount, 7);
  assert.equal(preview.sharedGroups.length, 2);
  assert.deepEqual(preview.sharedGroups[0].questionNumbers, [7, 8, 9, 10]);
  assert.deepEqual(preview.sharedGroups[1].questionNumbers, [15, 16]);
  const groupOne = preview.questions.filter((question) => [7, 8, 9, 10].includes(question.number));
  const groupTwo = preview.questions.filter((question) => [15, 16].includes(question.number));
  assert.equal(new Set(groupOne.map((question) => question.sharedGroupId)).size, 1);
  assert.equal(new Set(groupTwo.map((question) => question.sharedGroupId)).size, 1);
  assert.match(groupOne[0].passageText, /Mersin/u);
  assert.match(groupOne[0].passageText, /Antalya/u);
  assert.match(groupOne[0].passageText, /İzmir/u);
  assert.equal(groupOne[0].options.some((option) => /Mersin|Antalya|İzmir/u.test(option)), false);
  assert.deepEqual(groupOne[0].options, ["En büyük geliri sanayi sektöründen elde etmeleri", "Uluslararası organizasyonlara ev sahipliği yapmaları", "Turizmin gelişmiş olması", "Deniz kıyısında yer almaları"]);
  assert.equal(groupOne[1].options[2], "III.");
  assert.match(groupTwo[1].questionText, /Yukarıdaki pano yerleştirme verilerine göre/u);
  assert.equal(preview.questions.find((question) => question.number === 6)?.sharedGroupId, null);
  assert.deepEqual(preview.questions.map((question) => question.answerLetter), ["A", "A", "C", "D", "D", "D", "B"]);
});

test("shared marker range and reverse wording variants are extracted", () => {
  const variants = [
    ["7-10. sorular aşağıdaki metne göre cevaplanacaktır.", [7, 8, 9, 10]],
    ["7–10. sorular aşağıdaki metne göre cevaplanacaktır.", [7, 8, 9, 10]],
    ["7 ile 10. sorular aşağıdaki metne göre cevaplanacaktır.", [7, 8, 9, 10]],
    ["7\u0027den 10\u0027a sorular aşağıdaki metne göre cevaplanacaktır.", [7, 8, 9, 10]],
    ["Aşağıdaki metne göre 5 ve 6. soruları cevaplayınız.", [5, 6]],
  ];
  for (const [marker, numbers] of variants) {
    const questions = numbers.map((number) => number + ". Bu soru nedir?\nA) Bir\nB) İki\nC) Üç\nD) Dört").join("\n");
    const answers = numbers.map((number) => number + " A").join(" ");
    const preview = parseParagraphExamText(marker + "\nOrtak veri metni burada yeterince uzun ve korunmalıdır.\n" + questions + "\nCEVAP ANAHTARI\n" + answers);
    assert.deepEqual(preview.sharedGroups[0].questionNumbers, numbers);
    assert.equal(preview.sharedGroups[0].passageText.includes("Ortak veri"), true);
  }
});

test("real DOCX marker prefixes, Turkish answer heading, and inline answers are preserved", () => {
  const input = [
    "7. 7, 8, 9 ve 10. sorular aşağıdaki metinlere göre cevaplanacaktır.",
    "A. Mersin bölümü.",
    "B. Antalya bölümü.",
    "C. İzmir bölümü.",
    "Bu metinlerden hangisi söylenemez?",
    "A) Birinci seçenek",
    "B) İkinci seçenek",
    "C) Üçüncü seçenek",
    "D) Dördüncü seçenek",
    "Doğru cevap: A",
    "8. Bu metinler birlikte değerlendirildiğinde hangisi doğrudur?",
    "A) Birinci seçenek", "B) İkinci seçenek", "C) Üçüncü seçenek", "D) Dördüncü seçenek",
    "Doğru cevap: C",
    "9. Hangisine ulaşılabilir?",
    "A) Birinci seçenek", "B) İkinci seçenek", "C) Üçüncü seçenek", "D) Dördüncü seçenek",
    "Doğru cevap: D",
    "10. Hangisi yanlıştır?",
    "A) Birinci seçenek", "B) İkinci seçenek", "C) Üçüncü seçenek", "D) Dördüncü seçenek",
    "Doğru cevap: D",
    "15. 15 ve 16. sorular aşağıdaki verilere göre cevaplanacaktır.",
    "Sait Faik Abasıyanık, Halide Edip Adıvar, Orhan Veli, Albert Einstein, Aziz Sancar, Afife Jale, Sabiha Gökçen.",
    "Pano yerleşimi ve kurallar burada açıklanmıştır.",
    "Verilerden hareketle hangisi kesinlikle yanlıştır?",
    "A) Birinci seçenek", "B) İkinci seçenek", "C) Üçüncü seçenek", "D) Dördüncü seçenek",
    "Doğru cevap: D",
    "16. Yukarıdaki pano verilerine göre hangisi doğrudur?",
    "A) Birinci seçenek", "B) İkinci seçenek", "C) Üçüncü seçenek", "D) Dördüncü seçenek",
    "Doğru cevap: B",
    "Cevap Anahtarı",
    "7-A 8-C 9-D 10-D 15-D 16-B",
  ].join("\n");
  const preview = parseParagraphExamText(input);
  assert.equal(preview.questionCount, 6);
  assert.equal(preview.answerCount, 6);
  assert.deepEqual(preview.sharedGroups.map((group) => group.questionNumbers), [[7, 8, 9, 10], [15, 16]]);
  assert.deepEqual(preview.questions.map((question) => question.number), [7, 8, 9, 10, 15, 16]);
  assert.deepEqual(preview.questions.map((question) => question.answerLetter), ["A", "C", "D", "D", "D", "B"]);
  assert.equal(preview.questions.every((question) => question.options.length === 4), true);
  assert.equal(preview.questions[0].options.some((option) => /Mersin|Antalya|İzmir/u.test(option)), false);
  assert.match(preview.questions[0].passageText, /Mersin[\s\S]*Antalya[\s\S]*İzmir/u);
  assert.match(preview.questions[4].passageText, /Sait Faik Abasıyanık[\s\S]*Sabiha Gökçen/u);
  assert.equal(preview.questions.some((question) => question.options.some((option) => option.includes("Cevap Anahtarı"))), false);
  assert.deepEqual(preview.warnings, []);
});
test("ambiguous shared marker produces a warning instead of inventing a group", () => {
  const preview = parseParagraphExamText("Aşağıdaki metne göre soruları cevaplayınız.\n1. Bu soru nedir?\nUzun bağımsız metin burada bulunur.\nA) Bir\nB) İki\nC) Üç\nD) Dört\nCEVAP ANAHTARI\n1 A");
  assert.equal(preview.sharedGroups.length, 0);
  assert.ok(preview.warnings.some((item) => item.code === "shared_marker_ambiguous"));
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

test("shared import groups create one passage row and reuse its id", async () => {
  const { createImportedDraftExam } = await import("../src/lib/paragraph-exams/repository.ts");
  const passages = [];
  const questions = [];
  const dependencies = {
    createExam: async () => ({ id: "exam-1" }),
    upsertPassage: async (_examId, _passageId, input) => {
      passages.push(input);
      return { id: "passage-" + passages.length, passageText: input.passageText };
    },
    upsertQuestion: async (_examId, _questionId, input) => {
      questions.push(input);
      return { id: "question-" + questions.length };
    },
    deleteExam: async () => { throw new Error("unexpected cleanup"); },
  };
  const base = { passageText: "Ortak pasaj metni burada yeterince uzundur.", questionText: "Bu soru nedir?", options: ["A", "B", "C", "D"], correctOption: 0, explanation: "Açıklama", category: "main_idea", difficulty: "medium" };
  await createImportedDraftExam(
    { title: "Shared", gradeBand: "8", durationSeconds: 600 },
    [
      { ...base, position: 7, sharedGroupId: "shared-1" },
      { ...base, position: 8, sharedGroupId: "shared-1" },
      { ...base, position: 9 },
    ],
    "teacher",
    dependencies,
  );
  assert.equal(passages.length, 2);
  assert.equal(passages[0].label, "Ortak içerik");
  assert.deepEqual(questions.map((question) => question.passageId), ["passage-1", "passage-1", "passage-2"]);
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
