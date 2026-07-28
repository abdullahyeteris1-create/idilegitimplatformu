import type { ExerciseResult } from "@/lib/results/types";
import type { StudentXpSnapshot } from "@/lib/xp/xpLevels";
import type { StudentStatus } from "@/lib/students/studentStatus";

export type TeacherStudentAccountStatus = "active" | "passive";
export type TeacherStudentProgramStatus = "active" | "completed" | "cancelled";
export type TeacherStudentProgramDayStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed";
export type TeacherStudentProgramTaskStatus = TeacherStudentProgramDayStatus;

export type TeacherStudentListItem = {
  studentId: string;
  fullName: string;
  classLabel: string | null;
  status: StudentStatus;
  accountStatus: TeacherStudentAccountStatus;
  accessEndsAt: string | null;
  totalXp: number;
  level: number;
  levelTitle: string;
  lastActivityAt: string | null;
  activeProgramName: string | null;
  programProgressPercent: number | null;
};

export type TeacherStudentProfile = {
  studentId: string;
  fullName: string;
  username: string;
  classLabel: string | null;
  accountStatus: TeacherStudentAccountStatus;
  accessEndsAt: string | null;
  lastLoginAt: string | null;
  parentName: string | null;
  parentPhone: string | null;
  educationLevel: string | null;
  educationStatus: string | null;
  notes: string | null;
  createdAt: string | null;
};

export type TeacherStudentGamificationSummary = {
  totalXp: number;
  level: number;
  levelTitle: string;
  remainingXp: number;
  progressPercent: number;
  badgeCount: number;
  snapshot: StudentXpSnapshot;
};

export type TeacherStudentProgramSummary = {
  activeProgramId: string | null;
  activeProgramName: string | null;
  currentDayNumber: number | null;
  completedDays: number | null;
  totalDays: number | null;
  progressPercent: number | null;
  assignedAt: string | null;
  startedAt: string | null;
  lastCompletedTaskAt: string | null;
};

export type TeacherStudentProgramContext = {
  id: string;
  visibleName: string;
  status: TeacherStudentProgramStatus;
  currentDayNumber: number;
  completedDays: number;
  totalDays: number;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type TeacherStudentProgramTaskProgress = {
  taskId: string;
  programId: string;
  dayId: string;
  studentId: string;
  dayNumber: number;
  orderNumber: number;
  exerciseSlug: string;
  exerciseTitle: string;
  taskType: string;
  status: TeacherStudentProgramTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  resultId: string | null;
  resultSummary: string | null;
  awardedXp: number | null;
};

export type TeacherStudentProgramDayProgress = {
  dayId: string;
  programId: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  status: TeacherStudentProgramDayStatus;
  availableAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  tasks: TeacherStudentProgramTaskProgress[];
};

export type TeacherStudentProgramProgress = TeacherStudentProgramContext & {
  totalTasks: number;
  completedTasks: number;
  dayProgressPercent: number;
  taskProgressPercent: number;
  overallProgressPercent: number;
  lastCompletedTask: TeacherStudentProgramTaskProgress | null;
  nextPendingTask: TeacherStudentProgramTaskProgress | null;
  days: TeacherStudentProgramDayProgress[];
};

export type TeacherStudentPerformanceSummary = {
  totalExercises: number;
  lastStudyAt: string | null;
  latestReadingSpeedWpm: number | null;
  highestReadingSpeedWpm: number | null;
  latestComprehensionRate: number | null;
  averageComprehensionRate: number | null;
  readingTestCount: number;
};

export type TeacherStudentPerformanceTrendDirection = "up" | "down" | "stable" | "unavailable";

export type TeacherStudentPerformanceHistoryItem = {
  id: string;
  occurredAt: string | null;
  title: string;
  sourceLabel: string;
  sourceType: string;
  sourceId: string | null;
  submissionKey: string | null;
  value: number;
  correctCount: number | null;
  wrongCount: number | null;
  netCount: number | null;
  durationSeconds: number | null;
  programName: string | null;
  programTaskName: string | null;
  awardedXp: number | null;
};

export type TeacherStudentPerformanceMetricSummary = {
  latestValue: number | null;
  highestValue: number | null;
  averageValue: number | null;
  previousValue: number | null;
  changeValue: number | null;
  changePercent: number | null;
  trendDirection: TeacherStudentPerformanceTrendDirection;
  totalResultCount: number;
  recentResults: TeacherStudentPerformanceHistoryItem[];
};

export type TeacherStudentPerformanceHistory = {
  reading: TeacherStudentPerformanceMetricSummary;
  comprehension: TeacherStudentPerformanceMetricSummary;
};

export type TeacherStudentActivityType =
  | "exercise_completed"
  | "education_program_task_completed"
  | "login_first_of_day"
  | "reading_comprehension_completed"
  | "reading_speed_test_completed";

export type TeacherStudentActivity = {
  id: string;
  studentId: string;
  activityType: TeacherStudentActivityType;
  title: string;
  description: string;
  occurredAt: string | null;
  sourceType: string;
  sourceId: string | null;
  awardedXp: number | null;
  programName: string | null;
  programTaskName: string | null;
  readingSpeedWpm: number | null;
  comprehensionRate: number | null;
  dedupeKey: string;
};

export type TeacherStudentDetail = {
  profile: TeacherStudentProfile;
  gamificationSummary: TeacherStudentGamificationSummary;
  programSummary: TeacherStudentProgramSummary;
  programProgress: TeacherStudentProgramProgress | null;
  programProgressError: string | null;
  performanceSummary: TeacherStudentPerformanceSummary;
  performanceHistory: TeacherStudentPerformanceHistory;
  performanceHistoryError: string | null;
  results: ExerciseResult[];
  activityFeed: TeacherStudentActivity[];
  activityFeedError: string | null;
};
