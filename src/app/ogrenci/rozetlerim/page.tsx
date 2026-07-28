import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Icon } from "@/components/student-panel-preview/icons";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getStudentXpBadges } from "@/lib/xp/xpBadges";
import { getStudentXpSnapshotByStudentId } from "@/lib/xp/xpRepository";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";

async function getStudentProfile(studentId: string) {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name")
      .eq("id", studentId)
      .maybeSingle();

    return error ? null : data;
  } catch {
    return null;
  }
}

export default async function StudentBadgesPage() {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");

  const [student, xpSnapshot] = await Promise.all([
    getStudentProfile(access.studentId),
    getStudentXpSnapshotByStudentId(access.studentId),
  ]);

  const studentName = student?.name?.trim() ?? "";
  if (!student || String(student.id) !== access.studentId || !studentName) {
    redirect("/giris");
  }

  const badges = getStudentXpBadges(xpSnapshot);
  const earnedBadges = badges.filter((badge) => badge.isEarned);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_34%),linear-gradient(180deg,_var(--idil-page-bg),_var(--idil-page-bg))] text-[var(--idil-text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/85 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-violet-200">Rozetlerim</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Kazanılan rozetler ve gelişim yolun</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                {studentName} için rozetler, mevcut XP ve seviye durumuna göre otomatik hesaplanır.
                Kilitli rozetler sonraki fazlardaki etkinliklerle açılacaktır.
              </p>
            </div>
            <Link
              href="/ogrenci"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-white/15"
            >
              <Icon name="arrow" className="h-4 w-4 rotate-180" />
              Öğrenci Paneline Dön
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Toplam XP</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{xpSnapshot.totalXp.toLocaleString("tr-TR")}</p>
            <p className="mt-2 text-sm text-slate-500">Seviye {xpSnapshot.level} · {xpSnapshot.title}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Açılan Rozet</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{earnedBadges.length}</p>
            <p className="mt-2 text-sm text-slate-500">Toplam {badges.length} rozet tanımı</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Sonraki Hedef</p>
            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{xpSnapshot.nextLevelTitle}</p>
            <p className="mt-2 text-sm text-slate-500">Sonraki seviyeye {xpSnapshot.remainingXp.toLocaleString("tr-TR")} XP kaldı</p>
          </article>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-violet-700">Rozet Kataloğu</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Açık ve kilitli rozetler</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              {xpSnapshot.progressPercent}% seviye ilerlemesi
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => {
              const isEarned = badge.isEarned;
              return (
                <article
                  key={badge.id}
                  className={`rounded-3xl border p-4 shadow-sm transition ${isEarned ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50/90"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isEarned ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`}>
                      <Icon name={badge.icon} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-950">{badge.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isEarned ? "bg-emerald-100 text-emerald-700" : badge.comingSoon ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"}`}>
                          {isEarned ? "Açık" : badge.comingSoon ? "Yakında" : "Kilitli"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{badge.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
