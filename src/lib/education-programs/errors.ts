import type { EducationProgramRepositoryResult } from "@/lib/education-programs/types";

export function educationProgramFailure(
  code: "configuration" | "not_found" | "validation" | "database",
  message: string,
): EducationProgramRepositoryResult<never> {
  return { ok: false, code, message };
}

export function getEducationProgramDatabaseMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Eğitim programı verisi kaydedilemedi.";
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "23505") {
    return "Aynı gün ve sırada birden fazla çalışma bulunamaz.";
  }
  if (code === "23514" || code === "22P02") {
    return "Eğitim programı verileri geçerli değil.";
  }

  return "Eğitim programı verisi kaydedilemedi.";
}
