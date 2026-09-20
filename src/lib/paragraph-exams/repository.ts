import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { ParagraphCategory } from "@/lib/paragraph-exercises/paragraphQuestions";
import {
  type ParagraphExam,
  type ParagraphExamAnswer,
  type ParagraphExamDifficulty,
  type ParagraphExamInput,
  type ParagraphExamPassage,
  type ParagraphExamPassageInput,
  type ParagraphExamQuestion,
  type ParagraphExamQuestionInput,
  type ParagraphExamStatus,
  type ParagraphExamDatabaseError,
  type ParagraphExamGradeBand,
  type ParagraphExamQuestionOptions,
} from "./types";
import { isSelectedOption, isUuid } from "./validation";

const EXAMS_TABLE = "paragraph_exams";
const PASSAGES_TABLE = "paragraph_exam_passages";
const QUESTIONS_TABLE = "paragraph_exam_questions";
const ATTEMPTS_TABLE = "paragraph_exam_attempts";
const ANSWERS_TABLE = "paragraph_exam_answers";

const EXAM_FIELDS = "id,title,description,grade_band,duration_seconds,status,version,created_by,created_at,updated_at";
const PASSAGE_FIELDS = "id,exam_id,label,passage_text,position,created_at,updated_at";
const QUESTION_FIELDS = "id,exam_id,passage_id,source_question_id,question_text,options,correct_option,explanation,category,difficulty,grade_band,position,points,created_at,updated_at";
const ANSWER_FIELDS = "id,attempt_id,exam_question_id,selected_option,saved_at,created_at,updated_at";
export type ParagraphExamDeleteImpact = {
  exam: Pick<ParagraphExam, "id" | "title" | "status">;
  attemptCount: number;
  answerCount: number;
};

export type ParagraphExamDeleteResult = ParagraphExamDeleteImpact & {
  deleted: true;
};

type DeleteExamDependencies = {
  rpc?: (functionName: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: ParagraphExamDatabaseError | null }>;
};

export class ParagraphExamRepositoryError extends Error {
  code?: string;
  constraint?: string;
  status?: number;

  constructor(message: string, options: { code?: string; constraint?: string; status?: number } = {}) {
    super(message);
    this.name = "ParagraphExamRepositoryError";
    this.code = options.code;
    this.constraint = options.constraint;
    this.status = options.status;
  }
}

function client(): SupabaseClient {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new ParagraphExamRepositoryError("Supabase bağlantısı bulunamadı.", { status: 503 });
  return supabase;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(row: Record<string, unknown>, key: string): string {
  return typeof row[key] === "string" ? String(row[key]) : "";
}

function nullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0);
}

function nullableNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapError(error: ParagraphExamDatabaseError, fallback: string): ParagraphExamRepositoryError {
  const constraint = error.constraint ?? error.message?.match(/unique constraint "([^"]+)"/i)?.[1];
  return new ParagraphExamRepositoryError(error.message || fallback, { code: error.code, constraint });
}

function mapExam(row: unknown): ParagraphExam | null {
  const value = record(row);
  const id = stringValue(value, "id");
  const title = stringValue(value, "title");
  const status = stringValue(value, "status") as ParagraphExamStatus;
  if (!isUuid(id) || !title || !["draft", "published", "archived"].includes(status)) return null;
  return {
    id,
    title,
    description: nullableString(value, "description"),
    gradeBand: stringValue(value, "grade_band") as ParagraphExamGradeBand,
    durationSeconds: numberValue(value, "duration_seconds"),
    status,
    version: numberValue(value, "version"),
    createdBy: nullableString(value, "created_by"),
    createdAt: stringValue(value, "created_at"),
    updatedAt: stringValue(value, "updated_at"),
  };
}

function mapPassage(row: unknown): ParagraphExamPassage | null {
  const value = record(row);
  const id = stringValue(value, "id");
  const examId = stringValue(value, "exam_id");
  const passageText = stringValue(value, "passage_text");
  if (!isUuid(id) || !isUuid(examId) || !passageText) return null;
  return {
    id,
    examId,
    label: nullableString(value, "label"),
    passageText,
    position: numberValue(value, "position"),
    createdAt: stringValue(value, "created_at"),
    updatedAt: stringValue(value, "updated_at"),
  };
}

function mapOptions(value: unknown): ParagraphExamQuestionOptions | null {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 5) || value.some((option) => typeof option !== "string")) return null;
  const options = value.map((option) => option.trim());
  if (options.slice(0, 4).some((option) => !option)) return null;
  if (options.length === 5 && !options[4]) return options.slice(0, 4) as ParagraphExamQuestionOptions;
  return options as ParagraphExamQuestionOptions;
}

function mapQuestion(row: unknown): ParagraphExamQuestion | null {
  const value = record(row);
  const id = stringValue(value, "id");
  const examId = stringValue(value, "exam_id");
  const options = mapOptions(value.options);
  const correctOption = numberValue(value, "correct_option");
  if (!isUuid(id) || !isUuid(examId) || !options || !Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) return null;
  return {
    id,
    examId,
    passageId: nullableString(value, "passage_id"),
    sourceQuestionId: nullableString(value, "source_question_id"),
    questionText: stringValue(value, "question_text"),
    options,
    correctOption,
    explanation: stringValue(value, "explanation"),
    category: stringValue(value, "category") as ParagraphCategory,
    difficulty: stringValue(value, "difficulty") as ParagraphExamDifficulty,
    gradeBand: stringValue(value, "grade_band") as ParagraphExamGradeBand,
    position: numberValue(value, "position"),
    points: numberValue(value, "points"),
    createdAt: stringValue(value, "created_at"),
    updatedAt: stringValue(value, "updated_at"),
  };
}

function mapAnswer(row: unknown): ParagraphExamAnswer | null {
  const value = record(row);
  const id = stringValue(value, "id");
  const attemptId = stringValue(value, "attempt_id");
  const examQuestionId = stringValue(value, "exam_question_id");
  if (!isUuid(id) || !isUuid(attemptId) || !isUuid(examQuestionId)) return null;
  const selectedOption = nullableNumber(value, "selected_option");
  if (!isSelectedOption(selectedOption)) return null;
  return {
    id,
    attemptId,
    examQuestionId,
    selectedOption,
    savedAt: stringValue(value, "saved_at"),
    createdAt: stringValue(value, "created_at"),
    updatedAt: stringValue(value, "updated_at"),
  };
}

async function single<T>(query: PromiseLike<{ data: unknown; error: ParagraphExamDatabaseError | null }>, mapper: (row: unknown) => T | null, notFound: string): Promise<T> {
  const result = await query;
  if (result.error) throw mapError(result.error, notFound);
  const mapped = mapper(result.data);
  if (!mapped) throw new ParagraphExamRepositoryError(notFound, { status: 404 });
  return mapped;
}

export async function listExams(status?: ParagraphExamStatus | string): Promise<ParagraphExam[]> {
  let query = client().from(EXAMS_TABLE).select(EXAM_FIELDS).order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const result = await query;
  if (result.error) throw mapError(result.error, "Sınavlar alınamadı.");
  return (result.data ?? []).map(mapExam).filter((exam): exam is ParagraphExam => exam !== null);
}

export async function getExam(examId: string, options: { publishedOnly?: boolean } = {}): Promise<ParagraphExam> {
  if (!isUuid(examId)) throw new ParagraphExamRepositoryError("Sınav kimliği geçersiz.", { status: 400 });
  let query = client().from(EXAMS_TABLE).select(EXAM_FIELDS).eq("id", examId);
  if (options.publishedOnly) query = query.eq("status", "published");
  return single(query.maybeSingle(), mapExam, "Sınav bulunamadı.");
}

export async function getPassages(examId: string): Promise<ParagraphExamPassage[]> {
  const result = await client().from(PASSAGES_TABLE).select(PASSAGE_FIELDS).eq("exam_id", examId).order("position", { ascending: true });
  if (result.error) throw mapError(result.error, "Pasajlar alınamadı.");
  return (result.data ?? []).map(mapPassage).filter((passage): passage is ParagraphExamPassage => passage !== null);
}

export async function getQuestions(examId: string): Promise<ParagraphExamQuestion[]> {
  const result = await client().from(QUESTIONS_TABLE).select(QUESTION_FIELDS).eq("exam_id", examId).order("position", { ascending: true });
  if (result.error) throw mapError(result.error, "Sorular alınamadı.");
  return (result.data ?? []).map(mapQuestion).filter((question): question is ParagraphExamQuestion => question !== null);
}

export async function getDeleteExamImpact(examId: string): Promise<ParagraphExamDeleteImpact> {
  const exam = await getExam(examId);
  const attempts = await client().from(ATTEMPTS_TABLE).select("id").eq("exam_id", examId);
  if (attempts.error) throw mapError(attempts.error, "Öğrenci kayıtları doğrulanamadı.");
  const attemptIds = (attempts.data ?? []).map((row) => stringValue(record(row), "id")).filter(Boolean);
  let answerCount = 0;
  if (attemptIds.length > 0) {
    const answers = await client().from(ANSWERS_TABLE).select("id", { count: "exact", head: true }).in("attempt_id", attemptIds);
    if (answers.error) throw mapError(answers.error, "Öğrenci cevapları doğrulanamadı.");
    answerCount = answers.count ?? 0;
  }
  return { exam: { id: exam.id, title: exam.title, status: exam.status }, attemptCount: attemptIds.length, answerCount };
}
export async function getAnswers(attemptId: string): Promise<ParagraphExamAnswer[]> {
  const result = await client().from(ANSWERS_TABLE).select(ANSWER_FIELDS).eq("attempt_id", attemptId);
  if (result.error) throw mapError(result.error, "Cevaplar alınamadı.");
  return (result.data ?? []).map(mapAnswer).filter((answer): answer is ParagraphExamAnswer => answer !== null);
}

export async function createDraftExam(input: ParagraphExamInput, createdBy: string | null): Promise<ParagraphExam> {
  const result = await client().from(EXAMS_TABLE).insert({
    title: input.title,
    description: input.description ?? null,
    grade_band: input.gradeBand,
    duration_seconds: input.durationSeconds,
    status: "draft",
    version: 1,
    created_by: createdBy?.trim() || null,
  }).select(EXAM_FIELDS).single();
  if (result.error) throw mapError(result.error, "Taslak sınav oluşturulamadı.");
  return mapExam(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Oluşturulan sınav doğrulanamadı."); })();
}

async function ensureDraft(examId: string): Promise<ParagraphExam> {
  const exam = await getExam(examId);
  if (exam.status !== "draft") throw new ParagraphExamRepositoryError("Yalnızca taslak sınav düzenlenebilir.", { status: 409 });
  return exam;
}

export async function updateDraftExam(examId: string, input: ParagraphExamInput): Promise<ParagraphExam> {
  await ensureDraft(examId);
  const result = await client().from(EXAMS_TABLE).update({
    title: input.title,
    description: input.description ?? null,
    grade_band: input.gradeBand,
    duration_seconds: input.durationSeconds,
    updated_at: new Date().toISOString(),
  }).eq("id", examId).eq("status", "draft").select(EXAM_FIELDS).single();
  if (result.error) throw mapError(result.error, "Taslak sınav güncellenemedi.");
  return mapExam(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Güncellenen sınav doğrulanamadı."); })();
}

export async function upsertPassage(examId: string, passageId: string | null, input: ParagraphExamPassageInput): Promise<ParagraphExamPassage> {
  await ensureDraft(examId);
  if (passageId && !isUuid(passageId)) throw new ParagraphExamRepositoryError("Pasaj kimliği geçersiz.", { status: 400 });
  const values = {
    exam_id: examId,
    label: input.label ?? null,
    passage_text: input.passageText,
    position: input.position,
    updated_at: new Date().toISOString(),
  };
  const query = passageId
    ? client().from(PASSAGES_TABLE).update(values).eq("id", passageId).eq("exam_id", examId)
    : client().from(PASSAGES_TABLE).insert(values);
  const result = await query.select(PASSAGE_FIELDS).single();
  if (result.error) throw mapError(result.error, "Pasaj kaydedilemedi.");
  return mapPassage(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Kaydedilen pasaj doğrulanamadı."); })();
}

export async function deletePassage(examId: string, passageId: string): Promise<void> {
  await ensureDraft(examId);
  const result = await client().from(PASSAGES_TABLE).delete().eq("id", passageId).eq("exam_id", examId);
  if (result.error) throw mapError(result.error, "Pasaj silinemedi.");
}

export async function upsertQuestion(examId: string, questionId: string | null, input: ParagraphExamQuestionInput): Promise<ParagraphExamQuestion> {
  await ensureDraft(examId);
  if (questionId && !isUuid(questionId)) throw new ParagraphExamRepositoryError("Soru kimliği geçersiz.", { status: 400 });
  if (input.passageId) {
    const passage = await client().from(PASSAGES_TABLE).select("id").eq("id", input.passageId).eq("exam_id", examId).maybeSingle();
    if (passage.error) throw mapError(passage.error, "Pasaj doğrulanamadı.");
    if (!passage.data) throw new ParagraphExamRepositoryError("Soru pasaja ait değil.", { status: 400 });
  }
  const values = {
    exam_id: examId,
    passage_id: input.passageId ?? null,
    source_question_id: input.sourceQuestionId ?? null,
    question_text: input.questionText,
    options: input.options,
    correct_option: input.correctOption,
    explanation: input.explanation,
    category: input.category,
    difficulty: input.difficulty,
    grade_band: input.gradeBand,
    position: input.position,
    points: input.points ?? 1,
    updated_at: new Date().toISOString(),
  };
  const query = questionId
    ? client().from(QUESTIONS_TABLE).update(values).eq("id", questionId).eq("exam_id", examId)
    : client().from(QUESTIONS_TABLE).insert(values);
  const result = await query.select(QUESTION_FIELDS).single();
  if (result.error) throw mapError(result.error, "Soru kaydedilemedi.");
  return mapQuestion(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Kaydedilen soru doğrulanamadı."); })();
}

export async function deleteQuestion(examId: string, questionId: string): Promise<void> {
  await ensureDraft(examId);
  const result = await client().from(QUESTIONS_TABLE).delete().eq("id", questionId).eq("exam_id", examId);
  if (result.error) throw mapError(result.error, "Soru silinemedi.");
}

export async function reorderQuestions(examId: string, orderedQuestionIds: string[]): Promise<ParagraphExamQuestion[]> {
  await ensureDraft(examId);
  if (orderedQuestionIds.length === 0 || orderedQuestionIds.some((id) => !isUuid(id) || orderedQuestionIds.filter((candidate) => candidate === id).length !== 1)) {
    throw new ParagraphExamRepositoryError("Soru sırası geçersiz.", { status: 400 });
  }
  const questions = await getQuestions(examId);
  if (questions.length !== orderedQuestionIds.length || questions.some((question) => !orderedQuestionIds.includes(question.id))) {
    throw new ParagraphExamRepositoryError("Soru listesi sınavla eşleşmiyor.", { status: 400 });
  }
  for (const [index, id] of orderedQuestionIds.entries()) {
    const result = await client().from(QUESTIONS_TABLE).update({ position: index + 1, updated_at: new Date().toISOString() }).eq("id", id).eq("exam_id", examId);
    if (result.error) throw mapError(result.error, "Soru sırası güncellenemedi.");
  }
  return getQuestions(examId);
}

export async function publishExam(examId: string): Promise<ParagraphExam> {
  await ensureDraft(examId);
  const [passages, questions] = await Promise.all([getPassages(examId), getQuestions(examId)]);
  if (questions.length === 0) throw new ParagraphExamRepositoryError("Yayınlamak için en az bir soru gerekir.", { status: 400 });
  const positions = questions.map((question) => question.position).sort((a, b) => a - b);
  if (positions.some((position, index) => position !== index + 1)) throw new ParagraphExamRepositoryError("Soru sıraları 1'den başlamalı ve kesintisiz olmalıdır.", { status: 400 });
  if (passages.some((passage) => passage.position < 1)) throw new ParagraphExamRepositoryError("Pasaj sırası geçersiz.", { status: 400 });
  const result = await client().from(EXAMS_TABLE).update({ status: "published", updated_at: new Date().toISOString() }).eq("id", examId).eq("status", "draft").select(EXAM_FIELDS).single();
  if (result.error) throw mapError(result.error, "Sınav yayınlanamadı.");
  return mapExam(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Yayınlanan sınav doğrulanamadı."); })();
}

export async function archiveExam(examId: string): Promise<ParagraphExam> {
  const result = await client().from(EXAMS_TABLE).update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", examId).neq("status", "archived").select(EXAM_FIELDS).single();
  if (result.error) throw mapError(result.error, "Sınav arşivlenemedi.");
  return mapExam(result.data) ?? (() => { throw new ParagraphExamRepositoryError("Arşivlenen sınav doğrulanamadı."); })();
}

export async function deleteExam(examId: string, dependencies: DeleteExamDependencies = {}): Promise<ParagraphExamDeleteResult> {
  if (!isUuid(examId)) throw new ParagraphExamRepositoryError("Sınav kimliği geçersiz.", { status: 400 });
  const rpc = dependencies.rpc ?? ((functionName, args) => client().rpc(functionName, args));
  const result = await rpc("delete_paragraph_exam_force", { p_exam_id: examId });
  if (result.error) {
    if (result.error.code === "P0002") throw new ParagraphExamRepositoryError("Sınav bulunamadı.", { status: 404, code: result.error.code });
    throw mapError(result.error, "Deneme silinemedi.");
  }
  const value = record(result.data);
  return {
    deleted: true,
    exam: { id: stringValue(value, "exam_id"), title: stringValue(value, "title"), status: stringValue(value, "status") as ParagraphExamStatus },
    attemptCount: numberValue(value, "attempt_count"),
    answerCount: numberValue(value, "answer_count"),
  };
}
type ImportedDraftQuestion = {
  passageText: string;
  questionText: string;
  options: ParagraphExamQuestionOptions;
  correctOption: number;
  explanation: string;
  category: ParagraphCategory;
  difficulty: ParagraphExamDifficulty;
  position: number;
};

type ImportedDraftDependencies = {
  createExam: typeof createDraftExam;
  upsertPassage: typeof upsertPassage;
  upsertQuestion: typeof upsertQuestion;
  deleteExam: typeof deleteExam;
};

export async function createImportedDraftExam(
  input: ParagraphExamInput,
  questions: ImportedDraftQuestion[],
  createdBy: string | null,
  dependencies: ImportedDraftDependencies = { createExam: createDraftExam, upsertPassage, upsertQuestion, deleteExam },
): Promise<ParagraphExam> {
  const exam = await dependencies.createExam(input, createdBy);
  try {
    for (const question of questions) {
      const passage = await dependencies.upsertPassage(exam.id, null, {
        label: "Soru " + question.position,
        passageText: question.passageText,
        position: question.position,
      });
      await dependencies.upsertQuestion(exam.id, null, {
        passageId: passage.id,
        sourceQuestionId: null,
        questionText: question.questionText,
        options: [...question.options],
        correctOption: question.correctOption,
        explanation: question.explanation,
        category: question.category,
        difficulty: question.difficulty,
        gradeBand: input.gradeBand,
        position: question.position,
        points: 1,
      });
    }
    return exam;
  } catch (error) {
    try {
      await dependencies.deleteExam(exam.id);
    } catch (cleanupError) {
      console.error("paragraph_exam_import_cleanup_failed", { examId: exam.id, cleanupError });
    }
    throw error;
  }
}
export async function duplicateExam(examId: string, createdBy: string | null): Promise<ParagraphExam> {
  const source = await getExam(examId);
  const [passages, questions] = await Promise.all([getPassages(examId), getQuestions(examId)]);
  const copy = await createDraftExam({
    title: `${source.title} (Kopya)`.slice(0, 200),
    description: source.description,
    gradeBand: source.gradeBand,
    durationSeconds: source.durationSeconds,
  }, createdBy);
  for (const passage of passages) await upsertPassage(copy.id, null, { label: passage.label, passageText: passage.passageText, position: passage.position });
  const copiedPassages = await getPassages(copy.id);
  const passageMap = new Map(passages.map((passage) => [passage.id, copiedPassages.find((candidate) => candidate.position === passage.position)?.id ?? null]));
  for (const question of questions) {
    await upsertQuestion(copy.id, null, {
      passageId: question.passageId ? passageMap.get(question.passageId) ?? null : null,
      sourceQuestionId: question.sourceQuestionId,
      questionText: question.questionText,
      options: [...question.options],
      correctOption: question.correctOption,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty,
      gradeBand: question.gradeBand,
      position: question.position,
      points: question.points,
    });
  }
  return getExam(copy.id);
}
