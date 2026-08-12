import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { StudentEducationProgramList } from "@/components/education-programs/StudentEducationProgramList";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValid } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { listStudentEducationPrograms } from "@/lib/education-programs/studentProgramRepository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Öğrenci Programları | İDİL Hızlı Okuma",
  description: "Öğrencilere atanmış eğitim programı snapshot'larını görüntüleyin.",
};

async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!isAdminSessionTokenValid(token)) redirect("/giris");
}

export default async function StudentEducationProgramsPage() {
  await requireAdminSession();

  const supabase = getSupabaseServiceRoleClient();
  const result = supabase
    ? await listStudentEducationPrograms(supabase)
    : {
        ok: false as const,
        message: "Eğitim programı servisi yapılandırılmamış.",
      };

  return (
    <AppShell
      title="Öğrenci Programları"
      subtitle="Atanmış programları ve ilerleme durumlarını görüntüleyin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                Atanmış programlar
              </h2>
              <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                Programları görüntüleyebilir veya kalıcı olarak silebilirsiniz.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel/egitim-programlari/ata"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
            >
              Öğrenciye Program Ata
            </Link>
          </div>
        </PanelCard>

        <PanelCard>
          <StudentEducationProgramList
            programs={result.ok ? result.value : []}
            errorMessage={result.ok ? undefined : result.message}
          />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
