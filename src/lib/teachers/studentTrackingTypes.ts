import type { ExerciseResult } from "@/lib/results/types";
import type { StudentXpSnapshot } from "@/lib/xp/xpLevels";

export type TeacherStudentAccountStatus = "active" | "passive";

export type TeacherStudentListItem = {
  studentId: string;
  fullName: string;
  classLabel: string | null;
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

export type TeacherStudentPerformanceSummary = {
  totalExercises: number;
  lastStudyAt: string | null;
  latestReadingSpeedWpm: number | null;
  highestReadingSpeedWpm: number | null;
  latestComprehensionRate: number | null;
  averageComprehensionRate: number | null;
  readingTestCount: number;
};

export type TeacherStudentDetail = {
  profile: TeacherStudentProfile;
  gamificationSummary: TeacherStudentGamificationSummary;
  programSummary: TeacherStudentProgramSummary;
  performanceSummary: TeacherStudentPerformanceSummary;
  results: ExerciseResult[];
};
