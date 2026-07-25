import type {
  EducationProgramTaskCompleteErrorCode,
  StudentEducationProgramRepositoryResult,
} from "@/lib/education-programs/studentProgramTypes";

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

export function getEducationProgramTaskStartMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Görev başlatılamadı.";
  }

  const databaseError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const message =
    typeof databaseError.message === "string" ? databaseError.message : "";
  const details =
    typeof databaseError.details === "string" ? databaseError.details : "";
  const combined = `${message} ${details}`;

  if (combined.includes("EDUCATION_TASK_START_TASK_NOT_FOUND")) {
    return "Görev bulunamadı.";
  }
  if (combined.includes("EDUCATION_TASK_START_STUDENT_MISMATCH")) {
    return "Bu görev size ait değil.";
  }
  if (combined.includes("EDUCATION_TASK_START_PROGRAM_NOT_FOUND")) {
    return "Görevin bağlı olduğu program bulunamadı.";
  }
  if (combined.includes("EDUCATION_TASK_START_PROGRAM_NOT_ACTIVE")) {
    return "Bu program artık aktif değil.";
  }
  if (combined.includes("EDUCATION_TASK_START_DAY_NOT_FOUND")) {
    return "Görevin bağlı olduğu gün bulunamadı.";
  }
  if (combined.includes("EDUCATION_TASK_START_DAY_NOT_STARTABLE")) {
    return "Bu gün henüz açılmadı.";
  }
  if (combined.includes("EDUCATION_TASK_START_TASK_NOT_STARTABLE")) {
    return "Bu görev şu anda başlatılamaz.";
  }
  if (combined.includes("EDUCATION_TASK_START_INVALID_INPUT")) {
    return "Görev başlatma bilgileri geçerli değil.";
  }

  return "Görev başlatılamadı.";
}

export function getEducationProgramTaskStartErrorCode(
  message: string,
): "not_found" | "conflict" | "database" {
  if (
    message === "Görev bulunamadı." ||
    message === "Bu görev size ait değil." ||
    message === "Görevin bağlı olduğu program bulunamadı." ||
    message === "Görevin bağlı olduğu gün bulunamadı."
  ) {
    return "not_found";
  }
  if (
    message === "Bu program artık aktif değil." ||
    message === "Bu gün henüz açılmadı." ||
    message === "Bu görev şu anda başlatılamaz."
  ) {
    return "conflict";
  }
  return "database";
}

// FAZ 3B-1B: gorev tamamlama hata eslemesi. Turkce mesaj sabit bir tablodan
// (kod -> mesaj) geliyor; RPC hatasindan kod cikarma ayri bir fonksiyon -
// ikisi birbirinden bagimsiz, ham DB message/details/hint asla dogrudan
// donulmez.
const EDUCATION_TASK_COMPLETE_MESSAGE_BY_CODE: Record<
  EducationProgramTaskCompleteErrorCode,
  string
> = {
  task_not_found: "Görev bulunamadı.",
  unauthorized_task: "Bu görev size ait değil.",
  program_not_active: "Bu program artık aktif değil.",
  day_not_available: "Bu gün şu anda tamamlamaya uygun değil.",
  task_not_in_progress: "Bu görev şu anda tamamlanamaz.",
  completion_conflict: "Görev tamamlanamadı.",
  exercise_mismatch: "Bu sonuç bu göreve ait değil.",
  completion_failed: "Görev tamamlanamadı.",
};

export function getEducationProgramTaskCompleteMessage(
  code: EducationProgramTaskCompleteErrorCode,
): string {
  return EDUCATION_TASK_COMPLETE_MESSAGE_BY_CODE[code];
}

export function getEducationProgramTaskCompleteErrorCode(
  error: unknown,
): EducationProgramTaskCompleteErrorCode {
  if (!error || typeof error !== "object") {
    return "completion_failed";
  }

  const databaseError = error as { message?: unknown; details?: unknown };
  const message =
    typeof databaseError.message === "string" ? databaseError.message : "";
  const details =
    typeof databaseError.details === "string" ? databaseError.details : "";
  const combined = `${message} ${details}`;

  if (combined.includes("EDUCATION_TASK_COMPLETE_TASK_NOT_FOUND")) {
    return "task_not_found";
  }
  if (combined.includes("EDUCATION_TASK_COMPLETE_STUDENT_MISMATCH")) {
    return "unauthorized_task";
  }
  if (combined.includes("EDUCATION_TASK_COMPLETE_PROGRAM_NOT_ACTIVE")) {
    return "program_not_active";
  }
  if (combined.includes("EDUCATION_TASK_COMPLETE_DAY_NOT_AVAILABLE")) {
    return "day_not_available";
  }
  if (combined.includes("EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS")) {
    return "task_not_in_progress";
  }
  // PROGRAM_NOT_FOUND / DAY_NOT_FOUND / NEXT_DAY_NOT_FOUND / INVALID_INPUT:
  // bunlar normal kullanici akisinda olusmamasi gereken veri butunlugu
  // sorunlaridir (RPC'nin kendi guard'lari zaten normal reddleri EDUCATION_
  // TASK_COMPLETE_ prefix'iyle isaretliyor) - taniginamayan ama yine de bu
  // RPC'ye ait bir hata oldugu belli olan durum icin "completion_conflict"
  // (409, uygulama-seviyeli bir red), tamamen taniginamayan/RPC disi bir
  // hata icin "completion_failed" (500, beklenmedik) kullanilir.
  if (combined.includes("EDUCATION_TASK_COMPLETE_")) {
    return "completion_conflict";
  }
  return "completion_failed";
}
