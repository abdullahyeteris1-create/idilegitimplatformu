import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getTeacherStudentTrackingList } from "@/lib/teachers/studentTrackingRepository";
import type { TeacherStudentListItem } from "@/lib/teachers/studentTrackingTypes";
import { TeacherStudentTrackingClient } from "@/components/teacher-panel/TeacherStudentTrackingClient";

export default async function StudentTrackingPage() {
  await requireTeacherSession();
  let students: TeacherStudentListItem[] = [];
  let loadError: string | null = null;

  try {
    students = await getTeacherStudentTrackingList();
  } catch {
    loadError = "Öğrenci verileri şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin.";
  }

  return (
    <AppShell
      title="Ogrenci Takip"
      subtitle="XP, seviye, son aktivite ve aktif program gorunumu"
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherStudentTrackingClient initialStudents={students} loadError={loadError} />
    </AppShell>
  );
}
