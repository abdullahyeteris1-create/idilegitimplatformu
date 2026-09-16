import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregateParagraphAnalytics } from "../src/lib/paragraph-exercises/paragraphAnalytics.ts";

const metadata = [{ id: "q-options", category: "main_idea", difficulty: "medium", gradeBand: "6-7", question: "Seçenekli soru", source: "migration", correctIndex: 2, options: ["A metni", "B metni", "C metni", "D metni", "E metni"] }];

const answer = (selectedIndex, correct = selectedIndex === 2) => ({ questionId: "q-options", selectedIndex, correct, responseTimeMs: 1500 });

test("selectedIndex creates A-E optionStats with canonical correctness and deterministic wrong choice", () => {
  const answers = [3, 3, 3, 3, 3, 0, 1, 2, 2, 2].map((index) => answer(index));
  const result = aggregateParagraphAnalytics(metadata, [{ details: { answers } }]);
  const row = result.questions.find((item) => item.questionId === "q-options");
  assert.deepEqual(row?.optionStats.map((option) => [option.label, option.selectionCount]), [["A", 1], ["B", 1], ["C", 3], ["D", 5], ["E", 0]]);
  assert.equal(row?.optionStats[2].isCorrectOption, true);
  assert.equal(row?.optionStats[2].optionText, "C metni");
  assert.equal(row?.optionTrackedAttemptCount, 10);
  assert.equal(row?.mostSelectedWrongOption?.label, "D");
  assert.equal(row?.mostSelectedWrongOption?.selectionRate, 50);
  assert.equal(row?.distractorQualitySignal, "Belirli bir çeldiricide yoğunlaşma var");
  assert.equal(result.kpis.optionTrackedAnswers, 10);
  assert.equal(result.kpis.optionCoverageRate, 100);
});

test("ties use lower optionIndex and legacy or invalid selectedIndex is excluded", () => {
  const result = aggregateParagraphAnalytics(metadata, [{ details: { answers: [
    ...Array.from({ length: 5 }, () => answer(0, false)),
    ...Array.from({ length: 5 }, () => answer(1, false)),
    { questionId: "q-options", correct: true, responseTimeMs: 1500 },
    { questionId: "q-options", selectedIndex: -1, correct: false, responseTimeMs: 1500 },
    { questionId: "q-options", selectedIndex: 5, correct: false, responseTimeMs: 1500 },
    { questionId: "q-options", selectedIndex: 1.5, correct: false, responseTimeMs: 1500 },
    { questionId: "q-options", selectedIndex: "1", correct: false, responseTimeMs: 1500 },
  ] } }]);
  const row = result.questions.find((item) => item.questionId === "q-options");
  assert.equal(row?.optionTrackedAttemptCount, 10);
  assert.equal(row?.mostSelectedWrongOption?.label, "A");
  assert.equal(result.diagnostics.legacySelectedIndexCount, 1);
  assert.equal(result.diagnostics.invalidSelectedIndexCount, 4);
  assert.equal(result.kpis.optionCoverageRate, 66.7);
});

test("distractor quality thresholds are evaluated only at ten tracked attempts and exempt the correct option", () => {
  const answers = [
    ...Array.from({ length: 4 }, () => answer(0, true)),
    ...Array.from({ length: 1 }, () => answer(2, false)),
    ...Array.from({ length: 4 }, () => answer(3, false)),
    ...Array.from({ length: 11 }, () => answer(4, false)),
  ];
  const result = aggregateParagraphAnalytics([{ ...metadata[0], id: "q-flags", correctIndex: 0 }], [{ details: { answers: answers.map((item) => ({ ...item, questionId: "q-flags" })) } }]);
  const row = result.questions.find((item) => item.questionId === "q-flags");
  assert.equal(row?.optionTrackedAttemptCount, 20);
  assert.equal(row?.optionStats[0].distractorQualityFlag, null);
  assert.equal(row?.optionStats[1].distractorQualityFlag, "never-selected");
  assert.equal(row?.optionStats[2].distractorQualityFlag, "working");
  assert.equal(row?.optionStats[3].distractorQualityFlag, "strong");
  assert.equal(row?.optionStats[4].distractorQualityFlag, "strong");
});

test("zero tracked attempts keep rates and distractor flags null and do not expose student data", () => {
  const result = aggregateParagraphAnalytics(metadata, [{ studentId: "student-secret", details: { answers: [{ questionId: "q-options", correct: true, responseTimeMs: 1500 }] } }]);
  const row = result.questions.find((item) => item.questionId === "q-options");
  assert.equal(row?.optionTrackedAttemptCount, 0);
  assert.equal(row?.optionStats.every((option) => option.selectionRate === null && option.distractorQualityFlag === null), true);
  assert.equal(row?.mostSelectedWrongOption, null);
  assert.equal(result.kpis.optionCoverageRate, 0);
  assert.doesNotMatch(JSON.stringify(result), /student-secret/u);
});

test("save and presentation contracts preserve selectedIndex without sending PII", async () => {
  const studentClient = await readFile("src/app/egzersizler/paragraf-calismalari/ParagraphExercisesClient.tsx", "utf8");
  const resultsRoute = await readFile("src/app/api/student/results/route.ts", "utf8");
  const analyticsClient = await readFile("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/analiz/ParagraphAnalyticsClient.tsx", "utf8");
  assert.ok(studentClient.includes("selectedIndex: answers[item.id].selected"));
  assert.ok(resultsRoute.includes("item.selectedIndex !== undefined"));
  assert.ok(resultsRoute.includes("Number.isInteger(item.selectedIndex)"));
  assert.ok(resultsRoute.includes("item.selectedIndex < 0"));
  assert.ok(resultsRoute.includes("item.selectedIndex > 4"));
  assert.match(analyticsClient, /optionTrackedAttemptCount/);
  assert.match(analyticsClient, /En çok seçilen yanlış/);
  assert.match(analyticsClient, /En Güçlü Çeldiriciler/);
  assert.match(analyticsClient, /Hiç Seçilmeyen Çeldiriciler/);
  assert.match(analyticsClient, /Şık verisi filtresi/);
  assert.doesNotMatch(analyticsClient, /studentId|student_name|email|phone/u);
});