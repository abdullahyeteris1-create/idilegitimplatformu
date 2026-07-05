import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { TeacherRecentResultsClient } from "@/components/results/TeacherRecentResultsClient";
import { TeacherStudentOverviewClient } from "@/components/results/TeacherStudentOverviewClient";
import Link from "next/link";

const draftCards = [
  {
    title: "Sinif Yonetimi",
    text: "Ogrenci ekleme, gruplama ve sinif bazli atama islemleri icin taslak alan.",
  },
  {
    title: "Raporlama",
    text: "Dogru oranlari, sure trendleri ve egzersiz bazli gelisim raporlari burada olacak.",
  },
  {
    title: "Egzersiz Atama",
    text: "Takistoskop ve gelecek egzersizleri ogrencilere toplu veya bireysel atama akisi.",
  },
];

export default function TeacherPage() {
  return (
    <AppShell
      title="Ogretmen Paneli (Taslak)"
      subtitle="Bu ekran, gelecekteki ogretmen yetkileri ve raporlama altyapisina temel olur."
      navItems={TEACHER_NAV_ITEMS}
    >
      <PanelCard title="Panel Durumu" subtitle="Ilk asama taslak gorunumu">
        <div className="grid gap-3 md:grid-cols-3">
          {draftCards.map((card) => (
            <article key={card.title} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-base font-bold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.text}</p>
            </article>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        title="Icerik Yonetimi"
        subtitle="Metin, soru, kelime, simge ve egzersiz ayarlari icin yonetim merkezi"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Platformdaki egzersiz icerikleri ileride buradan yonetilecek. Ilk asamada Metin Kutuphanesi aktif olarak hazirlandi.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Metin Kutuphanesi", "Soru Kutuphanesi", "Kelime Havuzu", "Egzersiz Ayarlari"].map((item) => (
                <span key={item} className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/ogretmen/icerik-yonetimi"
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-3 text-sm font-black text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)]"
          >
            Icerik Yonetimini Ac
          </Link>
        </div>
      </PanelCard>

      <div id="ogrenciler">
        <PanelCard
          title="Ogrenci Yonetimi"
          subtitle="Ogrenci listesi, duzenleme ve yeni ogrenci olusturma islemleri"
        >
          <TeacherStudentOverviewClient />
        </PanelCard>
      </div>

      <div id="sonuclar">
        <PanelCard
          title="Son Egzersiz Sonuclari"
          subtitle="Tum ogrencilerden gelen son sonuclar. Veri kaynagi su an localStorage/mock katmanidir."
        >
          <TeacherRecentResultsClient />
        </PanelCard>
      </div>
    </AppShell>
  );
}
