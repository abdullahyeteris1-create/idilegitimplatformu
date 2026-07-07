"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import {
  createLesson,
  deleteLesson,
  listLessons,
  listStudentsForLessonRecords,
  updateLesson,
  type LessonRecord,
  type LessonRecordStatus,
  type LessonRecordStudent,
} from "@/lib/idil-panel/summaryStorage";

type LessonFormState = {
  studentId: string;
  courseNo: string;
  lessonDay: string;
  lessonDate: string;
  textTitle: string;
  readingSpeed: string;
  comprehensionScore: string;
  focusScore: string;
  completedLessonCount: string;
  status: LessonRecordStatus;
  teacherNote: string;
};

type StatusOption = {
  value: LessonRecordStatus;
  label: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "Tamamlandi", label: "Tamamlandı" },
  { value: "Eksik", label: "Eksik" },
  { value: "Iptal", label: "İptal" },
];

const COURSE_OPTIONS = ["1", "2", "3", "4"];
const LESSON_DAY_OPTIONS = Array.from({ length: 8 }, (_, index) => String(index + 1));

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_FORM: LessonFormState = {
  studentId: "",
  courseNo: "1",
  lessonDay: "1",
  lessonDate: "",
  textTitle: "",
  readingSpeed: "",
  comprehensionScore: "",
  focusScore: "",
  completedLessonCount: "1",
  status: "Tamamlandi",
  teacherNote: "",
};

function normalizeSearchValue(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function toPositiveInteger(value: string, maxValue?: number): number {
  const parsed = Math.max(0, Math.floor(Number(value || "0")));
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (typeof maxValue === "number") {
    return Math.min(maxValue, parsed);
  }

  return parsed;
}

function toRangeNumber(value: string, min: number, max: number): number {
  const parsed = Number(value || "0");
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

function toAverage(values: number[]): string {
  if (values.length === 0) {
    return "-";
  }

  return String(Math.round(values.reduce((total, value) => total + value, 0) / values.length));
}

function getCourseMetaPrefix(courseNo: string): string {
  return `[KUR:${courseNo}]`;
}

function parseCourseMeta(note: string): { courseNo: string; noteText: string } {
  const trimmed = note.trim();
  const match = trimmed.match(/^\[KUR:(\d)]\s*/i);

  if (!match) {
    return { courseNo: "1", noteText: trimmed };
  }

  const parsedCourseNo = COURSE_OPTIONS.includes(match[1]) ? match[1] : "1";
  return {
    courseNo: parsedCourseNo,
    noteText: trimmed.replace(/^\[KUR:(\d)]\s*/i, "").trim(),
  };
}

function buildTeacherNote(courseNo: string, noteText: string): string {
  const prefix = getCourseMetaPrefix(courseNo);
  const cleanNote = noteText.trim();
  return cleanNote ? `${prefix}\n${cleanNote}` : prefix;
}

function getStatusBadgeClass(status: LessonRecordStatus): string {
  if (status === "Tamamlandi") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Iptal") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusLabel(status: LessonRecordStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function toFormState(record: LessonRecord): LessonFormState {
  const { courseNo, noteText } = parseCourseMeta(record.teacherNote ?? "");

  return {
    studentId: record.studentId,
    courseNo,
    lessonDay: LESSON_DAY_OPTIONS.includes(String(record.lessonNo)) ? String(record.lessonNo) : "1",
    lessonDate: record.lessonDate,
    textTitle: record.textTitle,
    readingSpeed: String(record.wordsPerMinute ?? 0),
    comprehensionScore: String(record.comprehensionScore),
    focusScore: record.focusScore === null ? "" : String(record.focusScore),
    completedLessonCount: String(record.completedLessonCount || 1),
    status: record.status,
    teacherNote: noteText,
  };
}

type DayGroup = {
  day: number;
  records: LessonRecord[];
};

function LessonRecordsContent() {
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<LessonRecordStudent[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const prefilledStudentId = searchParams.get("studentId")?.trim() ?? "";
  const prefilledDate = searchParams.get("date")?.trim() ?? "";
  const prefilledLessonDay = searchParams.get("lessonDay")?.trim() ?? "";

  const [form, setForm] = useState<LessonFormState>(() => {
    const lessonDay = LESSON_DAY_OPTIONS.includes(prefilledLessonDay) ? prefilledLessonDay : DEFAULT_FORM.lessonDay;

    return {
      ...DEFAULT_FORM,
      studentId: prefilledStudentId || DEFAULT_FORM.studentId,
      lessonDate: prefilledDate || DEFAULT_FORM.lessonDate,
      lessonDay,
    };
  });

  const studentsById = useMemo(() => {
    return new Map(students.map((student) => [student.id, student.name]));
  }, [students]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [nextStudents, nextLessons] = await Promise.all([listStudentsForLessonRecords(), listLessons()]);
      setStudents(nextStudents);
      setLessons(nextLessons);
    } catch {
      setErrorMessage("Ders kayıtları yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  const summary = useMemo(() => {
    const averageSpeed = toAverage(lessons.map((lesson) => lesson.wordsPerMinute ?? 0));
    const averageComprehension = toAverage(lessons.map((lesson) => lesson.comprehensionScore ?? 0));
    const focusValues = lessons
      .map((lesson) => lesson.focusScore)
      .filter((value): value is number => value !== null && value !== undefined);
    const averageFocus = focusValues.length > 0 ? toAverage(focusValues) : "-";

    return {
      total: lessons.length,
      averageSpeed,
      averageComprehension,
      averageFocus,
    };
  }, [lessons]);

  const selectedStudentLessons = useMemo(() => {
    if (!form.studentId) {
      return [];
    }

    return lessons
      .filter((lesson) => lesson.studentId === form.studentId)
      .sort((first, second) => {
        const byDate = second.lessonDate.localeCompare(first.lessonDate);
        if (byDate !== 0) {
          return byDate;
        }

        return second.createdAt.localeCompare(first.createdAt);
      });
  }, [form.studentId, lessons]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const day = index + 1;
      const records = selectedStudentLessons.filter((lesson) => lesson.lessonNo === day);
      return { day, records };
    });
  }, [selectedStudentLessons]);

  const resetFormForNewRecord = useCallback(() => {
    setEditingLessonId(null);
    setForm((previous) => ({
      ...DEFAULT_FORM,
      studentId: previous.studentId,
      lessonDate: previous.lessonDate,
      lessonDay: previous.lessonDay,
      courseNo: previous.courseNo,
    }));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.studentId) {
      setErrorMessage("Lutfen ogrenci secin.");
      return;
    }

    if (!form.textTitle.trim()) {
      setErrorMessage("Metin adı zorunludur.");
      return;
    }

    if (!LESSON_DAY_OPTIONS.includes(form.lessonDay)) {
      setErrorMessage("Gun degeri 1-8 arasinda olmali.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        studentId: form.studentId,
        scheduleId: null,
        courseId: null,
        lessonNo: toPositiveInteger(form.lessonDay, 8),
        lessonDate: form.lessonDate || getTodayIso(),
        textTitle: form.textTitle.trim(),
        wordCount: 0,
        durationSeconds: 0,
        wordsPerMinute: toPositiveInteger(form.readingSpeed),
        comprehensionScore: toRangeNumber(form.comprehensionScore, 0, 100),
        focusScore: form.focusScore.trim() ? toRangeNumber(form.focusScore, 0, 100) : null,
        completedLessonCount: toPositiveInteger(form.completedLessonCount),
        status: form.status,
        teacherNote: buildTeacherNote(form.courseNo, form.teacherNote),
      };

      if (editingLessonId) {
        await updateLesson(editingLessonId, payload);
        setSuccessMessage("Ders kaydi guncellendi.");
      } else {
        await createLesson(payload);
        setSuccessMessage("Ders kaydi olusturuldu.");
      }

      await loadData();
      resetFormForNewRecord();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ders kaydi olusturulamadi.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditRecord = (lesson: LessonRecord) => {
    setEditingLessonId(lesson.id);
    setForm(toFormState(lesson));
    setSuccessMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (lessonId: string) => {
    const isConfirmed = window.confirm("Bu ders kaydını silmek istiyor musunuz?");
    if (!isConfirmed) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteLesson(lessonId);
      setSuccessMessage("Ders kaydi silindi.");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ders kaydi silinemedi.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Ders Kayitlari"
      subtitle="Ogrencinin gun bazli okuma hizi, anlama ve odaklanma kayitlarini takip et."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">Ders Kayitlari</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                Ogrencinin gun bazli okuma hizi, anlama ve odaklanma kayitlarini takip et.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Geri Don
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="Ozet" subtitle="Ders kayitlari genel gorunumu">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Toplam Kayit", summary.total],
              ["Ortalama Hiz", summary.averageSpeed === "-" ? "-" : `${summary.averageSpeed}`],
              ["Ortalama Anlama", summary.averageComprehension === "-" ? "-" : `%${summary.averageComprehension}`],
              ["Ortalama Odak", summary.averageFocus === "-" ? "-" : `%${summary.averageFocus}`],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">{label}</p>
                <p className="mt-2 text-[30px] font-semibold leading-none text-slate-950">{value}</p>
              </article>
            ))}
          </div>
        </PanelCard>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{successMessage}</div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[460px_1fr]">
          <PanelCard title="Ders Kaydi" subtitle="Gun bazli manuel kayit formu">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ogrenci sec</span>
                <select
                  value={form.studentId}
                  onChange={(event) => setForm((previous) => ({ ...previous, studentId: event.target.value }))}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Ogrenci secin</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Kacinci kur?</span>
                  <select
                    value={form.courseNo}
                    onChange={(event) => setForm((previous) => ({ ...previous, courseNo: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    {COURSE_OPTIONS.map((courseNo) => (
                      <option key={courseNo} value={courseNo}>
                        {courseNo}. Kur
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Kacinci Gun?</span>
                  <select
                    value={form.lessonDay}
                    onChange={(event) => setForm((previous) => ({ ...previous, lessonDay: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    {LESSON_DAY_OPTIONS.map((day) => (
                      <option key={day} value={day}>
                        {day}. Gun
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Metin adi</span>
                <input
                  value={form.textTitle}
                  onChange={(event) => setForm((previous) => ({ ...previous, textTitle: event.target.value }))}
                  placeholder="Metin adini yazin"
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Okuma hizi</span>
                  <input
                    type="number"
                    min={0}
                    value={form.readingSpeed}
                    onChange={(event) => setForm((previous) => ({ ...previous, readingSpeed: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Anlama / Algi %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.comprehensionScore}
                    onChange={(event) => setForm((previous) => ({ ...previous, comprehensionScore: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Odaklanma %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.focusScore}
                    onChange={(event) => setForm((previous) => ({ ...previous, focusScore: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Islenen Ders Sayisi</span>
                  <input
                    type="number"
                    min={0}
                    value={form.completedLessonCount}
                    onChange={(event) => setForm((previous) => ({ ...previous, completedLessonCount: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Ders tarihi</span>
                  <input
                    type="date"
                    value={form.lessonDate}
                    onChange={(event) => setForm((previous) => ({ ...previous, lessonDate: event.target.value }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Durum</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as LessonRecordStatus }))}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    {STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ogretmen notu</span>
                <textarea
                  rows={4}
                  value={form.teacherNote}
                  onChange={(event) => setForm((previous) => ({ ...previous, teacherNote: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-slate-950 to-rose-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingLessonId ? "Degisiklikleri Kaydet" : "Ders Kaydini Kaydet"}
                </button>
                {editingLessonId ? (
                  <button
                    type="button"
                    onClick={resetFormForNewRecord}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Vazgec / Yeni Kayit
                  </button>
                ) : null}
              </div>
            </form>
          </PanelCard>

          <PanelCard title="Gunluk Kayitlar" subtitle="Her gunun metinleri ve ortalamalari">
            {!form.studentId ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                Ogrenci secildiginde 1-8 gun kayitlari burada gorunur.
              </div>
            ) : null}

            {form.studentId ? (
              <div className="space-y-3">
                {dayGroups.map((group) => {
                  const speedValues = group.records.map((record) => record.wordsPerMinute ?? 0);
                  const comprehensionValues = group.records.map((record) => record.comprehensionScore ?? 0);
                  const focusValues = group.records
                    .map((record) => record.focusScore)
                    .filter((value): value is number => value !== null && value !== undefined);
                  const completedLessons = group.records.reduce((total, record) => total + (record.completedLessonCount || 0), 0);

                  return (
                    <article key={group.day} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-base font-semibold text-slate-900">{group.day}. Gun</h4>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {group.records.length} kayit
                        </span>
                      </div>

                      {group.records.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Ders kaydi yok.</div>
                      ) : (
                        <div className="space-y-2">
                          {group.records.map((record, index) => {
                            const { noteText } = parseCourseMeta(record.teacherNote ?? "");

                            return (
                              <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {index + 1}) {record.textTitle || "-"}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditRecord(record)}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                      Duzenle
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(record.id)}
                                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-2 grid gap-2 text-xs font-medium text-slate-700 sm:grid-cols-4">
                                  <p>Hiz: {record.wordsPerMinute ?? 0}</p>
                                  <p>Anlama: %{record.comprehensionScore ?? 0}</p>
                                  <p>Odak: {record.focusScore === null ? "-" : `%${record.focusScore}`}</p>
                                  <p>Islenen Ders: {record.completedLessonCount ?? 0}</p>
                                </div>

                                {noteText ? <p className="mt-2 text-xs text-slate-500">{noteText}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Gun Ortalamasi</p>
                        <div className="mt-1 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                          <p>Hiz: {toAverage(speedValues)}</p>
                          <p>Anlama: {toAverage(comprehensionValues)}</p>
                          <p>Odak: {focusValues.length > 0 ? toAverage(focusValues) : "-"}</p>
                          <p>Islenen Ders: {completedLessons}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </PanelCard>
        </section>
      </TeacherOnly>
    </AppShell>
  );
}

export default function LessonRecordsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
          <section className="mx-auto w-full max-w-[1600px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Yukleniyor...</div>
          </section>
        </main>
      }
    >
      <LessonRecordsContent />
    </Suspense>
  );
}
