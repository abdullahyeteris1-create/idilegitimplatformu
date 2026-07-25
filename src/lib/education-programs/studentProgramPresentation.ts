import type {
  StudentEducationProgramDayStatus,
  StudentEducationProgramStudentDay,
  StudentEducationProgramTaskStatus,
} from "@/lib/education-programs/studentProgramTypes";

export const STUDENT_PROGRAM_DAY_STATUS_LABELS: Record<
  StudentEducationProgramDayStatus,
  string
> = {
  locked: "Kilitli",
  available: "Başlamaya Hazır",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

export const STUDENT_PROGRAM_TASK_STATUS_LABELS: Record<
  StudentEducationProgramTaskStatus,
  string
> = {
  locked: "Kilitli",
  available: "Başlamaya Hazır",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

export function calculateStudentProgramProgress(
  completedDays: number,
  totalDays: number,
): number {
  if (!Number.isFinite(totalDays) || totalDays <= 0) return 0;

  const safeCompleted = Number.isFinite(completedDays) ? completedDays : 0;
  return Math.min(
    100,
    Math.max(0, Math.round((safeCompleted / totalDays) * 100)),
  );
}

export function formatStudentProgramDuration(durationSeconds: number): string {
  const safeSeconds =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.floor(durationSeconds)
      : 0;
  if (safeSeconds <= 60) return `${safeSeconds} saniye`;

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const minuteLabel = `${minutes} dakika`;

  return seconds === 0 ? minuteLabel : `${minuteLabel} ${seconds} saniye`;
}

export function selectCurrentStudentProgramDay(
  days: readonly StudentEducationProgramStudentDay[],
  currentDayNumber: number,
): StudentEducationProgramStudentDay | null {
  const sortedDays = [...days].sort(
    (first, second) => first.dayNumber - second.dayNumber,
  );
  const currentOpenDay = sortedDays.find(
    (day) =>
      day.dayNumber === currentDayNumber &&
      (day.status === "available" || day.status === "in_progress"),
  );
  if (currentOpenDay) return currentOpenDay;

  const firstOpenDay = sortedDays.find(
    (day) => day.status === "available" || day.status === "in_progress",
  );
  if (firstOpenDay) return firstOpenDay;

  return (
    sortedDays.find((day) => day.dayNumber === currentDayNumber) ??
    sortedDays[0] ??
    null
  );
}
