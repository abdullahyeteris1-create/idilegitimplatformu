import type { StudentXpAwardEventType } from "./xpRepository";

/**
 * Egzersiz turu -> XP odul politikasi (TEK merkezi kaynak).
 *
 * Buradaki ayrim "XP kazandirir mi", miktar degildir. XP MIKTARLARI Supabase
 * tarafinda `award_student_xp_v1` icindeki case ifadesinde merkezi olarak
 * tanimlidir; miktarlari burada tekrar yazmak iki kaynak arasinda drift
 * yaratirdi. Bu yuzden XP veren turler icin miktar `null` ("SQL belirler")
 * dondurulur, XP vermeyen turler icin kesin olarak 0 dondurulur.
 *
 * Client'lara kosul yazilmaz; sonuc kaydeden endpoint bu politikaya bakar.
 */

/**
 * Urun karari: bu turler sonuclarini GUVENLI ve sunucu dogrulamali yoldan
 * kaydeder fakat XP KAZANMAZ. Sonuc kaydi olusur; student_xp_events satiri
 * ve student_xp_summary artisi olusmaz.
 */
const NO_XP_EXERCISE_TYPES: ReadonlySet<string> = new Set([
  "hangman",
  "word-guess",
  "attention-maze",
  "visual-puzzle",
  "focused-reading",
]);

export function exerciseTypeAwardsXp(exerciseType: string): boolean {
  return !NO_XP_EXERCISE_TYPES.has(exerciseType.trim());
}

/**
 * XP vermeyen turler icin 0; XP veren turler icin `null` (miktar SQL'de
 * merkezi olarak belirlenir, bkz. award_student_xp_v1).
 */
export function getExerciseXpAward(exerciseType: string): number | null {
  return exerciseTypeAwardsXp(exerciseType) ? null : 0;
}

/**
 * XP veren turler icin ilgili event tipi; XP vermeyen turler icin `null`
 * (hicbir XP event'i yazilmaz).
 */
export function getExerciseXpEventType(exerciseType: string): StudentXpAwardEventType | null {
  const safeExerciseType = exerciseType.trim();

  if (!exerciseTypeAwardsXp(safeExerciseType)) {
    return null;
  }

  if (safeExerciseType === "reading-comprehension") {
    return "reading_comprehension_completed";
  }

  if (safeExerciseType === "reading-speed-test") {
    return "reading_speed_test_completed";
  }

  return "exercise_completed";
}

export function listNoXpExerciseTypes(): string[] {
  return [...NO_XP_EXERCISE_TYPES].sort();
}
