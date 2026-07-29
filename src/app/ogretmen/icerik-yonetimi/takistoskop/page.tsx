import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { listTachistoscopeWordsForTeacher } from "@/lib/tachistoscope/tachistoscopeRepository";
import { TakistoskopClient } from "./TakistoskopClient";

export default async function TakistoskopPage() {
  await requireTeacherSession();

  const supabase = getSupabaseServiceRoleClient();
  const result = await listTachistoscopeWordsForTeacher(supabase);

  return (
    <AppShell
      title="Takistoskop İçerikleri"
      subtitle="Tek kelimelik havuzu güvenli biçimde yönetin, hızlı ekleme ve toplu aktarma yapın."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <TeacherOnly>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/ogretmen/icerik-yonetimi"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-800 transition hover:bg-pink-100"
          >
            İçerik Yönetimine Dön
          </Link>
          <p className="text-sm font-medium text-slate-500">
            Kayıtlar yalnızca canlı Takistoskop havuzuna yazılır. Öğrenci egzersizi bu fazda değiştirilmez.
          </p>
        </div>

        {result.ok ? (
          <TakistoskopClient initialItems={result.items} />
        ) : (
          <section className="idil-card p-5">
            <p className="text-sm font-semibold text-red-700">Takistoskop içeriği yüklenemedi.</p>
            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
          </section>
        )}
      </TeacherOnly>
    </AppShell>
  );
}
