"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherRecentResultsClient } from "@/components/results/TeacherRecentResultsClient";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import {
  getIdilPanelSummary,
  listLessons,
  listSchedulesByDateRange,
  listStudentsForLessonRecords,
  type IdilPanelSummary,
  type LessonRecord,
  type ScheduleItem,
} from "@/lib/idil-panel/summaryStorage";
import { getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { Student } from "@/lib/students/types";

type DashboardState = {
  summary: IdilPanelSummary | null;
  students: Student[];
  weekSchedules: ScheduleItem[];
  todaySchedules: ScheduleItem[];
  lessons: LessonRecord[];
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: string;
};

function toDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekBounds(): { start: string; end: string } {
  const today = new Date();
  const day = today.getDay();
  const diffFromMonday = (day + 6) % 7;

  const monday = new Date(today);
  monday.setDate(today.getDate() - diffFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: toDateIso(monday),
    end: toDateIso(sunday),
  };
}

function formatDate(dateIso: string): string {
  if (!dateIso) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateIso));
}

function IconBox({ icon }: { icon: string }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white text-lg shadow-sm">
      {icon}
    </span>
  );
}

export default function TeacherPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [state, setState] = useState<DashboardState>({
    summary: null,
    students: [],
    weekSchedules: [],
    todaySchedules: [],
    lessons: [],
  });
  const [studentNameMap, setStudentNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { start, end } = getWeekBounds();
        const todayIso = toDateIso(new Date());

        const [summary, students, weekSchedules, lessons, lessonStudents] = await Promise.all([
          getIdilPanelSummary(),
          getStudentsWithRemote(),
          listSchedulesByDateRange(start, end),
          listLessons(),
          listStudentsForLessonRecords(),
        ]);

        if (!isMounted) {
          return;
        }

        const nameMap = new Map(lessonStudents.map((student) => [student.id, student.name]));
        setStudentNameMap(nameMap);

        setState({
          summary,
          students,
          weekSchedules,
          todaySchedules: weekSchedules.filter((schedule) => schedule.lessonDate === todayIso),
          lessons,
        });
      } catch {
        if (isMounted) {
          setErrorMessage("Panel verileri şu anda yüklenemiyor.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const quickActions: QuickAction[] = [
    {
      href: "/ogretmen/idil-panel/ogrenci-takip",
      label: "Öğrenci Takip",
      description: "XP, seviye ve aktif program görünümünü incele.",
      icon: "👥",
    },
    {
      href: "/ogretmen/ogrenciler/yeni",
      label: "Öğrenci Yönetimi",
      description: "Yeni kayıt oluştur, öğrencileri düzenle veya sil.",
      icon: "🪪",
    },
    {
      href: "/ogretmen/idil-panel/egitim-programlari",
      label: "Eğitim Programları",
      description: "Programları ata, takip et ve detayını aç.",
      icon: "📘",
    },
    {
      href: "/ogretmen/idil-panel/ders-kayitlari",
      label: "Ders Kayıtları",
      description: "Planlı dersleri ve günlük kayıtları yönet.",
      icon: "🗓️",
    },
    {
      href: "/ogretmen/icerik-yonetimi",
      label: "İçerik Yönetimi",
      description: "Egzersiz ve içerik düzenleme alanına geç.",
      icon: "✏️",
    },
  ];

  const activeStudentCount = useMemo(() => {
    return state.students.filter((student) => student.isActive !== false && student.status !== "passive").length;
  }, [state.students]);

  const completedExercises = state.summary?.exerciseResultCount ?? 0;
  const recentStudents = [...state.students]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 5);

  const attentionStudents = useMemo(() => {
    const grouped = new Map<string, LessonRecord[]>();

    state.lessons.forEach((lesson) => {
      const list = grouped.get(lesson.studentId) ?? [];
      list.push(lesson);
      grouped.set(lesson.studentId, list);
    });

    return Array.from(grouped.entries())
      .map(([studentId, records]) => {
        const average = Math.round(records.reduce((total, record) => total + (record.comprehensionScore ?? 0), 0) / records.length);
        return {
          studentId,
          studentName: studentNameMap.get(studentId) ?? "Öğrenci",
          average,
          count: records.length,
        };
      })
      .filter((item) => item.average < 70)
      .sort((first, second) => first.average - second.average)
      .slice(0, 5);
  }, [state.lessons, studentNameMap]);

  const stats = [
    { label: "Toplam Öğrenci", value: state.summary?.totalStudents ?? state.students.length, tone: "from-red-50 to-white" },
    { label: "Aktif Öğrenci", value: state.summary?.activeStudents ?? activeStudentCount, tone: "from-emerald-50 to-white" },
    { label: "Bu Hafta Ders", value: state.summary?.plannedLessonsThisWeek ?? state.weekSchedules.length, tone: "from-amber-50 to-white" },
    { label: "Tamamlanan Egzersiz", value: completedExercises, tone: "from-sky-50 to-white" },
  ];

  return (
    <AppShell
      title="Öğretmen Paneli"
      subtitle="Öğrenci takip, ders planlama ve performans görünümünü tek ekrandan yönetin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <div className="grid gap-4">
          <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,243,243,0.98)_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-7 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.96)_100%)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-orange-200/30 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700 shadow-sm [data-idil-theme=dark]:border-red-400/40 [data-idil-theme=dark]:bg-slate-900">
                  Yönetim Merkezi
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50 md:text-4xl">
                  Öğretmen paneline hoş geldiniz
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [data-idil-theme=dark]:text-slate-300 md:text-base">
                  Öğrenci takip, günlük ders kayıtları, eğitim programları ve performans özetlerini tek bir profesyonel arayüzde yönetin.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Hızlı tarama", "Canlı görünüm", "Mobil uyumlu", "Temiz yönetim"].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
                <Link
                  href="/ogretmen/idil-panel/ogrenci-takip"
                  className="group flex min-h-[72px] items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <IconBox icon="👥" />
                    <div>
                      <p className="text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Öğrenci Takip</p>
                      <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">XP ve seviye tabanlı görünüm</p>
                    </div>
                  </div>
                  <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-red-600" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link
                  href="/ogretmen/idil-panel/egitim-programlari"
                  className="group flex min-h-[72px] items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <IconBox icon="📘" />
                    <div>
                      <p className="text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Eğitim Programları</p>
                      <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">Görev ve program akışları</p>
                    </div>
                  </div>
                  <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-red-600" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className={`rounded-[24px] border border-slate-200 bg-gradient-to-br ${stat.tone} p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{stat.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <PanelCard title="Hızlı Erişim" subtitle="Sık kullanılan öğretmen işlemlerine tek tıkla geçin">
              <div className="grid gap-3 md:grid-cols-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex min-h-[96px] items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:hover:bg-slate-800/80"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white text-xl shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
                        {action.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{action.label}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-500 [data-idil-theme=dark]:text-slate-400">{action.description}</p>
                      </div>
                    </div>
                    <span className="ml-3 mt-0.5 text-xl text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-red-600" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="Bugünkü Durum" subtitle="Günlük eğitim akışının özeti">
              {isLoading ? (
                <p className="text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">Yükleniyor...</p>
              ) : state.todaySchedules.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                  Bugün için planlı ders bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {state.todaySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                          {studentNameMap.get(schedule.studentId) ?? "Öğrenci"}
                        </p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-400">
                          {schedule.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                        {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <PanelCard title="Haftalık Program" subtitle="Bu haftanın tüm planlı dersleri">
              {isLoading ? (
                <p className="text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">Yükleniyor...</p>
              ) : state.weekSchedules.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                  Haftalık program kaydı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {state.weekSchedules.slice(0, 6).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                          {studentNameMap.get(schedule.studentId) ?? "Öğrenci"}
                        </p>
                        <span className="text-xs font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-400">
                          {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                        {formatDate(schedule.lessonDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            <PanelCard title="Yeni Eklenen Öğrenciler" subtitle="Son kayıtlanan öğrenci listesi">
              {isLoading ? (
                <p className="text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">Yükleniyor...</p>
              ) : recentStudents.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                  Öğrenci kaydı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentStudents.map((student) => (
                    <Link
                      key={student.id}
                      href={`/ogretmen/ogrenciler/${student.id}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/60 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:hover:bg-slate-800/80"
                    >
                      <span className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">{student.name}</span>
                      <span className="text-slate-500 [data-idil-theme=dark]:text-slate-400">{student.className ?? student.classLevel ?? "-"}</span>
                    </Link>
                  ))}
                </div>
              )}
            </PanelCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <PanelCard title="Son Egzersiz Sonuçları" subtitle="Sisteme kayıtlı en güncel egzersiz çıktıları">
              <TeacherRecentResultsClient />
            </PanelCard>

            <PanelCard title="Dikkat Gerektiren Öğrenciler" subtitle="Anlama ortalaması düşük öğrenciler">
              {isLoading ? (
                <p className="text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">Yükleniyor...</p>
              ) : attentionStudents.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                  Dikkat gerektiren bir öğrenci bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {attentionStudents.map((item) => (
                    <Link
                      key={item.studentId}
                      href={`/ogretmen/ogrenciler/${item.studentId}`}
                      className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-amber-900 [data-idil-theme=dark]:text-amber-100">{item.studentName}</p>
                        <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-amber-100">
                          %{item.average}
                        </span>
                      </div>
                      <p className="mt-2 text-amber-800 [data-idil-theme=dark]:text-amber-100/90">
                        {item.count} kayıt ile ortalama anlama puanı
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </PanelCard>
          </section>

          {errorMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </TeacherOnly>
    </AppShell>
  );
}
