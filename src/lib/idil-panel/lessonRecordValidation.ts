export const MAX_LESSON_NO = 40;

export function isValidLessonNo(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_LESSON_NO;
}

export function parseLessonNo(value: string): number | null {
  const parsed = Number(value);
  return isValidLessonNo(parsed) ? parsed : null;
}
