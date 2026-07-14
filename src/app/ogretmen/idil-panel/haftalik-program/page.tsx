"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

type Student = {
  id: string;
  name: string;
  class_name?: string | null;
  is_active?: boolean | null;
};

type ScheduleStatus = "Planlandı" | "Tamamlandı" | "İptal" | "Gelmedi";

type ScheduleRow = {
  id: string;
  student_id: string;
  course_id: string | null;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  students?: {
    name?: string | null;
    class_name?: string | null;
  } | null;
};

type ScheduleFormState = {
  student_id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  lesson_day: string;
  slotIndex: number;
  notes: string;
};

type DayColumn = {
  key: string;
  label: string;
  shortLabel: string;
  date: Date;
  dateIso: string;
  color: {
    header: string;
    border: string;
    bg: string;
    text: string;
    soft: string;
  };
};

const STATUS_OPTIONS: ScheduleStatus[] = [
  "Planlandı",
  "Tamamlandı",
  "İptal",
  "Gelmedi",
];

const LESSON_DAY_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const SLOT_COUNT_PER_DAY = 9;

const LESSON_DAY_PREFIX = "__IDIL_LESSON_DAY__:";
const SLOT_INDEX_PREFIX = "__IDIL_SLOT_INDEX__:";

const WEEKDAY_COLOR: DayColumn["color"] = {
  header: "bg-red-100",
  border: "border-red-300",
  bg: "bg-red-50/70",
  text: "text-blue-900",
  soft: "bg-red-50",
};

const WEEKEND_COLOR: DayColumn["color"] = {
  header: "bg-orange-100",
  border: "border-orange-300",
  bg: "bg-orange-50/80",
  text: "text-orange-900",
  soft: "bg-orange-50",
};

const STUDENT_COLOR_PALETTE = [
  { card: "bg-blue-50 border-blue-300", name: "text-blue-950" },
  { card: "bg-emerald-50 border-emerald-300", name: "text-emerald-950" },
  { card: "bg-violet-50 border-violet-300", name: "text-violet-950" },
  { card: "bg-orange-50 border-orange-300", name: "text-orange-950" },
  { card: "bg-pink-50 border-pink-300", name: "text-pink-950" },
  { card: "bg-teal-50 border-teal-300", name: "text-teal-950" },
  { card: "bg-amber-50 border-amber-300", name: "text-amber-950" },
  { card: "bg-indigo-50 border-indigo-300", name: "text-indigo-950" },
];

const DAY_NAMES = [
  { key: "monday", label: "Pazartesi", shortLabel: "Pzt" },
  { key: "tuesday", label: "Salı", shortLabel: "Sal" },
  { key: "wednesday", label: "Çarşamba", shortLabel: "Çar" },
  { key: "thursday", label: "Perşembe", shortLabel: "Per" },
  { key: "friday", label: "Cuma", shortLabel: "Cum" },
  { key: "saturday", label: "Cumartesi", shortLabel: "Cmt" },
  { key: "sunday", label: "Pazar", shortLabel: "Paz" },
];

const DEFAULT_FORM: ScheduleFormState = {
  student_id: "",
  lesson_date: "",
  start_time: "10:30",
  end_time: "11:50",
  status: "Planlandı",
  lesson_day: "1",
  slotIndex: 0,
  notes: "",
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  current.setDate(current.getDate() + diff);
  return current;
}

function addDays(date: Date, dayCount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + dayCount);
  return next;
}

function addWeeks(date: Date, weekCount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weekCount * 7);
  return getMonday(next);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatLongDateRange(startDate: Date, endDate: Date) {
  const start = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
  }).format(startDate);

  const end = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(endDate);

  return `${start} - ${end}`;
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function parseNotes(rawNotes: string | null | undefined) {
  if (!rawNotes) {
    return {
      lessonDay: "1",
      slotIndex: null as number | null,
      visibleNotes: "",
    };
  }

  const lines = rawNotes.split("\n");
  let lessonDay = "1";
  let slotIndex: number | null = null;
  const visibleLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith(LESSON_DAY_PREFIX)) {
      const parsedLessonDay = line.replace(LESSON_DAY_PREFIX, "").trim();
      lessonDay = LESSON_DAY_OPTIONS.includes(parsedLessonDay)
        ? parsedLessonDay
        : "1";
      return;
    }

    if (line.startsWith(SLOT_INDEX_PREFIX)) {
      const parsedSlotIndex = Number(
        line.replace(SLOT_INDEX_PREFIX, "").trim(),
      );
      slotIndex =
        Number.isInteger(parsedSlotIndex) &&
        parsedSlotIndex >= 0 &&
        parsedSlotIndex < SLOT_COUNT_PER_DAY
          ? parsedSlotIndex
          : null;
      return;
    }

    visibleLines.push(line);
  });

  return {
    lessonDay,
    slotIndex,
    visibleNotes: visibleLines.join("\n").trim(),
  };
}

function buildNotes(
  lessonDay: string,
  slotIndex: number,
  visibleNotes: string,
) {
  const safeLessonDay = LESSON_DAY_OPTIONS.includes(lessonDay)
    ? lessonDay
    : "1";
  const safeSlotIndex =
    Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < SLOT_COUNT_PER_DAY
      ? slotIndex
      : 0;

  const cleanNotes = visibleNotes.trim();
  const metadata = `${LESSON_DAY_PREFIX}${safeLessonDay}\n${SLOT_INDEX_PREFIX}${safeSlotIndex}`;

  if (!cleanNotes) {
    return metadata;
  }

  return `${metadata}\n${cleanNotes}`;
}

function getLessonDay(schedule: ScheduleRow) {
  return parseNotes(schedule.notes).lessonDay;
}

function getVisibleNotes(schedule: ScheduleRow) {
  return parseNotes(schedule.notes).visibleNotes;
}

function getSlotIndex(schedule: ScheduleRow) {
  return parseNotes(schedule.notes).slotIndex;
}

function statusBadgeClass(status: ScheduleStatus) {
  switch (status) {
    case "Tamamlandı":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "İptal":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Gelmedi":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStudentColor(studentId: string) {
  let hash = 0;

  for (let index = 0; index < studentId.length; index += 1) {
    hash = (hash * 31 + studentId.charCodeAt(index)) % 100000;
  }

  return STUDENT_COLOR_PALETTE[hash % STUDENT_COLOR_PALETTE.length];
}

function getStudentName(schedule: ScheduleRow, students: Student[]) {
  if (schedule.students?.name) {
    return schedule.students.name;
  }

  const foundStudent = students.find(
    (student) => student.id === schedule.student_id,
  );

  return foundStudent?.name ?? "Öğrenci";
}

function getDefaultTimeForSlot(slotIndex: number) {
  const baseHour = 10;
  const hour = baseHour + slotIndex;

  if (hour <= 21) {
    return `${String(hour).padStart(2, "0")}:30`;
  }

  return "10:30";
}

function getEndTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "11:50";
  }

  const totalMinutes = hour * 60 + minute + 80;
  const nextHour = Math.floor(totalMinutes / 60) % 24;
  const nextMinute = totalMinutes % 60;

  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(
    2,
    "0",
  )}`;
}

function placeSchedulesInSlots(daySchedules: ScheduleRow[]) {
  const slots = Array<ScheduleRow | null>(SLOT_COUNT_PER_DAY).fill(null);

  daySchedules.forEach((schedule) => {
    const slotIndex = getSlotIndex(schedule);

    if (slotIndex !== null && !slots[slotIndex]) {
      slots[slotIndex] = schedule;
      return;
    }

    const firstEmptySlot = slots.findIndex((slot) => slot === null);

    if (firstEmptySlot >= 0) {
      slots[firstEmptySlot] = schedule;
    }
  });

  return slots;
}

export default function WeeklyProgramPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(
    null,
  );
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_FORM);

  const days = useMemo<DayColumn[]>(() => {
    return DAY_NAMES.map((day, index) => {
      const date = addDays(weekStart, index);

      return {
        ...day,
        date,
        dateIso: toDateInputValue(date),
        color: index < 5 ? WEEKDAY_COLOR : WEEKEND_COLOR,
      };
    });
  }, [weekStart]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const schedulesByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleRow[]>();

    schedules.forEach((schedule) => {
      const existing = grouped.get(schedule.lesson_date) ?? [];
      existing.push(schedule);
      grouped.set(schedule.lesson_date, existing);
    });

    return grouped;
  }, [schedules]);

  const loadStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id,name,class_name,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("students load error", error);
      setErrorMessage("Öğrenci listesi alınamadı.");
      return;
    }

    setStudents((data ?? []) as Student[]);
  }, [supabase]);

  const loadSchedules = useCallback(async () => {
    await Promise.resolve();

    setIsLoading(true);
    setErrorMessage("");

    const startDate = toDateInputValue(weekStart);
    const endDate = toDateInputValue(weekEnd);

    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        id,
        student_id,
        course_id,
        lesson_date,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        updated_at,
        students (
          name,
          class_name
        )
      `,
      )
      .gte("lesson_date", startDate)
      .lte("lesson_date", endDate)
      .order("lesson_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("schedules load error", error);
      setErrorMessage("Haftalık program alınamadı.");
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    setSchedules((data ?? []) as ScheduleRow[]);
    setIsLoading(false);
  }, [supabase, weekEnd, weekStart]);

  useEffect(() => {
    void Promise.resolve().then(loadStudents);
  }, [loadStudents]);

  useEffect(() => {
    void Promise.resolve().then(loadSchedules);
  }, [loadSchedules]);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCreateModal(dateIso?: string, slotIndex = 0) {
    clearMessages();

    const startTime = getDefaultTimeForSlot(slotIndex);

    setEditingSchedule(null);
    setForm({
      ...DEFAULT_FORM,
      student_id: students[0]?.id ?? "",
      lesson_date: dateIso ?? toDateInputValue(new Date()),
      start_time: startTime,
      end_time: getEndTime(startTime),
      lesson_day: "1",
      slotIndex,
    });
    setIsModalOpen(true);
  }

  function openEditModal(schedule: ScheduleRow, fallbackSlotIndex = 0) {
    clearMessages();

    const parsed = parseNotes(schedule.notes);
    const slotIndex = parsed.slotIndex ?? fallbackSlotIndex;

    setEditingSchedule(schedule);
    setForm({
      student_id: schedule.student_id,
      lesson_date: schedule.lesson_date,
      start_time: formatTime(schedule.start_time),
      end_time: formatTime(schedule.end_time),
      status: schedule.status,
      lesson_day: parsed.lessonDay,
      slotIndex,
      notes: parsed.visibleNotes,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSchedule(null);
    setForm(DEFAULT_FORM);
  }

  async function hasScheduleConflict() {
    const { data, error } = await supabase
      .from("schedules")
      .select("id,student_id,course_id,lesson_date,start_time,end_time,status,notes")
      .eq("lesson_date", form.lesson_date);

    if (error) {
      console.error("schedule conflict check error", error);
      setErrorMessage("Ders satırı kontrol edilemedi.");
      return null;
    }

    const sameDaySchedules = ((data ?? []) as ScheduleRow[]).filter(
      (schedule) => schedule.id !== editingSchedule?.id,
    );
    const slots = placeSchedulesInSlots(sameDaySchedules);

    return slots[form.slotIndex] !== null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!form.student_id) {
      setErrorMessage("Lütfen öğrenci seçin.");
      return;
    }

    if (!form.lesson_date || !form.start_time || !form.end_time) {
      setErrorMessage("Lütfen tarih ve saat bilgilerini doldurun.");
      return;
    }

    if (form.start_time >= form.end_time) {
      setErrorMessage("Bitiş saati başlangıç saatinden sonra olmalı.");
      return;
    }

    setIsSaving(true);

    const hasConflict = await hasScheduleConflict();

    if (hasConflict === null) {
      setIsSaving(false);
      return;
    }

    if (hasConflict) {
      setErrorMessage("Bu satirda zaten bir ders var.");
      setIsSaving(false);
      return;
    }

    const payload = {
      student_id: form.student_id,
      course_id: null,
      lesson_date: form.lesson_date,
      start_time: form.start_time,
      end_time: form.end_time,
      status: form.status,
      notes: buildNotes(form.lesson_day, form.slotIndex, form.notes),
      updated_at: new Date().toISOString(),
    };

    if (editingSchedule) {
      const { error } = await supabase
        .from("schedules")
        .update(payload)
        .eq("id", editingSchedule.id);

      if (error) {
        console.error("schedule update error", error);
        setErrorMessage("Ders güncellenemedi.");
        setIsSaving(false);
        return;
      }

      setSuccessMessage("Ders programı güncellendi.");
    } else {
      const { error } = await supabase.from("schedules").insert(payload);

      if (error) {
        console.error("schedule create error", error);
        setErrorMessage("Ders programa eklenemedi.");
        setIsSaving(false);
        return;
      }

      setSuccessMessage("Ders programa eklendi.");
    }

    setIsSaving(false);
    closeModal();
    await loadSchedules();
  }

  async function handleStatusChange(id: string, status: ScheduleStatus) {
    clearMessages();

    setSchedules((previous) =>
      previous.map((schedule) =>
        schedule.id === id ? { ...schedule, status } : schedule,
      ),
    );

    const { error } = await supabase
      .from("schedules")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("schedule status update error", error);
      setErrorMessage("Durum güncellenemedi.");
      await loadSchedules();
      return;
    }

    setSuccessMessage("Ders durumu güncellendi.");
  }

  async function handleLessonDayChange(
    schedule: ScheduleRow,
    lessonDay: string,
    fallbackSlotIndex = 0,
  ) {
    clearMessages();

    const visibleNotes = getVisibleNotes(schedule);
    const slotIndex = getSlotIndex(schedule) ?? fallbackSlotIndex;
    const newNotes = buildNotes(lessonDay, slotIndex, visibleNotes);

    setSchedules((previous) =>
      previous.map((item) =>
        item.id === schedule.id ? { ...item, notes: newNotes } : item,
      ),
    );

    const { error } = await supabase
      .from("schedules")
      .update({
        notes: newNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule.id);

    if (error) {
      console.error("lesson day update error", error);
      setErrorMessage("Ders günü güncellenemedi.");
      await loadSchedules();
      return;
    }

    setSuccessMessage("Ders günü güncellendi.");
  }

  async function handleDelete(schedule: ScheduleRow) {
    clearMessages();

    const studentName = getStudentName(schedule, students);

    const confirmed = window.confirm(
      `${studentName} öğrencisinin ${formatTime(
        schedule.start_time,
      )} dersini programdan silmek istiyor musunuz?`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", schedule.id);

    if (error) {
      console.error("schedule delete error", error);
      setErrorMessage("Ders silinemedi.");
      return;
    }

    setSuccessMessage("Ders programdan silindi.");
    await loadSchedules();
  }

  return (
    <AppShell
      title="Haftalik Program"
      subtitle="Pazartesiden pazara ders planini gor, duzenle ve takip et."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
      <section className="w-full text-slate-900">
        <div className="mb-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Link
                href="/ogretmen/idil-panel"
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                ← İdil Yönetim Paneli
              </Link>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Haftalık Ders Programı
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Öğrencilerin haftalık ders akışını planla ve takip et.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWeekStart((current) => addWeeks(current, -1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                ← Önceki Hafta
              </button>

              <button
                type="button"
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 shadow-sm transition hover:bg-rose-100"
              >
                Bu Hafta
              </button>

              <button
                type="button"
                onClick={() => setWeekStart((current) => addWeeks(current, 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sonraki Hafta →
              </button>

              <button
                type="button"
                onClick={() => openCreateModal(days[0]?.dateIso, 0)}
                className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                + Yeni Ders
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Seçili Hafta
            </p>

            <p className="mt-1 text-xl font-black text-slate-950">
              {formatLongDateRange(weekStart, weekEnd)}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-black text-slate-500">
                Toplam Ders
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {schedules.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-black text-emerald-700">
                Tamamlandı
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-700">
                {
                  schedules.filter(
                    (schedule) => schedule.status === "Tamamlandı",
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-black text-amber-700">Gelmedi</p>
              <p className="mt-1 text-2xl font-black text-amber-700">
                {
                  schedules.filter((schedule) => schedule.status === "Gelmedi")
                    .length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-black text-rose-700">İptal</p>
              <p className="mt-1 text-2xl font-black text-rose-700">
                {
                  schedules.filter((schedule) => schedule.status === "İptal")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid min-w-[1540px] grid-cols-7 gap-2">
            {days.map((day) => {
              const daySchedules = schedulesByDate.get(day.dateIso) ?? [];
              const slots = placeSchedulesInSlots(daySchedules);

              return (
                <section
                  key={day.key}
                  className={`rounded-2xl border ${day.color.border} ${day.color.bg} overflow-hidden`}
                >
                  <header
                    className={`border-b ${day.color.border} ${day.color.header} px-3 py-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2
                          className={`text-sm font-black leading-tight ${day.color.text}`}
                        >
                          {day.label}
                        </h2>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                          {formatShortDate(day.date)}
                        </p>
                      </div>

                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                        {daySchedules.length} ders
                      </span>
                    </div>
                  </header>

                  <div className="space-y-1.5 p-2">
                    {slots.map((schedule, slotIndex) => {
                      if (isLoading) {
                        return (
                          <div
                            key={`${day.key}-loading-${slotIndex}`}
                            className="flex h-[86px] items-center justify-center rounded-xl border border-white/70 bg-white/60 text-[11px] font-black text-slate-400"
                          >
                            Yükleniyor...
                          </div>
                        );
                      }

                      if (!schedule) {
                        return (
                          <button
                            key={`${day.key}-empty-${slotIndex}`}
                            type="button"
                            onClick={() => openCreateModal(day.dateIso, slotIndex)}
                            className="group flex h-[86px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/45 text-[11px] font-black text-transparent transition hover:border-slate-400 hover:bg-white/80 hover:text-slate-500"
                            title={`${day.label} için ders ekle`}
                          >
                            + Ders Ekle
                          </button>
                        );
                      }

                      const visibleNotes = getVisibleNotes(schedule);
                      const lessonDay = getLessonDay(schedule);
                      const studentColor = getStudentColor(schedule.student_id);

                      return (
                        <article
                          key={schedule.id}
                          className={`h-[86px] overflow-hidden rounded-xl border px-2 py-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${studentColor.card}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p
                                className={`truncate text-[12px] font-black uppercase leading-tight ${studentColor.name}`}
                              >
                                {getStudentName(schedule, students)}
                              </p>

                              <p className="mt-0.5 text-[11px] font-black leading-tight text-blue-700">
                                {formatTime(schedule.start_time)} -{" "}
                                {formatTime(schedule.end_time)}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(schedule.id, "Tamamlandı")
                                }
                                className={`flex h-6 w-6 items-center justify-center rounded-lg text-[12px] font-black transition ${
                                  schedule.status === "Tamamlandı"
                                    ? "bg-emerald-200 text-emerald-800"
                                    : "bg-white/80 text-emerald-700 hover:bg-emerald-100"
                                }`}
                                title="Tamamlandı yap"
                              >
                                ✓
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(schedule, slotIndex)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-[12px] text-slate-700 transition hover:bg-slate-100"
                                title="Düzenle"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(schedule)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-[12px] text-rose-600 transition hover:bg-rose-100"
                                title="Sil"
                              >
                                🗑
                              </button>
                            </div>
                          </div>

                          <div className="mt-1 flex min-w-0 items-center gap-1">
                            <select
                              value={lessonDay}
                              onChange={(event) =>
                                handleLessonDayChange(
                                  schedule,
                                  event.target.value,
                                  slotIndex,
                                )
                              }
                              className="h-7 w-[72px] min-w-0 truncate rounded-full border border-slate-200 bg-white/90 px-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                              title="Kaçıncı ders günü?"
                            >
                              {LESSON_DAY_OPTIONS.map((dayNumber) => (
                                <option key={dayNumber} value={dayNumber}>
                                  {dayNumber}. gün
                                </option>
                              ))}
                            </select>

                            <select
                              value={schedule.status}
                              onChange={(event) =>
                                handleStatusChange(
                                  schedule.id,
                                  event.target.value as ScheduleStatus,
                                )
                              }
                              className={`h-7 min-w-0 flex-1 truncate rounded-full border px-1.5 text-[10px] font-black outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 ${statusBadgeClass(
                                schedule.status,
                              )}`}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>

                          {visibleNotes ? (
                            <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                              {visibleNotes}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-900 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-200">
                    Haftalık Program
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {editingSchedule ? "Dersi Düzenle" : "Yeni Ders Ekle"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-white/20 px-3 py-1 text-sm font-black text-white transition hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {students.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                  Önce öğrenci ekleyin. Aktif öğrenci bulunamadı.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Öğrenci
                  </span>
                  <select
                    value={form.student_id}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        student_id: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    required
                  >
                    <option value="">Öğrenci seçin</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                        {student.class_name ? ` - ${student.class_name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Ders Tarihi
                  </span>
                  <input
                    type="date"
                    value={form.lesson_date}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        lesson_date: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Başlangıç Saati
                  </span>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        start_time: event.target.value,
                        end_time: getEndTime(event.target.value),
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Bitiş Saati
                  </span>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        end_time: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Kaçıncı Ders?
                  </span>
                  <select
                    value={form.lesson_day}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        lesson_day: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    {LESSON_DAY_OPTIONS.map((dayNumber) => (
                      <option key={dayNumber} value={dayNumber}>
                        {dayNumber}. gün
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Durum
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target.value as ScheduleStatus,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-black text-slate-700">Not</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Dersle ilgili kısa not..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={isSaving || students.length === 0}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Kaydediliyor..."
                    : editingSchedule
                      ? "Değişiklikleri Kaydet"
                      : "Dersi Programa Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </TeacherOnly>
    </AppShell>
  );
}

