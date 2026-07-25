export type EducationProgramCategory =
  | "grade_1"
  | "grade_2"
  | "grade_3"
  | "grade_4"
  | "grade_5_6"
  | "grade_7_8"
  | "high_school"
  | "general_adult";

export type EducationProgramTemplateStatus = "draft" | "published";

export type EducationProgramTaskSettings = Record<string, string | number | boolean>;

export type EducationProgramTemplateTask = {
  id: string;
  templateDayId: string;
  orderNumber: number;
  exerciseSlug: string | null;
  exerciseTitle: string | null;
  resultExerciseType: string | null;
  durationSeconds: number | null;
  startingLevel: number | null;
  settingsSchemaVersion: number;
  settings: EducationProgramTaskSettings;
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplateDay = {
  id: string;
  templateId: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  tasks: EducationProgramTemplateTask[];
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplateSummary = {
  id: string;
  name: string;
  adminDescription: string | null;
  category: EducationProgramCategory;
  dayCount: number;
  status: EducationProgramTemplateStatus;
  isActive: boolean;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplate = EducationProgramTemplateSummary & {
  days: EducationProgramTemplateDay[];
};

export type EducationProgramTemplateMetadataInput = {
  name: string;
  adminDescription: string | null;
  category: EducationProgramCategory;
  dayCount: number;
};

export type EducationProgramTemplateTaskInput = {
  orderNumber: number;
  exerciseSlug: string | null;
  durationSeconds: number | null;
  startingLevel: number | null;
  settings: EducationProgramTaskSettings;
};

export type EducationProgramValidationIssue = {
  field: string;
  message: string;
  dayNumber?: number;
  orderNumber?: number;
};

export type EducationProgramValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; issues: EducationProgramValidationIssue[] };

export type EducationProgramRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "configuration" | "not_found" | "validation" | "database"; message: string };

export type EducationProgramActionState = {
  status: "idle" | "success" | "error";
  message: string;
  issues?: EducationProgramValidationIssue[];
};
