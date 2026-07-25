import type {
  StudentEducationProgramAssignmentInput,
  StudentEducationProgramValidationIssue,
  StudentEducationProgramValidationResult,
} from "@/lib/education-programs/studentProgramTypes";

export const DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME = "Eğitim Programım";
export const MAX_STUDENT_PROGRAM_VISIBLE_NAME_LENGTH = 120;
export const MAX_STUDENT_PROGRAM_MESSAGE_LENGTH = 1000;
export const MAX_STUDENT_PROGRAM_ADMIN_NOTE_LENGTH = 2000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isEducationProgramUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateStudentEducationProgramAssignment(
  value: unknown,
): StudentEducationProgramValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      message: "Atama bilgileri geçerli değil.",
      issues: [{ field: "form", message: "Atama bilgileri geçerli değil." }],
    };
  }

  const input = value as Record<string, unknown>;
  const issues: StudentEducationProgramValidationIssue[] = [];
  const studentId = typeof input.studentId === "string" ? input.studentId.trim() : "";
  const templateId = typeof input.templateId === "string" ? input.templateId.trim() : "";
  const visibleName =
    readOptionalText(input.visibleName) ?? DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME;
  const studentMessage = readOptionalText(input.studentMessage);
  const adminNote = readOptionalText(input.adminNote);

  if (!isEducationProgramUuid(studentId)) {
    issues.push({ field: "studentId", message: "Geçerli bir öğrenci seçin." });
  }

  if (!isEducationProgramUuid(templateId)) {
    issues.push({ field: "templateId", message: "Geçerli bir program şablonu seçin." });
  }

  if (visibleName.length > MAX_STUDENT_PROGRAM_VISIBLE_NAME_LENGTH) {
    issues.push({
      field: "visibleName",
      message: `Öğrenciye görünen program adı en fazla ${MAX_STUDENT_PROGRAM_VISIBLE_NAME_LENGTH} karakter olabilir.`,
    });
  }

  if (studentMessage && studentMessage.length > MAX_STUDENT_PROGRAM_MESSAGE_LENGTH) {
    issues.push({
      field: "studentMessage",
      message: `Öğrenci mesajı en fazla ${MAX_STUDENT_PROGRAM_MESSAGE_LENGTH} karakter olabilir.`,
    });
  }

  if (adminNote && adminNote.length > MAX_STUDENT_PROGRAM_ADMIN_NOTE_LENGTH) {
    issues.push({
      field: "adminNote",
      message: `Yönetici notu en fazla ${MAX_STUDENT_PROGRAM_ADMIN_NOTE_LENGTH} karakter olabilir.`,
    });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0]?.message ?? "Atama bilgileri geçerli değil.",
      issues,
    };
  }

  return {
    ok: true,
    value: {
      studentId,
      templateId,
      visibleName,
      studentMessage,
      adminNote,
    } satisfies StudentEducationProgramAssignmentInput,
  };
}
