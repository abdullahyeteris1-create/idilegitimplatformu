import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createDefaultStudentXpSnapshot, getStudentXpSnapshot, type StudentXpSnapshot } from "./xpLevels";

const STUDENT_XP_SUMMARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_XP_SUMMARY_TABLE ?? "student_xp_summary";
const STUDENT_XP_AWARD_RPC = "award_student_xp_v1";
const STUDENT_RESULT_AWARD_RPC = "record_student_result_and_award_xp_v1";
const STUDENT_XP_SUMMARY_REPAIR_RPC = "repair_student_xp_summary_v1";

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

export type StudentRecordedResultAndAwardInput = {
  studentId: string;
  studentName: string;
  username: string;
  exerciseType: string;
  exerciseTitle: string;
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  completedAt: string;
  submissionKey: string;
  details?: Record<string, unknown>;
};

export type StudentRecordedResultAndAwardResult = {
  replayed: boolean;
  resultRow: Record<string, unknown>;
  xpAwarded: number;
  totalXp: number;
  eventId?: string;
  earnedAt?: string;
};

export type StudentXpSummaryRepairResult = {
  studentId: string;
  totalXp: number;
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

function parseRecordedResultResponse(payload: unknown): StudentRecordedResultAndAwardResult | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as SupabaseRow;
  if (typeof data.replayed !== "boolean") return null;
  if (typeof data.result_row !== "object" || data.result_row === null || Array.isArray(data.result_row)) return null;
  if (typeof data.xp_awarded !== "number" || !Number.isFinite(data.xp_awarded)) return null;
  if (typeof data.total_xp !== "number" || !Number.isFinite(data.total_xp)) return null;

  return {
    replayed: data.replayed,
    resultRow: data.result_row as Record<string, unknown>,
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

export async function recordStudentResultAndAwardXp(
  supabase: SupabaseClient,
  input: StudentRecordedResultAndAwardInput,
): Promise<StudentRecordedResultAndAwardResult | null> {
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

  try {
    const { data, error } = await supabase.rpc(STUDENT_RESULT_AWARD_RPC, {
      p_student_id: studentId,
      p_student_name: studentName,
      p_username: username,
      p_exercise_type: exerciseType,
      p_exercise_title: exerciseTitle,
      p_score: input.score,
      p_success_rate: input.successRate,
      p_correct_count: input.correctCount,
      p_wrong_count: input.wrongCount,
      p_duration_seconds: input.durationSeconds,
      p_completed_at: completedAt,
      p_submission_key: submissionKey,
      p_details: input.details ?? {},
    });

    if (error) {
      return null;
    }

    return parseRecordedResultResponse(data);
  } catch {
    return null;
  }
}

export async function repairStudentXpSummaryByStudentId(studentId: string): Promise<StudentXpSummaryRepairResult | null> {
  const safeStudentId = studentId.trim();
  if (!safeStudentId) {
    return null;
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc(STUDENT_XP_SUMMARY_REPAIR_RPC, {
      p_student_id: safeStudentId,
    });

    if (error) {
      return null;
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    const payload = data as SupabaseRow;
    if (typeof payload.student_id !== "string") {
      return null;
    }
    if (typeof payload.total_xp !== "number" || !Number.isFinite(payload.total_xp)) {
      return null;
    }

    return {
      studentId: payload.student_id,
      totalXp: payload.total_xp,
    };
  } catch {
    return null;
  }
}
