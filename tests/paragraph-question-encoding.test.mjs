import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const files = [
  "src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/ParagraphQuestionsAdminClient.tsx",
  "src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/ParagraphQuestionAIGenerator.tsx",
  "src/app/api/admin/paragraph-questions/generate/route.ts",
  "src/lib/paragraph-exercises/paragraphQuestions.ts",
  "supabase/migrations/20260914120000_create_paragraph_questions.sql",
];
const mojibake = /(?:Ãƒ|Ã„|Ã…|Ã‚|Ã¢|Ã|Ä|Å|Â|ï¿½)/u;

test("paragraph question sources contain canonical Turkish UTF-8", () => {
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, mojibake, file);
  }
});

test("paragraph question sources retain key Turkish strings", () => {
  const admin = fs.readFileSync(files[0], "utf8");
  const ai = fs.readFileSync(files[1], "utf8");
  const bank = fs.readFileSync(files[3], "utf8");
  assert.match(admin, /Arşivle|Düzenle|Doğru seçenek/u);
  assert.match(ai, /Yapay Zekâ ile Soru Üret/u);
  assert.match(bank, /Parçanın|öğrenc/u);
});
