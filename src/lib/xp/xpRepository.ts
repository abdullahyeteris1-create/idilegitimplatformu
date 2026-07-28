import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createDefaultStudentXpSnapshot, getStudentXpSnapshot, type StudentXpSnapshot } from "./xpLevels";

const STUDENT_XP_SUMMARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_XP_SUMMARY_TABLE ?? "student_xp_summary";
const STUDENT_XP_AWARD_RPC = "award_student_xp_v1";

export type StudentXpAwardEventType =
  | "login_first_of_day"
  | "exercise_completed"
  | "education_program_task_completed"
  | "reading_comprehension_completed"
  | "reading_speed_test_completed";

export type StudentXpAwardInput = {
  studentId: string;
  eventType: StudentXpAwardEventType;
  idempotencyKey: string;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type StudentXpAwardResult = {
  awarded: boolean;
  xpAwarded: number;
  totalXp: number;
  eventId?: string;
  earnedAt?: string;
};

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

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseAwardResponse(payload: unknown): StudentXpAwardResult | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as SupabaseRow;
  if (typeof data.awarded !== "boolean") return null;
  if (typeof data.xp_awarded !== "number" || !Number.isFinite(data.xp_awarded)) return null;
  if (typeof data.total_xp !== "number" || !Number.isFinite(data.total_xp)) return null;

  return {
    awarded: data.awarded,
    xpAwarded: data.xp_awarded,
    totalXp: data.total_xp,
    eventId: normalizeString(typeof data.event_id === "string" ? data.event_id : null) ?? undefined,
    earnedAt: normalizeString(typeof data.earned_at === "string" ? data.earned_at : null) ?? undefined,
  };
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

export async function awardStudentXpEvent(input: StudentXpAwardInput): Promise<StudentXpAwardResult | null> {
  const studentId = input.studentId.trim();
  const eventType = input.eventType.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  const sourceType = normalizeString(input.sourceType ?? null);
  const sourceId = normalizeString(input.sourceId ?? null);
  const metadata = input.metadata ?? {};

  if (!studentId || !eventType || !idempotencyKey) {
    return null;
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc(STUDENT_XP_AWARD_RPC, {
      p_student_id: studentId,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_metadata: metadata,
    });

    if (error) {
      return null;
    }

    return parseAwardResponse(data);
  } catch {
    return null;
  }
}
