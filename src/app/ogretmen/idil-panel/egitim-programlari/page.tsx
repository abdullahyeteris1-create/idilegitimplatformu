import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { EducationProgramTemplateList } from "@/components/education-programs/EducationProgramTemplateList";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { listEducationProgramTemplates } from "@/lib/education-programs/repository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Eğitim Programları | İDİL Hızlı Okuma",
  description: "Yeniden kullanılabilir eğitim programı şablonlarını oluşturun ve düzenleyin.",
};

async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token || token.trim().length < 16) redirect("/giris");
}

export default async function EducationProgramsPage() {
  await requireAdminSession();

  const supabase = getSupabaseServiceRoleClient();
  const result = supabase
    ? await listEducationProgramTemplates(supabase)
    : { ok: false as const, message: "Eğitim programı servisi yapılandırılmamış." };

  return (
    <AppShell
      title="Eğitim Programları"
      subtitle="Yeniden kullanılabilir program şablonlarını hazırlayın ve yönetin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                Program Şablonları
              </h2>
              <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                Kategori yalnız yönetici düzenlemesi içindir; öğrenci ataması bu fazın kapsamında değildir.
              </p>
            </div>
            <a
              href="/ogretmen/idil-panel/egitim-programlari/yeni"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
            >
              Yeni Program Oluştur
            </a>
          </div>
        </PanelCard>

        <PanelCard>
          <EducationProgramTemplateList
            templates={result.ok ? result.value : []}
            errorMessage={result.ok ? undefined : result.message}
          />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
