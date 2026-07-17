import { supabase } from "@/lib/supabase/client";

const QUESTION_LIBRARY_STORAGE_KEY = "idil_question_library";
const QUESTION_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_QUESTION_LIBRARY_TABLE ?? "question_library";

export type ComprehensionQuestion = {
  id: string;
  textId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  isActive: boolean;
  questionOrder?: number;
  createdAt: string;
  updatedAt: string;
  questionType?: string;
};

export type ComprehensionQuestionInput = Omit<ComprehensionQuestion, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type QuestionPatch = Partial<Omit<ComprehensionQuestionInput, "id" | "createdAt">>;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function generateQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `question-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseOptions(parsed);
    } catch {
      return value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

function readQuestionsRaw(): ComprehensionQuestion[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(QUESTION_LIBRARY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ComprehensionQuestion[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string").map(normalizeStoredQuestion) : [];
  } catch {
    return [];
  }
}

function writeQuestions(questions: ComprehensionQuestion[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(QUESTION_LIBRARY_STORAGE_KEY, JSON.stringify(questions));
}

function normalizeStoredQuestion(question: ComprehensionQuestion): ComprehensionQuestion {
  const options = normalizeOptions(question.options);
  const safeCorrectAnswer = options.includes(question.correctAnswer) ? question.correctAnswer.trim() : options[0] ?? "";

  return {
    ...question,
    textId: normalizeText(question.textId),
    question: normalizeText(question.question),
    options,
    correctAnswer: safeCorrectAnswer,
    explanation: normalizeText(question.explanation) || undefined,
    isActive: question.isActive !== false,
    questionOrder: typeof question.questionOrder === "number" ? question.questionOrder : 0,
    createdAt: question.createdAt ?? new Date().toISOString(),
    updatedAt: question.updatedAt ?? question.createdAt ?? new Date().toISOString(),
    questionType: normalizeText(question.questionType) || undefined,
  };
}

function normalizeQuestionInput(input: ComprehensionQuestionInput): ComprehensionQuestion {
  const now = new Date().toISOString();
  const options = normalizeOptions(input.options);
  const safeCorrectAnswer = options.includes(input.correctAnswer) ? input.correctAnswer.trim() : options[0] ?? "";

  return {
    id: input.id ?? generateQuestionId(),
    textId: normalizeText(input.textId),
    question: normalizeText(input.question),
    options,
    correctAnswer: safeCorrectAnswer,
    explanation: normalizeText(input.explanation) || undefined,
    isActive: input.isActive !== false,
    questionOrder: typeof input.questionOrder === "number" ? input.questionOrder : 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    questionType: normalizeText(input.questionType) || undefined,
  };
}

function mapSupabaseRowToQuestion(row: Record<string, unknown>): ComprehensionQuestion {
  return normalizeStoredQuestion({
    id: String(row.id ?? generateQuestionId()),
    textId: String(row.text_id ?? row.textId ?? ""),
    question: String(row.question ?? ""),
    options: parseOptions(row.options),
    correctAnswer: String(row.correct_answer ?? row.correctAnswer ?? ""),
    explanation: typeof row.explanation === "string" ? row.explanation : undefined,
    isActive: typeof row.is_active === "boolean" ? row.is_active : typeof row.isActive === "boolean" ? row.isActive : true,
    questionOrder:
      typeof row.question_order === "number"
        ? row.question_order
        : typeof row.questionOrder === "number"
          ? row.questionOrder
          : 0,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString(),
    updatedAt:
      typeof row.updated_at === "string"
        ? row.updated_at
        : typeof row.updatedAt === "string"
          ? row.updatedAt
          : new Date().toISOString(),
    questionType: typeof row.question_type === "string" ? row.question_type : typeof row.questionType === "string" ? row.questionType : undefined,
  });
}

function mapQuestionToSupabaseRow(question: ComprehensionQuestion): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    text_id: question.textId,
    question: question.question,
    options: question.options,
    correct_answer: question.correctAnswer,
    explanation: question.explanation ?? null,
    is_active: question.isActive,
    question_order: question.questionOrder ?? 0,
    question_type: question.questionType ?? "multiple_choice",
    updated_at: new Date().toISOString(),
  };

  if (question.id) {
    payload.id = question.id;
  }

  return payload;
}

function sortQuestions(questions: ComprehensionQuestion[]): ComprehensionQuestion[] {
  return [...questions].sort((left, right) => {
    const leftOrder = typeof left.questionOrder === "number" ? left.questionOrder : 0;
    const rightOrder = typeof right.questionOrder === "number" ? right.questionOrder : 0;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function normalizeQuestionLibrary(questions: ComprehensionQuestion[]): ComprehensionQuestion[] {
  return sortQuestions(questions.map(normalizeStoredQuestion));
}

function getNextQuestionOrder(questions: ComprehensionQuestion[], textId: string): number {
  const existingOrders = questions.filter((question) => question.textId === textId).map((question) => question.questionOrder ?? 0);
  if (existingOrders.length === 0) {
    return 0;
  }

  return Math.max(...existingOrders) + 1;
}

function syncQuestionInLocalCache(question: ComprehensionQuestion): void {
  const currentQuestions = getQuestions();
  const existingIndex = currentQuestions.findIndex((item) => item.id === question.id);
  const nextQuestions = [...currentQuestions];

  if (existingIndex >= 0) {
    nextQuestions[existingIndex] = question;
  } else {
    nextQuestions.unshift(question);
  }

  writeQuestions(normalizeQuestionLibrary(nextQuestions));
}

async function fetchQuestionsFromSupabase(): Promise<ComprehensionQuestion[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from(QUESTION_LIBRARY_TABLE).select("*").order("question_order", { ascending: true });

  if (error || !Array.isArray(data)) {
    return null;
  }

  return normalizeQuestionLibrary(data.map((row) => mapSupabaseRowToQuestion(row as Record<string, unknown>)));
}

async function upsertQuestionToSupabase(question: ComprehensionQuestion): Promise<void> {
  if (!supabase) {
    return;
  }

  const payload = mapQuestionToSupabaseRow(question);
  const { data, error } = await supabase.from(QUESTION_LIBRARY_TABLE).upsert(payload, { onConflict: "id" }).select("*").single();

  if (error || !data) {
    if (error) {
      console.error("Supabase question_library upsert failed", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload,
      });
    }

    return;
  }

  syncQuestionInLocalCache(mapSupabaseRowToQuestion(data as Record<string, unknown>));
}

async function deleteQuestionFromSupabase(questionId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(QUESTION_LIBRARY_TABLE).delete().eq("id", questionId);
  if (error) {
    console.error("Supabase question_library delete failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      questionId,
    });
  }
}

export function getQuestions(): ComprehensionQuestion[] {
  return normalizeQuestionLibrary(readQuestionsRaw());
}

export function getQuestionsByTextId(textId: string): ComprehensionQuestion[] {
  const normalizedTextId = normalizeText(textId);
  return sortQuestions(getQuestions().filter((question) => question.textId === normalizedTextId));
}

export function getActiveQuestionsByTextId(textId: string): ComprehensionQuestion[] {
  return getQuestionsByTextId(textId).filter((question) => question.isActive);
}

export function getTextIdsWithActiveQuestions(): string[] {
  return Array.from(new Set(getQuestions().filter((question) => question.isActive).map((question) => question.textId))).filter(Boolean);
}

export function createQuestion(question: ComprehensionQuestionInput): ComprehensionQuestion {
  const currentQuestions = getQuestions();
  const normalizedQuestion = normalizeQuestionInput({
    ...question,
    questionOrder: typeof question.questionOrder === "number" ? question.questionOrder : getNextQuestionOrder(currentQuestions, question.textId),
  });

  writeQuestions(normalizeQuestionLibrary([normalizedQuestion, ...currentQuestions]));
  void upsertQuestionToSupabase(normalizedQuestion);

  return normalizedQuestion;
}

export function updateQuestion(questionId: string, patch: QuestionPatch): ComprehensionQuestion | null {
  const currentQuestions = getQuestions();
  const existingQuestion = currentQuestions.find((question) => question.id === questionId);

  if (!existingQuestion) {
    return null;
  }

  const nextQuestion = normalizeQuestionInput({
    ...existingQuestion,
    ...patch,
    id: existingQuestion.id,
    createdAt: existingQuestion.createdAt,
    updatedAt: new Date().toISOString(),
    questionOrder: typeof patch.questionOrder === "number" ? patch.questionOrder : existingQuestion.questionOrder,
  });

  const nextQuestions = currentQuestions.map((question) => (question.id === questionId ? nextQuestion : question));
  writeQuestions(normalizeQuestionLibrary(nextQuestions));
  void upsertQuestionToSupabase(nextQuestion);

  return nextQuestion;
}

export function deleteQuestion(questionId: string): boolean {
  const currentQuestions = getQuestions();
  const nextQuestions = currentQuestions.filter((question) => question.id !== questionId);

  if (nextQuestions.length === currentQuestions.length) {
    return false;
  }

  writeQuestions(normalizeQuestionLibrary(nextQuestions));
  void deleteQuestionFromSupabase(questionId);
  return true;
}

export async function refreshQuestionLibraryCache(): Promise<ComprehensionQuestion[]> {
  const remoteQuestions = await fetchQuestionsFromSupabase();

  if (remoteQuestions && remoteQuestions.length > 0) {
    writeQuestions(remoteQuestions);
    return remoteQuestions;
  }

  return getQuestions();
}

export function mapQuestionToReadingQuestion(question: ComprehensionQuestion): { id: string; question: string; options: string[]; correctAnswerIndex: number } {
  const correctAnswerIndex = Math.max(0, question.options.findIndex((option) => option === question.correctAnswer));

  return {
    id: question.id,
    question: question.question,
    options: [...question.options],
    correctAnswerIndex,
  };
}