import assert from "node:assert/strict";
import { readFile as read } from "node:fs/promises";
import test from "node:test";

import {
  createQuestionContentFingerprint,
  validateQuestionInput,
} from "../src/lib/paragraph-exercises/paragraphQuestionAdminRepository.ts";
import { parseQuestionBankText } from "../src/lib/paragraph-exercises/paragraphQuestionBankImporter.ts";

const fixture = [
  "1. Normal soru",
  "Türkçe karakterleri içeren yeterince uzun bir paragraf metni burada bulunur.",
  "Bu paragrafın ana düşüncesi nedir?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "2. Bağımsız soru hangisidir?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "7 ve 8. sorular aşağıdaki metne göre cevaplanacaktır.",
  "Paylaşılan metin iki sorunun da bağımsız olarak kullanılabilmesini sağlayacak kadar uzundur.",
  "7. Paylaşılan metne göre hangisi doğrudur?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "8. Paylaşılan metne göre hangisi yanlıştır?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "5. Beş seçenekli soru hangisidir?",
  "Bu soru için ayrı ve yeterince uzun bir paragraf metni bulunur.",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "E) Beşinci seçenek",
  "6. Satır kırılması olan soru hangisidir?",
  "Bu paragraf satır kırılması ve Türkçe karakterlerle birlikte test edilir.",
  "Bu sorunun doğru cevabı hangisidir?",
  "A) Birinci seçenek",
  "B) İkinci seçenek",
  "C) Üçüncü seçenek",
  "D) Dördüncü seçenek",
  "CEVAP ANAHTARI",
  "1-A 2-B 5-E 6-A 7-C 8-D",
].join("\n");

const base = {
  passage: "Bu paragraf soru bankası için yeterince uzun bir içeriktir.",
  question: "Bu sorunun doğru cevabı hangisidir?",
  options: ["Birinci", "İkinci", "Üçüncü", "Dördüncü"],
  correctIndex: 0,
  explanation: "Doğru seçenek metindeki bilgileri karşılar.",
  category: "main_idea",
  difficulty: "medium",
  gradeBand: "6-7",
};

test("question-bank parser reuses exam parser behavior for six realistic questions", () => {
  const preview = parseQuestionBankText(fixture);
  assert.equal(preview.questionCount, 6);
  assert.equal(preview.answerCount, 6);
  assert.equal(preview.errorCount, 0);
  assert.deepEqual(preview.questions.map((question) => question.answerLetter), ["A", "B", "C", "D", "E", "A"]);
  assert.equal(preview.questions[1].passageText, "");
  assert.equal(preview.questions[1].status, "ready");
  assert.equal(preview.questions[4].options.length, 5);
  assert.equal(preview.questions[4].correctOption, 4);
  assert.deepEqual(preview.sharedGroups[0].questionNumbers, [7, 8]);
  assert.equal(new Set(preview.questions.filter((question) => question.sharedGroupId).map((question) => question.passageText)).size, 1);
});

test("missing and invalid answers become blocking errors for bank import", () => {
  const missing = parseQuestionBankText("1. Soru\nBu bağımsız soru metni yeterince uzun ve geçerlidir?\nA) Bir\nB) İki\nC) Üç\nD) Dört");
  assert.equal(missing.questions[0].status, "error");
  const invalid = parseQuestionBankText("1. Soru\nBu bağımsız soru metni yeterince uzun ve geçerlidir?\nA) Bir\nB) İki\nC) Üç\nD) Dört\nCEVAP ANAHTARI\n1-F");
  assert.equal(invalid.questions[0].status, "error");
});

test("standalone and four-option questions pass only the import-specific server validator", () => {
  assert.equal(validateQuestionInput({ ...base, passage: "", options: ["A", "B", "C", "D"] }).ok, false);
  assert.equal(validateQuestionInput({ ...base, passage: "", options: ["A", "B", "C", "D"] }, { allowEmptyPassage: true, allowFourOptions: true }).ok, true);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C", "D"], correctIndex: 3 }, { allowFourOptions: true }).ok, true);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C", "D"], correctIndex: 4 }, { allowFourOptions: true }).ok, false);
});

test("duplicate detection fingerprint normalizes exact content without fuzzy matching", () => {
  const a = createQuestionContentFingerprint(base);
  const b = createQuestionContentFingerprint({ ...base, passage: "  Bu   paragraf soru bankası için yeterince uzun bir içeriktir. " });
  assert.equal(a, b);
  assert.notEqual(a, createQuestionContentFingerprint({ ...base, options: ["Başka", "İkinci", "Üçüncü", "Dördüncü"] }));
});

test("selective import and atomic bulk contract are server-backed", async () => {
  const route = await read("src/app/api/admin/paragraph-questions/import/create/route.ts", "utf8");
  const repository = await read("src/lib/paragraph-exercises/paragraphQuestionAdminRepository.ts", "utf8");
  const page = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/page.tsx", "utf8");
  const parser = await read("src/lib/paragraph-exercises/paragraphQuestionBankImporter.ts", "utf8");
  const client = await read("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/ice-aktar/QuestionBankImportClient.tsx", "utf8");
  assert.match(route, /validateQuestionInput/);
  assert.match(route, /createQuestionsBulk/);
  assert.match(repository, /const rows = inputs\.map/);
  assert.match(repository, /\.insert\(rows\)\.select\(fields\)/);
  assert.doesNotMatch(route, /createQuestion\(/);
  assert.match(parser, /parseDocxFile/);
  assert.match(page, /paragraf-sorulari\/ice-aktar/);
  assert.match(client, /Seçili Soruları Soru Bankasına Ekle/);
  assert.match(client, /setSelected/);
});
