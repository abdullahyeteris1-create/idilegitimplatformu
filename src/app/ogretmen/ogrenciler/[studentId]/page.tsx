import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { StudentDetailClient } from "./StudentDetailClient";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

export default function StudentDetailPage() {
  return (
    <AppShell
      title="Ogrenci Detayi"
      subtitle="Ogrenci bilgileri, performans ozeti ve sonuc gecmisi"
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        <PanelCard title="Detayli Ogrenci Raporu" subtitle="Performans takip ve disa aktarma alani">
          <StudentDetailClient />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
