import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import QuestionBankImportClient from "./QuestionBankImportClient";

export default async function Page() {
  await requireTeacherSession();
  return <AppShell title="Dosyadan Soru Ekle" subtitle="DOCX sorularını kontrol ederek soru bankasına aktarın." navItems={TEACHER_NAV_ITEMS} wide>
    <div className="mb-4">
      <Link href="/ogretmen/icerik-yonetimi/paragraf-sorulari" className="text-sm font-semibold text-red-700 hover:underline">← Soru bankasına dön</Link>
    </div>
    <QuestionBankImportClient />
  </AppShell>;
}
