import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { EditStudentFormClient } from "./EditStudentFormClient";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

export default function EditStudentPage() {
  return (
    <AppShell
      title="Ogrenci Duzenle"
      subtitle="Mevcut ogrenci bilgilerini guncelleyebilirsin. Opsiyonel alanlari bos birakabilirsin."
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        <PanelCard title="Ogrenci Bilgileri" subtitle="Degisiklikler kaydedildikten sonra ogrenci listesine donersin.">
          <EditStudentFormClient />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
