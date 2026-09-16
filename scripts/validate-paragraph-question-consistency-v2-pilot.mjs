import { paragraphQuestionExpansionV2Pilot } from "../data/paragraph-question-expansion-v2-pilot.mjs";

const letters = ["A", "B", "C", "D", "E"];
const expectedCorrectIndex = {
  "v2-4-5-main_idea-01": 2,
  "v2-4-5-supporting_idea-01": 1,
  "v2-4-5-inference-01": 0,
  "v2-4-5-completion-01": 2,
  "v2-4-5-flow-01": 4,
  "v2-8-main_idea-01": 0,
  "v2-8-supporting_idea-01": 1,
  "v2-8-inference-01": 2,
  "v2-8-completion-01": 3,
  "v2-8-flow-01": 4,
  "v2-hs-main_idea-01": 0,
  "v2-hs-supporting_idea-01": 1,
  "v2-hs-inference-01": 2,
  "v2-hs-completion-01": 3,
  "v2-hs-flow-01": 2,
};
const expectedFlowNumeral = {
  "v2-4-5-flow-01": "IV",
  "v2-8-flow-01": "III",
  "v2-hs-flow-01": "IV",
};
const rows = paragraphQuestionExpansionV2Pilot;
const explanationLetter = (value) => value.match(/^([A-E])\s+seçeneği/u)?.[1] ?? null;
const explanationFlowNumeral = (value) => value.match(/\b([IVX]+)\. cümle/u)?.[1] ?? null;

const details = rows.map((row) => {
  const expectedIndex = expectedCorrectIndex[row.id];
  const displayedAnswer = letters[row.correct_index] ?? "?";
  const semanticAnswer = letters[expectedIndex] ?? "?";
  const isFlow = row.category === "flow";
  const explanationAgrees = isFlow
    ? explanationFlowNumeral(row.explanation) === row.options[row.correct_index]
    : explanationLetter(row.explanation) === displayedAnswer;
  const flowNumeralAgrees = !isFlow
    ? true
    : row.options[row.correct_index] === expectedFlowNumeral[row.id]
      && explanationFlowNumeral(row.explanation) === expectedFlowNumeral[row.id];
  return {
    id: row.id,
    correct_index: row.correct_index,
    displayed_answer: displayedAnswer,
    semantic_answer: semanticAnswer,
    explanation_agrees: explanationAgrees,
    flow_numeral_agrees: flowNumeralAgrees,
    pass: row.correct_index === expectedIndex && explanationAgrees && flowNumeralAgrees,
  };
});

const report = {
  total: rows.length,
  answerKeyMismatchCount: details.filter((item) => item.correct_index !== expectedCorrectIndex[item.id]).length,
  explanationMismatchCount: details.filter((item) => !item.explanation_agrees).length,
  flowNumeralMismatchCount: details.filter((item) => !item.flow_numeral_agrees).length,
  distribution: rows.reduce((result, row) => {
    const letter = letters[row.correct_index];
    result[letter] = (result[letter] ?? 0) + 1;
    return result;
  }, { A: 0, B: 0, C: 0, D: 0, E: 0 }),
  approveCount: details.filter((item) => item.pass).length,
  rejectCount: details.filter((item) => !item.pass).length,
  details,
};

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`total=${report.total}`);
  console.log(`answer_key_mismatches=${report.answerKeyMismatchCount}`);
  console.log(`explanation_mismatches=${report.explanationMismatchCount}`);
  console.log(`flow_numeral_mismatches=${report.flowNumeralMismatchCount}`);
  console.log(`distribution=${JSON.stringify(report.distribution)}`);
  console.log(`approve=${report.approveCount} reject=${report.rejectCount}`);
  for (const item of details) console.log(`${item.id} index=${item.correct_index} displayed=${item.displayed_answer} semantic=${item.semantic_answer} explanation=${item.explanation_agrees ? "yes" : "no"} flow=${item.flow_numeral_agrees ? "yes" : "no"} ${item.pass ? "PASS" : "FAIL"}`);
}

if (report.answerKeyMismatchCount || report.explanationMismatchCount || report.flowNumeralMismatchCount || report.approveCount !== 15 || report.rejectCount !== 0) process.exitCode = 1;

export { report, expectedCorrectIndex, expectedFlowNumeral };
