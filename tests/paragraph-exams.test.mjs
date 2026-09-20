import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreParagraphExam, calculateAttemptDurationSeconds } from "../src/lib/paragraph-exams/scoring.ts";
import { toAttemptDto, toResultDto } from "../src/lib/paragraph-exams/dto.ts";
import { validateExamInput, validateQuestionInput } from "../src/lib/paragraph-exams/validation.ts";

const exam = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Deneme",
  description: null,
  gradeBand: "8",
  durationSeconds: 600,
  status: "published",
  version: 1,
  createdBy: "teacher",
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt: "2026-09-18T10:00:00.000Z",
};

const questions = [
  {
    id: "22222222-2222-4222-8222-222222222221",
    examId: exam.id,
    passageId: null,
    sourceQuestionId: "source-1",
    questionText: "Soru 1",
    options: ["A", "B", "C", "D", "E"],
    correctOption: 1,
    explanation: "Açıklama",
    category: "main_idea",
    difficulty: "easy",
    gradeBand: "8",
    position: 1,
    points: 2,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    examId: exam.id,
    passageId: null,
    sourceQuestionId: null,
    questionText: "Soru 2",
    options: ["A", "B", "C", "D", "E"],
    correctOption: 3,
    explanation: "Açıklama",
    category: "flow",
    difficulty: "medium",
    gradeBand: "8",
    position: 2,
    points: 1,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  },
];

const passages = [];
const attempt = {
  id: "33333333-3333-4333-8333-333333333333",
  examId: exam.id,
  examVersion: 1,
  studentId: "44444444-4444-4444-8444-444444444444",
  status: "in_progress",
  startedAt: exam.createdAt,
  expiresAt: "2026-09-18T10:10:00.000Z",
  submittedAt: null,
  correctCount: null,
  wrongCount: null,
  blankCount: null,
  totalPoints: null,
  score: null,
  accuracy: null,
  durationSeconds: null,
  submissionKey: "submission-key-123456",
  createdAt: exam.createdAt,
  updatedAt: exam.createdAt,
};

test("blank answers are separate from wrong answers and points are weighted", () => {
  const result = scoreParagraphExam(questions, [
    { examQuestionId: questions[0].id, selectedOption: 1 },
    { examQuestionId: questions[1].id, selectedOption: null },
  ]);
  assert.deepEqual(result, {
    correctCount: 1,
    wrongCount: 0,
    blankCount: 1,
    totalPoints: 3,
    score: 2,
    accuracy: 50,
  });
});

test("safe attempt DTO does not expose answer-key fields", () => {
  const dto = toAttemptDto(exam, attempt, passages, questions, []);
  const serialized = JSON.stringify(dto);
  assert.doesNotMatch(serialized, /correctOption|correct_option|explanation|sourceQuestionId|correct answer/u);
  assert.equal(dto.questions[0].selectedOption, null);
});

test("finalized result exposes review data only after finalization", () => {
  const inProgress = toResultDto(exam, attempt, passages, questions, []);
  assert.equal(inProgress, null);

  const finalized = toResultDto(exam, {
    ...attempt,
    status: "submitted",
    submittedAt: "2026-09-18T10:05:00.000Z",
    correctCount: 1,
    wrongCount: 0,
    blankCount: 1,
    totalPoints: 3,
    score: 2,
    accuracy: 50,
    durationSeconds: 300,
  }, passages, questions, []);
  assert.equal(finalized?.questions[0].correctOption, 1);
  assert.equal(finalized?.questions[0].explanation, "Açıklama");
});

test("validation rejects unsafe exam/question payloads", () => {
  assert.equal(validateExamInput({ title: "x", gradeBand: "8", durationSeconds: 59 }).ok, false);
  assert.equal(validateQuestionInput({
    questionText: "Soru",
    options: ["A", "A", "C", "D", "E"],
    correctOption: 0,
    explanation: "Açıklama",
    category: "main_idea",
    difficulty: "easy",
    gradeBand: "8",
    position: 1,
  }).ok, false);
});

test("manual questions support four options and normalize an empty E", () => {
  const base = {
    questionText: "Soru",
    explanation: "Açıklama",
    category: "main_idea",
    difficulty: "easy",
    gradeBand: "8",
    position: 1,
  };
  const four = validateQuestionInput({ ...base, options: ["A", "B", "C", "D"], correctOption: 3 });
  assert.equal(four.ok, true);
  if (four.ok) assert.deepEqual(four.value.options, ["A", "B", "C", "D"]);
  const whitespaceE = validateQuestionInput({ ...base, options: ["A", "B", "C", "D", "   "], correctOption: 3 });
  assert.equal(whitespaceE.ok, true);
  if (whitespaceE.ok) assert.deepEqual(whitespaceE.value.options, ["A", "B", "C", "D"]);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C"], correctOption: 2 }).ok, false);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C", "D", "E", "F"], correctOption: 2 }).ok, false);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C", ""], correctOption: 2 }).ok, false);
  assert.equal(validateQuestionInput({ ...base, options: ["A", "B", "C", "D"], correctOption: 4 }).ok, false);
  const five = validateQuestionInput({ ...base, options: ["A", "B", "C", "D", "E"], correctOption: 4 });
  assert.equal(five.ok, true);
  if (five.ok) assert.deepEqual(five.value.options, ["A", "B", "C", "D", "E"]);
});

test("student autosave and scoring enforce the stored option count", () => {
  const repository = readFileSync(new URL("../src/lib/paragraph-exams/studentRepository.ts", import.meta.url), "utf8");
  assert.match(repository, /id,options/u);
  assert.match(repository, /selectedOption >= optionCount/u);
  const fourCorrect = scoreParagraphExam([{ id: "four-correct", correctOption: 3, points: 1, optionCount: 4 }], [{ examQuestionId: "four-correct", selectedOption: 3 }]);
  assert.equal(fourCorrect.correctCount, 1);
  const fiveCorrect = scoreParagraphExam([{ id: "five-correct", correctOption: 4, points: 1, optionCount: 5 }], [{ examQuestionId: "five-correct", selectedOption: 4 }]);
  assert.equal(fiveCorrect.correctCount, 1);
  const result = scoreParagraphExam([{ id: "four", correctOption: 3, points: 1, optionCount: 4 }], [{ examQuestionId: "four", selectedOption: 4 }]);
  assert.deepEqual(result, { correctCount: 0, wrongCount: 1, blankCount: 0, totalPoints: 1, score: 0, accuracy: 0 });
});

test("question-bank mapping keeps four and five option source questions", () => {
  const repository = readFileSync(new URL("../src/lib/paragraph-exercises/paragraphQuestionRepository.ts", import.meta.url), "utf8");
  assert.match(repository, /options.length !== 4/u);
  const teacher = readFileSync(new URL("../src/app/ogretmen/icerik-yonetimi/paragraf-denemeleri/ParagraphExamsClient.tsx", import.meta.url), "utf8");
  assert.match(teacher, /sourceQuestionId/u);
});

test("server duration is bounded by the stored expiry window", () => {
  assert.equal(calculateAttemptDurationSeconds("2026-09-18T10:00:00.000Z", new Date("2026-09-18T10:05:00.000Z")), 300);
  assert.equal(calculateAttemptDurationSeconds("2026-09-18T10:00:00.000Z", new Date("2026-09-18T09:59:00.000Z")), 0);
});

test("optional-E migration changes only option cardinality and correct-index bounds", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260920100000_allow_four_option_paragraph_questions.sql", import.meta.url), "utf8");
  assert.match(migration, /between 4 and 5/u);
  assert.match(migration, /correct_option >= 0 and correct_option < jsonb_array_length/u);
  assert.match(migration, /correct_index >= 0 and correct_index < jsonb_array_length/u);
  assert.doesNotMatch(migration, /insert|update|delete|truncate/iu);
});

test("migration enforces isolated tables, active-attempt uniqueness, and forced RLS", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260918100000_create_paragraph_exams.sql", import.meta.url), "utf8");
  for (const table of ["paragraph_exams", "paragraph_exam_passages", "paragraph_exam_questions", "paragraph_exam_attempts", "paragraph_exam_answers"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
  }
  assert.match(migration, /paragraph_exam_attempts_one_active_uidx/u);
  assert.match(migration, /where status = 'in_progress'/u);
  assert.match(migration, /unique \(attempt_id, exam_question_id\)/u);
  assert.match(migration, /paragraph_exam_questions_draft_guard/u);
  assert.match(migration, /paragraph_exam_attempts_immutable_guard/u);
  assert.match(migration, /paragraph_exam_answers_immutable_guard/u);
});

test("student and management routes require their existing session guards", () => {
  const studentRoute = readFileSync(new URL("../src/app/api/student/paragraph-exams/[examId]/attempt/[attemptId]/route.ts", import.meta.url), "utf8");
  const adminRoute = readFileSync(new URL("../src/app/api/admin/paragraph-exams/[examId]/questions/route.ts", import.meta.url), "utf8");
  assert.match(studentRoute, /verifyStudentAccess/u);
  assert.match(studentRoute, /access\.studentId/u);
  assert.match(adminRoute, /isAdminSessionValid/u);
});
