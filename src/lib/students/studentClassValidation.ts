import type { EducationLevel } from "@/lib/assignments/educationLevels";

const STUDENT_CLASS_PATTERN = /^(1[0-2]|[1-9])(?:\.?\s*(?:s\u0131n\u0131f|sinif))?(?:\s*[/\-]?\s*[a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc])?$/iu;

const INDIVIDUAL_CLASS_OPTIONS: Record<EducationLevel, readonly number[]> = {
  primary_1: [1], primary_2: [2], primary_3: [3], primary_4: [4],
  middle_5_6: [5, 6], middle_7_8: [7, 8], high_school: [9, 10, 11, 12], adult: [],
};

export function requiresIndividualClass(educationLevel: EducationLevel | ""): boolean {
  return educationLevel !== "" && educationLevel !== "adult";
}

export function getIndividualClassOptions(educationLevel: EducationLevel): readonly number[] {
  return INDIVIDUAL_CLASS_OPTIONS[educationLevel];
}

export function parseStudentClassGrade(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().normalize("NFKC").match(STUDENT_CLASS_PATTERN);
  return match ? Number(match[1]) : null;
}

export type StudentClassValidation =
  | { ok: true; value: string | null; grade: number | null }
  | { ok: false; message: string };

export function validateStudentClassValue(value: unknown, { required }: { required: boolean }): StudentClassValidation {
  if (typeof value !== "string" || !value.trim()) {
    return required ? { ok: false, message: "Gercek sinif secimi zorunludur." } : { ok: true, value: null, grade: null };
  }
  const trimmed = value.trim();
  const grade = parseStudentClassGrade(trimmed);
  if (grade === null) return { ok: false, message: "1-12 arasinda gercek bir sinif girin (ornek: 4/A)." };
  return { ok: true, value: trimmed, grade };
}
