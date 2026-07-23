/**
 * 20 gunluk odev programi icin sinif grubu sabitleri.
 *
 * Bu deger seti `students.education_level`'dan KASITLI olarak ayri tutulur
 * (bkz. supabase/migrations/20260723090000_create_student_assignment_program_system.sql
 * basindaki "GENERATION_SEED"/"v1 SABITLERI" notlari ve daha once onaylanan
 * mimari karari): education_level 3 canli tabloda CHECK ile kisitli ve
 * gradeExerciseProfiles.ts'te zaten profil anahtari olarak kullaniliyor;
 * "general" (Genel) ise education_level'daki "adult" (Yetiskin) ile ayni
 * kavram degil. Bu yuzden yeni sistem kendi ayri `class_group` alanini
 * kullanir, ogrenci profili/education_level formu degismez.
 */

export const ASSIGNMENT_CLASS_GROUPS = [
  "grade_1",
  "grade_2",
  "grade_3",
  "grade_4",
  "grade_5_6",
  "grade_7_8",
  "high_school",
  "general",
] as const;

export type AssignmentClassGroup = (typeof ASSIGNMENT_CLASS_GROUPS)[number];

export const ASSIGNMENT_CLASS_GROUP_LABELS: Record<AssignmentClassGroup, string> = {
  grade_1: "1. Sınıf",
  grade_2: "2. Sınıf",
  grade_3: "3. Sınıf",
  grade_4: "4. Sınıf",
  grade_5_6: "5–6. Sınıf",
  grade_7_8: "7–8. Sınıf",
  high_school: "Lise",
  general: "Genel",
};

const ASSIGNMENT_CLASS_GROUP_SET = new Set<string>(ASSIGNMENT_CLASS_GROUPS);

/** Bilinmeyen bir degerin gecerli bir AssignmentClassGroup olup olmadigini calisma zamaninda dogrular. */
export function isAssignmentClassGroup(value: unknown): value is AssignmentClassGroup {
  return typeof value === "string" && ASSIGNMENT_CLASS_GROUP_SET.has(value);
}
