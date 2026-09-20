import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ImportExamClient } from "./ImportExamClient";
export default async function Page() {
  await requireTeacherSession();
  return <AppShell title="Dosyadan Deneme Yükle" subtitle="DOCX sorularını kontrol ederek taslak denemeye dönüştürün." navItems={TEACHER_NAV_ITEMS} wide><ImportExamClient /></AppShell>;
}
