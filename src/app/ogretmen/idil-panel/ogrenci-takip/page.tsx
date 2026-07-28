import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getTeacherStudentTrackingList } from "@/lib/teachers/studentTrackingRepository";
import { TeacherStudentTrackingClient } from "@/components/teacher-panel/TeacherStudentTrackingClient";

export default async function StudentTrackingPage() {
  await requireTeacherSession();
  const students = await getTeacherStudentTrackingList();

  return (
    <AppShell
      title="Ogrenci Takip"
      subtitle="XP, seviye, son aktivite ve aktif program gorunumu"
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherStudentTrackingClient initialStudents={students} />
    </AppShell>
  );
}
