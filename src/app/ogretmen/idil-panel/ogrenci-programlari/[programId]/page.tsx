import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { StudentEducationProgramDetail } from "@/components/education-programs/StudentEducationProgramDetail";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/adminSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getStudentEducationProgramDetail } from "@/lib/education-programs/studentProgramRepository";
import { isEducationProgramUuid } from "@/lib/education-programs/studentProgramValidation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Öğrenci Programı Detayı | İDİL Hızlı Okuma",
  description: "Öğrenci eğitim programı snapshot günlerini ve çalışmalarını görüntüleyin.",
};

async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token || token.trim().length < 16) redirect("/giris");
}

export default async function StudentEducationProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ assigned?: string | string[] }>;
}) {
  await requireAdminSession();

  const { programId } = await params;
  const query = await searchParams;
  if (!isEducationProgramUuid(programId)) notFound();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return (
      <AppShell
        title="Öğrenci Programı"
        subtitle="Program detayları şu anda görüntülenemiyor."
        navItems={TEACHER_NAV_ITEMS}
        wide
      >
        <TeacherOnly>
          <PanelCard>
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800"
            >
              Eğitim programı servisi yapılandırılmamış.
            </div>
          </PanelCard>
        </TeacherOnly>
      </AppShell>
    );
  }

  const result = await getStudentEducationProgramDetail(supabase, programId);
  if (!result.ok && result.code === "not_found") notFound();

  return (
    <AppShell
      title={result.ok ? result.value.visibleName : "Öğrenci Programı"}
      subtitle="Atama anında oluşturulan gün ve çalışma snapshot'ı."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                Program detayı
              </h2>
              <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                Bu ekran salt okunurdur.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel/ogrenci-programlari"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Öğrenci Programlarına Dön
            </Link>
          </div>
        </PanelCard>

        {query.assigned === "1" ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            Program öğrenciye başarıyla atandı.
          </div>
        ) : null}

        <PanelCard>
          {result.ok ? (
            <StudentEducationProgramDetail program={result.value} />
          ) : (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800"
            >
              {result.message}
            </div>
          )}
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
