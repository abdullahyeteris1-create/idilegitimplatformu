import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CONTENT_MODULES } from "@/lib/content-management/modules";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export default function ContentManagementPage() {
  return (
    <AppShell
      title="Icerik Yonetimi"
      subtitle="Egzersizlerde kullanilacak metin, soru, kelime ve ayar kaynaklarini yonet."
      navItems={TEACHER_NAV_ITEMS}
    >
      <section className="idil-card overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Yonetim Merkezi</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Icerik modulleri</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Bu alan ogretmen ve panel sahibi icindir. Ogrenci ekranlarinda gorunmez.
            </p>
          </div>
          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-700">
            {CONTENT_MODULES.length} modul
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONTENT_MODULES.map((module) => {
            const isActive = module.status === "active";

            return (
              <article
                key={module.id}
                className="group flex min-h-[252px] flex-col rounded-2xl border border-red-100 bg-white p-4 shadow-[0_10px_28px_rgba(127,29,29,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(127,29,29,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.tone} text-sm font-black text-white shadow-md`}>
                    {module.icon}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${isActive ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {isActive ? "Aktif" : "Yakinda"}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{module.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{module.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {module.connectedExercises.map((exercise) => (
                    <span key={exercise} className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                      {exercise}
                    </span>
                  ))}
                </div>

                {isActive ? (
                  <Link
                    href={module.href}
                    className={`mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r ${module.tone} px-4 py-3 text-sm font-black text-white shadow-md transition duration-200 active:scale-[0.98] group-hover:brightness-110`}
                  >
                    Yonet
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500"
                  >
                    Yakinda
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
