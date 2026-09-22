import {
  parseDocxFile,
  parseParagraphExamText,
  type ImportWarning,
  type ParagraphExamImportPreview,
} from "@/lib/paragraph-exams/importer";
import type { ParagraphCategory, ParagraphQuestion } from "./paragraphQuestions";

export type QuestionBankImportStatus = "ready" | "review" | "error" | "duplicate";

export type QuestionBankImportQuestion = {
  importId: string;
  number: number;
  passageText: string;
  questionText: string;
  options: string[];
  answerLetter: string | null;
  correctOption: number | null;
  explanation: string;
  category: ParagraphCategory;
  difficulty: ParagraphQuestion["level"];
  gradeBand: ParagraphQuestion["gradeBand"];
  warnings: ImportWarning[];
  status: QuestionBankImportStatus;
  duplicateId: string | null;
  sharedGroupId: string | null;
};

export type QuestionBankImportPreview = {
  fileName: string;
  questionCount: number;
  answerCount: number;
  readyCount: number;
  reviewCount: number;
  errorCount: number;
  duplicateCount: number;
  questions: QuestionBankImportQuestion[];
  sharedGroups: ParagraphExamImportPreview["sharedGroups"];
  warnings: ImportWarning[];
};

export type QuestionBankImportDraft = {
  passage: string;
  question: string;
  options: string[];
  correctIndex: number | null;
  explanation: string;
  category: ParagraphCategory;
  difficulty: ParagraphQuestion["level"];
  gradeBand: ParagraphQuestion["gradeBand"];
};

const answerErrors = new Set([
  "missing_answer",
  "invalid_answer",
  "answer_option_missing",
]);

function getCounts(questions: QuestionBankImportQuestion[]) {
  return {
    readyCount: questions.filter((question) => question.status === "ready").length,
    reviewCount: questions.filter((question) => question.status === "review").length,
    errorCount: questions.filter((question) => question.status === "error").length,
    duplicateCount: questions.filter((question) => question.status === "duplicate").length,
  };
}

export function mapParagraphExamImportToQuestionBank(
  preview: ParagraphExamImportPreview,
  gradeBand: ParagraphQuestion["gradeBand"] = "6-7",
): QuestionBankImportPreview {
  const questions = preview.questions.map((question) => {
    const hasAnswerError = question.warnings.some((item) => answerErrors.has(item.code));
    const status: QuestionBankImportStatus = question.status === "error" || hasAnswerError
      ? "error"
      : question.status === "review"
        ? "review"
        : "ready";
    return {
      importId: question.importId,
      number: question.number,
      passageText: question.passageText,
      questionText: question.questionText,
      options: question.options,
      answerLetter: question.answerLetter,
      correctOption: question.correctOption,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty,
      gradeBand,
      warnings: question.warnings,
      status,
      duplicateId: null,
      sharedGroupId: question.sharedGroupId,
    };
  });
  return {
    fileName: preview.fileName,
    questionCount: preview.questionCount,
    answerCount: preview.answerCount,
    ...getCounts(questions),
    questions,
    sharedGroups: preview.sharedGroups,
    warnings: preview.warnings,
  };
}

export function addQuestionBankDuplicate(
  preview: QuestionBankImportPreview,
  importId: string,
  duplicateId: string,
): QuestionBankImportPreview {
  const questions = preview.questions.map((question) => question.importId === importId
    ? {
      ...question,
      status: question.status === "error" ? "error" as const : "duplicate" as const,
      duplicateId,
      warnings: question.warnings.some((item) => item.code === "duplicate_question")
        ? question.warnings
        : [...question.warnings, { code: "duplicate_question", message: "Bu soru soru bankasında zaten bulunuyor olabilir." }],
    }
    : question);
  return { ...preview, ...getCounts(questions), questions };
}

export function toQuestionBankImportDraft(
  question: QuestionBankImportQuestion,
): QuestionBankImportDraft {
  return {
    passage: question.passageText,
    question: question.questionText,
    options: question.options,
    correctIndex: question.correctOption,
    explanation: question.explanation,
    category: question.category,
    difficulty: question.difficulty,
    gradeBand: question.gradeBand,
  };
}

export function parseQuestionBankText(
  text: string,
  fileName = "soru-bankasi.docx",
  gradeBand: ParagraphQuestion["gradeBand"] = "6-7",
): QuestionBankImportPreview {
  return mapParagraphExamImportToQuestionBank(parseParagraphExamText(text, fileName), gradeBand);
}

export async function parseQuestionBankDocxFile(
  file: Parameters<typeof parseDocxFile>[0],
  gradeBand: ParagraphQuestion["gradeBand"] = "6-7",
): Promise<QuestionBankImportPreview> {
  return mapParagraphExamImportToQuestionBank(await parseDocxFile(file), gradeBand);
}
