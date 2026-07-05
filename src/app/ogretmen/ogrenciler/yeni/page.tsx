import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { NewStudentFormClient } from "./NewStudentFormClient";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

export default function NewStudentPage() {
  return (
    <AppShell
      title="Yeni Ogrenci Olustur"
      subtitle="Zorunlu alanlar: Ad Soyad, Kullanici Adi, Sifre. Diger alanlar opsiyoneldir."
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        <PanelCard title="Ogrenci Bilgileri" subtitle="Kayit sonrasi ogrenci listesinde gorunur.">
          <NewStudentFormClient />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
