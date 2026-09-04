import type { StudentStatusFilter } from "@/lib/students/studentStatus";
import { isCurrentStudentStatus } from "@/lib/students/studentStatus";
import type { TeacherStudentListItem } from "./studentTrackingTypes";

export type TeacherStudentTrackingSummary = {
  total: number;
  active: number;
  completed: number;
  passive: number;
  totalXp: number;
  activePrograms: number;
};

export function getTeacherStudentTrackingSummary(
  students: readonly TeacherStudentListItem[],
): TeacherStudentTrackingSummary {
  return students.reduce<TeacherStudentTrackingSummary>(
    (summary, student) => {
      summary.total += 1;
      summary[student.status] += 1;
      summary.totalXp += student.totalXp;
      summary.activePrograms += student.activeProgramName ? 1 : 0;
      return summary;
    },
    {
      total: 0,
      active: 0,
      completed: 0,
      passive: 0,
      totalXp: 0,
      activePrograms: 0,
    },
  );
}

export function matchesTeacherStudentStatusFilter(
  student: Pick<TeacherStudentListItem, "status">,
  filter: StudentStatusFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "current") {
    return isCurrentStudentStatus(student.status);
  }

  return student.status === filter;
}
