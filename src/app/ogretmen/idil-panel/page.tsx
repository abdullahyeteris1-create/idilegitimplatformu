"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  ASSIGNMENT_PROGRAM_HREF,
  SHOW_ASSIGNMENT_PROGRAM,
  TEACHER_NAV_ITEMS,
} from "@/lib/constants/teacherNavigation";
import { getIdilPanelSummary, type IdilPanelSummary } from "@/lib/idil-panel/summaryStorage";

type SummaryStat = {
  key: string;
  label: string;
  value: number | string;
};

/**
 * Metrik anahtarı + etiketi + özetten hangi alanı okuduğu tek yerde tanımlı.
 * Daha önce bu dokuz etiket üç ayrı dizide (başlangıç / başarı / hata) birebir
 * tekrarlanıyordu; bir etiketi değiştirmek üç yeri birden düzeltmeyi
 * gerektiriyordu.
 */
const SUMMARY_METRICS: ReadonlyArray<{
  key: string;
  label: string;
  read: (summary: IdilPanelSummary) => number;
}> = [
  { key: "students-total", label: "Toplam Öğrenci", read: (s) => s.totalStudents },
  { key: "students-active", label: "Aktif Öğrenci", read: (s) => s.activeStudents },
  { key: "active-courses", label: "Aktif Kur", read: (s) => s.activeCourses },
  { key: "planned-lessons", label: "Bu Haftaki Planlı Ders", read: (s) => s.plannedLessonsThisWeek },
  { key: "completed-lessons", label: "Tamamlanan Ders", read: (s) => s.completedLessons },
  { key: "report-count", label: "Rapor Sayısı", read: (s) => s.reportCount },
  { key: "text-count", label: "Metin Sayısı", read: (s) => s.textCount },
  { key: "exercise-results", label: "Egzersiz Sonucu", read: (s) => s.exerciseResultCount },
  { key: "reading-tests", label: "Okuma Testi Sonucu", read: (s) => s.readingTestCount },
];

function buildStats(value: (metric: (typeof SUMMARY_METRICS)[number]) => number | string): SummaryStat[] {
  return SUMMARY_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: value(metric),
  }));
}

type ModuleCard = {
  title: string;
  description: string;
  status: string;
  href?: string;
};

const INITIAL_STATS: SummaryStat[] = buildStats(() => "Hazırlanıyor");

const MODULE_CARDS: ModuleCard[] = [
  {
    title: "Öğrenci Takip",
    description: "Öğrenci bilgileri, durum ve gelişim takibi.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/ogrenci-takip",
  },
  {
    title: "Haftalık Ders Programı",
    description: "Günlük ve haftalık dersleri planla.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/haftalik-program",
  },
  {
    title: "Toplu Öğrenci Aktar",
    description: "CSV dosyasıyla öğrenci listesini toplu olarak sisteme ekle.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/toplu-ogrenci-aktar",
  },
  {
    title: "Ders Kayıtları",
    description: "Yapılan dersleri ve ölçümleri takip et.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/ders-kayitlari",
  },
  {
    title: "Oyun Odaları",
    description: "Çok oyunculu oyunlar için oda oluştur, kod paylaş ve canlı lobiyi yönet.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/oyun-odalari",
  },
  {
    title: "Ödev Programı",
    description: "Sınıf gruplarına göre 20 günlük ödev şablonu ayarları ve program önizlemesi.",
    status: "Aktif",
    href: "/ogretmen/idil-panel/odev-programi",
  },
  {
    title: "Eğitim Programları",
    description: "Yeniden kullanılabilir, gün gün düzenlenen bağımsız eğitim programı şablonları.",
    status: "Faz 1",
    href: "/ogretmen/idil-panel/egitim-programlari",
  },
  {
    title: "Gelişim Raporu",
    description: "Öğrenci bazlı okuma hızı ve anlama gelişimi.",
    status: "Sonraki adım",
  },
  {
    title: "Veli Raporu",
    description: "Yazdırmaya uygun veli bilgilendirme raporu.",
    status: "Sonraki adım",
  },
  {
    title: "İçerik Yönetimi",
    description: "Metin kütüphanesi ve anlama testi soruları.",
    status: "Hazır",
    href: "/ogretmen/icerik-yonetimi",
  },
];

const visibleModuleCards = MODULE_CARDS.filter(
  (module) => SHOW_ASSIGNMENT_PROGRAM || module.href !== ASSIGNMENT_PROGRAM_HREF,
);

export default function IdilPanelPage() {
  const [stats, setStats] = useState<SummaryStat[]>(INITIAL_STATS);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        const summary = await getIdilPanelSummary();
        if (!isMounted) {
          return;
        }

        setStats(buildStats((metric) => metric.read(summary)));
      } catch {
        if (!isMounted) {
          return;
        }

        // TODO: "okunamadı" ile "gerçekten 0" ayrımı henüz yok; ikisi de 0
        // görünüyor. Sonraki adımda hata durumu ayrı gösterilecek.
        setStats(buildStats(() => 0));
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell
      title="İdil Yönetim Paneli"
      subtitle="Öğrenci takip, ders programı ve rapor yönetimi için yönetici alanı."
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        {/* Başlık/alt başlık AppShell'de zaten render ediliyor; burada
            tekrarlanınca ekranda üst üste iki kez görünüyordu. Yalnızca
            geri dönüş bağlantısı bırakıldı. */}
        <PanelCard>
          <div className="flex justify-end">
            <Link
              href="/ogretmen"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Geri Dön
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="Yönetim Özetleri" subtitle="Temel metrikler">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <article key={stat.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-[18px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">{stat.label}</p>
                <p className="mt-2 text-[30px] font-semibold leading-none text-slate-950">{stat.value}</p>
              </article>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Yönetim Modülleri" subtitle="Masaüstü İdilpanel akışı için web modülleri">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleModuleCards.map((module) => (
              <article key={module.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-[18px]">
                <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  {module.status}
                </div>
                <h3 className="mt-2 text-[18px] font-semibold text-slate-950">{module.title}</h3>
                <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{module.description}</p>
                <div className="mt-3">
                  {module.href ? (
                    <Link
                      href={module.href}
                      className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-100"
                    >
                      Modülü Aç
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                      Yakında
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </PanelCard>

        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900 shadow-sm">
          Masaüstü İdilpanel özellikleri bu alana kademeli olarak taşınacaktır.
        </section>
      </TeacherOnly>
    </AppShell>
  );
}
