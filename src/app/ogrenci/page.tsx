import { AppShell } from "@/components/layout/AppShell";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";

export default function StudentDashboardPage() {
  return (
    <AppShell
      title="Ogrenci Paneli"
      subtitle="Egzersizlerini sec, ilerlemeni takip et ve sonucu gor."
      navItems={APP_NAV_ITEMS}
    >
      <StudentDashboardClient />
    </AppShell>
  );
}
