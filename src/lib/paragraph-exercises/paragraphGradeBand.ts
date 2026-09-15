export type ParagraphGradeBand = "4-5" | "6-7" | "8" | "high-school";

export function resolveParagraphGradeBand(studentClass: unknown): ParagraphGradeBand | null {
  if (typeof studentClass === "number" && Number.isInteger(studentClass)) {
    return mapGrade(studentClass);
  }
  if (typeof studentClass !== "string") return null;
  const value = studentClass.trim().normalize("NFKC").toLocaleLowerCase("tr-TR");
  if (!value) return null;
  const match = value.match(/^(\d{1,2})(?:\.?\s*(?:sınıf|sinif))?$/u);
  return match ? mapGrade(Number(match[1])) : null;
}

function mapGrade(grade: number): ParagraphGradeBand | null {
  if (grade === 4 || grade === 5) return "4-5";
  if (grade === 6 || grade === 7) return "6-7";
  if (grade === 8) return "8";
  if (grade >= 9 && grade <= 12) return "high-school";
  return null;
}
