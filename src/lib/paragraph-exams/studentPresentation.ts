import type { ParagraphExamResultQuestionDto, SafeParagraphExamPassage, SafeParagraphExamQuestion } from "./types";

export type StudentExamQuestion = SafeParagraphExamQuestion | ParagraphExamResultQuestionDto;
export type StudentQuestionGroup = { passage: SafeParagraphExamPassage | null; questions: StudentExamQuestion[] };

export function getRemainingSeconds(expiresAt: string, now = Date.now()): number {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
}
export function formatRemainingTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
export function getAnswerCounts(questions: readonly Pick<StudentExamQuestion, "selectedOption">[]) {
  const answered = questions.filter((question) => question.selectedOption !== null).length;
  return { answered, blank: questions.length - answered };
}
export function buildStudentQuestionGroups(questions: readonly StudentExamQuestion[], passages: readonly SafeParagraphExamPassage[]): StudentQuestionGroup[] {
  const passageById = new Map(passages.map((passage) => [passage.id, passage]));
  const passageGroups = new Map<string, StudentQuestionGroup>();
  const groups: StudentQuestionGroup[] = [];
  let standalone: StudentQuestionGroup | null = null;
  for (const question of [...questions].sort((left, right) => left.position - right.position)) {
    if (!question.passageId) {
      if (!standalone) { standalone = { passage: null, questions: [] }; groups.push(standalone); }
      standalone.questions.push(question);
      continue;
    }
    let group = passageGroups.get(question.passageId);
    if (!group) { group = { passage: passageById.get(question.passageId) ?? null, questions: [] }; passageGroups.set(question.passageId, group); groups.push(group); }
    group.questions.push(question);
  }
  return groups;
}