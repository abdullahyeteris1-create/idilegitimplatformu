import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ContentManagementClient } from "./ContentManagementClient";

export default function ContentManagementPage() {
  return (
    <AppShell
      title="Icerik Yonetimi"
      subtitle="Egzersiz metinleri, kelime havuzlari, soru setleri ve ayarlari icin ogretmen yonetim merkezi."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <ContentManagementClient />
    </AppShell>
  );
}
