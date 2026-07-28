import { AppShell } from "@/components/layout/AppShell";
import { TeacherDashboardOverview } from "@/components/teacher-panel/TeacherDashboardOverview";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getTeacherDashboardSummary } from "@/lib/teachers/teacherDashboardRepository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherPage() {
  await requireTeacherSession();
  const { summary, error } = await getTeacherDashboardSummary();

  return (
    <AppShell
      title="Öğretmen Paneli"
      subtitle="Öğrenci takibini, program ilerlemesini ve son aktiviteleri gerçek verilerle tek ekranda görün."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherDashboardOverview summary={summary} error={error} />
    </AppShell>
  );
}
