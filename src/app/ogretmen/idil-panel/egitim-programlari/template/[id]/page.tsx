import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { EducationProgramTemplateEditor } from "@/components/education-programs/EducationProgramTemplateEditor";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValid } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getEducationProgramTemplate } from "@/lib/education-programs/repository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Eğitim Programı Düzenle | İDİL Hızlı Okuma",
  description: "Eğitim programının günlük çalışma planını düzenleyin.",
};

export default async function EducationProgramTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!isAdminSessionTokenValid(token)) redirect("/giris");

  const { id } = await params;
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <AppShell
        title="Eğitim Programı"
        subtitle="Şablon düzenleyici"
        navItems={TEACHER_NAV_ITEMS}
        wide
      >
        <PanelCard>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800">
            Eğitim programı servisi yapılandırılmamış.
          </div>
        </PanelCard>
      </AppShell>
    );
  }

  const result = await getEducationProgramTemplate(supabase, id);
  if (!result.ok && result.code === "not_found") notFound();

  return (
    <AppShell
      title={result.ok ? result.value.name : "Eğitim Programı"}
      subtitle="Günleri seçin ve her günün beş temel çalışma kartını düzenleyin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        {result.ok ? (
          <EducationProgramTemplateEditor
            key={result.value.updatedAt}
            template={result.value}
          />
        ) : (
          <PanelCard>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800">
              {result.message}
            </div>
          </PanelCard>
        )}
      </TeacherOnly>
    </AppShell>
  );
}
