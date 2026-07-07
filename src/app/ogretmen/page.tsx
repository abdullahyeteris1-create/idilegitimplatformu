import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { TeacherRecentResultsClient } from "@/components/results/TeacherRecentResultsClient";
import { TeacherStudentOverviewClient } from "@/components/results/TeacherStudentOverviewClient";
import Link from "next/link";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

const draftCards = [
  {
    title: "Sinif Yonetimi",
    text: "Ogrenci gruplari ve atamalar.",
    tone: "from-red-500 to-rose-600",
  },
  {
    title: "Raporlama",
    text: "Kisa gelisim ozeti ve trendler.",
    tone: "from-indigo-500 to-sky-600",
  },
  {
    title: "Egzersiz Atama",
    text: "Egzersizleri ogrencilere ata.",
    tone: "from-emerald-500 to-teal-600",
  },
];

export default function TeacherPage() {
  return (
    <AppShell
      title="Ogretmen Paneli"
      subtitle="Ogrenci yonetimi, sonuclar ve icerik alani."
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        <PanelCard title="Panel Durumu" subtitle="Kisa yonetim ozeti">
          <div className="grid gap-3 md:grid-cols-3">
            {draftCards.map((card, index) => (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-[18px]">
                <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl bg-gradient-to-br ${card.tone} text-[11px] font-semibold text-white`}>
                  {index + 1}
                </span>
                <h3 className="mt-2.5 text-[18px] font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{card.text}</p>
              </article>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          title="Icerik Yonetimi"
          subtitle="Metin, soru, kelime ve gorsel ayarlari."
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm leading-5 text-[var(--muted)]">
                Icerik yonetimini buradan ac ve gerekli modulleri duzenle.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Metin Kutuphanesi", "Soru Kutuphanesi", "Kelime Havuzu", "Egzersiz Ayarlari"].map((item) => (
                  <span key={item} className="idil-badge">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="/ogretmen/icerik-yonetimi"
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_48%,#991b1b_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:brightness-110"
            >
              Icerik Yonetimini Ac
            </Link>
          </div>
        </PanelCard>

        <PanelCard
          title="Yonetim Alanlari"
          subtitle="Idilpanel web yonetim modullerine hizli gecis"
        >
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-[18px]">
            <h3 className="text-[18px] font-semibold text-slate-950">Idil Yonetim Paneli</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              Ogrenci takip, ders programi, gelisim ve veli raporlarini yonet.
            </p>
            <div className="mt-3">
              <Link
                href="/ogretmen/idil-panel"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-100"
              >
                Idil Yonetim Panelini Ac
              </Link>
            </div>
          </article>
        </PanelCard>

        <div id="ogrenciler">
          <PanelCard
            title="Ogrenci Yonetimi"
            subtitle="Ogrenci listesi ve duzenleme islemleri"
          >
            <TeacherStudentOverviewClient />
          </PanelCard>
        </div>

        <div id="sonuclar">
          <PanelCard
            title="Son Egzersiz Sonuclari"
            subtitle="Son egzersiz ozetleri"
          >
            <TeacherRecentResultsClient />
          </PanelCard>
        </div>
      </TeacherOnly>
    </AppShell>
  );
}
