import type {
  StudentEducationProgramDayStatus,
  StudentEducationProgramStudentDay,
  StudentEducationProgramStudentTask,
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

export function countCompletedStudentProgramTasks(
  tasks: readonly StudentEducationProgramStudentTask[],
): number {
  return tasks.filter((task) => task.status === "completed").length;
}

export type StudentProgramResumeTarget = {
  dayId: string;
  taskId: string;
};

export function selectStudentProgramResumeTarget(
  days: readonly StudentEducationProgramStudentDay[],
  currentDayNumber: number,
): StudentProgramResumeTarget | null {
  const sortedDays = [...days].sort(
    (first, second) => first.dayNumber - second.dayNumber,
  );
  const openDays = sortedDays.filter(
    (day) => day.status === "available" || day.status === "in_progress",
  );
  const currentOpenDay = openDays.find(
    (day) => day.dayNumber === currentDayNumber,
  );
  const orderedDays = currentOpenDay
    ? [currentOpenDay, ...openDays.filter((day) => day.id !== currentOpenDay.id)]
    : openDays;

  for (const day of orderedDays) {
    const task =
      day.tasks.find((candidate) => candidate.status === "in_progress") ??
      day.tasks.find((candidate) => candidate.status === "available");
    if (task) return { dayId: day.id, taskId: task.id };
  }

  return null;
}

// Iki kolonlu gun gezgininin baslangicta hangi gunu secili gostermesi
// gerektigini belirler. Yalniz UI state icin kullanilir - veritabanini veya
// mevcut program.currentDayNumber degerini degistirmez. Sira: 1) ogrencinin
// mevcut gunu, 2) yoksa ilk in_progress gun, 3) yoksa ilk available gun,
// 4) yoksa son tamamlanan gun, 5) hicbiri yoksa ilk gun.
export function selectInitialStudentProgramDayId(
  days: readonly StudentEducationProgramStudentDay[],
  currentDayNumber: number,
): string | null {
  if (days.length === 0) return null;

  const sortedDays = [...days].sort(
    (first, second) => first.dayNumber - second.dayNumber,
  );

  const currentDay = sortedDays.find(
    (day) => day.dayNumber === currentDayNumber,
  );
  if (currentDay) return currentDay.id;

  const firstInProgressDay = sortedDays.find(
    (day) => day.status === "in_progress",
  );
  if (firstInProgressDay) return firstInProgressDay.id;

  const firstAvailableDay = sortedDays.find(
    (day) => day.status === "available",
  );
  if (firstAvailableDay) return firstAvailableDay.id;

  const completedDays = sortedDays.filter((day) => day.status === "completed");
  if (completedDays.length > 0) {
    return completedDays[completedDays.length - 1].id;
  }

  return sortedDays[0]?.id ?? null;
}
