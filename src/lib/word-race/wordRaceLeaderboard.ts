import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Kelime Yarisi sinif ici liderlik tablosu.
 *
 * Gizlilik siniri: bu modul DISARIYA yalnizca gorunen ad (adin ilk kelimesi)
 * ve skoru verir. Ogrenci id'si, tam ad, soyad, kullanici adi veya sinif
 * bilgisi client'a HICBIR ZAMAN gonderilmez. Karsilastirma yalnizca ogrencinin
 * KENDI sinifi icinde yapilir.
 */

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";

export const WORD_RACE_LEADERBOARD_SIZE = 10;
const WORD_RACE_EXERCISE_TYPE = "word-race";

export type WordRaceLeaderboardEntry = {
  rank: number;
  displayName: string;
  score: number;
  isCurrentStudent: boolean;
};

/**
 * "Ahmet Yilmaz Kaya" -> "Ahmet". Soyad hicbir kosulda disari cikmaz;
 * ad bos/tek karakterse anonim bir etikete duser.
 */
export function toDisplayName(fullName: unknown): string {
  if (typeof fullName !== "string") return "Öğrenci";

  const firstWord = fullName.trim().split(/\s+/)[0] ?? "";
  return firstWord.length > 0 ? firstWord.slice(0, 24) : "Öğrenci";
}

export async function getWordRaceClassLeaderboard(
  studentId: string,
): Promise<WordRaceLeaderboardEntry[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  const { data: currentStudent } = await supabase
    .from(STUDENTS_TABLE)
    .select("id,class_name")
    .eq("id", studentId)
    .maybeSingle();

  const className = typeof currentStudent?.class_name === "string" ? currentStudent.class_name.trim() : "";
  if (!className) return [];

  const { data: classmates } = await supabase
    .from(STUDENTS_TABLE)
    .select("id,name")
    .eq("class_name", className);

  if (!Array.isArray(classmates) || classmates.length === 0) return [];

  const nameById = new Map<string, string>();
  for (const classmate of classmates) {
    if (typeof classmate?.id === "string") {
      nameById.set(classmate.id, toDisplayName(classmate.name));
    }
  }

  const { data: results } = await supabase
    .from(RESULTS_TABLE)
    .select("student_id,score")
    .eq("exercise_type", WORD_RACE_EXERCISE_TYPE)
    .in("student_id", [...nameById.keys()]);

  if (!Array.isArray(results)) return [];

  // Ogrenci basina EN IYI skor - yoksa cok oynayan tek ogrenci listeyi doldurur.
  const bestByStudent = new Map<string, number>();
  for (const row of results) {
    const rowStudentId = typeof row?.student_id === "string" ? row.student_id : "";
    const score = typeof row?.score === "number" && Number.isFinite(row.score) ? row.score : null;

    if (!rowStudentId || score === null || !nameById.has(rowStudentId)) continue;

    const previous = bestByStudent.get(rowStudentId);
    if (previous === undefined || score > previous) {
      bestByStudent.set(rowStudentId, score);
    }
  }

  return [...bestByStudent.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, WORD_RACE_LEADERBOARD_SIZE)
    .map(([rowStudentId, score], index) => ({
      rank: index + 1,
      displayName: nameById.get(rowStudentId) ?? "Öğrenci",
      score,
      isCurrentStudent: rowStudentId === studentId,
    }));
}
