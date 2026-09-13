export type ParagraphAccessStudent = {
  paragraphExercisesEnabled?: unknown;
};

export function canAccessParagraphExercises(student: ParagraphAccessStudent | null | undefined): boolean {
  return student?.paragraphExercisesEnabled === true;
}
