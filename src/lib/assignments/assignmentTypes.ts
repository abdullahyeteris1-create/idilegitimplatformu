import type { EducationLevel } from "@/lib/assignments/educationLevels";

export type AssignmentStatus = "pending" | "in_progress" | "completed" | "skipped";

export type AssignmentItemStatus = "pending" | "started" | "completed" | "skipped";

export type AssignmentGenerationMode = "automatic" | "manual" | "ai_suggested";

export type AssignmentItemCategory =
  | "speed"
  | "attention"
  | "eye"
  | "memory"
  | "comprehension";

export type AssignmentItemTargetType =
  | "target_correct"
  | "target_score"
  | "target_success_rate"
  | "duration_minutes"
  | "custom";

export type AssignmentSettings = Record<string, number | string | boolean>;

export type DailyAssignmentItem = {
  id: string;
  assignmentId: string;
  studentId: string;
  exerciseSlug: string;
  exerciseTitle: string;
  category: AssignmentItemCategory;
  sortOrder: number;
  settingsJson: AssignmentSettings;
  status: AssignmentItemStatus;
  targetType?: AssignmentItemTargetType;
  targetValue?: number;
  resultId?: string;
  assignedTextId?: string;
  assignedTextTitle?: string;
  isRepeat: boolean;
  teacherNote?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyAssignment = {
  id: string;
  studentId: string;
  assignmentDate: string;
  title: string;
  status: AssignmentStatus;
  generationMode: AssignmentGenerationMode;
  educationLevel?: EducationLevel;
  teacherNote?: string;
  warningMessage?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items: DailyAssignmentItem[];
};

export type StudentAssignmentProfile = {
  id: string;
  name: string;
  className?: string;
  educationLevel?: EducationLevel;
  assignmentMode: "automatic" | "manual" | "ai_assisted";
};

export type GenerateDailyAssignmentInput = {
  studentId: string;
  assignmentDate: string;
  forceRegenerate?: boolean;
  createdBy?: string;
};

export type AssignmentWarningCode =
  | "missing_education_level"
  | "missing_comprehension_text"
  | "fallback_category_used"
  | "manual_mode";
