export const STUDENT_STATUSES = ["active", "passive", "completed"] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export type StudentStatusFilter = StudentStatus | "all" | "current";

const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Aktif",
  passive: "Pasif",
  completed: "Eğitimi Tamamlandı",
};

const STUDENT_STATUS_BADGE_CLASSES: Record<StudentStatus, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100",
  passive:
    "border-slate-200 bg-slate-100 text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300",
  completed:
    "border-sky-200 bg-sky-50 text-sky-700 [data-idil-theme=dark]:border-sky-400/30 [data-idil-theme=dark]:bg-sky-400/10 [data-idil-theme=dark]:text-sky-100",
};

export function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === "string" && (STUDENT_STATUSES as readonly string[]).includes(value);
}

export function normalizeStudentStatus(value: unknown, fallback: StudentStatus = "active"): StudentStatus {
  return isStudentStatus(value) ? value : fallback;
}

export function getStudentStatusLabel(status: StudentStatus): string {
  return STUDENT_STATUS_LABELS[status];
}

export function getStudentStatusBadgeClass(status: StudentStatus): string {
  return STUDENT_STATUS_BADGE_CLASSES[status];
}

export function isCurrentStudentStatus(status: StudentStatus): boolean {
  return status === "active" || status === "passive";
}

export function getStudentIsActiveValue(status: StudentStatus): boolean {
  return status !== "passive";
}

export function getStudentStatusFilterLabel(filter: StudentStatusFilter): string {
  switch (filter) {
    case "current":
      return "Güncel Öğrenciler";
    case "active":
      return "Aktif";
    case "passive":
      return "Pasif";
    case "completed":
      return "Tamamlanmış Eğitimler";
    default:
      return "Tümü";
  }
}
