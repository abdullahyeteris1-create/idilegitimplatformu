import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { EducationProgramCreateForm } from "@/components/education-programs/EducationProgramCreateForm";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export const metadata: Metadata = {
  title: "Yeni Eğitim Programı | İDİL Hızlı Okuma",
  description: "Yeni bir eğitim programı şablonu oluşturun.",
};

export default async function NewEducationProgramPage() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token || token.trim().length < 16) redirect("/giris");

  return (
    <AppShell
      title="Yeni Eğitim Programı"
      subtitle="Program bilgilerini girin; günlük çalışmalar sonraki ekranda düzenlenecek."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard
          title="Program Bilgileri"
          subtitle="Programı taslak olarak bırakabilir veya doğrudan günlük editöre geçebilirsiniz."
        >
          <EducationProgramCreateForm />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
