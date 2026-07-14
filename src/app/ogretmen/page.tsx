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
          setErrorMessage("Panel verileri su anda yuklenemiyor.");
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

  const quickActions = [
    { href: "/ogretmen/ogrenciler/yeni", label: "Yeni Ogrenci Ekle" },
    { href: "/ogretmen/idil-panel/ders-kayitlari", label: "Ders Kaydi Ekle" },
    { href: "/ogretmen/icerik-yonetimi/ai-icerik-ureticisi", label: "AI Analiz Olustur" },
    { href: "/ogretmen/icerik-yonetimi", label: "Icerik Uret" },
    { href: "/ogretmen/idil-panel/toplu-ogrenci-aktar", label: "Rapor Goruntule" },
  ];

  const activeStudentCount = useMemo(() => {
    return state.students.filter((student) => student.isActive !== false && student.status !== "passive").length;
  }, [state.students]);

  const completedExercises = state.summary?.exerciseResultCount ?? 0;
  const averageSuccess = state.lessons.length > 0
    ? Math.round(state.lessons.reduce((total, lesson) => total + (lesson.comprehensionScore ?? 0), 0) / state.lessons.length)
    : null;

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
          studentName: studentNameMap.get(studentId) ?? "Ogrenci",
          average,
          count: records.length,
        };
      })
      .filter((item) => item.average < 70)
      .sort((first, second) => first.average - second.average)
      .slice(0, 5);
  }, [state.lessons, studentNameMap]);

  return (
    <AppShell
      title="Ogretmen Paneli"
      subtitle="Ogrenci takip, ders planlama ve performans gorunumunu tek ekrandan yonetin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Toplam Ogrenci", state.summary?.totalStudents ?? state.students.length],
            ["Aktif Ogrenci", state.summary?.activeStudents ?? activeStudentCount],
            ["Bu Hafta Ders", state.summary?.plannedLessonsThisWeek ?? state.weekSchedules.length],
            ["Tamamlanan Egzersiz", completedExercises],
            ["Ortalama Basari", averageSuccess === null ? "-" : `%${averageSuccess}`],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{value}</p>
            </article>
          ))}
        </div>

        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <PanelCard title="Bugunku Dersler" subtitle="Takvimde bugune dusen planli dersler">
            {isLoading ? (
              <p className="text-sm text-slate-500">Yukleniyor...</p>
            ) : state.todaySchedules.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Bugun icin planli ders bulunmuyor.</div>
            ) : (
              <div className="space-y-2">
                {state.todaySchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                    <p className="font-semibold text-slate-900">{studentNameMap.get(schedule.studentId) ?? "Ogrenci"}</p>
                    <p className="text-slate-600">{schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)} · {schedule.status}</p>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Hizli Islemler" subtitle="Sik kullanilan ogretmen aksiyonlari">
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </PanelCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <PanelCard title="Haftalik Program" subtitle="Bu haftanin tum planli dersleri">
            {isLoading ? (
              <p className="text-sm text-slate-500">Yukleniyor...</p>
            ) : state.weekSchedules.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Haftalik program kaydi bulunmuyor.</div>
            ) : (
              <div className="space-y-2">
                {state.weekSchedules.slice(0, 6).map((schedule) => (
                  <div key={schedule.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                    <p className="font-semibold text-slate-900">{studentNameMap.get(schedule.studentId) ?? "Ogrenci"}</p>
                    <p className="text-slate-600">{formatDate(schedule.lessonDate)} · {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}</p>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Son Eklenen Ogrenciler" subtitle="Yeni kayitlanan ogrenci listesi">
            {isLoading ? (
              <p className="text-sm text-slate-500">Yukleniyor...</p>
            ) : recentStudents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Ogrenci kaydi bulunmuyor.</div>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((student) => (
                  <Link key={student.id} href={`/ogretmen/ogrenciler/${student.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm transition hover:border-red-200 hover:bg-red-50">
                    <span className="font-semibold text-slate-900">{student.name}</span>
                    <span className="text-slate-500">{student.className ?? student.classLevel ?? "-"}</span>
                  </Link>
                ))}
              </div>
            )}
          </PanelCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <PanelCard title="Son Egzersiz Sonuclari" subtitle="Sisteme kayitli en guncel egzersiz ciktilari">
            <TeacherRecentResultsClient />
          </PanelCard>

          <PanelCard title="Dikkat Gerektiren Ogrenciler" subtitle="Anlama ortalamasi dusuk ogrenciler">
            {isLoading ? (
              <p className="text-sm text-slate-500">Yukleniyor...</p>
            ) : attentionStudents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Dikkat gerektiren bir ogrenci bulunmuyor.</div>
            ) : (
              <div className="space-y-2">
                {attentionStudents.map((item) => (
                  <Link
                    key={item.studentId}
                    href={`/ogretmen/ogrenciler/${item.studentId}`}
                    className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm"
                  >
                    <p className="font-semibold text-amber-900">{item.studentName}</p>
                    <p className="text-amber-800">Ortalama anlama: %{item.average} · {item.count} kayit</p>
                  </Link>
                ))}
              </div>
            )}
          </PanelCard>
        </section>
      </TeacherOnly>
    </AppShell>
  );
}
