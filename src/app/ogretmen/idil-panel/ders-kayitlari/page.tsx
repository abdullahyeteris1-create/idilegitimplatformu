"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  type LessonRecordStudent,
} from "@/lib/idil-panel/summaryStorage";
import { getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { Student } from "@/lib/students/types";

type LessonFormState = {
  studentId: string;
  lessonDate: string;
  textTitle: string;
  readingSpeed: string;
  comprehensionScore: string;
  teacherNote: string;
};

type ChartRange = "5" | "10" | "all";

type ComprehensionFilter = "all" | "high" | "mid" | "low";

type SpeedSort = "date-desc" | "speed-desc" | "speed-asc";

type InlineEditFormState = {
  lessonDate: string;
  textTitle: string;
  readingSpeed: string;
  comprehensionScore: string;
  teacherNote: string;
};

const DEFAULT_FORM: LessonFormState = {
  studentId: "",
  lessonDate: "",
  textTitle: "",
  readingSpeed: "",
  comprehensionScore: "",
  teacherNote: "",
};

const MAX_NOTE_LENGTH = 600;
const PAGE_SIZE = 8;

const DEFAULT_INLINE_EDIT_FORM: InlineEditFormState = {
  lessonDate: "",
  textTitle: "",
  readingSpeed: "",
  comprehensionScore: "",
  teacherNote: "",
};

function toPositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed);
}

function toComprehension(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
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

function formatStudentClass(student: Student | undefined): string {
  if (!student) {
    return "-";
  }

  return student.className ?? student.classLevel ?? "-";
}

function getStudentStatus(student: Student | undefined): string {
  if (!student) {
    return "Durum bilinmiyor";
  }

  return student.status === "passive" || student.isActive === false ? "Pasif" : "Aktif";
}

function getStudentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function evaluateProgress(records: LessonRecord[]): {
  speedText: string;
  averageText: string;
  evaluationText: string;
  speedDiffPercent: number | null;
} {
  if (records.length < 2) {
    return {
      speedText: "Degerlendirme icin yeterli kayit bulunmuyor.",
      averageText: "Ortalama anlama icin en az 1 kayit gerekli.",
      evaluationText: "Degerlendirme icin yeterli kayit bulunmuyor.",
      speedDiffPercent: null,
    };
  }

  const sorted = [...records].sort((first, second) => first.lessonDate.localeCompare(second.lessonDate));
  const firstRecord = sorted[0];
  const lastRecord = sorted[sorted.length - 1];
  const speedDelta = lastRecord.wordsPerMinute - firstRecord.wordsPerMinute;
  const speedDiffPercent = firstRecord.wordsPerMinute > 0
    ? Math.round((speedDelta / firstRecord.wordsPerMinute) * 100)
    : null;
  const averageComprehension = Math.round(
    sorted.reduce((total, record) => total + record.comprehensionScore, 0) / sorted.length,
  );

  let evaluationText = "Ilerleme dengeli gorunuyor.";
  if (speedDelta > 0 && averageComprehension >= 85) {
    evaluationText = "Cok iyi ilerleme kaydediliyor.";
  } else if (speedDelta > 0 && averageComprehension < 70) {
    evaluationText = "Hiz artiyor, anlama takibi onerilir.";
  } else if (speedDelta <= 0 && averageComprehension >= 85) {
    evaluationText = "Anlama guclu, hiz artisi icin hedef calisma onerilir.";
  }

  const speedText = speedDiffPercent === null
    ? `Baslangic: ${firstRecord.wordsPerMinute} kelime/dk · Guncel: ${lastRecord.wordsPerMinute} kelime/dk`
    : `Baslangic: ${firstRecord.wordsPerMinute} kelime/dk · Guncel: ${lastRecord.wordsPerMinute} kelime/dk (${speedDiffPercent >= 0 ? "+" : ""}${speedDiffPercent}%)`;

  return {
    speedText,
    averageText: `Ortalama anlama: %${averageComprehension}`,
    evaluationText,
    speedDiffPercent,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function LessonProgressChart({ records, range }: { records: LessonRecord[]; range: ChartRange }) {
  const chartRecords = useMemo(() => {
    const sorted = [...records].sort((first, second) => first.lessonDate.localeCompare(second.lessonDate));
    if (range === "5") {
      return sorted.slice(-5);
    }

    if (range === "10") {
      return sorted.slice(-10);
    }

    return sorted;
  }, [records, range]);

  if (chartRecords.length < 2) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
        Grafik olusturmak icin yeterli ders kaydi bulunmuyor.
      </div>
    );
  }

  const width = 660;
  const height = 280;
  const padding = 34;
  const maxSpeed = Math.max(...chartRecords.map((item) => item.wordsPerMinute), 120);
  const speedScale = (value: number) => {
    const normalized = value / maxSpeed;
    return height - padding - normalized * (height - padding * 2);
  };
  const comprehensionScale = (value: number) => {
    const normalized = value / 100;
    return height - padding - normalized * (height - padding * 2);
  };
  const xScale = (index: number) => {
    if (chartRecords.length <= 1) {
      return padding;
    }

    const segment = (width - padding * 2) / (chartRecords.length - 1);
    return padding + segment * index;
  };

  const speedPath = chartRecords
    .map((record, index) => `${index === 0 ? "M" : "L"} ${xScale(index)} ${speedScale(record.wordsPerMinute)}`)
    .join(" ");
  const comprehensionPath = chartRecords
    .map((record, index) => `${index === 0 ? "M" : "L"} ${xScale(index)} ${comprehensionScale(record.comprehensionScore)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Okuma Hizi (kelime/dk)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Anlama (%)</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Okuma hizi ve anlama gelisim grafigi">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />

        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={`tick-${tick}`}>
            <line
              x1={padding}
              y1={comprehensionScale(tick)}
              x2={width - padding}
              y2={comprehensionScale(tick)}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="1"
            />
            <text x={width - padding + 6} y={comprehensionScale(tick) + 4} fontSize="10" fill="#64748b">{tick}%</text>
          </g>
        ))}

        <path d={speedPath} stroke="#ef4444" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d={comprehensionPath} stroke="#2563eb" strokeWidth="2.4" fill="none" strokeLinecap="round" />

        {chartRecords.map((record, index) => (
          <g key={record.id}>
            <circle cx={xScale(index)} cy={speedScale(record.wordsPerMinute)} r="3.2" fill="#ef4444">
              <title>{`${formatDate(record.lessonDate)} · Hiz: ${record.wordsPerMinute} kelime/dk`}</title>
            </circle>
            <circle cx={xScale(index)} cy={comprehensionScale(record.comprehensionScore)} r="3.2" fill="#2563eb">
              <title>{`${formatDate(record.lessonDate)} · Anlama: %${record.comprehensionScore}`}</title>
            </circle>
            <text x={xScale(index)} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b">
              {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit" }).format(new Date(record.lessonDate))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function LessonRecordsContent() {
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId")?.trim() ?? "";

  const [students, setStudents] = useState<LessonRecordStudent[]>([]);
  const [studentDetails, setStudentDetails] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState<LessonFormState>({
    ...DEFAULT_FORM,
    studentId: preselectedStudentId,
  });
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);
  const [viewingLesson, setViewingLesson] = useState<LessonRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [inlineEditLessonId, setInlineEditLessonId] = useState<string | null>(null);
  const [inlineEditForm, setInlineEditForm] = useState<InlineEditFormState>(DEFAULT_INLINE_EDIT_FORM);
  const [openDateGroups, setOpenDateGroups] = useState<Record<string, boolean>>({});

  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [comprehensionFilter, setComprehensionFilter] = useState<ComprehensionFilter>("all");
  const [speedSort, setSpeedSort] = useState<SpeedSort>("date-desc");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [nextStudents, nextLessons, nextStudentDetails] = await Promise.all([
        listStudentsForLessonRecords(),
        listLessons(),
        getStudentsWithRemote(),
      ]);

      setStudents(nextStudents);
      setLessons(nextLessons);
      setStudentDetails(nextStudentDetails);
    } catch {
      setErrorMessage("Ders kayitlari yuklenemedi.");
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

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === form.studentId) ?? null;
  }, [form.studentId, students]);

  const selectedStudentDetail = useMemo(() => {
    return studentDetails.find((student) => student.id === form.studentId);
  }, [form.studentId, studentDetails]);

  const selectedStudentLessons = useMemo(() => {
    if (!form.studentId) {
      return [];
    }

    return lessons.filter((lesson) => lesson.studentId === form.studentId);
  }, [form.studentId, lessons]);

  const sortedByDateAsc = useMemo(() => {
    return [...selectedStudentLessons].sort((first, second) => first.lessonDate.localeCompare(second.lessonDate));
  }, [selectedStudentLessons]);

  const firstLesson = sortedByDateAsc[0];
  const latestLesson = sortedByDateAsc[sortedByDateAsc.length - 1];
  const averageComprehension = sortedByDateAsc.length > 0
    ? Math.round(sortedByDateAsc.reduce((total, lesson) => total + lesson.comprehensionScore, 0) / sortedByDateAsc.length)
    : null;

  const progress = useMemo(() => evaluateProgress(sortedByDateAsc), [sortedByDateAsc]);

  const filteredLessons = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchText.trim());

    const records = selectedStudentLessons.filter((lesson) => {
      if (dateFilter && lesson.lessonDate !== dateFilter) {
        return false;
      }

      if (comprehensionFilter === "high" && lesson.comprehensionScore < 90) {
        return false;
      }

      if (comprehensionFilter === "mid" && (lesson.comprehensionScore < 70 || lesson.comprehensionScore > 89)) {
        return false;
      }

      if (comprehensionFilter === "low" && lesson.comprehensionScore >= 70) {
        return false;
      }

      if (normalizedSearch && !normalizeSearchText(lesson.textTitle).includes(normalizedSearch)) {
        return false;
      }

      return true;
    });

    records.sort((first, second) => {
      if (speedSort === "speed-desc") {
        return second.wordsPerMinute - first.wordsPerMinute;
      }

      if (speedSort === "speed-asc") {
        return first.wordsPerMinute - second.wordsPerMinute;
      }

      const byDate = second.lessonDate.localeCompare(first.lessonDate);
      if (byDate !== 0) {
        return byDate;
      }

      return second.createdAt.localeCompare(first.createdAt);
    });

    return records;
  }, [comprehensionFilter, dateFilter, searchText, selectedStudentLessons, speedSort]);

  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLessons = filteredLessons.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const groupedLessons = useMemo(() => {
    const groupedMap = new Map<string, LessonRecord[]>();

    filteredLessons.forEach((lesson) => {
      const list = groupedMap.get(lesson.lessonDate) ?? [];
      list.push(lesson);
      groupedMap.set(lesson.lessonDate, list);
    });

    return Array.from(groupedMap.entries())
      .sort((first, second) => second[0].localeCompare(first[0]))
      .map(([date, records]) => {
        const averageSpeed = Math.round(records.reduce((total, item) => total + item.wordsPerMinute, 0) / records.length);
        const averageComprehension = Math.round(records.reduce((total, item) => total + item.comprehensionScore, 0) / records.length);

        return {
          date,
          records,
          count: records.length,
          averageSpeed,
          averageComprehension,
        };
      });
  }, [filteredLessons]);

  const recentNotes = useMemo(() => {
    return [...selectedStudentLessons]
      .filter((lesson) => lesson.teacherNote.trim())
      .sort((first, second) => second.lessonDate.localeCompare(first.lessonDate))
      .slice(0, 5);
  }, [selectedStudentLessons]);

  const resetForm = () => {
    setEditingLesson(null);
    setForm((previous) => ({
      ...DEFAULT_FORM,
      studentId: previous.studentId,
    }));
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (lesson: LessonRecord) => {
    setEditingLesson(lesson);
    setForm({
      studentId: lesson.studentId,
      lessonDate: lesson.lessonDate,
      textTitle: lesson.textTitle,
      readingSpeed: String(lesson.wordsPerMinute),
      comprehensionScore: String(lesson.comprehensionScore),
      teacherNote: lesson.teacherNote ?? "",
    });
    setIsFormOpen(true);
  };

  const beginInlineEdit = (lesson: LessonRecord) => {
    setInlineEditLessonId(lesson.id);
    setInlineEditForm({
      lessonDate: lesson.lessonDate,
      textTitle: lesson.textTitle,
      readingSpeed: String(lesson.wordsPerMinute),
      comprehensionScore: String(lesson.comprehensionScore),
      teacherNote: lesson.teacherNote ?? "",
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditLessonId(null);
    setInlineEditForm(DEFAULT_INLINE_EDIT_FORM);
  };

  const saveInlineEdit = async (lesson: LessonRecord) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!inlineEditForm.lessonDate) {
      setErrorMessage("Ders tarihi zorunludur.");
      return;
    }

    if (!inlineEditForm.textTitle.trim()) {
      setErrorMessage("Metnin adi zorunludur.");
      return;
    }

    const readingSpeed = toPositiveInteger(inlineEditForm.readingSpeed);
    if (readingSpeed <= 0) {
      setErrorMessage("Okuma hizi pozitif bir sayi olmalidir.");
      return;
    }

    if (inlineEditForm.comprehensionScore.trim() === "") {
      setErrorMessage("Anlama yuzdesi zorunludur.");
      return;
    }

    if (inlineEditForm.teacherNote.length > MAX_NOTE_LENGTH) {
      setErrorMessage(`Ogretmen notu en fazla ${MAX_NOTE_LENGTH} karakter olabilir.`);
      return;
    }

    setIsSaving(true);

    try {
      await updateLesson(lesson.id, {
        lessonDate: inlineEditForm.lessonDate,
        textTitle: inlineEditForm.textTitle.trim(),
        wordsPerMinute: readingSpeed,
        comprehensionScore: toComprehension(inlineEditForm.comprehensionScore),
        teacherNote: inlineEditForm.teacherNote.trim(),
      });

      setSuccessMessage("Ders kaydi guncellendi.");
      cancelInlineEdit();
      await loadData();
    } catch {
      setErrorMessage("Ders kaydi guncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDateGroup = (date: string) => {
    setOpenDateGroups((previous) => ({
      ...previous,
      [date]: !(previous[date] ?? true),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.studentId) {
      setErrorMessage("Ogrenci secimi zorunludur.");
      return;
    }

    if (!form.lessonDate) {
      setErrorMessage("Ders tarihi zorunludur.");
      return;
    }

    if (!form.textTitle.trim()) {
      setErrorMessage("Metnin adi zorunludur.");
      return;
    }

    const readingSpeed = toPositiveInteger(form.readingSpeed);
    if (readingSpeed <= 0) {
      setErrorMessage("Okuma hizi pozitif bir sayi olmalidir.");
      return;
    }

    const comprehensionScore = toComprehension(form.comprehensionScore);
    if (form.comprehensionScore.trim() === "") {
      setErrorMessage("Anlama yuzdesi zorunludur.");
      return;
    }

    if (form.teacherNote.length > MAX_NOTE_LENGTH) {
      setErrorMessage(`Ogretmen notu en fazla ${MAX_NOTE_LENGTH} karakter olabilir.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        studentId: form.studentId,
        scheduleId: null,
        courseId: null,
        lessonNo: editingLesson?.lessonNo ?? Math.max(1, selectedStudentLessons.length + 1),
        lessonDate: form.lessonDate,
        textTitle: form.textTitle.trim(),
        wordCount: editingLesson?.wordCount ?? 0,
        durationSeconds: editingLesson?.durationSeconds ?? 0,
        wordsPerMinute: readingSpeed,
        comprehensionScore,
        focusScore: editingLesson?.focusScore ?? null,
        completedLessonCount: editingLesson?.completedLessonCount ?? Math.max(1, selectedStudentLessons.length),
        status: editingLesson?.status ?? "Tamamlandi",
        teacherNote: form.teacherNote.trim(),
      };

      if (editingLesson) {
        await updateLesson(editingLesson.id, payload);
        setSuccessMessage("Ders kaydi guncellendi.");
      } else {
        await createLesson(payload);
        setSuccessMessage("Ders kaydi basariyla eklendi.");
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch {
      setErrorMessage("Ders kaydi kaydedilemedi. Lutfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    const confirmed = window.confirm("Bu ders kaydini silmek istiyor musunuz?");
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteLesson(lessonId);
      setSuccessMessage("Ders kaydi silindi.");
      await loadData();
    } catch {
      setErrorMessage("Ders kaydi silinemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Ders Kayitlari"
      subtitle="Ogrencinin okuma hizi ve anlama gelisimini modern panelde takip edin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <PanelCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-semibold text-slate-950">Ders Kayitlari</h2>
              <p className="mt-1 text-sm text-slate-600">Ogrencinin gelisim kayitlarini inceleyin, duzenleyin ve yeni kayit ekleyin.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSuccessMessage("Rapor ozelligi sonraki asamada eklenecek")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                aria-label="Rapor olustur"
              >
                Rapor Olustur
              </button>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                aria-label="Yeni ders kaydi"
              >
                Yeni Ders Kaydi
              </button>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Ogrenci Secimi" subtitle="Kayitlari goruntulemek icin ogrenci secin">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="block">
              <span className="sr-only">Ogrenci sec</span>
              <select
                value={form.studentId}
                onChange={(event) => setForm((previous) => ({ ...previous, studentId: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
              >
                <option value="">Ogrenci secin</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </label>

            <Link href="/ogretmen/idil-panel/ogrenci-takip" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              Ogrenci Takibe Git
            </Link>
          </div>

          {!form.studentId ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Bir ogrenci secerek ders kayitlarini goruntuleyin.
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Ders kayitlari yukleniyor...
            </div>
          ) : null}
        </PanelCard>

        {form.studentId ? (
          <>
            <PanelCard title="Ogrenci Bilgisi" subtitle="Secilen ogrencinin temel bilgileri">
              <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                  {getStudentInitials(selectedStudent?.name ?? "?")}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-950">{selectedStudent?.name ?? "-"}</p>
                  <p className="text-sm text-slate-600">Sinif: {formatStudentClass(selectedStudentDetail)}</p>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStudentStatus(selectedStudentDetail) === "Aktif" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                  {getStudentStatus(selectedStudentDetail)} Ogrenci · Toplam {selectedStudentLessons.length} Ders
                </span>
              </div>
            </PanelCard>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-red-600">Baslangic Hizi</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{firstLesson ? firstLesson.wordsPerMinute : "-"}</p>
                <p className="text-sm text-slate-500">kelime/dk</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-600">Guncel Hiz</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{latestLesson ? latestLesson.wordsPerMinute : "-"}</p>
                <p className="text-sm text-slate-500">kelime/dk</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-600">Ortalama Anlama</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{averageComprehension === null ? "-" : `%${averageComprehension}`}</p>
                <p className="text-sm text-slate-500">tum dersler</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-blue-600">Toplam Ders</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{selectedStudentLessons.length}</p>
                <p className="text-sm text-slate-500">kayit</p>
              </article>
            </div>

            <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <PanelCard title="Okuma Hizi ve Anlama Gelisimi" subtitle="Gercek ders kayitlarina gore trend grafigi">
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    { label: "Son 5 Ders", value: "5" as const },
                    { label: "Son 10 Ders", value: "10" as const },
                    { label: "Tumu", value: "all" as const },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChartRange(option.value)}
                      className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${chartRange === option.value ? "border-red-600 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-700"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <LessonProgressChart records={selectedStudentLessons} range={chartRange} />
              </PanelCard>

              <div className="space-y-4">
                <PanelCard title="Gelisim Ozeti" subtitle="Kural bazli hiz ve anlama yorumu">
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{progress.speedText}</p>
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{progress.averageText}</p>
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">{progress.evaluationText}</p>
                    {progress.speedDiffPercent !== null ? (
                      <p className="text-xs font-semibold text-slate-500">Hiz degisimi: {progress.speedDiffPercent >= 0 ? "Yukari" : "Asagi"} yonlu {Math.abs(progress.speedDiffPercent)}%</p>
                    ) : null}
                  </div>

                  <Link
                    href="/ogretmen/icerik-yonetimi/ai-icerik-ureticisi"
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                  >
                    AI Gelisim Analizi Olustur
                  </Link>
                </PanelCard>

                <PanelCard title="Son Ogretmen Notlari" subtitle="Son 5 ders notu">
                  {recentNotes.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">Ogretmen notu bulunmuyor.</div>
                  ) : (
                    <div className="space-y-2">
                      {recentNotes.map((lesson) => (
                        <article key={`note-${lesson.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                          <p className="font-semibold text-slate-900">{lesson.textTitle}</p>
                          <p className="text-xs text-slate-500">{formatDate(lesson.lessonDate)}</p>
                          <p className="mt-1 text-slate-700 line-clamp-2">{lesson.teacherNote}</p>
                        </article>
                      ))}
                    </div>
                  )}

                  <a href="#lesson-records-list" className="mt-3 inline-flex text-sm font-semibold text-red-700 hover:underline">Butun Notlari Gor</a>
                </PanelCard>
              </div>
            </section>

            <PanelCard title="Ders Kayitlari" subtitle="Arama, filtreleme ve islem aksiyonlari">
              <div id="lesson-records-list" className="grid gap-2 md:grid-cols-4">
                <label className="block md:col-span-2">
                  <span className="sr-only">Metin ara</span>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    placeholder="Metin adina gore ara"
                  />
                </label>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  aria-label="Tarihe gore filtre"
                />

                <select
                  value={comprehensionFilter}
                  onChange={(event) => setComprehensionFilter(event.target.value as ComprehensionFilter)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  aria-label="Anlama filtresi"
                >
                  <option value="all">Anlama: Tumu</option>
                  <option value="high">Anlama: %90 ve ustu</option>
                  <option value="mid">Anlama: %70-%89</option>
                  <option value="low">Anlama: %70 alti</option>
                </select>

                <select
                  value={speedSort}
                  onChange={(event) => setSpeedSort(event.target.value as SpeedSort)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm md:col-start-4"
                  aria-label="Hiz siralama"
                >
                  <option value="date-desc">Tarihe Gore (Yeni)</option>
                  <option value="speed-desc">Hiz (Yuksekten Dusuge)</option>
                  <option value="speed-asc">Hiz (Dusukten Yuksege)</option>
                </select>
              </div>

              <div className="mt-4 space-y-2">
                {groupedLessons.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Tarih grubu olusturmak icin kayit bulunmuyor.</div>
                ) : (
                  groupedLessons.map((group) => {
                    const isOpen = openDateGroups[group.date] ?? true;

                    return (
                      <article key={`group-${group.date}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleDateGroup(group.date)}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 text-left"
                          aria-label={`${formatDate(group.date)} tarih grubunu ${isOpen ? "kapat" : "ac"}`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{formatDate(group.date)}</p>
                            <p className="text-xs text-slate-600">{group.count} kayit · Ortalama hiz: {group.averageSpeed} · Ortalama anlama: %{group.averageComprehension}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{isOpen ? "Gizle" : "Goster"}</span>
                        </button>

                        {isOpen ? (
                          <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                            {group.records.map((lesson) => (
                              <div key={`group-row-${lesson.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">{lesson.textTitle}</p>
                                  <p className="text-slate-600">{lesson.wordsPerMinute} kelime/dk · %{lesson.comprehensionScore}</p>
                                </div>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => setViewingLesson(lesson)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Goruntule</button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.innerWidth < 768) {
                                        openEditForm(lesson);
                                      } else {
                                        beginInlineEdit(lesson);
                                      }
                                    }}
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                  >
                                    Duzenle
                                  </button>
                                  <button type="button" onClick={() => void handleDelete(lesson.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Sil</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {pagedLessons.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Kayit bulunmuyor.</div>
                ) : (
                  pagedLessons.map((lesson) => (
                    <article key={`mobile-${lesson.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Metin: {lesson.textTitle}</p>
                      <p className="mt-1 text-sm text-slate-600">Tarih: {formatDate(lesson.lessonDate)}</p>
                      <p className="text-sm text-slate-600">Hiz: {lesson.wordsPerMinute} kelime/dk</p>
                      <p className="text-sm text-slate-600">Anlama: %{lesson.comprehensionScore}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">Not: {lesson.teacherNote || "-"}</p>

                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => setViewingLesson(lesson)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Goruntule</button>
                        <button type="button" onClick={() => openEditForm(lesson)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Duzenle</button>
                        <button type="button" onClick={() => void handleDelete(lesson.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Sil</button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Tarih</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Metnin Adi</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Okuma Hizi</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Anlama</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Ogretmen Notu</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Islem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLessons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-600">Kayit bulunmuyor.</td>
                      </tr>
                    ) : (
                      pagedLessons.map((lesson) => (
                        <tr key={lesson.id} className="border-b border-slate-100 last:border-0">
                          {inlineEditLessonId === lesson.id ? (
                            <>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="date"
                                  value={inlineEditForm.lessonDate}
                                  onChange={(event) => setInlineEditForm((previous) => ({ ...previous, lessonDate: event.target.value }))}
                                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input
                                  value={inlineEditForm.textTitle}
                                  onChange={(event) => setInlineEditForm((previous) => ({ ...previous, textTitle: event.target.value }))}
                                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="number"
                                  min={1}
                                  value={inlineEditForm.readingSpeed}
                                  onChange={(event) => setInlineEditForm((previous) => ({ ...previous, readingSpeed: event.target.value }))}
                                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={inlineEditForm.comprehensionScore}
                                  onChange={(event) => setInlineEditForm((previous) => ({ ...previous, comprehensionScore: event.target.value }))}
                                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <textarea
                                  rows={2}
                                  value={inlineEditForm.teacherNote}
                                  onChange={(event) => setInlineEditForm((previous) => ({ ...previous, teacherNote: event.target.value.slice(0, MAX_NOTE_LENGTH) }))}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                  <button type="button" onClick={() => void saveInlineEdit(lesson)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Kaydet</button>
                                  <button type="button" onClick={cancelInlineEdit} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Iptal</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-slate-700">{formatDate(lesson.lessonDate)}</td>
                              <td className="px-3 py-3 font-semibold text-slate-900">{lesson.textTitle}</td>
                              <td className="px-3 py-3 text-slate-700">{lesson.wordsPerMinute} kelime/dk</td>
                              <td className="px-3 py-3"><span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">%{lesson.comprehensionScore}</span></td>
                              <td className="max-w-[260px] truncate px-3 py-3 text-slate-700">{lesson.teacherNote || "-"}</td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <button type="button" onClick={() => setViewingLesson(lesson)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Goruntule</button>
                                  <button type="button" onClick={() => beginInlineEdit(lesson)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Duzenle</button>
                                  <button type="button" onClick={() => void handleDelete(lesson.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Sil</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <p>Toplam {filteredLessons.length} kayit</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    Onceki
                  </button>
                  <span className="text-xs font-semibold">{currentPage} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </PanelCard>

            {viewingLesson ? (
              <PanelCard title="Kayit Detayi" subtitle="Secilen ders kaydinin tam notu">
                <div className="space-y-1 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Tarih:</span> {formatDate(viewingLesson.lessonDate)}</p>
                  <p><span className="font-semibold text-slate-900">Metin:</span> {viewingLesson.textTitle}</p>
                  <p><span className="font-semibold text-slate-900">Hiz:</span> {viewingLesson.wordsPerMinute} kelime/dk</p>
                  <p><span className="font-semibold text-slate-900">Anlama:</span> %{viewingLesson.comprehensionScore}</p>
                  <p><span className="font-semibold text-slate-900">Ogretmen Notu:</span> {viewingLesson.teacherNote || "-"}</p>
                </div>
              </PanelCard>
            ) : null}
          </>
        ) : null}

        {isFormOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 md:items-center">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 className="text-lg font-semibold text-slate-900">{editingLesson ? "Ders Kaydini Duzenle" : "Yeni Ders Kaydi"}</h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700"
                  aria-label="Formu kapat"
                >
                  Kapat
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Ogrenci</span>
                    <select
                      value={form.studentId}
                      onChange={(event) => setForm((previous) => ({ ...previous, studentId: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    >
                      <option value="">Ogrenci secin</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Ders Tarihi</span>
                    <input
                      type="date"
                      value={form.lessonDate}
                      onChange={(event) => setForm((previous) => ({ ...previous, lessonDate: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Metnin Adi</span>
                    <input
                      value={form.textTitle}
                      onChange={(event) => setForm((previous) => ({ ...previous, textTitle: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Okuma Hizi</span>
                    <input
                      type="number"
                      min={1}
                      value={form.readingSpeed}
                      onChange={(event) => setForm((previous) => ({ ...previous, readingSpeed: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Anlama Yuzdesi</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.comprehensionScore}
                      onChange={(event) => setForm((previous) => ({ ...previous, comprehensionScore: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Ogretmen Notu</span>
                    <textarea
                      rows={4}
                      value={form.teacherNote}
                      onChange={(event) => setForm((previous) => ({ ...previous, teacherNote: event.target.value.slice(0, MAX_NOTE_LENGTH) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">{form.teacherNote.length}/{MAX_NOTE_LENGTH}</p>
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Vazgec
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSaving ? "Kaydediliyor..." : editingLesson ? "Degisiklikleri Kaydet" : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </TeacherOnly>
    </AppShell>
  );
}

export default function LessonRecordsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">Yukleniyor...</main>}>
      <LessonRecordsContent />
    </Suspense>
  );
}
