import type { Metadata } from "next";
import Link from "next/link";
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
      subtitle="Şablonları hazırlayın, öğrencilere program atayın ve oluşturulan snapshot programları izleyin."
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
                Kategori yalnız yönetici filtresidir. Öğrenci atamaları yayınlanmış
                şablonlardan bağımsız bir snapshot oluşturur.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel/egitim-programlari/yeni"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
            >
              Yeni Program Oluştur
            </Link>
          </div>
        </PanelCard>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href="/ogretmen/idil-panel/egitim-programlari"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 transition hover:bg-red-100"
          >
            <p className="text-sm font-semibold text-red-900">Program Şablonları</p>
            <p className="mt-1 text-xs text-red-800">
              Taslakları düzenleyin ve eksiksiz şablonları yayınlayın.
            </p>
          </Link>
          <Link
            href="/ogretmen/idil-panel/egitim-programlari/ata"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-red-200 hover:bg-red-50 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
              Öğrenciye Program Ata
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Yayınlanmış şablondan değişmez öğrenci programı oluşturun.
            </p>
          </Link>
          <Link
            href="/ogretmen/idil-panel/ogrenci-programlari"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-red-200 hover:bg-red-50 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
              Öğrenci Programları
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Atanan programları ve snapshot günlerini salt okunur inceleyin.
            </p>
          </Link>
        </div>

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
