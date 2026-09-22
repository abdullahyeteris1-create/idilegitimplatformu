import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { mapParagraphQuestionRow } from "./paragraphQuestionRepository";
import type {
  ParagraphCategory,
  ParagraphQuestion,
} from "./paragraphQuestions";

export const QUESTION_CATEGORIES = [
  "main_idea",
  "supporting_idea",
  "inference",
  "completion",
  "flow",
] as const;
export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_GRADES = ["4-5", "6-7", "8", "high-school"] as const;
export const QUESTION_SOURCES = ["migration", "manual", "ai"] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];
export type AdminParagraphQuestion = ParagraphQuestion & {
  isActive: boolean;
  source: QuestionSource;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};
export type QuestionInput = {
  category: ParagraphCategory;
  difficulty: ParagraphQuestion["level"];
  gradeBand: ParagraphQuestion["gradeBand"];
  passage: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isActive?: boolean;
};
export type DuplicateQuestionMatch = {
  inputIndex: number;
  existingId: string;
};

const table =
  process.env.NEXT_PUBLIC_SUPABASE_PARAGRAPH_QUESTIONS_TABLE ??
  "paragraph_questions";
const valid = (v: unknown, values: readonly string[]) =>
  typeof v === "string" && values.includes(v);
export function validateQuestionInput(
  value: unknown,
  options: { allowEmptyPassage?: boolean; allowFourOptions?: boolean } = {},
): { ok: true; value: QuestionInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object")
    return { ok: false, error: "Geçersiz soru verisi." };
  const v = value as Record<string, unknown>;
  if (
    !valid(v.category, QUESTION_CATEGORIES) ||
    !valid(v.difficulty, QUESTION_DIFFICULTIES) ||
    !valid(v.gradeBand, QUESTION_GRADES)
  )
    return { ok: false, error: "Kategori, zorluk veya sınıf düzeyi geçersiz." };
  const passage = typeof v.passage === "string" ? v.passage.trim() : null;
  if (
    passage === null ||
    passage.length > 20000 ||
    (!options.allowEmptyPassage && passage.length < 10) ||
    (options.allowEmptyPassage && passage.length > 0 && passage.length < 10)
  )
    return { ok: false, error: "Paragraf uzunluğu geçersiz." };
  if (
    typeof v.question !== "string" ||
    !v.question.trim() ||
    v.question.length > 2000
  )
    return { ok: false, error: "Soru metni geçersiz." };
  if (
    !Array.isArray(v.options) ||
    (v.options.length !== 5 && !(options.allowFourOptions && v.options.length === 4)) ||
    v.options.some((o) => typeof o !== "string" || !o.trim() || o.length > 500)
  )
    return { ok: false, error: "A-D seçenekleri zorunludur; E seçeneği isteğe bağlıdır." };
  const normalized = (v.options as string[]).map((o) =>
    o.trim().normalize("NFKC").toLocaleLowerCase("tr-TR"),
  );
  if (new Set(normalized).size !== normalized.length)
    return { ok: false, error: "Seçenekler birbirinden farklı olmalıdır." };
  if (
    !Number.isInteger(v.correctIndex) ||
    (v.correctIndex as number) < 0 ||
    (v.correctIndex as number) >= normalized.length
  )
    return { ok: false, error: "Doğru seçenek mevcut seçeneklerden biri olmalıdır." };
  if (
    typeof v.explanation !== "string" ||
    !v.explanation.trim() ||
    v.explanation.length > 4000
  )
    return { ok: false, error: "Açıklama geçersiz." };
  if (v.isActive !== undefined && typeof v.isActive !== "boolean")
    return { ok: false, error: "Aktiflik değeri geçersiz." };
  return {
    ok: true,
    value: {
      category: v.category as ParagraphCategory,
      difficulty: v.difficulty as ParagraphQuestion["level"],
      gradeBand: v.gradeBand as ParagraphQuestion["gradeBand"],
      passage,
      question: v.question.trim(),
      options: (v.options as string[]).map((o) => o.trim()),
      correctIndex: v.correctIndex as number,
      explanation: v.explanation.trim(),
      isActive: v.isActive as boolean | undefined,
    },
  };
}

function client() {
  return getSupabaseServiceRoleClient();
}
export class ParagraphQuestionRepositoryError extends Error {
  code?: string;
  constraint?: string;
  constructor(error: { code?: string; message?: string; constraint?: string }) {
    super(error.message ?? "Paragraph question repository error");
    this.name = "ParagraphQuestionRepositoryError";
    this.code = error.code;
    this.constraint = error.constraint ?? error.message?.match(/unique constraint "([^"]+)"/)?.[1];
  }
}
export const PARAGRAPH_QUESTION_IDEMPOTENCY_CONSTRAINT =
  "paragraph_questions_content_fingerprint_uidx";
export function isParagraphQuestionIdempotencyConflict(
  error: unknown,
): error is ParagraphQuestionRepositoryError {
  return (
    error instanceof ParagraphQuestionRepositoryError &&
    error.code === "23505" &&
    error.constraint === PARAGRAPH_QUESTION_IDEMPOTENCY_CONSTRAINT
  );
}
function map(row: Record<string, unknown>): AdminParagraphQuestion | null {
  const base = mapParagraphQuestionRow(row as never);
  if (
    !base ||
    !valid(row.source, QUESTION_SOURCES) ||
    typeof row.is_active !== "boolean" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  )
    return null;
  return {
    ...base,
    isActive: row.is_active,
    source: row.source as QuestionSource,
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
  };
}
const fields =
  "id,category,difficulty,grade_band,passage,question,options,correct_index,explanation,is_active,source,archived_at,created_at,updated_at,created_by";
const normalizeForFingerprint = (value: string) =>
  value
    .trim()
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("tr-TR");
export function createQuestionFingerprint(
  input: Pick<
    QuestionInput,
    | "category"
    | "difficulty"
    | "gradeBand"
    | "passage"
    | "question"
    | "options"
    | "correctIndex"
  >,
): string {
  const canonical = [
    input.category,
    input.difficulty,
    input.gradeBand,
    normalizeForFingerprint(input.passage),
    normalizeForFingerprint(input.question),
    input.options.map(normalizeForFingerprint).join("\u001f"),
    String(input.correctIndex),
  ].join("\u001e");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
export function createQuestionContentFingerprint(
  input: Pick<QuestionInput, "passage" | "question" | "options" | "correctIndex">,
): string {
  const canonical = [
    normalizeForFingerprint(input.passage),
    normalizeForFingerprint(input.question),
    input.options.map(normalizeForFingerprint).join("\u001f"),
    String(input.correctIndex),
  ].join("\u001e");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export class ParagraphQuestionDuplicateError extends Error {
  matches: DuplicateQuestionMatch[];

  constructor(matches: DuplicateQuestionMatch[]) {
    super("Seçilen sorulardan biri soru bankasında zaten bulunuyor.");
    this.name = "ParagraphQuestionDuplicateError";
    this.matches = matches;
  }
}

export async function findQuestionDuplicates(
  inputs: QuestionInput[],
  c = client(),
): Promise<DuplicateQuestionMatch[]> {
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const matches: DuplicateQuestionMatch[] = [];
  const firstByFingerprint = new Map<string, number>();
  for (const [inputIndex, input] of inputs.entries()) {
    const fingerprint = createQuestionContentFingerprint(input);
    const firstIndex = firstByFingerprint.get(fingerprint);
    if (firstIndex !== undefined) {
      matches.push({ inputIndex, existingId: `batch:${firstIndex + 1}` });
    } else {
      firstByFingerprint.set(fingerprint, inputIndex);
    }
  }

  const { data, error } = await c
    .from(table)
    .select("id,passage,question,options,correct_index")
    .limit(10000);
  if (error) throw new ParagraphQuestionRepositoryError(error);
  const existingByFingerprint = new Map<string, string>();
  for (const row of data ?? []) {
    if (!row || typeof row !== "object" || typeof row.id !== "string") continue;
    const options = Array.isArray(row.options) ? row.options.filter((item): item is string => typeof item === "string") : [];
    const correctIndex = typeof row.correct_index === "number" ? row.correct_index : Number(row.correct_index);
    if (typeof row.passage !== "string" || typeof row.question !== "string" || !Number.isInteger(correctIndex) || options.length < 4) continue;
    existingByFingerprint.set(createQuestionContentFingerprint({ passage: row.passage, question: row.question, options, correctIndex }), row.id);
  }
  for (const [inputIndex, input] of inputs.entries()) {
    if (matches.some((match) => match.inputIndex === inputIndex)) continue;
    const existingId = existingByFingerprint.get(createQuestionContentFingerprint(input));
    if (existingId) matches.push({ inputIndex, existingId });
  }
  return matches;
}

export async function createQuestionsBulk(
  inputs: QuestionInput[],
  source: QuestionSource = "manual",
) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const duplicates = await findQuestionDuplicates(inputs, c);
  if (duplicates.length > 0) throw new ParagraphQuestionDuplicateError(duplicates);
  const rows = inputs.map((input) => ({
    id: `paragraph-${source}-${crypto.randomUUID()}`,
    category: input.category,
    difficulty: input.difficulty,
    grade_band: input.gradeBand,
    passage: input.passage,
    question: input.question,
    options: input.options,
    correct_index: input.correctIndex,
    explanation: input.explanation,
    is_active: false,
    source,
    created_by: process.env.ADMIN_USERNAME?.trim() || "teacher",
    content_fingerprint: source === "manual" || source === "ai" ? createQuestionFingerprint(input) : undefined,
  }));
  const { data, error } = await c.from(table).insert(rows).select(fields);
  if (error) throw new ParagraphQuestionRepositoryError(error);
  if (!Array.isArray(data) || data.length !== inputs.length) throw new Error("Toplu soru kaydı doğrulanamadı.");
  const mapped = data.map((row) => map(row as Record<string, unknown>));
  if (mapped.some((question) => question === null)) throw new Error("Toplu oluşturulan kayıtlar doğrulanamadı.");
  return mapped as AdminParagraphQuestion[];
}
export async function createQuestion(
  input: QuestionInput,
  source: QuestionSource = "manual",
) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const id = `paragraph-${source}-${crypto.randomUUID()}`;
  const contentFingerprint =
    source === "manual" || source === "ai"
      ? createQuestionFingerprint(input)
      : undefined;
  const { data, error } = await c
    .from(table)
    .insert({
      id,
      category: input.category,
      difficulty: input.difficulty,
      grade_band: input.gradeBand,
      passage: input.passage,
      question: input.question,
      options: input.options,
      correct_index: input.correctIndex,
      explanation: input.explanation,
      is_active: input.isActive ?? false,
      source,
      created_by: process.env.ADMIN_USERNAME?.trim() || "teacher",
      ...(contentFingerprint ? { content_fingerprint: contentFingerprint } : {}),
    })
    .select(fields)
    .single();
  if (error) throw new ParagraphQuestionRepositoryError(error);
  const result = map(data as Record<string, unknown>);
  if (!result) throw new Error("Oluşturulan kayıt doğrulanamadı.");
  return result;
}
export async function updateQuestion(id: string, input: QuestionInput) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const { data, error } = await c
    .from(table)
    .update({
      category: input.category,
      difficulty: input.difficulty,
      grade_band: input.gradeBand,
      passage: input.passage,
      question: input.question,
      options: input.options,
      correct_index: input.correctIndex,
      explanation: input.explanation,
      is_active: input.isActive ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(fields)
    .single();
  if (error) throw error;
  const result = map(data as Record<string, unknown>);
  if (!result) throw new Error("Güncellenen kayıt doğrulanamadı.");
  return result;
}
export async function setActive(id: string, active: boolean) {
  return mutate(id, {
    is_active: active,
    updated_at: new Date().toISOString(),
  });
}
export async function archiveQuestion(id: string) {
  return mutate(id, {
    is_active: false,
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
export async function restoreQuestion(id: string) {
  return mutate(id, {
    is_active: false,
    archived_at: null,
    updated_at: new Date().toISOString(),
  });
}
async function mutate(id: string, values: Record<string, unknown>) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const { data, error } = await c
    .from(table)
    .update(values)
    .eq("id", id)
    .select(fields)
    .single();
  if (error) throw error;
  const result = map(data as Record<string, unknown>);
  if (!result) throw new Error("Kayıt doğrulanamadı.");
  return result;
}
export async function getQuestion(id: string) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const { data, error } = await c
    .from(table)
    .select(fields)
    .eq("id", id)
    .single();
  if (error) throw error;
  return map(data as Record<string, unknown>);
}
export async function listQuestions(params: {
  page: number;
  pageSize: number;
  category?: string;
  difficulty?: string;
  gradeBand?: string;
  status?: string;
  source?: string;
  search?: string;
}) {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  let q = c
    .from(table)
    .select(fields, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(
      (params.page - 1) * params.pageSize,
      params.page * params.pageSize - 1,
    );
  if (valid(params.category, QUESTION_CATEGORIES))
    q = q.eq("category", params.category);
  if (valid(params.difficulty, QUESTION_DIFFICULTIES))
    q = q.eq("difficulty", params.difficulty);
  if (valid(params.gradeBand, QUESTION_GRADES))
    q = q.eq("grade_band", params.gradeBand);
  if (valid(params.source, QUESTION_SOURCES)) q = q.eq("source", params.source);
  if (params.status === "active")
    q = q.eq("is_active", true).is("archived_at", null);
  else if (params.status === "passive")
    q = q.eq("is_active", false).is("archived_at", null);
  else if (params.status === "archived") q = q.not("archived_at", "is", null);
  else if (params.status === "available") q = q.is("archived_at", null);
  if (params.search?.trim()) {
    const term = params.search
      .trim()
      .slice(0, 80)
      .replace(/[%,()]/g, " ");
    q = q.or(
      `id.ilike.%${term}%,question.ilike.%${term}%,passage.ilike.%${term}%`,
    );
  }
  const { data, error, count } = await q;
  if (error) throw error;
  return {
    items: (data ?? [])
      .map((r) => map(r as Record<string, unknown>))
      .filter(Boolean) as AdminParagraphQuestion[],
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}
export async function stats() {
  const c = client();
  if (!c) throw new Error("Supabase istemcisi kullanılamıyor.");
  const count = async (filter: (q: any) => any) => {
    let q = c.from(table).select("id", { count: "exact", head: true });
    q = filter(q);
    const r = await q;
    if (r.error) throw r.error;
    return r.count ?? 0;
  };
  const [total, active, passive, archived, manual, ai] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("is_active", true).is("archived_at", null)),
    count((q) => q.eq("is_active", false).is("archived_at", null)),
    count((q) => q.not("archived_at", "is", null)),
    count((q) => q.eq("source", "manual")),
    count((q) => q.eq("source", "ai")),
  ]);
  return { total, active, passive, archived, manual, ai };
}
