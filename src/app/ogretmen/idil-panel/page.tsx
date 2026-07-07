"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getIdilPanelSummary } from "@/lib/idil-panel/summaryStorage";

type SummaryStat = {
  key: string;
  label: string;
  value: number | string;
};

type ModuleCard = {
  title: string;
  description: string;
  status: string;
  href?: string;
};

const INITIAL_STATS: SummaryStat[] = [
  { key: "students-total", label: "Toplam Ogrenci", value: "Hazirlaniyor" },
  { key: "students-active", label: "Aktif Ogrenci", value: "Hazirlaniyor" },
  { key: "active-courses", label: "Aktif Kur", value: "Hazirlaniyor" },
  { key: "planned-lessons", label: "Bu Haftaki Planli Ders", value: "Hazirlaniyor" },
  { key: "completed-lessons", label: "Tamamlanan Ders", value: "Hazirlaniyor" },
  { key: "report-count", label: "Rapor Sayisi", value: "Hazirlaniyor" },
  { key: "text-count", label: "Metin Sayisi", value: "Hazirlaniyor" },
  { key: "exercise-results", label: "Egzersiz Sonucu", value: "Hazirlaniyor" },
  { key: "reading-tests", label: "Okuma Testi Sonucu", value: "Hazirlaniyor" },
];

const MODULE_CARDS: ModuleCard[] = [
  {
    title: "Ogrenci Takip",
    description: "Ogrenci bilgileri, durum ve gelisim takibi.",
    status: "Hazirlaniyor",
    href: "/ogretmen/ogrenciler",
  },
  {
    title: "Haftalik Ders Programi",
    description: "Gunluk ve haftalik dersleri planla.",
    status: "Sonraki adim",
  },
  {
    title: "Ders Kayitlari",
    description: "Yapilan dersleri ve olcumleri takip et.",
    status: "Sonraki adim",
  },
  {
    title: "Gelisim Raporu",
    description: "Ogrenci bazli okuma hizi ve anlama gelisimi.",
    status: "Sonraki adim",
  },
  {
    title: "Veli Raporu",
    description: "Yazdirmaya uygun veli bilgilendirme raporu.",
    status: "Sonraki adim",
  },
  {
    title: "Icerik Yonetimi",
    description: "Metin kutuphanesi ve anlama testi sorulari.",
    status: "Hazir",
    href: "/ogretmen/icerik-yonetimi",
  },
];

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

        const nextStats: SummaryStat[] = [
          { key: "students-total", label: "Toplam Ogrenci", value: summary.totalStudents },
          { key: "students-active", label: "Aktif Ogrenci", value: summary.activeStudents },
          { key: "active-courses", label: "Aktif Kur", value: summary.activeCourses },
          { key: "planned-lessons", label: "Bu Haftaki Planli Ders", value: summary.plannedLessonsThisWeek },
          { key: "completed-lessons", label: "Tamamlanan Ders", value: summary.completedLessons },
          { key: "report-count", label: "Rapor Sayisi", value: summary.reportCount },
          { key: "text-count", label: "Metin Sayisi", value: summary.textCount },
          { key: "exercise-results", label: "Egzersiz Sonucu", value: summary.exerciseResultCount },
          { key: "reading-tests", label: "Okuma Testi Sonucu", value: summary.readingTestCount },
        ];

        setStats(nextStats);
      } catch {
        if (!isMounted) {
          return;
        }

        const fallbackStats: SummaryStat[] = [
          { key: "students-total", label: "Toplam Ogrenci", value: 0 },
          { key: "students-active", label: "Aktif Ogrenci", value: 0 },
          { key: "active-courses", label: "Aktif Kur", value: 0 },
          { key: "planned-lessons", label: "Bu Haftaki Planli Ders", value: 0 },
          { key: "completed-lessons", label: "Tamamlanan Ders", value: 0 },
          { key: "report-count", label: "Rapor Sayisi", value: 0 },
          { key: "text-count", label: "Metin Sayisi", value: 0 },
          { key: "exercise-results", label: "Egzersiz Sonucu", value: 0 },
          { key: "reading-tests", label: "Okuma Testi Sonucu", value: 0 },
        ];

        setStats(fallbackStats);
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell
      title="Idil Yonetim Paneli"
      subtitle="Ogrenci takip, ders programi ve rapor yonetimi icin yonetici alani."
      navItems={TEACHER_NAV_ITEMS}
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">Idil Yonetim Paneli</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                Ogrenci takip, ders programi ve rapor yonetimi icin yonetici alani.
              </p>
            </div>
            <Link
              href="/ogretmen"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Geri Don
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="Yonetim Ozetleri" subtitle="Temel metrikler">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <article key={stat.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-[18px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">{stat.label}</p>
                <p className="mt-2 text-[30px] font-semibold leading-none text-slate-950">{stat.value}</p>
              </article>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Yonetim Modulleri" subtitle="Masaustu Idilpanel akisi icin web modulleri">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MODULE_CARDS.map((module) => (
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
                      Modulu Ac
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                      Yakinda
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </PanelCard>

        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900 shadow-sm">
          Masaustu Idilpanel ozellikleri bu alana kademeli olarak tasinacaktir.
        </section>
      </TeacherOnly>
    </AppShell>
  );
}