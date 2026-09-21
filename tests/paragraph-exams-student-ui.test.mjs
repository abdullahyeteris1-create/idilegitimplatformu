import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildStudentQuestionGroups,
  formatRemainingTime,
  getAnswerCounts,
  getRemainingSeconds,
} from "../src/lib/paragraph-exams/studentPresentation.ts";

const root = path.resolve(".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const client = () => read("src/app/ogrenci/paragraf-denemeleri/StudentParagraphExamsClient.tsx");

const passage = { id: "p1", label: null, passageText: "Paragraf metni", position: 1 };
const questions = [
  { id: "q1", passageId: "p1", questionText: "Bir", options: ["A", "B", "C", "D", "E"], position: 1, selectedOption: 0 },
  { id: "q2", passageId: "p1", questionText: "İki", options: ["A", "B", "C", "D", "E"], position: 2, selectedOption: null },
  { id: "q3", passageId: null, questionText: "Üç", options: ["A", "B", "C", "D", "E"], position: 3, selectedOption: 4 },
];

test("student paragraph routes are server-guarded and reuse the feature gate", () => {
  for (const file of [
    "src/app/ogrenci/paragraf-denemeleri/page.tsx",
    "src/app/ogrenci/paragraf-denemeleri/[examId]/page.tsx",
    "src/app/ogrenci/paragraf-denemeleri/[examId]/deneme/[attemptId]/page.tsx",
    "src/app/ogrenci/paragraf-denemeleri/[examId]/sonuc/[attemptId]/page.tsx",
  ]) assert.match(read(file), /requireParagraphExerciseAccess/);
});

test("feature-enabled exercise navigation includes Paragraph Exams and hides it otherwise", () => {
  const source = read("src/components/exercises-preview/exercisePreviewGroups.ts");
  assert.match(source, /slug: "paragraf-denemeleri"/);
  assert.match(source, /href: "\/ogrenci\/paragraf-denemeleri"/);
  assert.match(source, /buildPreviewExerciseGroups\(paragraphExercisesEnabled = false\)/);
  assert.match(source, /paragraphExercisesEnabled \? \[\.\.\.PREVIEW_EXERCISE_GROUPS, PARAGRAPH_EXERCISE_GROUP\]/);
});

test("student API surface uses existing published list, attempt, save, finalize, and result routes", () => {
  const source = client();
  for (const pathFragment of [
    "/api/student/paragraph-exams",
    "/attempt`, { method: \"POST\"",
    "/attempt/${attemptId}`, { method: \"PATCH\"",
    "/attempt/${attemptId}`, { method: \"POST\"",
    "/result`",
  ]) assert.match(source, new RegExp(pathFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /supabase\/(client|server)/);
});

test("active player does not contain answer key or explanation access", () => {
  const source = client();
  const playerStart = source.indexOf("function Player(");
  const resultStart = source.indexOf("function ResultQuestion(");
  const playerSource = source.slice(playerStart, resultStart);
  assert.doesNotMatch(playerSource, /correctOption|explanation/);
  assert.match(source.slice(resultStart), /correctOption/);
  assert.match(source.slice(resultStart), /explanation/);
});

test("timer and presentation helpers use server expires_at semantics and preserve global ordering", () => {
  assert.equal(getRemainingSeconds("2026-09-18T10:01:01.000Z", Date.parse("2026-09-18T10:00:00.000Z")), 61);
  assert.equal(getRemainingSeconds("2026-09-18T09:59:59.000Z", Date.parse("2026-09-18T10:00:00.000Z")), 0);
  assert.equal(formatRemainingTime(61), "01:01");
  assert.deepEqual(getAnswerCounts(questions), { answered: 2, blank: 1 });
  const groups = buildStudentQuestionGroups(questions, [passage]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].passage?.id, "p1");
  assert.deepEqual(groups[0].questions.map((question) => question.id), ["q1", "q2"]);
  assert.deepEqual(groups[1].questions.map((question) => question.id), ["q3"]);
  assert.match(read("src/lib/paragraph-exams/presentation.ts"), /createQuestionNumberMap/);
  assert.match(client(), /createQuestionNumberMap\(attempt\.questions\)/);
});

test("player has accessible radio choices, visual progress palette, retryable save, and finish confirmation", () => {
  const source = client();
  assert.match(source, /type="radio"/);
  assert.match(source, /<fieldset/);
  assert.match(source, /accent-blue-700/);
  assert.match(source, /bg-emerald-100/);
  assert.match(source, /bg-slate-100/);
  assert.match(source, /Kaydedilemedi/);
  assert.match(source, /Tekrar dene/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /soruyu cevapladın, \{counts\.blank\} soru boş kalacak/);
});

test("answers are serialized through a pending queue and finalization is locked", () => {
  const source = client();
  assert.match(source, /const pending = useRef\(new Map<string, number \| null>\(\)\)/);
  assert.match(source, /const sending = useRef\(false\)/);
  assert.match(source, /if \(sending\.current \|\| locked\.current \|\| !attempt\) return/);
  assert.match(source, /pending\.current\.set\(questionId, selectedOption\)/);
  assert.match(source, /if \(locked\.current \|\| finishing\) return/);
  assert.match(source, /locked\.current = true/);
});

test("student wording is paragraph-oriented and technical persistence wording is absent", () => {
  const source = client();
  assert.match(source, /Paragraf Denemeleri/);
  assert.doesNotMatch(source, /snapshot|sourceQuestionId|repository/iu);
  assert.doesNotMatch(source, /Pasaj/u);
});
test("completed result presents total and average completion time metrics", () => {
  const source = client();
  assert.match(source, /formatDuration/);
  assert.match(source, /formatAverageSecondsPerQuestion/);
  assert.match(source, /Toplam Süre/);
  assert.match(source, /Soru Başına Ortalama/);
  assert.match(source, /sm:grid-cols-3 lg:grid-cols-6/);
});