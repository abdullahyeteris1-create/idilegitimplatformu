import test from "node:test";
import assert from "node:assert/strict";
import { paragraphQuestions, PARAGRAPH_CATEGORIES, selectParagraphQuestions } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";
import { calculateAverageResponseTimeMs, calculateParagraphAccuracy } from "../src/lib/paragraph-exercises/paragraphExerciseMetrics.ts";
import { readFile } from "node:fs/promises";

const seeded = () => { let value = 7; return () => { value = (value * 31 + 11) % 997; return value / 997; }; };
test("paragraf soru bankası 60 soruyu beş kategoriye dengeli dağıtır", () => {
  assert.equal(paragraphQuestions.length, 60);
  for (const category of ["main_idea", "supporting_idea", "inference", "completion", "flow"]) assert.equal(paragraphQuestions.filter((q) => q.category === category).length, 12);
  assert.equal(new Set(paragraphQuestions.map((q) => q.id)).size, 60);
});
test("kategori ve karma seçimleri 10 benzersiz soru döndürür", () => {
  for (const category of ["main_idea", "supporting_idea", "inference", "completion", "flow", "mixed"]) {
    const selected = selectParagraphQuestions(category, 10, seeded());
    assert.equal(selected.length, 10);
    assert.equal(new Set(selected.map((q) => q.id)).size, 10);
    if (category === "mixed") for (const source of ["main_idea", "supporting_idea", "inference", "completion", "flow"]) assert.equal(selected.filter((q) => q.category === source).length, 2);
  }
});
test("route altı kartı ve tek cevap davranışını içerir", async () => {
  const client = await readFile(new URL("../src/app/egzersizler/paragraf-calismalari/ParagraphExercisesClient.tsx", import.meta.url), "utf8");
  assert.equal(PARAGRAPH_CATEGORIES.length, 6);
  assert.match(client, /if \(!question \|\| answer \|\| answeredIds\.current\.has\(question\.id\)\) return/);
  assert.match(client, /responseTimeMs/);
  assert.match(client, /ExerciseEndScreenActions/);
});
test("sonuç metrikleri 10, 8 ve 0 doğru örneklerinde doğru hesaplanır", () => {
  assert.equal(calculateParagraphAccuracy(10, 10), 100);
  assert.equal(calculateParagraphAccuracy(8, 10), 80);
  assert.equal(calculateParagraphAccuracy(0, 10), 0);
  assert.equal(calculateAverageResponseTimeMs([1000, 2000, 3000, 4000], 4), 2500);
  assert.equal(calculateAverageResponseTimeMs([], 0), 0);
});
test("60 sorunun yapısal sözleşmesi geçerlidir", () => {
  for (const question of paragraphQuestions) {
    assert.equal(question.options.length, 5);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length);
    assert.ok(question.paragraph.trim() && question.question.trim() && question.explanation.trim());
    assert.match(question.gradeBand, /^(4-5|6-7|8|high-school)$/);
  }
});
test("paragraflar ve sorular tekrarsız, doğru cevaplar dengelidir", () => {
  assert.equal(new Set(paragraphQuestions.map((q) => q.paragraph)).size, 60);
  assert.equal(new Set(paragraphQuestions.map((q) => q.question)).size, 60);
  const counts = paragraphQuestions.reduce((result, question) => { result[question.correctIndex] += 1; return result; }, [0, 0, 0, 0, 0]);
  assert.deepEqual(counts, [12, 12, 12, 12, 12]);
});
test("kayıt hatası görünür, yeniden kayıt aynı payload ile yapılır ve cevap detayları taşınır", async () => {
  const client = await readFile(new URL("../src/app/egzersizler/paragraf-calismalari/ParagraphExercisesClient.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/app/api/student/results/route.ts", import.meta.url), "utf8");
  assert.match(client, /Sonucun kaydedilemedi/);
  assert.match(client, /Tekrar Kaydet/);
  assert.match(client, /pendingPayload/);
  assert.match(client, /answers:/);
  assert.match(api, /answers: \{ type: "array"/);
});
