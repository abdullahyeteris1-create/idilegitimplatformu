import Link from "next/link";

import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { listTwoSideFocusWordSetsForTeacher } from "@/lib/two-side-focus/twoSideFocusTeacherRepository";
import { TwoSideFocusAdminClient } from "./TwoSideFocusAdminClient";

export default async function TwoSideFocusPage() {
  await requireTeacherSession();

  const supabase = getSupabaseServiceRoleClient();
  const result = await listTwoSideFocusWordSetsForTeacher(supabase);

  return (
    <AppShell
      title="Çift Taraflı Odak İçerikleri"
      subtitle="Kelime gruplarını güvenli biçimde yönetin, tek tek veya toplu olarak düzenleyin."
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
            Kaydedilen içerikler yalnızca canlı Çift Taraflı Odak havuzuna yazılır. Öğrenci egzersizi bu fazda
            değiştirilmez.
          </p>
        </div>

        {result.ok ? (
          <TwoSideFocusAdminClient initialItems={result.items} />
        ) : (
          <section className="idil-card p-5">
            <p role="alert" className="text-sm font-semibold text-red-700">Çift Taraflı Odak içeriği yüklenemedi.</p>
            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
          </section>
        )}
      </TeacherOnly>
    </AppShell>
  );
}
