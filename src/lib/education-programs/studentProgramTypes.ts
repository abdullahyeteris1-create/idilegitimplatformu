import type { EducationProgramCategory, EducationProgramTaskSettings } from "@/lib/education-programs/types";

export type StudentEducationProgramStatus = "active" | "completed" | "cancelled";
export type StudentEducationProgramDayStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed";
export type StudentEducationProgramTaskStatus = StudentEducationProgramDayStatus;

export type StudentEducationProgramAssignmentInput = {
  studentId: string;
  templateId: string;
  visibleName: string;
  studentMessage: string | null;
  adminNote: string | null;
};

export type StudentEducationProgramAssignmentStudent = {
  id: string;
  name: string;
  className: string | null;
  activeProgramId: string | null;
  activeProgramName: string | null;
};

export type StudentEducationProgramAssignmentTemplate = {
  id: string;
  name: string;
  category: EducationProgramCategory;
  dayCount: number;
  version: number;
  updatedAt: string;
};

export type StudentEducationProgramAssignmentOptions = {
  students: StudentEducationProgramAssignmentStudent[];
  templates: StudentEducationProgramAssignmentTemplate[];
};

export type StudentEducationProgramSummary = {
  id: string;
  studentId: string;
  studentName: string;
  studentClassName: string | null;
  visibleName: string;
  sourceTemplateId: string | null;
  sourceTemplateName: string;
  sourceTemplateVersion: number;
  status: StudentEducationProgramStatus;
  totalDays: number;
  currentDayNumber: number;
  completedDays: number;
  assignedAt: string;
};

export type StudentEducationProgramTask = {
  id: string;
  programId: string;
  programDayId: string;
  studentId: string;
  dayNumber: number;
  orderNumber: number;
  exerciseSlug: string;
  exerciseTitle: string;
  resultExerciseType: string | null;
  startingLevel: number | null;
  durationSeconds: number;
  settingsSchemaVersion: number;
  settings: EducationProgramTaskSettings;
  status: StudentEducationProgramTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export type StudentEducationProgramDay = {
  id: string;
  programId: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  status: StudentEducationProgramDayStatus;
  availableAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  tasks: StudentEducationProgramTask[];
};

export type StudentEducationProgramDetail = StudentEducationProgramSummary & {
  studentMessage: string | null;
  adminNote: string | null;
  assignedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  days: StudentEducationProgramDay[];
};

export type StudentEducationProgramValidationIssue = {
  field: keyof StudentEducationProgramAssignmentInput | "form";
  message: string;
};

export type StudentEducationProgramValidationResult =
  | { ok: true; value: StudentEducationProgramAssignmentInput }
  | { ok: false; message: string; issues: StudentEducationProgramValidationIssue[] };

export type StudentEducationProgramRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "configuration" | "not_found" | "validation" | "conflict" | "database";
      message: string;
    };

export type StudentEducationProgramActionState = {
  status: "idle" | "success" | "error";
  message: string;
  issues?: StudentEducationProgramValidationIssue[];
  programId?: string;
};

export type StudentEducationProgramTaskStartResult = {
  taskId: string;
  taskStatus: "in_progress";
  startedAt: string;
  exerciseSlug: string;
  idempotent: boolean;
};

export type StudentEducationProgramStudentTask = {
  id: string;
  dayNumber: number;
  orderNumber: number;
  exerciseSlug: string;
  exerciseTitle: string;
  durationSeconds: number;
  startingLevel: number | null;
  status: StudentEducationProgramTaskStatus;
};

export type StudentEducationProgramStudentDay = {
  id: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  status: StudentEducationProgramDayStatus;
  startedAt: string | null;
  completedAt: string | null;
  tasks: StudentEducationProgramStudentTask[];
};

export type StudentEducationProgramStudentView = {
  id: string;
  visibleName: string;
  studentMessage: string | null;
  status: StudentEducationProgramStatus;
  currentDayNumber: number;
  completedDays: number;
  totalDays: number;
  assignedAt: string;
  startedAt: string | null;
  days: StudentEducationProgramStudentDay[];
};
