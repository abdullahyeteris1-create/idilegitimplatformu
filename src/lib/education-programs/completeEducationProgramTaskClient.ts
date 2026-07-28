// Egitim Programi gorev tamamlama Route Handler'ina ("/api/student/
// education-program-tasks/[taskId]/complete") istek atan, KUCUK ve izole bir
// fetch sarmalayicisi. Bu dosya:
//   - ogrenci kimligini ASLA gondermez (server oturumundan gelir, bu dosyanin
//     haberi bile yoktur)
//   - service-role veya Supabase client'ina dokunmaz
//   - tarayici depolamasi, sayfa yonlendirmesi veya bildirim UI'i kullanmaz
//   - otomatik retry yapmaz (RPC zaten idempotent - cagiran taraf
//     isterse kendi guard'iyla tekrar cagirabilir)
//   - Assignment System V2'nin hicbir yardimcisini import etmez
// Bu FAZ'da (3B-1B) hicbir egzersiz client'ina bagli DEGILDIR - yalniz
// cagirma bicimini saglar, ne zaman cagrilacagina karar vermez (FAZ 3B-2).
import { emitXpRewardNotification } from "@/components/xp-notifications/xpRewardNotifications";

export type CompleteEducationProgramTaskClientOutcome =
  | "already_completed"
  | "task_completed"
  | "task_completed_next_task_unlocked"
  | "day_completed"
  | "day_completed_next_day_unlocked"
  | "program_completed";

export type CompleteEducationProgramTaskClientSuccess = {
  ok: true;
  outcome: CompleteEducationProgramTaskClientOutcome;
  alreadyCompleted: boolean;
  taskId: string;
  taskStatus: "completed";
  dayId: string;
  dayStatus: "available" | "in_progress" | "completed";
  programId: string;
  programStatus: "active" | "completed";
  unlockedTaskId: string | null;
  unlockedDayId: string | null;
  currentDayNumber: number;
  completedDays: number;
  totalDays: number;
  programCompleted: boolean;
  reward?: {
    eventType: "education_program_task_completed";
    awardedXp: number;
    currentTotalXp: number;
    replayed: boolean;
    rewardKey?: string;
  };
};

export type CompleteEducationProgramTaskClientFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CompleteEducationProgramTaskClientResult =
  | CompleteEducationProgramTaskClientSuccess
  | CompleteEducationProgramTaskClientFailure;

const DEFAULT_FAILURE: CompleteEducationProgramTaskClientFailure = {
  ok: false,
  code: "completion_failed",
  message: "Görev tamamlanamadı. Lütfen tekrar deneyin.",
};

const OUTCOME_VALUES = new Set([
  "already_completed",
  "task_completed",
  "task_completed_next_task_unlocked",
  "day_completed",
  "day_completed_next_day_unlocked",
  "program_completed",
]);
const DAY_STATUS_VALUES = new Set(["available", "in_progress", "completed"]);
const PROGRAM_STATUS_VALUES = new Set(["active", "completed"]);

function parseSuccessPayload(
  data: Record<string, unknown>,
): CompleteEducationProgramTaskClientSuccess | null {
  if (typeof data.outcome !== "string" || !OUTCOME_VALUES.has(data.outcome)) return null;
  if (typeof data.alreadyCompleted !== "boolean") return null;
  if (typeof data.taskId !== "string" || !data.taskId.trim()) return null;
  if (data.taskStatus !== "completed") return null;
  if (typeof data.dayId !== "string" || !data.dayId.trim()) return null;
  if (typeof data.dayStatus !== "string" || !DAY_STATUS_VALUES.has(data.dayStatus)) return null;
  if (typeof data.programId !== "string" || !data.programId.trim()) return null;
  if (
    typeof data.programStatus !== "string" ||
    !PROGRAM_STATUS_VALUES.has(data.programStatus)
  ) {
    return null;
  }
  if (data.unlockedTaskId !== null && typeof data.unlockedTaskId !== "string") return null;
  if (data.unlockedDayId !== null && typeof data.unlockedDayId !== "string") return null;
  if (typeof data.currentDayNumber !== "number" || !Number.isFinite(data.currentDayNumber)) {
    return null;
  }
  if (typeof data.completedDays !== "number" || !Number.isFinite(data.completedDays)) return null;
  if (typeof data.totalDays !== "number" || !Number.isFinite(data.totalDays)) return null;
  if (typeof data.programCompleted !== "boolean") return null;
  if (data.reward !== undefined) {
    const reward = data.reward as Record<string, unknown>;
    if (typeof reward !== "object" || reward === null || Array.isArray(reward)) return null;
    if (reward.eventType !== "education_program_task_completed") return null;
    if (typeof reward.awardedXp !== "number" || !Number.isFinite(reward.awardedXp)) return null;
    if (typeof reward.currentTotalXp !== "number" || !Number.isFinite(reward.currentTotalXp)) return null;
    if (typeof reward.replayed !== "boolean") return null;
    if (reward.rewardKey !== undefined && reward.rewardKey !== null && typeof reward.rewardKey !== "string") return null;
  }

  return {
    ok: true,
    outcome: data.outcome as CompleteEducationProgramTaskClientOutcome,
    alreadyCompleted: data.alreadyCompleted,
    taskId: data.taskId,
    taskStatus: "completed",
    dayId: data.dayId,
    dayStatus: data.dayStatus as CompleteEducationProgramTaskClientSuccess["dayStatus"],
    programId: data.programId,
    programStatus: data.programStatus as CompleteEducationProgramTaskClientSuccess["programStatus"],
    unlockedTaskId: data.unlockedTaskId as string | null,
    unlockedDayId: data.unlockedDayId as string | null,
    currentDayNumber: data.currentDayNumber,
    completedDays: data.completedDays,
    totalDays: data.totalDays,
    programCompleted: data.programCompleted,
    reward: data.reward
      ? {
          eventType: "education_program_task_completed",
          awardedXp: (data.reward as Record<string, unknown>).awardedXp as number,
          currentTotalXp: (data.reward as Record<string, unknown>).currentTotalXp as number,
          replayed: (data.reward as Record<string, unknown>).replayed as boolean,
          rewardKey: typeof (data.reward as Record<string, unknown>).rewardKey === "string"
            ? (data.reward as Record<string, unknown>).rewardKey as string
            : undefined,
        }
      : undefined,
  };
}

export async function completeEducationProgramTask(
  taskId: string,
  expectedResultExerciseType?: string,
  options?: { signal?: AbortSignal },
): Promise<CompleteEducationProgramTaskClientResult> {
  try {
    const response = await fetch(
      `/api/student/education-program-tasks/${encodeURIComponent(taskId)}/complete`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        signal: options?.signal,
        body: JSON.stringify(
          expectedResultExerciseType ? { expectedResultExerciseType } : {},
        ),
      },
    );

    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return DEFAULT_FAILURE;
    }

    const data = payload as Record<string, unknown>;

    if (data.success === true) {
      const parsed = parseSuccessPayload(data);
      if (parsed?.reward && !parsed.reward.replayed && parsed.reward.awardedXp > 0) {
        emitXpRewardNotification({
          eventType: parsed.reward.eventType,
          awardedXp: parsed.reward.awardedXp,
          currentTotalXp: parsed.reward.currentTotalXp,
          replayed: parsed.reward.replayed,
          rewardKey: parsed.reward.rewardKey,
          sourceLabel: "Görev tamamlandı",
        });
      }
      return parsed ?? DEFAULT_FAILURE;
    }

    const errorPayload =
      data.error && typeof data.error === "object" ? (data.error as Record<string, unknown>) : null;
    const code = typeof errorPayload?.code === "string" ? errorPayload.code : DEFAULT_FAILURE.code;
    const message =
      typeof errorPayload?.message === "string" ? errorPayload.message : DEFAULT_FAILURE.message;

    return { ok: false, code, message };
  } catch {
    return DEFAULT_FAILURE;
  }
}
