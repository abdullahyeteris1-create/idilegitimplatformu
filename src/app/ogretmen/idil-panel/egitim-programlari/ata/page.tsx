import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { EducationProgramAssignmentForm } from "@/components/education-programs/EducationProgramAssignmentForm";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValid } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { listEducationProgramAssignmentOptions } from "@/lib/education-programs/studentProgramRepository";
import type { StudentEducationProgramAssignmentOptions } from "@/lib/education-programs/studentProgramTypes";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Öğrenciye Program Ata | İDİL Hızlı Okuma",
  description: "Yayınlanmış eğitim programı şablonunu aktif öğrenciye atayın.",
};

const EMPTY_OPTIONS: StudentEducationProgramAssignmentOptions = {
  students: [],
  templates: [],
};

async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!isAdminSessionTokenValid(token)) redirect("/giris");
}

export default async function AssignEducationProgramPage() {
  await requireAdminSession();

  const supabase = getSupabaseServiceRoleClient();
  const result = supabase
    ? await listEducationProgramAssignmentOptions(supabase)
    : {
        ok: false as const,
        message: "Eğitim programı servisi yapılandırılmamış.",
      };

  return (
    <AppShell
      title="Öğrenciye Program Ata"
      subtitle="Yayınlanmış şablondan öğrenciye özel, bağımsız bir program snapshot'ı oluşturun."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                Yeni program ataması
              </h2>
              <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                Atama anındaki günler, çalışmalar, süreler, seviyeler ve ayarlar
                öğrenci programına kopyalanır.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel/ogrenci-programlari"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Öğrenci Programları
            </Link>
          </div>
        </PanelCard>

        <PanelCard>
          {!result.ok ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800"
            >
              {result.message}
            </div>
          ) : null}
          <EducationProgramAssignmentForm
            options={result.ok ? result.value : EMPTY_OPTIONS}
          />
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
