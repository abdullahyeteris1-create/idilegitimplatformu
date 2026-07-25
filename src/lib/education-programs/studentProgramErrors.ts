import type { StudentEducationProgramRepositoryResult } from "@/lib/education-programs/studentProgramTypes";

export function studentEducationProgramFailure(
  code: "configuration" | "not_found" | "validation" | "conflict" | "database",
  message: string,
): StudentEducationProgramRepositoryResult<never> {
  return { ok: false, code, message };
}

export function getStudentEducationProgramDatabaseMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Program atanamadı.";
  }

  const databaseError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const code = typeof databaseError.code === "string" ? databaseError.code : "";
  const message =
    typeof databaseError.message === "string" ? databaseError.message : "";
  const details =
    typeof databaseError.details === "string" ? databaseError.details : "";
  const combined = `${message} ${details}`;

  if (combined.includes("STUDENT_EDUCATION_STUDENT_NOT_FOUND")) {
    return "Öğrenci bulunamadı.";
  }
  if (combined.includes("STUDENT_EDUCATION_STUDENT_INACTIVE")) {
    return "Pasif öğrenciye program atanamaz.";
  }
  if (combined.includes("STUDENT_EDUCATION_TEMPLATE_NOT_FOUND")) {
    return "Şablon bulunamadı.";
  }
  if (combined.includes("STUDENT_EDUCATION_TEMPLATE_NOT_PUBLISHED")) {
    return "Şablon yayınlanmamış.";
  }
  if (combined.includes("STUDENT_EDUCATION_TEMPLATE_INACTIVE")) {
    return "Şablon aktif değil.";
  }
  if (combined.includes("STUDENT_EDUCATION_TEMPLATE_INVALID")) {
    return "Şablon eksik veya geçersiz.";
  }
  if (
    combined.includes("STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS") ||
    code === "23505"
  ) {
    return "Öğrencinin zaten aktif programı var.";
  }
  if (
    combined.includes("STUDENT_EDUCATION_INPUT_INVALID") ||
    code === "23514" ||
    code === "22P02"
  ) {
    return "Atama bilgileri geçerli değil.";
  }

  return "Program atanamadı.";
}
