import type { TeacherStudentActivityType } from "./studentTrackingTypes";

export type TeacherDashboardSectionKey =
  | "students"
  | "programs"
  | "results"
  | "tasks"
  | "xp"
  | "activities"
  | "recent_students"
  | "attention_students";

export type TeacherDashboardSectionWarning = {
  section: TeacherDashboardSectionKey;
  message: string;
};

export type TeacherDashboardStats = {
  totalStudents: number | null;
  activeStudents: number | null;
  inactiveStudents: number | null;
  activePrograms: number | null;
  totalXp: number | null;
  activeStudentsLast7Days: number | null;
  completedActivitiesLast7Days: number | null;
  earnedXpLast7Days: number | null;
};

export type TeacherDashboardRecentActivity = {
  id: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  activityType: TeacherStudentActivityType;
  title: string;
  description: string;
  occurredAt: string | null;
  awardedXp: number | null;
  programName: string | null;
  readingSpeedWpm: number | null;
  comprehensionRate: number | null;
  detailHref: string;
};

export type TeacherDashboardRecentStudent = {
  studentId: string;
  studentName: string;
  studentInitials: string;
  classLabel: string | null;
  level: number | null;
  levelTitle: string | null;
  totalXp: number | null;
  lastActivityAt: string | null;
  lastActivitySummary: string;
  activeProgramName: string | null;
  detailHref: string;
};

export type TeacherDashboardAttentionReasonCode =
  | "access_expiring"
  | "no_program_progress"
  | "inactive_7_days"
  | "performance_decline";

export type TeacherDashboardAttentionStudent = {
  studentId: string;
  studentName: string;
  reasonCode: TeacherDashboardAttentionReasonCode;
  reasonLabel: string;
  supportingValue: string;
  lastActivityAt: string | null;
  detailHref: string;
};

export type TeacherDashboardSummary = {
  stats: TeacherDashboardStats;
  recentActivities: TeacherDashboardRecentActivity[];
  recentStudents: TeacherDashboardRecentStudent[];
  attentionStudents: TeacherDashboardAttentionStudent[];
  generatedAt: string;
  warnings: TeacherDashboardSectionWarning[];
};

export type TeacherDashboardSummaryResult = {
  summary: TeacherDashboardSummary | null;
  error: string | null;
};
