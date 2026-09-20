import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { scoreParagraphExam, calculateAttemptDurationSeconds, type ScoreAnswer } from "./scoring";
import {
  type ParagraphExam,
  type ParagraphExamAnswer,
  type ParagraphExamAttempt,
  type ParagraphExamQuestion,
  type ParagraphExamPassage,
} from "./types";
import { isSelectedOption, isUuid, normalizeQuestionOptions } from "./validation";
import {
  ParagraphExamRepositoryError,
  getExam,
  getPassages,
  getQuestions,
} from "./repository";

const ATTEMPTS_TABLE = "paragraph_exam_attempts";
const ANSWERS_TABLE = "paragraph_exam_answers";
const QUESTIONS_TABLE = "paragraph_exam_questions";
const ATTEMPT_FIELDS = "id,exam_id,exam_version,student_id,status,started_at,expires_at,submitted_at,correct_count,wrong_count,blank_count,total_points,score,accuracy,duration_seconds,submission_key,created_at,updated_at";
const ANSWER_FIELDS = "id,attempt_id,exam_question_id,selected_option,saved_at,created_at,updated_at";
const UNIQUE_VIOLATION = "23505";

function client(): SupabaseClient {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new ParagraphExamRepositoryError("Supabase bağlantısı bulunamadı.", { status: 503 });
  return supabase;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function text(row: Record<string, unknown>, key: string): string {
  return typeof row[key] === "string" ? String(row[key]) : "";
}

function nullableText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function number(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0);
}

function nullableNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapAttempt(row: unknown): ParagraphExamAttempt | null {
  const value = record(row);
  const id = text(value, "id");
  const examId = text(value, "exam_id");
  const studentId = text(value, "student_id");
  const status = text(value, "status") as ParagraphExamAttempt["status"];
  if (!isUuid(id) || !isUuid(examId) || !isUuid(studentId) || !["in_progress", "submitted", "expired", "abandoned"].includes(status)) return null;
  return {
    id,
    examId,
    examVersion: number(value, "exam_version"),
    studentId,
    status,
    startedAt: text(value, "started_at"),
    expiresAt: text(value, "expires_at"),
    submittedAt: nullableText(value, "submitted_at"),
    correctCount: nullableNumber(value, "correct_count"),
    wrongCount: nullableNumber(value, "wrong_count"),
    blankCount: nullableNumber(value, "blank_count"),
    totalPoints: nullableNumber(value, "total_points"),
    score: nullableNumber(value, "score"),
    accuracy: nullableNumber(value, "accuracy"),
    durationSeconds: nullableNumber(value, "duration_seconds"),
    submissionKey: text(value, "submission_key"),
    createdAt: text(value, "created_at"),
    updatedAt: text(value, "updated_at"),
  };
}

function mapAnswer(row: unknown): ParagraphExamAnswer | null {
  const value = record(row);
  const id = text(value, "id");
  const attemptId = text(value, "attempt_id");
  const examQuestionId = text(value, "exam_question_id");
  if (!isUuid(id) || !isUuid(attemptId) || !isUuid(examQuestionId)) return null;
  const selectedOption = nullableNumber(value, "selected_option");
  if (!isSelectedOption(selectedOption)) return null;
  return {
    id,
    attemptId,
    examQuestionId,
    selectedOption,
    savedAt: text(value, "saved_at"),
    createdAt: text(value, "created_at"),
    updatedAt: text(value, "updated_at"),
  };
}

async function loadAttempt(attemptId: string, studentId: string): Promise<ParagraphExamAttempt> {
  if (!isUuid(attemptId) || !isUuid(studentId)) throw new ParagraphExamRepositoryError("Attempt kimliği geçersiz.", { status: 400 });
  const result = await client().from(ATTEMPTS_TABLE).select(ATTEMPT_FIELDS).eq("id", attemptId).eq("student_id", studentId).maybeSingle();
  if (result.error) throw new ParagraphExamRepositoryError(result.error.message || "Attempt alınamadı.", { code: result.error.code });
  const attempt = result.data ? mapAttempt(result.data) : null;
  if (!attempt) throw new ParagraphExamRepositoryError("Attempt bulunamadı.", { status: 404 });
  return attempt;
}

async function loadActiveAttempt(examId: string, studentId: string): Promise<ParagraphExamAttempt | null> {
  const result = await client().from(ATTEMPTS_TABLE).select(ATTEMPT_FIELDS).eq("exam_id", examId).eq("student_id", studentId).eq("status", "in_progress").maybeSingle();
  if (result.error) throw new ParagraphExamRepositoryError(result.error.message || "Aktif attempt alınamadı.", { code: result.error.code });
  return result.data ? mapAttempt(result.data) : null;
}

async function loadStudentAnswers(attemptId: string): Promise<ParagraphExamAnswer[]> {
  const result = await client().from(ANSWERS_TABLE).select(ANSWER_FIELDS).eq("attempt_id", attemptId);
  if (result.error) throw new ParagraphExamRepositoryError(result.error.message || "Cevaplar alınamadı.", { code: result.error.code });
  return (result.data ?? []).map(mapAnswer).filter((answer): answer is ParagraphExamAnswer => answer !== null);
}

async function loadExamBundle(examId: string, publishedOnly: boolean): Promise<{
  exam: ParagraphExam;
  passages: ParagraphExamPassage[];
  questions: ParagraphExamQuestion[];
}> {
  const exam = await getExam(examId, { publishedOnly });
  if (!publishedOnly && exam.status === "draft") {
    throw new ParagraphExamRepositoryError("Bu sınav henüz yayınlanmadı.", { status: 409 });
  }
  const [passages, questions] = await Promise.all([getPassages(examId), getQuestions(examId)]);
  if (questions.length === 0) throw new ParagraphExamRepositoryError("Yayınlanmış sınavda soru bulunamadı.", { status: 409 });
  return { exam, passages, questions };
}

async function loadPublishedBundle(examId: string) {
  return loadExamBundle(examId, true);
}

async function loadAttemptBundle(examId: string) {
  return loadExamBundle(examId, false);
}

export async function getStudentAttempt(attemptId: string, studentId: string): Promise<{
  exam: ParagraphExam;
  passages: ParagraphExamPassage[];
  questions: ParagraphExamQuestion[];
  attempt: ParagraphExamAttempt;
  answers: ParagraphExamAnswer[];
}> {
  const attempt = await loadAttempt(attemptId, studentId);
  const bundle = await loadAttemptBundle(attempt.examId);
  return { ...bundle, attempt, answers: await loadStudentAnswers(attempt.id) };
}

export async function createOrResumeStudentAttempt(examId: string, studentId: string, now = new Date()): Promise<{
  exam: ParagraphExam;
  passages: ParagraphExamPassage[];
  questions: ParagraphExamQuestion[];
  attempt: ParagraphExamAttempt;
  answers: ParagraphExamAnswer[];
  resumed: boolean;
}> {
  if (!isUuid(examId) || !isUuid(studentId)) throw new ParagraphExamRepositoryError("Sınav veya öğrenci kimliği geçersiz.", { status: 400 });
  const bundle = await loadPublishedBundle(examId);
  const existing = await loadActiveAttempt(examId, studentId);
  if (existing) {
    if (Date.parse(existing.expiresAt) > now.getTime()) {
      return { ...bundle, attempt: existing, answers: await loadStudentAnswers(existing.id), resumed: true };
    }
    await finalizeStudentAttempt(examId, existing.id, studentId, now);
  }

  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + bundle.exam.durationSeconds * 1000).toISOString();
  const result = await client().from(ATTEMPTS_TABLE).insert({
    exam_id: examId,
    exam_version: bundle.exam.version,
    student_id: studentId,
    status: "in_progress",
    started_at: startedAt,
    expires_at: expiresAt,
    submission_key: crypto.randomUUID(),
  }).select(ATTEMPT_FIELDS).single();
  if (result.error) {
    if (result.error.code === UNIQUE_VIOLATION) {
      const raced = await loadActiveAttempt(examId, studentId);
      if (raced) return { ...bundle, attempt: raced, answers: await loadStudentAnswers(raced.id), resumed: true };
    }
    throw new ParagraphExamRepositoryError(result.error.message || "Attempt oluşturulamadı.", { code: result.error.code });
  }
  const attempt = mapAttempt(result.data);
  if (!attempt) throw new ParagraphExamRepositoryError("Oluşturulan attempt doğrulanamadı.");
  return { ...bundle, attempt, answers: [], resumed: false };
}

export async function saveStudentAnswer(
  examId: string,
  attemptId: string,
  studentId: string,
  examQuestionId: string,
  selectedOption: number | null,
  now = new Date(),
): Promise<{ attempt: ParagraphExamAttempt; answer: ParagraphExamAnswer }> {
  const attempt = await loadAttempt(attemptId, studentId);
  if (attempt.examId !== examId) throw new ParagraphExamRepositoryError("Attempt sınavla eşleşmiyor.", { status: 400 });
  if (attempt.status !== "in_progress") throw new ParagraphExamRepositoryError("Bu attempt artık cevap kabul etmiyor.", { status: 409 });
  if (Date.parse(attempt.expiresAt) <= now.getTime()) {
    await finalizeStudentAttempt(examId, attemptId, studentId, now);
    throw new ParagraphExamRepositoryError("Attempt süresi doldu.", { status: 409 });
  }
  if (!isSelectedOption(selectedOption)) throw new ParagraphExamRepositoryError("Seçilen seçenek geçersiz.", { status: 400 });
  const question = await client().from(QUESTIONS_TABLE).select("id,options").eq("id", examQuestionId).eq("exam_id", examId).maybeSingle();
  if (question.error) throw new ParagraphExamRepositoryError(question.error.message || "Soru doğrulanamadı.", { code: question.error.code });
  if (!question.data) throw new ParagraphExamRepositoryError("Soru bu sınava ait değil.", { status: 400 });
  const optionCount = normalizeQuestionOptions((question.data as { options?: unknown }).options)?.length;
  if (!optionCount || (selectedOption !== null && selectedOption >= optionCount)) {
    throw new ParagraphExamRepositoryError("Seçilen seçenek bu soru için geçersiz.", { status: 400 });
  }
  const result = await client().from(ANSWERS_TABLE).upsert({
    attempt_id: attemptId,
    exam_question_id: examQuestionId,
    selected_option: selectedOption,
    saved_at: now.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "attempt_id,exam_question_id" }).select(ANSWER_FIELDS).single();
  if (result.error) throw new ParagraphExamRepositoryError(result.error.message || "Cevap kaydedilemedi.", { code: result.error.code });
  const answer = mapAnswer(result.data);
  if (!answer) throw new ParagraphExamRepositoryError("Kaydedilen cevap doğrulanamadı.");
  return { attempt, answer };
}

export async function finalizeStudentAttempt(
  examId: string,
  attemptId: string,
  studentId: string,
  now = new Date(),
): Promise<{
  exam: ParagraphExam;
  passages: ParagraphExamPassage[];
  questions: ParagraphExamQuestion[];
  attempt: ParagraphExamAttempt;
  answers: ParagraphExamAnswer[];
}> {
  const bundle = await loadAttemptBundle(examId);
  const current = await loadAttempt(attemptId, studentId);
  if (current.examId !== examId) throw new ParagraphExamRepositoryError("Attempt sınavla eşleşmiyor.", { status: 400 });
  if (current.status !== "in_progress") return { ...bundle, attempt: current, answers: await loadStudentAnswers(current.id) };
  const answers = await loadStudentAnswers(current.id);
  const score = scoreParagraphExam(bundle.questions.map((question) => ({
    ...question,
    optionCount: question.options.length,
  })), answers.map<ScoreAnswer>((answer) => ({
    examQuestionId: answer.examQuestionId,
    selectedOption: answer.selectedOption,
  })));
  const expired = now.getTime() >= Date.parse(current.expiresAt);
  const status = expired ? "expired" : "submitted";
  const submittedAt = now.toISOString();
  const durationSeconds = expired
    ? bundle.exam.durationSeconds
    : Math.min(bundle.exam.durationSeconds, calculateAttemptDurationSeconds(current.startedAt, now));
  const result = await client().from(ATTEMPTS_TABLE).update({
    status,
    submitted_at: submittedAt,
    correct_count: score.correctCount,
    wrong_count: score.wrongCount,
    blank_count: score.blankCount,
    total_points: score.totalPoints,
    score: score.score,
    accuracy: score.accuracy,
    duration_seconds: durationSeconds,
    updated_at: submittedAt,
  }).eq("id", attemptId).eq("student_id", studentId).eq("status", "in_progress").select(ATTEMPT_FIELDS).maybeSingle();
  if (result.error) throw new ParagraphExamRepositoryError(result.error.message || "Attempt sonuçlandırılamadı.", { code: result.error.code });
  if (!result.data) {
    const raced = await loadAttempt(attemptId, studentId);
    return { ...bundle, attempt: raced, answers: await loadStudentAnswers(raced.id) };
  }
  const finalized = mapAttempt(result.data);
  if (!finalized) throw new ParagraphExamRepositoryError("Sonuçlandırılan attempt doğrulanamadı.");
  return { ...bundle, attempt: finalized, answers };
}
