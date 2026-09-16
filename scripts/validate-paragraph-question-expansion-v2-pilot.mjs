import { paragraphQuestionExpansionV2Pilot, v2PilotTarget } from "../data/paragraph-question-expansion-v2-pilot.mjs";
import { paragraphQuestions } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";

const categories = new Set(["main_idea", "supporting_idea", "inference", "completion", "flow"]);
const difficulties = new Set(["easy", "medium", "hard"]);
const grades = new Set(Object.keys(v2PilotTarget));
const forbiddenQuestion = /(?:ayrÄ±ntÄ±sÄ±nÄ± da dikkate alÄ±nÄ±z|ayrıntısını da dikkate alınız)/iu;
const mojibake = /(?:Ã|Ä|Å|Â|�|â€)/u;
const absoluteLanguage = /\b(?:her zaman|kesinlikle|hiçbir zaman|önemsizdir|tamamen|yalnızca)\b/iu;
const normalize = (value) => value.trim().normalize("NFKC").replace(/\s+/gu, " ").toLocaleLowerCase("tr-TR");
const tokens = (value) => new Set(normalize(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
const sentenceList = (value) => value.split(/(?<=[.!?])\s+/u).map(normalize).filter(Boolean);
const duplicateCount = (values) => values.length - new Set(values).size;
const countBy = (items, key) => items.reduce((result, item) => {
  result[item[key]] = (result[item[key]] ?? 0) + 1;
  return result;
}, {});
const fingerprint = (item) => [
  item.category,
  item.difficulty,
  item.grade_band,
  normalize(item.passage),
  normalize(item.question),
  item.options.map(normalize).join("\u001f"),
  String(item.correct_index),
].join("\u001e");

const errors = [];
const rows = paragraphQuestionExpansionV2Pilot;

for (const item of rows) {
  if (!grades.has(item.grade_band)) errors.push(`${item.id}: invalid grade_band`);
  if (!categories.has(item.category)) errors.push(`${item.id}: invalid category`);
  if (!difficulties.has(item.difficulty)) errors.push(`${item.id}: invalid difficulty`);
  if (!item.id || typeof item.passage !== "string" || !item.passage.trim()) errors.push(`${item.id}: empty passage`);
  if (typeof item.question !== "string" || !item.question.trim()) errors.push(`${item.id}: empty question`);
  if (!Array.isArray(item.options) || item.options.length !== 5) errors.push(`${item.id}: options length`);
  if (Array.isArray(item.options) && new Set(item.options.map(normalize)).size !== 5) errors.push(`${item.id}: duplicate options`);
  if (!Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index > 4) errors.push(`${item.id}: invalid correct_index`);
  if (typeof item.explanation !== "string" || !item.explanation.trim()) errors.push(`${item.id}: empty explanation`);
  for (const value of [item.passage, item.question, ...(item.options ?? []), item.explanation]) {
    if (mojibake.test(value)) errors.push(`${item.id}: mojibake`);
  }
  if (forbiddenQuestion.test(item.question)) errors.push(`${item.id}: forbidden question template`);
  if (item.category === "flow" && !/^\(I\)/u.test(item.passage)) errors.push(`${item.id}: flow passage is not numbered`);
}

const ids = rows.map((item) => item.id);
const passages = rows.map((item) => normalize(item.passage));
const questions = rows.map((item) => normalize(item.question));
const fingerprints = rows.map(fingerprint);
const sentenceDuplicateRows = [];
const suspiciousSentenceSimilarity = [];

for (const item of rows) {
  const sentences = sentenceList(item.passage);
  if (duplicateCount(sentences) > 0) sentenceDuplicateRows.push(item.id);
  for (let first = 0; first < sentences.length; first += 1) {
    const left = tokens(sentences[first]);
    if (left.size < 6) continue;
    for (let second = first + 1; second < sentences.length; second += 1) {
      const right = tokens(sentences[second]);
      if (right.size < 6) continue;
      const intersection = [...left].filter((token) => right.has(token)).length;
      const union = new Set([...left, ...right]).size;
      if (union > 0 && intersection / union >= 0.8) suspiciousSentenceSimilarity.push({ id: item.id, first: first + 1, second: second + 1 });
    }
  }
}

const staticPassages = new Set(paragraphQuestions.map((item) => normalize(item.paragraph)));
const staticQuestions = new Set(paragraphQuestions.map((item) => normalize(item.question)));
const staticOverlap = rows.filter((item) => staticPassages.has(normalize(item.passage)) || staticQuestions.has(normalize(item.question))).map((item) => item.id);
const optionLengths = rows.map((item) => {
  const lengths = item.options.map((option) => option.trim().length);
  const correctLength = lengths[item.correct_index];
  const distractorLengths = lengths.filter((_, index) => index !== item.correct_index);
  return {
    id: item.id,
    category: item.category,
    correct: correctLength,
    distractorAverage: distractorLengths.reduce((sum, length) => sum + length, 0) / distractorLengths.length,
    correctLongest: correctLength === Math.max(...lengths),
    correctShortest: correctLength === Math.min(...lengths),
    substantial: correctLength > Math.max(...distractorLengths) * 1.25,
  };
});
const correctOptionAverageLength = optionLengths.reduce((sum, item) => sum + item.correct, 0) / optionLengths.length;
const distractorAverageLength = optionLengths.reduce((sum, item) => sum + item.distractorAverage, 0) / optionLengths.length;
const proseOptionLengths = optionLengths.filter((item) => item.category !== "flow");
const proseCorrectOptionAverageLength = proseOptionLengths.reduce((sum, item) => sum + item.correct, 0) / proseOptionLengths.length;
const proseDistractorAverageLength = proseOptionLengths.reduce((sum, item) => sum + item.distractorAverage, 0) / proseOptionLengths.length;
const suspiciousAbsoluteLanguage = rows.filter((item) => item.options.some((option) => absoluteLanguage.test(option))).map((item) => item.id);

const report = {
  total: rows.length,
  byGrade: countBy(rows, "grade_band"),
  byCategory: countBy(rows, "category"),
  byDifficulty: countBy(rows, "difficulty"),
  correctIndex: rows.reduce((result, item) => { result[item.correct_index] = (result[item.correct_index] ?? 0) + 1; return result; }, [0, 0, 0, 0, 0]),
  exactDuplicateIds: duplicateCount(ids),
  exactDuplicatePassages: duplicateCount(passages),
  exactDuplicateQuestions: duplicateCount(questions),
  fingerprintDuplicates: duplicateCount(fingerprints),
  sentenceDuplicateCount: sentenceDuplicateRows.length,
  sentenceDuplicateRows,
  suspiciousSentenceSimilarity,
  staticOverlap,
  productionOverlap: null,
  mojibakeCount: rows.filter((item) => [item.passage, item.question, ...item.options, item.explanation].some((value) => mojibake.test(value))).length,
  forbiddenTemplateCount: rows.filter((item) => forbiddenQuestion.test(item.question)).length,
  invalidOptionCount: rows.filter((item) => !Array.isArray(item.options) || item.options.length !== 5 || new Set(item.options.map(normalize)).size !== 5).length,
  invalidCorrectIndexCount: rows.filter((item) => !Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index > 4).length,
  correctOptionAverageLength: Number(correctOptionAverageLength.toFixed(2)),
  distractorAverageLength: Number(distractorAverageLength.toFixed(2)),
  correctAnswerLongestCount: optionLengths.filter((item) => item.correctLongest).length,
  correctAnswerShortestCount: optionLengths.filter((item) => item.correctShortest).length,
  substantialCorrectLengthFlags: optionLengths.filter((item) => item.substantial).map((item) => item.id),
  proseOptionLengthQuestionCount: proseOptionLengths.length,
  proseCorrectOptionAverageLength: Number(proseCorrectOptionAverageLength.toFixed(2)),
  proseDistractorAverageLength: Number(proseDistractorAverageLength.toFixed(2)),
  proseCorrectAnswerLongestCount: proseOptionLengths.filter((item) => item.correctLongest).length,
  proseCorrectAnswerShortestCount: proseOptionLengths.filter((item) => item.correctShortest).length,
  proseSubstantialCorrectLengthFlags: proseOptionLengths.filter((item) => item.substantial).map((item) => item.id),
  suspiciousAbsoluteLanguage,
  errors,
};

for (const [grade, target] of Object.entries(v2PilotTarget)) {
  if (report.byGrade[grade] !== target) errors.push(`grade ${grade}: expected ${target}, got ${report.byGrade[grade] ?? 0}`);
}
if (report.total !== 15) errors.push(`total: expected 15, got ${report.total}`);
if (report.exactDuplicateIds || report.exactDuplicatePassages || report.exactDuplicateQuestions || report.fingerprintDuplicates) errors.push("duplicate rows detected");
if (report.sentenceDuplicateCount || report.staticOverlap.length || report.mojibakeCount || report.forbiddenTemplateCount) errors.push("quality gate failed");

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`total=${report.total}`);
  console.log(`grade=${JSON.stringify(report.byGrade)}`);
  console.log(`category=${JSON.stringify(report.byCategory)}`);
  console.log(`difficulty=${JSON.stringify(report.byDifficulty)}`);
  console.log(`correct_index=${JSON.stringify(report.correctIndex)}`);
  console.log(`duplicates ids=${report.exactDuplicateIds} passages=${report.exactDuplicatePassages} questions=${report.exactDuplicateQuestions} fingerprints=${report.fingerprintDuplicates}`);
  console.log(`sentence_duplicates=${report.sentenceDuplicateCount} suspicious_similarity=${report.suspiciousSentenceSimilarity.length}`);
  console.log(`static_overlap=${report.staticOverlap.length} mojibake=${report.mojibakeCount} forbidden_template=${report.forbiddenTemplateCount}`);
  console.log(`option_lengths all(correct=${report.correctOptionAverageLength},distractor=${report.distractorAverageLength},longest=${report.correctAnswerLongestCount},shortest=${report.correctAnswerShortestCount}) prose(correct=${report.proseCorrectOptionAverageLength},distractor=${report.proseDistractorAverageLength},longest=${report.proseCorrectAnswerLongestCount},shortest=${report.proseCorrectAnswerShortestCount})`);
}

if (errors.length) {
  if (!process.argv.includes("--json")) console.error(errors.join("\n"));
  process.exitCode = 1;
}

export { report, normalize, fingerprint };
