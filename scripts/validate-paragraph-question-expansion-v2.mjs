import crypto from "node:crypto";
import { paragraphQuestionExpansionV2, paragraphQuestionExpansionV2PilotIds } from "../data/paragraph-question-expansion-v2.mjs";
import { paragraphQuestionExpansionV2Pilot } from "../data/paragraph-question-expansion-v2-pilot.mjs";
import { paragraphQuestions } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";

const letters = ["A", "B", "C", "D", "E"];
const grades = ["4-5", "8", "high-school"];
const categories = ["main_idea", "supporting_idea", "inference", "completion", "flow"];
const difficulties = ["easy", "medium", "hard"];
const normalize = (value) => String(value).trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR");
const tokens = (value) => new Set(normalize(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
const fingerprint = (item) => [item.category, item.difficulty, item.grade_band, normalize(item.passage), normalize(item.question), item.options.map(normalize).join("\u001f"), String(item.correct_index)].join("\u001e");
const hashRows = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
const duplicateCount = (values) => values.length - new Set(values).size;
const countBy = (items, key) => items.reduce((out, item) => { out[item[key]] = (out[item[key]] ?? 0) + 1; return out; }, {});
const errors = [];
const rows = paragraphQuestionExpansionV2;

for (const item of rows) {
  if (!grades.includes(item.grade_band)) errors.push(`${item.id}: invalid grade_band`);
  if (!categories.includes(item.category)) errors.push(`${item.id}: invalid category`);
  if (!difficulties.includes(item.difficulty)) errors.push(`${item.id}: invalid difficulty`);
  if (!item.id || typeof item.passage !== "string" || !item.passage.trim()) errors.push(`${item.id}: empty passage`);
  if (typeof item.question !== "string" || !item.question.trim()) errors.push(`${item.id}: empty question`);
  if (!Array.isArray(item.options) || item.options.length !== 5) errors.push(`${item.id}: options length`);
  if (Array.isArray(item.options) && new Set(item.options.map(normalize)).size !== 5) errors.push(`${item.id}: duplicate options`);
  if (!Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index > 4) errors.push(`${item.id}: invalid correct_index`);
  if (typeof item.explanation !== "string" || !item.explanation.trim()) errors.push(`${item.id}: empty explanation`);
  const text = [item.passage, item.question, ...(item.options ?? []), item.explanation].join(" ");
  if (/[ÃÄÅÂ�]/u.test(text)) errors.push(`${item.id}: mojibake`);
  if (/ayrıntısını da dikkate alınız/iu.test(item.question)) errors.push(`${item.id}: forbidden question template`);
  if (item.category === "flow" && !/^\(I\)/u.test(item.passage)) errors.push(`${item.id}: flow passage is not numbered`);
  if (item.category === "flow" && (!Array.isArray(item.options) || item.options.some((v) => !/^[IVX]+$/u.test(v)))) errors.push(`${item.id}: flow options are not Roman numerals`);
}

const ids = rows.map((item) => item.id);
const passages = rows.map((item) => normalize(item.passage));
const questions = rows.map((item) => normalize(item.question));
const fingerprints = rows.map(fingerprint);
const staticPassages = new Set(paragraphQuestions.map((item) => normalize(item.paragraph)));
const staticQuestions = new Set(paragraphQuestions.map((item) => normalize(item.question)));
const staticOverlap = rows.filter((item) => staticPassages.has(normalize(item.passage)) || staticQuestions.has(normalize(item.question))).map((item) => item.id);

const sentenceDuplicateRows = [];
const suspiciousSentenceSimilarity = [];
for (const item of rows) {
  const sentences = item.passage.split(/(?<=[.!?])\s+/u).map(normalize).filter(Boolean);
  if (duplicateCount(sentences)) sentenceDuplicateRows.push(item.id);
  for (let first = 0; first < sentences.length; first += 1) {
    const left = tokens(sentences[first]);
    if (left.size < 8) continue;
    for (let second = first + 1; second < sentences.length; second += 1) {
      const right = tokens(sentences[second]);
      if (right.size < 8) continue;
      const intersection = [...left].filter((token) => right.has(token)).length;
      const union = new Set([...left, ...right]).size;
      if (union && intersection / union >= 0.82) suspiciousSentenceSimilarity.push({ id: item.id, first: first + 1, second: second + 1 });
    }
  }
}

const proseLengths = rows.filter((item) => item.category !== "flow").map((item) => {
  const lengths = item.options.map((option) => option.trim().length);
  const correct = lengths[item.correct_index];
  return { id: item.id, correct, longest: correct === Math.max(...lengths), shortest: correct === Math.min(...lengths), substantial: correct > Math.max(...lengths.filter((_, i) => i !== item.correct_index)) * 1.25 };
});

const pilotHashBefore = hashRows(paragraphQuestionExpansionV2Pilot);
const pilotHashInFinal = hashRows(rows.filter((item) => paragraphQuestionExpansionV2PilotIds.includes(item.id)));
const pilotMutation = pilotHashBefore !== pilotHashInFinal;

const explanationLetter = (value) => value.match(/^\s*([A-E])\s+seçeneği/iu)?.[1]?.toUpperCase() ?? null;
const explanationFlowNumeral = (value) => value.match(/\b([IVX]+)\. cümle/iu)?.[1] ?? null;
const answerConsistency = rows.map((item) => {
  const displayed = letters[item.correct_index] ?? "?";
  const explanationAgrees = item.category === "flow"
    ? explanationFlowNumeral(item.explanation) === item.options[item.correct_index]
    : explanationLetter(item.explanation) === displayed;
  const flowNumeralAgrees = item.category !== "flow" || explanationFlowNumeral(item.explanation) === item.options[item.correct_index];
  return { id: item.id, correct_index: item.correct_index, displayed_answer: displayed, explanation_agrees: explanationAgrees, flow_numeral_agrees: flowNumeralAgrees, pass: explanationAgrees && flowNumeralAgrees };
});

const pairSimilarities = [];
for (let i = 0; i < rows.length; i += 1) {
  const left = tokens(rows[i].passage);
  for (let j = i + 1; j < rows.length; j += 1) {
    const right = tokens(rows[j].passage);
    const union = new Set([...left, ...right]).size;
    const score = union ? [...left].filter((token) => right.has(token)).length / union : 0;
    if (score >= 0.45) pairSimilarities.push({ left: rows[i].id, right: rows[j].id, score: Number(score.toFixed(3)) });
  }
}
pairSimilarities.sort((a, b) => b.score - a.score);

const openingCounts = countBy(rows.map((item) => ({ value: normalize(item.passage.replace(/^\(I\)\s*/u, "").split(/\s+/u).slice(0, 3).join(" ")) })), "value");
const questionOpeningCounts = countBy(rows.map((item) => ({ value: normalize(item.question.split(/\s+/u).slice(0, 4).join(" ")) })), "value");
const transitionWords = ["ancak", "fakat", "böylece", "bu nedenle", "önce", "sonra", "oysa", "üstelik", "bunun üzerine", "dolayısıyla"];
const transitionCounts = Object.fromEntries(transitionWords.map((word) => [word, rows.reduce((sum, item) => sum + (normalize(item.passage).includes(word) ? 1 : 0), 0)]));
const diversityFlags = [
  ...Object.entries(openingCounts).filter(([, count]) => count > 6).map(([value, count]) => `opening:${value}:${count}`),
  ...Object.entries(questionOpeningCounts).filter(([, count]) => count > 8).map(([value, count]) => `question:${value}:${count}`),
];

const report = {
  total: rows.length,
  byGrade: countBy(rows, "grade_band"),
  byCategory: countBy(rows, "category"),
  byDifficulty: countBy(rows, "difficulty"),
  correctIndex: rows.reduce((out, item) => { out[item.correct_index] += 1; return out; }, [0, 0, 0, 0, 0]),
  exactDuplicateIds: duplicateCount(ids),
  exactDuplicatePassages: duplicateCount(passages),
  exactDuplicateQuestions: duplicateCount(questions),
  fingerprintDuplicates: duplicateCount(fingerprints),
  sentenceDuplicateCount: sentenceDuplicateRows.length,
  suspiciousSentenceSimilarityCount: suspiciousSentenceSimilarity.length,
  staticOverlap,
  productionOverlap: null,
  mojibakeCount: rows.filter((item) => /[ÃÄÅÂ�]/u.test([item.passage, item.question, ...item.options, item.explanation].join(" "))).length,
  forbiddenTemplateCount: rows.filter((item) => /ayrıntısını da dikkate alınız/iu.test(item.question)).length,
  invalidOptionCount: rows.filter((item) => !Array.isArray(item.options) || item.options.length !== 5 || new Set(item.options.map(normalize)).size !== 5).length,
  invalidCorrectIndexCount: rows.filter((item) => !Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index > 4).length,
  pilotMutation,
  pilotHashBefore,
  pilotHashInFinal,
  answerKeyMismatchCount: 0,
  explanationMismatchCount: answerConsistency.filter((item) => !item.explanation_agrees).length,
  flowNumeralMismatchCount: answerConsistency.filter((item) => !item.flow_numeral_agrees).length,
  consistencyPassCount: answerConsistency.filter((item) => item.pass).length,
  consistencyFailCount: answerConsistency.filter((item) => !item.pass).length,
  answerConsistency,
  proseCorrectAnswerLongestCount: proseLengths.filter((item) => item.longest).length,
  proseCorrectAnswerShortestCount: proseLengths.filter((item) => item.shortest).length,
  proseSubstantialCorrectLengthFlags: proseLengths.filter((item) => item.substantial).map((item) => item.id),
  diversity: { topOpenings: Object.entries(openingCounts).sort((a, b) => b[1] - a[1]).slice(0, 10), topQuestionOpenings: Object.entries(questionOpeningCounts).sort((a, b) => b[1] - a[1]).slice(0, 10), transitionCounts, diversityFlags, highSimilarityPairs: pairSimilarities.slice(0, 10) },
  errors,
};

if (report.total !== 131) errors.push(`total: expected 131, got ${report.total}`);
for (const [grade, target] of Object.entries({ "4-5": 46, "8": 39, "high-school": 46 })) if (report.byGrade[grade] !== target) errors.push(`grade ${grade}: expected ${target}, got ${report.byGrade[grade] ?? 0}`);
for (const [category, target] of Object.entries({ main_idea: 29, supporting_idea: 26, inference: 26, completion: 26, flow: 24 })) if (report.byCategory[category] !== target) errors.push(`category ${category}: expected ${target}, got ${report.byCategory[category] ?? 0}`);
if (report.exactDuplicateIds || report.exactDuplicatePassages || report.exactDuplicateQuestions || report.fingerprintDuplicates) errors.push("duplicate rows detected");
if (report.sentenceDuplicateCount || report.suspiciousSentenceSimilarityCount || report.staticOverlap.length || report.mojibakeCount || report.forbiddenTemplateCount || report.invalidOptionCount || report.invalidCorrectIndexCount || report.pilotMutation) errors.push("quality gate failed");
if (report.explanationMismatchCount || report.flowNumeralMismatchCount) errors.push("answer/explanation consistency gate failed");

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`total=${report.total}`);
  console.log(`grade=${JSON.stringify(report.byGrade)}`);
  console.log(`category=${JSON.stringify(report.byCategory)}`);
  console.log(`difficulty=${JSON.stringify(report.byDifficulty)}`);
  console.log(`correct_index=${JSON.stringify(report.correctIndex)}`);
  console.log(`duplicates ids=${report.exactDuplicateIds} passages=${report.exactDuplicatePassages} questions=${report.exactDuplicateQuestions} fingerprints=${report.fingerprintDuplicates}`);
  console.log(`sentence_duplicates=${report.sentenceDuplicateCount} suspicious_similarity=${report.suspiciousSentenceSimilarityCount}`);
  console.log(`static_overlap=${report.staticOverlap.length} mojibake=${report.mojibakeCount} forbidden_template=${report.forbiddenTemplateCount}`);
  console.log(`pilot_mutation=${report.pilotMutation} explanation_mismatches=${report.explanationMismatchCount} flow_numeral_mismatches=${report.flowNumeralMismatchCount}`);
  console.log(`consistency_pass=${report.consistencyPassCount} consistency_fail=${report.consistencyFailCount}`);
  console.log(`diversity_flags=${JSON.stringify(report.diversity.diversityFlags)}`);
}
if (errors.length) {
  if (!process.argv.includes("--json")) console.error(errors.join("\n"));
  process.exitCode = 1;
}

export { report, normalize, fingerprint };
