export type EducationDateRangeValidation =
  | { valid: true }
  | { valid: false; message: string };

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

export function getIstanbulDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Istanbul tarihi olusturulamadi.");
  }

  return `${year}-${month}-${day}`;
}

export function isValidDateOnlyString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month);
}

export function isEducationDateRangeValid(
  educationStartDate: string | null,
  accessEndDate: string | null,
): EducationDateRangeValidation {
  if (!educationStartDate && !accessEndDate) {
    return { valid: true };
  }

  if (!educationStartDate || !accessEndDate) {
    return { valid: false, message: "Başlangıç ve bitiş tarihlerini seçin." };
  }

  if (!isValidDateOnlyString(educationStartDate) || !isValidDateOnlyString(accessEndDate)) {
    return { valid: false, message: "Geçerli bir tarih seçin." };
  }

  if (educationStartDate > accessEndDate) {
    return {
      valid: false,
      message: "Erişim bitiş tarihi eğitim başlangıç tarihinden önce olamaz.",
    };
  }

  return { valid: true };
}
