import { getIstanbulDateString } from "@/lib/students/studentAccessDates";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDateOnly(value: string, offsetDays: number): string {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    throw new Error("Tarih araligi olusturulamadi.");
  }

  const shifted = new Date(parsed.getTime() + offsetDays * MS_PER_DAY);
  return formatDateOnly(shifted);
}

export type TeacherDashboardDateRange = {
  startDateKey: string;
  endDateKey: string;
  startInclusiveIso: string;
  endExclusiveIso: string;
};

export function getTeacherDashboardDateRange(days = 7, now = new Date()): TeacherDashboardDateRange {
  const safeDays = Math.max(1, Math.trunc(days));
  const todayKey = getIstanbulDateString(now);
  const startDateKey = shiftDateOnly(todayKey, -(safeDays - 1));
  const endDateKey = shiftDateOnly(todayKey, 1);

  return {
    startDateKey,
    endDateKey,
    startInclusiveIso: `${startDateKey}T00:00:00+03:00`,
    endExclusiveIso: `${endDateKey}T00:00:00+03:00`,
  };
}

