import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ContentManagementClient } from "./ContentManagementClient";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

export default function ContentManagementPage() {
  return (
    <AppShell
      title="Icerik Yonetimi"
      subtitle="Egzersiz metinleri, kelime havuzlari, soru setleri ve ayarlari icin ogretmen yonetim merkezi."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <TeacherOnly>
        <ContentManagementClient />
      </TeacherOnly>
    </AppShell>
  );
}
