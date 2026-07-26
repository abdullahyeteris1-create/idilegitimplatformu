import { EDUCATION_PROGRAM_TASKS_PER_DAY } from "@/lib/education-programs/validation";
import type { EducationProgramValidationIssue } from "@/lib/education-programs/types";

// Saf mesaj olusturma mantigi - "use server" direktifli actions.ts dosyasi
// yalniz async server action export edebildigi icin bu yardimci ayri, sunucu
// gerektirmeyen bir dosyada tutulur (dogrudan unit test edilebilir olmasi
// icin de).
export function buildPublishValidationMessage(
  issues: EducationProgramValidationIssue[],
  dayCount: number,
): string {
  const missingTaskCountByDay = new Map<number, number>();

  for (const issue of issues) {
    if (typeof issue.dayNumber !== "number") continue;

    if (issue.field === "day") {
      missingTaskCountByDay.set(issue.dayNumber, EDUCATION_PROGRAM_TASKS_PER_DAY);
      continue;
    }

    if (issue.field === "exerciseSlug") {
      const current = missingTaskCountByDay.get(issue.dayNumber) ?? 0;
      missingTaskCountByDay.set(
        issue.dayNumber,
        Math.min(EDUCATION_PROGRAM_TASKS_PER_DAY, current + 1),
      );
    }
  }

  const dayNumbers = Array.from(missingTaskCountByDay.keys()).sort((a, b) => a - b);
  const base = `Şablon yayınlanamadı. ${dayCount} günün her birinde ${EDUCATION_PROGRAM_TASKS_PER_DAY} görev bulunmalıdır.`;

  if (dayNumbers.length === 0) {
    return base;
  }

  const dayList = dayNumbers
    .map((day) => `${day}. gün (${missingTaskCountByDay.get(day)} görev eksik)`)
    .join(", ");

  return `${base} Eksik günler: ${dayList}.`;
}
