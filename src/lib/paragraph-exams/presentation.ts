import type { ParagraphExamPassage, ParagraphExamQuestion } from "./types";

const GENERATED_BANK_PASSAGE_LABEL = "Soru bankası pasajı";

export function createQuestionNumberMap(questions: Pick<ParagraphExamQuestion, "id">[]) {
  return new Map(questions.map((question, index) => [question.id, index + 1] as const));
}

export function getPassageDisplayLabel(passage: Pick<ParagraphExamPassage, "label" | "position">) {
  const label = passage.label?.trim();
  return label && label !== GENERATED_BANK_PASSAGE_LABEL ? label : "Paragraf " + passage.position;
}