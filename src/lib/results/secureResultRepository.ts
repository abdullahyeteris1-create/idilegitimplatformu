import type { SupabaseClient } from "@supabase/supabase-js";

const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const UNIQUE_VIOLATION = "23505";

export type StudentResultWithoutXpInput = {
  studentId: string;
  studentName: string;
  username: string;
  exerciseType: string;
  exerciseTitle: string;
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  completedAt: string;
  submissionKey: string;
  details?: Record<string, unknown>;
};

export type StudentResultWithoutXpResult = {
  replayed: boolean;
  resultRow: Record<string, unknown>;
};

const SELECT_COLUMNS =
  "id,student_id,exercise_type,exercise_title,correct_count,wrong_count,score,success_rate,details,submission_key,completed_at,created_at";

async function findBySubmissionKey(
  supabase: SupabaseClient,
  studentId: string,
  submissionKey: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(RESULTS_TABLE)
    .select(SELECT_COLUMNS)
    .eq("student_id", studentId)
    .eq("submission_key", submissionKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Record<string, unknown>;
}

/**
 * XP KAZANDIRMAYAN egzersizler icin guvenli sonuc kaydi.
 *
 * Neden ayri bir yol: `record_student_result_and_award_xp_v1` sonuc kaydini XP
 * odulune bagli olarak yazar - odul verilemezse `RESULT_AWARD_XP_FAILED`
 * firlatir ve transaction geri alinir. Ustelik `student_xp_events` uzerindeki
 * `xp_amount > 0` kisiti 0 XP'li bir event'i sema seviyesinde imkansiz kilar.
 * Bu yuzden 0 XP'li turler o RPC ile kaydedilemez.
 *
 * Bu fonksiyon sonucu SERVICE-ROLE client ile yazar (anon client ile DEGIL) ve
 * ogrenci kimligi cagiran endpoint tarafindan imzali oturumdan turetilir.
 * Idempotency, `exercise_results (student_id, submission_key)` uzerindeki
 * mevcut UNIQUE index ile saglanir: ayni anahtarla ikinci bir satir olusmaz.
 *
 * XP tarafina hicbir yazma yapmaz: student_xp_events ve student_xp_summary
 * degismez.
 */
export async function recordStudentResultWithoutXp(
  supabase: SupabaseClient,
  input: StudentResultWithoutXpInput,
): Promise<StudentResultWithoutXpResult | null> {
  const studentId = input.studentId.trim();
  const studentName = input.studentName.trim();
  const username = input.username.trim();
  const exerciseType = input.exerciseType.trim();
  const exerciseTitle = input.exerciseTitle.trim();
  const submissionKey = input.submissionKey.trim();
  const completedAt = input.completedAt.trim();

  if (
    !studentId ||
    !studentName ||
    !username ||
    !exerciseType ||
    !exerciseTitle ||
    !submissionKey ||
    !completedAt
  ) {
    return null;
  }

  const existing = await findBySubmissionKey(supabase, studentId, submissionKey);
  if (existing) {
    return { replayed: true, resultRow: existing };
  }

  const { data, error } = await supabase
    .from(RESULTS_TABLE)
    .insert({
      student_id: studentId,
      student_name: studentName,
      username,
      exercise_type: exerciseType,
      exercise_title: exerciseTitle,
      correct_count: input.correctCount,
      wrong_count: input.wrongCount,
      score: input.score,
      success_rate: input.successRate,
      submission_key: submissionKey,
      details: input.details ?? {},
      completed_at: completedAt,
    })
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    // Es zamanli ikinci gonderim: UNIQUE index tetiklendi, mevcut satiri dondur.
    if (error.code === UNIQUE_VIOLATION) {
      const replayedRow = await findBySubmissionKey(supabase, studentId, submissionKey);
      return replayedRow ? { replayed: true, resultRow: replayedRow } : null;
    }

    return null;
  }

  if (!data) {
    return null;
  }

  return { replayed: false, resultRow: data as Record<string, unknown> };
}
