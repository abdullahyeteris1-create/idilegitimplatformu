import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createDefaultStudentXpSnapshot, getStudentXpSnapshot, type StudentXpSnapshot } from "./xpLevels";

const STUDENT_XP_SUMMARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_XP_SUMMARY_TABLE ?? "student_xp_summary";

type SupabaseRow = Record<string, unknown>;

function readTotalXp(row: SupabaseRow | null | undefined): number {
  const value = row?.total_xp;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export async function getStudentXpSnapshotByStudentId(studentId: string): Promise<StudentXpSnapshot> {
  const safeStudentId = studentId.trim();
  if (!safeStudentId) {
    return createDefaultStudentXpSnapshot();
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return createDefaultStudentXpSnapshot();
  }

  try {
    const { data, error } = await supabase
      .from(STUDENT_XP_SUMMARY_TABLE)
      .select("student_id,total_xp,updated_at")
      .eq("student_id", safeStudentId)
      .maybeSingle();

    if (error || !data) {
      return createDefaultStudentXpSnapshot();
    }

    return getStudentXpSnapshot(readTotalXp(data as SupabaseRow));
  } catch {
    return createDefaultStudentXpSnapshot();
  }
}

