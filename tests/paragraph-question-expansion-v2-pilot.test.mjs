import test from "node:test";
import assert from "node:assert/strict";
import { paragraphQuestionExpansionV2Pilot, v2PilotTarget } from "../data/paragraph-question-expansion-v2-pilot.mjs";
import { report } from "../scripts/validate-paragraph-question-expansion-v2-pilot.mjs";
import { report as consistencyReport } from "../scripts/validate-paragraph-question-consistency-v2-pilot.mjs";

test("V2 pilot contains exactly five questions per requested grade", () => {
  assert.equal(paragraphQuestionExpansionV2Pilot.length, 15);
  for (const [grade, target] of Object.entries(v2PilotTarget)) assert.equal(report.byGrade[grade], target);
  assert.equal(report.byGrade["6-7"], undefined);
});

test("V2 pilot has one question per category in each grade", () => {
  for (const grade of Object.keys(v2PilotTarget)) {
    const rows = paragraphQuestionExpansionV2Pilot.filter((item) => item.grade_band === grade);
    assert.deepEqual(rows.map((item) => item.category).sort(), ["completion", "flow", "inference", "main_idea", "supporting_idea"]);
  }
});

test("V2 pilot passes structural and encoding gates", () => {
  assert.equal(report.errors.length, 0);
  assert.equal(report.invalidOptionCount, 0);
  assert.equal(report.invalidCorrectIndexCount, 0);
  assert.equal(report.mojibakeCount, 0);
  assert.equal(report.forbiddenTemplateCount, 0);
  assert.deepEqual(report.suspiciousAbsoluteLanguage, []);
  assert.equal(report.sentenceDuplicateCount, 0);
  assert.deepEqual(report.suspiciousSentenceSimilarity, []);
});

test("V2 pilot has no local duplicate or static-bank overlap", () => {
  assert.equal(report.exactDuplicateIds, 0);
  assert.equal(report.exactDuplicatePassages, 0);
  assert.equal(report.exactDuplicateQuestions, 0);
  assert.equal(report.fingerprintDuplicates, 0);
  assert.deepEqual(report.staticOverlap, []);
});

test("V2 pilot keeps answer positions valid after semantic repairs", () => {
  assert.deepEqual(report.correctIndex, [3, 3, 5, 2, 2]);
  for (const grade of Object.keys(v2PilotTarget)) {
    const positions = paragraphQuestionExpansionV2Pilot
      .filter((item) => item.grade_band === grade)
      .map((item) => item.correct_index)
      .every((position) => position >= 0 && position <= 4);
    assert.equal(positions, true);
  }
});

test("V2 pilot answer keys and explanations are semantically consistent", () => {
  assert.equal(consistencyReport.answerKeyMismatchCount, 0);
  assert.equal(consistencyReport.explanationMismatchCount, 0);
  assert.equal(consistencyReport.flowNumeralMismatchCount, 0);
  assert.equal(consistencyReport.approveCount, 15);
  assert.equal(consistencyReport.rejectCount, 0);
});
