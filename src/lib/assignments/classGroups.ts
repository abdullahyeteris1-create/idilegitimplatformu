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

import { isEducationLevel, type EducationLevel } from "@/lib/assignments/educationLevels";

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

export type ClassGroupMappingResult = { ok: true; value: AssignmentClassGroup } | { ok: false; message: string };

/**
 * students.education_level -> class_group deterministic esleme tablosu.
 * TEK kaynak - bu esleme baska hicbir dosyada tekrarlanmaz. "adult" icin
 * dogrudan karsilik gelen bir sinif grubu olmadigindan "general" (Genel)
 * kullanilir; bu, egitim_seviyesindeki "adult" ile class_group'taki "general"
 * kavramlarinin farkli oldugu notunu (bkz. yukaridaki dosya basi aciklama)
 * ihlal etmez - yalniz "general" grubunun pratikte "adult" ogrencileri de
 * kapsayacak sekilde kullanilmasi gerektigi anlamina gelir.
 */
const EDUCATION_LEVEL_TO_CLASS_GROUP: Record<EducationLevel, AssignmentClassGroup> = {
  primary_1: "grade_1",
  primary_2: "grade_2",
  primary_3: "grade_3",
  primary_4: "grade_4",
  middle_5_6: "grade_5_6",
  middle_7_8: "grade_7_8",
  high_school: "high_school",
  adult: "general",
};

/**
 * Bir ogrencinin class_group'unu YALNIZ education_level degerinden turetir.
 * Client'tan gelen bir classGroup degerine ASLA guvenilmemeli - bu fonksiyon
 * her zaman DB'den taze okunan education_level ile cagrilmalidir. Bilinmeyen/
 * null/bos/desteklenmeyen bir deger icin sessizce bir varsayilan grup
 * URETMEZ - acik bir validation hatasi doner.
 */
export function mapEducationLevelToClassGroup(educationLevel: unknown): ClassGroupMappingResult {
  if (!isEducationLevel(educationLevel)) {
    return { ok: false, message: "Öğrencinin eğitim seviyesi desteklenmiyor veya tanımlı değil." };
  }
  return { ok: true, value: EDUCATION_LEVEL_TO_CLASS_GROUP[educationLevel] };
}
