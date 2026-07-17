import { AppShell } from "@/components/layout/AppShell";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";

export default function StudentDashboardPage() {
  return (
    <AppShell
      title="Öğrenci Paneli"
      subtitle="Egzersizlerini seç, ilerlemeni takip et ve sonuçlarını gör."
      navItems={APP_NAV_ITEMS}
      headerVariant="student-vibrant"
    >
      <StudentDashboardClient />
    </AppShell>
  );
}
