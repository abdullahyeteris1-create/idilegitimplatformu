import { AppShell } from "@/components/layout/AppShell";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { AnlamaTestiOlusturClient } from "./AnlamaTestiOlusturClient";

export default function AnlamaTestiOlusturPage() {
  return (
    <AppShell
      title="Anlama Testi Oluştur"
      subtitle="Metin Kütüphanesi'ndeki metinlere soru ve cevap seçenekleri ekleyin."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <TeacherOnly>
        <AnlamaTestiOlusturClient />
      </TeacherOnly>
    </AppShell>
  );
}