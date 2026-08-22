import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  WordRaceLeaderboardEntryView,
  WordRaceLeaderboardGroupLabel,
} from "@/lib/word-race/wordRaceBridge";

/**
 * Kelime Yarisi sinif grubu liderlik tablosu.
 *
 * Gizlilik siniri: bu modul DISARIYA yalnizca gorunen ad (adin ilk kelimesi)
 * ve skoru verir. Ogrenci id'si, tam ad, soyad veya kullanici adi client'a
 * HICBIR ZAMAN gonderilmez. Lise havuzunda yalnizca 9-12 arasindaki guvenli
 * sinif etiketi gonderilir; ham profil degeri disari cikmaz.
 */

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";

export const WORD_RACE_LEADERBOARD_SIZE = 10;
const WORD_RACE_EXERCISE_TYPE = "word-race";
export const WORD_RACE_HIGH_SCHOOL_CLASS_NAMES = ["9", "10", "11", "12"] as const;

export type WordRaceLeaderboardEntry = WordRaceLeaderboardEntryView;

export type WordRaceLeaderboard = {
  groupLabel: WordRaceLeaderboardGroupLabel;
  entries: WordRaceLeaderboardEntry[];
};

export type WordRaceLeaderboardGroup = {
  groupLabel: WordRaceLeaderboardGroupLabel;
  classNames: string[];
  showClassLabel: boolean;
};

type WordRaceStudentRow = {
  id?: unknown;
  name?: unknown;
  class_name?: unknown;
};

type WordRaceResultRow = {
  student_id?: unknown;
  score?: unknown;
};

const EMPTY_CLASS_LEADERBOARD: WordRaceLeaderboard = {
  groupLabel: "Sınıf",
  entries: [],
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

/**
 * Canli veride `students.class_name` text alaninda siniflar "1"..."12"
 * biciminde tutulur. Yalniz 9-12 ayni havuza acilir; diger butun degerler
 * onceki davranistaki gibi birebir eslesmeye devam eder.
 */
export function resolveWordRaceLeaderboardGroup(className: unknown): WordRaceLeaderboardGroup | null {
  const normalizedClassName = typeof className === "string" ? className.trim() : "";
  if (!normalizedClassName) return null;

  if ((WORD_RACE_HIGH_SCHOOL_CLASS_NAMES as readonly string[]).includes(normalizedClassName)) {
    return {
      groupLabel: "Lise",
      classNames: [...WORD_RACE_HIGH_SCHOOL_CLASS_NAMES],
      showClassLabel: true,
    };
  }

  return {
    groupLabel: "Sınıf",
    classNames: [normalizedClassName],
    showClassLabel: false,
  };
}

function toHighSchoolClassLabel(className: unknown): string | undefined {
  const normalizedClassName = typeof className === "string" ? className.trim() : "";
  return (WORD_RACE_HIGH_SCHOOL_CLASS_NAMES as readonly string[]).includes(normalizedClassName)
    ? `${normalizedClassName}. Sınıf`
    : undefined;
}

/**
 * Supabase sonucunu leaderboard gorunumune cevirir. Skora hicbir donusum veya
 * bonus uygulamaz; mevcut davranistaki gibi ogrenci basina en yuksek kaydi
 * secer, azalan skorla siralar ve ilk 10'u dondurur.
 */
export function mapWordRaceLeaderboardEntries(
  classmates: readonly WordRaceStudentRow[],
  results: readonly WordRaceResultRow[],
  currentStudentId: string,
  showClassLabel: boolean,
): WordRaceLeaderboardEntry[] {
  const profileById = new Map<string, { displayName: string; classLabel?: string }>();
  for (const classmate of classmates) {
    if (typeof classmate?.id !== "string") continue;

    profileById.set(classmate.id, {
      displayName: toDisplayName(classmate.name),
      ...(showClassLabel
        ? { classLabel: toHighSchoolClassLabel(classmate.class_name) }
        : {}),
    });
  }

  // Ogrenci basina EN IYI skor - yoksa cok oynayan tek ogrenci listeyi doldurur.
  const bestByStudent = new Map<string, number>();
  for (const row of results) {
    const rowStudentId = typeof row?.student_id === "string" ? row.student_id : "";
    const score = typeof row?.score === "number" && Number.isFinite(row.score) ? row.score : null;

    if (!rowStudentId || score === null || !profileById.has(rowStudentId)) continue;

    const previous = bestByStudent.get(rowStudentId);
    if (previous === undefined || score > previous) {
      bestByStudent.set(rowStudentId, score);
    }
  }

  return [...bestByStudent.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, WORD_RACE_LEADERBOARD_SIZE)
    .map(([rowStudentId, score], index) => {
      const profile = profileById.get(rowStudentId);

      return {
        rank: index + 1,
        displayName: profile?.displayName ?? "Öğrenci",
        ...(profile?.classLabel ? { classLabel: profile.classLabel } : {}),
        score,
        isCurrentStudent: rowStudentId === currentStudentId,
      };
    });
}

export async function getWordRaceClassLeaderboard(
  studentId: string,
): Promise<WordRaceLeaderboard> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return EMPTY_CLASS_LEADERBOARD;

  const { data: currentStudent } = await supabase
    .from(STUDENTS_TABLE)
    .select("id,class_name")
    .eq("id", studentId)
    .maybeSingle();

  const group = resolveWordRaceLeaderboardGroup(currentStudent?.class_name);
  if (!group) return EMPTY_CLASS_LEADERBOARD;

  const classmatesQuery = supabase
    .from(STUDENTS_TABLE)
    .select("id,name,class_name");

  const { data: classmates } = group.classNames.length > 1
    ? await classmatesQuery.in("class_name", group.classNames)
    : await classmatesQuery.eq("class_name", group.classNames[0]);

  if (!Array.isArray(classmates) || classmates.length === 0) {
    return { groupLabel: group.groupLabel, entries: [] };
  }

  const classmateIds: string[] = [];
  for (const classmate of classmates) {
    if (typeof classmate?.id === "string") {
      classmateIds.push(classmate.id);
    }
  }

  const { data: results } = await supabase
    .from(RESULTS_TABLE)
    .select("student_id,score")
    .eq("exercise_type", WORD_RACE_EXERCISE_TYPE)
    .in("student_id", classmateIds);

  if (!Array.isArray(results)) {
    return { groupLabel: group.groupLabel, entries: [] };
  }

  return {
    groupLabel: group.groupLabel,
    entries: mapWordRaceLeaderboardEntries(
      classmates,
      results,
      studentId,
      group.showClassLabel,
    ),
  };
}
