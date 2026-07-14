"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  getTextLibraryItems,
  refreshTextLibraryCache,
  type TextLibraryItem,
} from "@/lib/settings/textLibraryStorage";
import {
  getTextIdsWithActiveQuestions,
  refreshQuestionLibraryCache,
} from "@/lib/settings/questionLibraryStorage";
import { getResultsByStudentWithRemote } from "@/lib/results/resultStorage";
import type { ExerciseResult } from "@/lib/results/types";
import { getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { Student } from "@/lib/students/types";

type LessonFormState = {
  studentId: string;
  lessonDate: string;
  lessonNo: string;
  textTitle: string;
  selectedTextId: string;
  readingSpeed: string;
  comprehensionScore: string;
  focusScore: string;
  teacherNote: string;
};

type ChartRange = "5" | "10" | "all";

type ComprehensionFilter = "all" | "high" | "mid" | "low";

type LessonDayGroup = {
  lessonNo: number;
  dateLabel: string;
  dayNumber: number;
  lessons: LessonRecord[];
  recordCount: number;
  averageSpeed: number | null;
  averageComprehension: number | null;
  averageFocus: number | null;
};

type InlineEditFormState = {
  lessonNo: string;
  lessonDate: string;
  textTitle: string;
  readingSpeed: string;
  comprehensionScore: string;
  focusScore: string;
  teacherNote: string;
};

type LibraryTextOption = {
  id: string;
  title: string;
  category: string;
  level?: string;
  timesRead: number;
  lastReadLessonNo: number | null;
  lastReadDate: string | null;
  lastReadSpeed: number | null;
  lastReadComprehension: number | null;
  lastReadFocus: number | null;
};

type StudentGeneralPerformance = {
  totalStudy: number;
  averageSuccess: number | null;
  totalScore: number;
  lastStudyAt: string | null;
};

const DEFAULT_FORM: LessonFormState = {
  studentId: "",
  lessonDate: "",
  lessonNo: "1",
  textTitle: "",
  selectedTextId: "",
  readingSpeed: "",
  comprehensionScore: "",
  focusScore: "",
  teacherNote: "",
};

const MAX_NOTE_LENGTH = 600;

const DEFAULT_INLINE_EDIT_FORM: InlineEditFormState = {
  lessonNo: "1",
  lessonDate: "",
  textTitle: "",
  readingSpeed: "",
  comprehensionScore: "",
  focusScore: "",
  teacherNote: "",
};

const LESSON_DAY_OPTIONS = Array.from({ length: 16 }, (_, index) => index + 1);

function toLessonNo(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 16) {
    return null;
  }

  return parsed;
}

function toFocusScore(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function normalizeTitle(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"'`’“”()\-_/\\]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function resolveLessonNo(lesson: LessonRecord, fallbackLessonNoByDate: Map<string, number>): number {
  const currentLessonNo = Number(lesson.lessonNo);
  if (Number.isInteger(currentLessonNo) && currentLessonNo >= 1 && currentLessonNo <= 16) {
    return currentLessonNo;
  }

  return fallbackLessonNoByDate.get(lesson.lessonDate) ?? 1;
}

function buildFallbackLessonNoMap(lessons: LessonRecord[]): Map<string, number> {
  const uniqueDates = Array.from(new Set(lessons.map((lesson) => lesson.lessonDate))).sort((a, b) => a.localeCompare(b));
  return new Map(uniqueDates.map((dateKey, index) => [dateKey, index + 1]));
}

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

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeAverage(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (validValues.length === 0) {
    return null;
  }

  return Math.round(validValues.reduce((total, value) => total + value, 0) / validValues.length);
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

function formatDateTime(dateIso: string | null): string {
  if (!dateIso) {
    return "Henuz calisma yok";
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return "Henuz calisma yok";
  }

  return parsed.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildGeneralPerformance(results: ExerciseResult[]): StudentGeneralPerformance {
  const sortedResults = [...results].sort((first, second) => second.date.localeCompare(first.date));
  const validSuccessRates = sortedResults
    .map((result) => toFiniteNumber(result.successRate))
    .filter((value): value is number => value !== null);
  const validScores = sortedResults
    .map((result) => toFiniteNumber(result.score))
    .filter((value): value is number => value !== null);

  return {
    totalStudy: sortedResults.length,
    averageSuccess: validSuccessRates.length > 0
      ? Math.round(validSuccessRates.reduce((total, value) => total + value, 0) / validSuccessRates.length)
      : null,
    totalScore: validScores.length > 0
      ? Math.round(validScores.reduce((total, value) => total + value, 0))
      : 0,
    lastStudyAt: sortedResults[0]?.date ?? null,
  };
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
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const [performanceErrorMessage, setPerformanceErrorMessage] = useState("");
  const [generalPerformance, setGeneralPerformance] = useState<StudentGeneralPerformance | null>(null);
  const generalPerformanceCacheRef = useRef<Map<string, StudentGeneralPerformance>>(new Map());
  const [libraryTexts, setLibraryTexts] = useState<TextLibraryItem[]>([]);
  const [isTextLibraryLoading, setIsTextLibraryLoading] = useState(false);
  const [textLibraryErrorMessage, setTextLibraryErrorMessage] = useState("");
  const [isTextSelectorOpen, setIsTextSelectorOpen] = useState(false);
  const [textSearchTerm, setTextSearchTerm] = useState("");
  const [textPickerInfoMessage, setTextPickerInfoMessage] = useState("");
  const textSelectorRef = useRef<HTMLDivElement | null>(null);

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsTextLibraryLoading(true);
    setErrorMessage("");
    setTextLibraryErrorMessage("");

    try {
      const [nextStudents, nextLessons, nextStudentDetails] = await Promise.all([
        listStudentsForLessonRecords(),
        listLessons(),
        getStudentsWithRemote(),
      ]);

      setStudents(nextStudents);
      setLessons(nextLessons);
      setStudentDetails(nextStudentDetails);

      const [questionRefreshResult, textLibraryResult] = await Promise.all([
        refreshQuestionLibraryCache(),
        refreshTextLibraryCache(),
      ]);

      const activeQuestionTextIds = new Set(getTextIdsWithActiveQuestions());
      const availableTexts = (textLibraryResult.items.length > 0 ? textLibraryResult.items : getTextLibraryItems())
        .filter((item) => item.isActive && activeQuestionTextIds.has(item.id));

      setLibraryTexts(availableTexts);

      void questionRefreshResult;

      if (textLibraryResult.error) {
        setTextLibraryErrorMessage("Metin kutuphanesi yuklenemedi.");
      }
    } catch {
      setErrorMessage("Ders kayitlari yuklenemedi.");
      setTextLibraryErrorMessage("Metin kutuphanesi yuklenemedi.");
    } finally {
      setIsLoading(false);
      setIsTextLibraryLoading(false);
    }
  }, []);

  const handleStudentSelectChange = (nextStudentId: string) => {
    setForm((previous) => ({ ...previous, studentId: nextStudentId }));
    setGeneralPerformance(null);
    setPerformanceErrorMessage("");
    setIsPerformanceLoading(Boolean(nextStudentId));
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  useEffect(() => {
    if (!isTextSelectorOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (textSelectorRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsTextSelectorOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTextSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTextSelectorOpen]);

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === form.studentId) ?? null;
  }, [form.studentId, students]);

  const selectedStudentDetail = useMemo(() => {
    return studentDetails.find((student) => student.id === form.studentId);
  }, [form.studentId, studentDetails]);

  useEffect(() => {
    if (!form.studentId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const studentId = form.studentId;
      const studentName = selectedStudentDetail?.name ?? selectedStudent?.name;
      const username = selectedStudentDetail?.username;
      const cacheKey = `${studentId}::${username ?? ""}::${studentName ?? ""}`;
      const cachedPerformance = generalPerformanceCacheRef.current.get(cacheKey);

      if (cachedPerformance) {
        if (!cancelled) {
          setGeneralPerformance(cachedPerformance);
          setPerformanceErrorMessage("");
          setIsPerformanceLoading(false);
        }

        return;
      }

      if (!cancelled) {
        setIsPerformanceLoading(true);
      }

      try {
        const results = await getResultsByStudentWithRemote(studentId, studentName, username);

        if (cancelled) {
          return;
        }

        const nextPerformance = buildGeneralPerformance(results);
        generalPerformanceCacheRef.current.set(cacheKey, nextPerformance);
        setGeneralPerformance(nextPerformance);
      } catch {
        if (cancelled) {
          return;
        }

        setGeneralPerformance({
          totalStudy: 0,
          averageSuccess: null,
          totalScore: 0,
          lastStudyAt: null,
        });
        setPerformanceErrorMessage("Genel performans verileri su anda yuklenemiyor.");
      } finally {
        if (!cancelled) {
          setIsPerformanceLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.studentId, selectedStudent?.name, selectedStudentDetail?.name, selectedStudentDetail?.username]);

  const selectedStudentLessons = useMemo(() => {
    if (!form.studentId) {
      return [];
    }

    return lessons.filter((lesson) => lesson.studentId === form.studentId);
  }, [form.studentId, lessons]);

  const fallbackLessonNoByDate = useMemo(() => buildFallbackLessonNoMap(selectedStudentLessons), [selectedStudentLessons]);

  const recommendedLessonNo = useMemo(() => {
    const maxLessonNo = selectedStudentLessons.reduce((maxValue, lesson) => {
      const resolved = resolveLessonNo(lesson, fallbackLessonNoByDate);
      return Math.max(maxValue, resolved);
    }, 0);

    if (maxLessonNo <= 0) {
      return 1;
    }

    return Math.min(16, maxLessonNo + 1);
  }, [fallbackLessonNoByDate, selectedStudentLessons]);

  const sortedByDateAsc = useMemo(() => {
    return [...selectedStudentLessons].sort((first, second) => first.lessonDate.localeCompare(second.lessonDate));
  }, [selectedStudentLessons]);

  const firstLesson = sortedByDateAsc[0];
  const latestLesson = sortedByDateAsc[sortedByDateAsc.length - 1];
  const averageComprehension = sortedByDateAsc.length > 0
    ? Math.round(sortedByDateAsc.reduce((total, lesson) => total + lesson.comprehensionScore, 0) / sortedByDateAsc.length)
    : null;
  const averageFocus = useMemo(() => {
    const focusValues = sortedByDateAsc
      .map((lesson) => toFiniteNumber(lesson.focusScore))
      .filter((value): value is number => value !== null);

    if (focusValues.length === 0) {
      return null;
    }

    return Math.round(focusValues.reduce((total, value) => total + value, 0) / focusValues.length);
  }, [sortedByDateAsc]);

  const readTextInfoByTitle = useMemo(() => {
    const lessonByTitle = new Map<string, LessonRecord[]>();

    selectedStudentLessons.forEach((lesson) => {
      const titleKey = normalizeTitle(lesson.textTitle);
      if (!titleKey) {
        return;
      }

      const currentList = lessonByTitle.get(titleKey) ?? [];
      currentList.push(lesson);
      lessonByTitle.set(titleKey, currentList);
    });

    return lessonByTitle;
  }, [selectedStudentLessons]);

  const libraryTextOptions = useMemo<LibraryTextOption[]>(() => {
    return [...libraryTexts]
      .sort((a, b) => a.title.localeCompare(b.title, "tr"))
      .map((textItem) => {
        const titleKey = normalizeTitle(textItem.title);
        const matchedLessons = [...(readTextInfoByTitle.get(titleKey) ?? [])]
          .sort((a, b) => {
            if (a.lessonDate !== b.lessonDate) {
              return a.lessonDate.localeCompare(b.lessonDate);
            }

            return a.createdAt.localeCompare(b.createdAt);
          });
        const lastLesson = matchedLessons[matchedLessons.length - 1] ?? null;

        return {
          id: textItem.id,
          title: textItem.title,
          category: textItem.category,
          level: textItem.level,
          timesRead: matchedLessons.length,
          lastReadLessonNo: lastLesson ? resolveLessonNo(lastLesson, fallbackLessonNoByDate) : null,
          lastReadDate: lastLesson?.lessonDate ?? null,
          lastReadSpeed: lastLesson?.wordsPerMinute ?? null,
          lastReadComprehension: lastLesson?.comprehensionScore ?? null,
          lastReadFocus: lastLesson?.focusScore ?? null,
        };
      });
  }, [fallbackLessonNoByDate, libraryTexts, readTextInfoByTitle]);

  const filteredLibraryTextOptions = useMemo(() => {
    const normalizedSearch = normalizeTitle(textSearchTerm);
    if (!normalizedSearch) {
      return libraryTextOptions;
    }

    return libraryTextOptions.filter((item) => normalizeTitle(item.title).includes(normalizedSearch));
  }, [libraryTextOptions, textSearchTerm]);

  const selectedTextReadInfo = useMemo(() => {
    if (!form.textTitle.trim()) {
      return null;
    }

    const titleKey = normalizeTitle(form.textTitle);
    const matchingLessons = readTextInfoByTitle.get(titleKey) ?? [];

    if (matchingLessons.length === 0) {
      return null;
    }

    const latestLesson = [...matchingLessons].sort((a, b) => {
      if (a.lessonDate !== b.lessonDate) {
        return b.lessonDate.localeCompare(a.lessonDate);
      }

      return b.createdAt.localeCompare(a.createdAt);
    })[0];

    return {
      count: matchingLessons.length,
      lessonNo: resolveLessonNo(latestLesson, fallbackLessonNoByDate),
      speed: latestLesson.wordsPerMinute,
      comprehension: latestLesson.comprehensionScore,
      focus: latestLesson.focusScore,
    };
  }, [fallbackLessonNoByDate, form.textTitle, readTextInfoByTitle]);

  const progress = useMemo(() => evaluateProgress(sortedByDateAsc), [sortedByDateAsc]);

  const filteredLessons = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchText.trim());

    return selectedStudentLessons.filter((lesson) => {
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
  }, [comprehensionFilter, dateFilter, searchText, selectedStudentLessons]);

  const dayGroups = useMemo<LessonDayGroup[]>(() => {
    const fallbackByDate = buildFallbackLessonNoMap(filteredLessons);
    const groupedByLessonNo = new Map<number, LessonRecord[]>();

    filteredLessons.forEach((lesson) => {
      const lessonNo = resolveLessonNo(lesson, fallbackByDate);
      const current = groupedByLessonNo.get(lessonNo) ?? [];
      current.push(lesson);
      groupedByLessonNo.set(lessonNo, current);
    });

    return Array.from(groupedByLessonNo.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lessonNo, lessonsForDay]) => {
        const orderedLessons = [...lessonsForDay].sort((a, b) => {
          if (a.lessonDate !== b.lessonDate) {
            return a.lessonDate.localeCompare(b.lessonDate);
          }

          return a.createdAt.localeCompare(b.createdAt);
        });

        const dayDates = orderedLessons.map((lesson) => lesson.lessonDate).sort((a, b) => a.localeCompare(b));
        const firstDate = dayDates[0] ?? "";
        const lastDate = dayDates[dayDates.length - 1] ?? firstDate;
        const dateLabel = firstDate && lastDate && firstDate !== lastDate
          ? `${formatDate(firstDate)} - ${formatDate(lastDate)}`
          : formatDate(firstDate);

        const averageSpeed = safeAverage(orderedLessons.map((lesson) => toFiniteNumber(lesson.wordsPerMinute)));
        const averageComprehension = safeAverage(orderedLessons.map((lesson) => toFiniteNumber(lesson.comprehensionScore)));
        const averageFocus = safeAverage(orderedLessons.map((lesson) => toFiniteNumber(lesson.focusScore)));

        return {
          lessonNo,
          dateLabel,
          dayNumber: lessonNo,
          lessons: orderedLessons,
          recordCount: orderedLessons.length,
          averageSpeed,
          averageComprehension,
          averageFocus,
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
    setTextPickerInfoMessage("");
    setTextSearchTerm("");
    setIsTextSelectorOpen(false);
    setForm((previous) => ({
      ...DEFAULT_FORM,
      studentId: previous.studentId,
      lessonNo: String(recommendedLessonNo),
    }));
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (lesson: LessonRecord) => {
    setEditingLesson(lesson);
    setTextPickerInfoMessage("");
    setTextSearchTerm("");
    setIsTextSelectorOpen(false);
    setForm({
      studentId: lesson.studentId,
      lessonDate: lesson.lessonDate,
      lessonNo: String(resolveLessonNo(lesson, fallbackLessonNoByDate)),
      textTitle: lesson.textTitle,
      selectedTextId: "",
      readingSpeed: String(lesson.wordsPerMinute),
      comprehensionScore: String(lesson.comprehensionScore),
      focusScore: lesson.focusScore === null ? "" : String(lesson.focusScore),
      teacherNote: lesson.teacherNote ?? "",
    });
    setIsFormOpen(true);
  };

  const beginInlineEdit = (lesson: LessonRecord) => {
    setInlineEditLessonId(lesson.id);
    setInlineEditForm({
      lessonNo: String(resolveLessonNo(lesson, fallbackLessonNoByDate)),
      lessonDate: lesson.lessonDate,
      textTitle: lesson.textTitle,
      readingSpeed: String(lesson.wordsPerMinute),
      comprehensionScore: String(lesson.comprehensionScore),
      focusScore: lesson.focusScore === null ? "" : String(lesson.focusScore),
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

    const lessonNo = toLessonNo(inlineEditForm.lessonNo);
    if (lessonNo === null) {
      setErrorMessage("Kacinci ders gunu 1 ile 16 arasinda olmalidir.");
      return;
    }

    const focusScore = toFocusScore(inlineEditForm.focusScore);
    if (focusScore === null) {
      setErrorMessage("Odaklanma puani 0 ile 100 arasinda olmalidir.");
      return;
    }

    if (inlineEditForm.teacherNote.length > MAX_NOTE_LENGTH) {
      setErrorMessage(`Ogretmen notu en fazla ${MAX_NOTE_LENGTH} karakter olabilir.`);
      return;
    }

    setIsSaving(true);

    try {
      await updateLesson(lesson.id, {
        lessonNo,
        lessonDate: inlineEditForm.lessonDate,
        textTitle: inlineEditForm.textTitle.trim(),
        wordsPerMinute: readingSpeed,
        comprehensionScore: toComprehension(inlineEditForm.comprehensionScore),
        focusScore,
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

    const lessonNo = toLessonNo(form.lessonNo);
    if (lessonNo === null) {
      setErrorMessage("Kacinci ders gunu 1 ile 16 arasinda olmalidir.");
      return;
    }

    const focusScore = toFocusScore(form.focusScore);
    if (focusScore === null) {
      setErrorMessage("Odaklanma puani 0 ile 100 arasinda olmalidir.");
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
        lessonNo,
        lessonDate: form.lessonDate,
        textTitle: form.textTitle.trim(),
        wordCount: editingLesson?.wordCount ?? 0,
        durationSeconds: editingLesson?.durationSeconds ?? 0,
        wordsPerMinute: readingSpeed,
        comprehensionScore,
        focusScore,
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

  const handleSelectLibraryText = (textOption: LibraryTextOption) => {
    setForm((previous) => ({
      ...previous,
      textTitle: textOption.title,
      selectedTextId: textOption.id,
    }));

    if (textOption.timesRead > 0) {
      const summary = `Bu ogrenci bu metni daha once okudu. Son kayit: ${textOption.lastReadLessonNo ?? "-"}. Gun · ${textOption.lastReadSpeed ?? "-"} kelime/dk · %${textOption.lastReadComprehension ?? "-"} anlama`;
      setTextPickerInfoMessage(summary);
    } else {
      setTextPickerInfoMessage("");
    }

    setIsTextSelectorOpen(false);
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
                onChange={(event) => handleStudentSelectChange(event.target.value)}
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

            <PanelCard title="Genel Performans" subtitle="Egzersiz sonuclarindan hesaplanan ogrenci ozeti">
              {performanceErrorMessage ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {performanceErrorMessage}
                </div>
              ) : null}

              {isPerformanceLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Genel performans yukleniyor...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-[360px]:grid-cols-1 lg:grid-cols-4">
                  <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold text-blue-600">Toplam Calisma</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{generalPerformance?.totalStudy ?? 0}</p>
                    <p className="text-xs text-slate-500">egzersiz kaydi</p>
                  </article>

                  <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600">Ortalama Basari</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {generalPerformance?.averageSuccess === null || generalPerformance?.averageSuccess === undefined
                        ? "-"
                        : `%${generalPerformance.averageSuccess}`}
                    </p>
                    <p className="text-xs text-slate-500">tum sonuclar</p>
                  </article>

                  <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold text-rose-600">Toplam Puan</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{generalPerformance?.totalScore ?? 0}</p>
                    <p className="text-xs text-slate-500">birikimli</p>
                  </article>

                  <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold text-amber-600">Son Calisma</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(generalPerformance?.lastStudyAt ?? null)}</p>
                    <p className="text-xs text-slate-500">son tamamlanan egzersiz</p>
                  </article>
                </div>
              )}
            </PanelCard>

            <PanelCard title="Ders Kayitlari Ozeti" subtitle="Secili ogrencinin ders kayitlarindan uretilen metrikler">
              <div className="grid grid-cols-2 gap-3 max-[360px]:grid-cols-1 lg:grid-cols-5">
                <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-red-600">Baslangic Hizi</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{firstLesson ? firstLesson.wordsPerMinute : "-"}</p>
                  <p className="text-xs text-slate-500">kelime/dk</p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600">Guncel Hiz</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{latestLesson ? latestLesson.wordsPerMinute : "-"}</p>
                  <p className="text-xs text-slate-500">kelime/dk</p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-amber-600">Ortalama Anlama</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{averageComprehension === null ? "-" : `%${averageComprehension}`}</p>
                  <p className="text-xs text-slate-500">tum dersler</p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-teal-600">Ortalama Odaklanma</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{averageFocus === null ? "-" : `%${averageFocus}`}</p>
                  <p className="text-xs text-slate-500">tum dersler</p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-blue-600">Toplam Ders</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{selectedStudentLessons.length}</p>
                  <p className="text-xs text-slate-500">kayit</p>
                </article>
              </div>
            </PanelCard>

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

              </div>

              <div className="mt-4 space-y-2">
                {dayGroups.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Tarih grubu olusturmak icin kayit bulunmuyor.</div>
                ) : (
                  dayGroups.map((group) => {
                    const groupKey = String(group.lessonNo);
                    const isOpen = openDateGroups[groupKey] ?? true;

                    return (
                      <article key={`group-${group.lessonNo}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleDateGroup(groupKey)}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 text-left"
                          aria-label={`${group.dayNumber}. gun grubunu ${isOpen ? "kapat" : "ac"}`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{group.dayNumber}. Gun · {group.dateLabel}</p>
                            <p className="text-xs text-slate-600">
                              {group.recordCount} metin · Ortalama hiz: {group.averageSpeed === null ? "—" : `${group.averageSpeed} kelime/dk`} · Ortalama anlama: {group.averageComprehension === null ? "—" : `%${group.averageComprehension}`} · Ortalama odaklanma: {group.averageFocus === null ? "—" : `%${group.averageFocus}`}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{isOpen ? "Gizle" : "Goster"}</span>
                        </button>

                        {isOpen ? (
                          <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                            {group.lessons.map((lesson) => (
                              <div key={`group-row-${lesson.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">{lesson.textTitle}</p>
                                  <p className="text-slate-600">{lesson.wordsPerMinute} kelime/dk · %{lesson.comprehensionScore} · Odaklanma: {lesson.focusScore === null ? "—" : `%${lesson.focusScore}`}</p>
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
                {dayGroups.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Kayit bulunmuyor.</div>
                ) : (
                  dayGroups.map((group) => (
                    <section key={`mobile-group-${group.lessonNo}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-3">
                        <p className="text-sm font-semibold text-red-900">{group.dayNumber}. Gun</p>
                        <p className="text-xs text-red-800">{group.dateLabel}</p>
                        <p className="mt-1 text-xs text-red-800">
                          {group.recordCount} metin · Ortalama hiz: {group.averageSpeed === null ? "—" : `${group.averageSpeed} kelime/dk`} · Ortalama anlama: {group.averageComprehension === null ? "—" : `%${group.averageComprehension}`} · Ortalama odaklanma: {group.averageFocus === null ? "—" : `%${group.averageFocus}`}
                        </p>
                      </div>

                      <div className="mt-2 space-y-2">
                        {group.lessons.map((lesson) => (
                          <article key={`mobile-${lesson.id}`} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{resolveLessonNo(lesson, fallbackLessonNoByDate)}. Gun</p>
                            <p className="text-sm font-semibold text-slate-900">Metin: {lesson.textTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">Tarih: {formatDate(lesson.lessonDate)}</p>
                            <p className="text-sm text-slate-600">Hiz: {lesson.wordsPerMinute} kelime/dk</p>
                            <p className="text-sm text-slate-600">Anlama: %{lesson.comprehensionScore}</p>
                            <p className="text-sm text-slate-600">Odaklanma: {lesson.focusScore === null ? "—" : `%${lesson.focusScore}`}</p>
                            <p className="mt-1 truncate text-sm text-slate-600">Not: {lesson.teacherNote || "-"}</p>

                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => setViewingLesson(lesson)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Goruntule</button>
                              <button type="button" onClick={() => openEditForm(lesson)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Duzenle</button>
                              <button type="button" onClick={() => void handleDelete(lesson.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Sil</button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Ders Gunu</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Tarih</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Metnin Adi</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Okuma Hizi</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Anlama</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Odaklanma</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Ogretmen Notu</th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold">Islem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayGroups.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-600">Kayit bulunmuyor.</td>
                      </tr>
                    ) : (
                      dayGroups.flatMap((group) => {
                        const summaryRow = (
                          <tr key={`summary-${group.lessonNo}`} className="bg-red-50/70">
                            <td colSpan={8} className="border-b border-red-100 px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2 text-sm text-red-900">
                                <span className="font-semibold">{group.dayNumber}. Gun · {group.dateLabel}</span>
                                <span className="inline-flex rounded-full border border-red-200 bg-white px-2 py-0.5 text-xs font-semibold">{group.recordCount} metin</span>
                                <span className="text-xs">Ortalama anlama: {group.averageComprehension === null ? "—" : `%${group.averageComprehension}`}</span>
                                <span className="text-xs">Ortalama odaklanma: {group.averageFocus === null ? "—" : `%${group.averageFocus}`}</span>
                              </div>
                            </td>
                          </tr>
                        );

                        const lessonRows = group.lessons.map((lesson) => (
                          <tr key={lesson.id} className="border-b border-slate-100 last:border-0">
                            {inlineEditLessonId === lesson.id ? (
                              <>
                                <td className="px-3 py-2 align-top">
                                  <select
                                    value={inlineEditForm.lessonNo}
                                    onChange={(event) => setInlineEditForm((previous) => ({ ...previous, lessonNo: event.target.value }))}
                                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                  >
                                    {LESSON_DAY_OPTIONS.map((option) => (
                                      <option key={`inline-day-${lesson.id}-${option}`} value={String(option)}>{option}. Gun</option>
                                    ))}
                                  </select>
                                </td>
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
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={inlineEditForm.focusScore}
                                    onChange={(event) => setInlineEditForm((previous) => ({ ...previous, focusScore: event.target.value }))}
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
                                <td className="px-3 py-3 text-slate-700">{resolveLessonNo(lesson, fallbackLessonNoByDate)}. Gun</td>
                                <td className="px-3 py-3 text-slate-700">{formatDate(lesson.lessonDate)}</td>
                                <td className="px-3 py-3 font-semibold text-slate-900">{lesson.textTitle}</td>
                                <td className="px-3 py-3 text-slate-700">{lesson.wordsPerMinute} kelime/dk</td>
                                <td className="px-3 py-3"><span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">%{lesson.comprehensionScore}</span></td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${lesson.focusScore === null ? "border-slate-200 bg-slate-50 text-slate-600" : lesson.focusScore >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : lesson.focusScore >= 60 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                                    {lesson.focusScore === null ? "—" : `%${lesson.focusScore}`}
                                  </span>
                                </td>
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
                        ));

                        return [summaryRow, ...lessonRows];
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-sm text-slate-600">Toplam {filteredLessons.length} kayit</div>
            </PanelCard>

            {viewingLesson ? (
              <PanelCard title="Kayit Detayi" subtitle="Secilen ders kaydinin tam notu">
                <div className="space-y-1 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Ders Gunu:</span> {resolveLessonNo(viewingLesson, fallbackLessonNoByDate)}. Gun</p>
                  <p><span className="font-semibold text-slate-900">Tarih:</span> {formatDate(viewingLesson.lessonDate)}</p>
                  <p><span className="font-semibold text-slate-900">Metin:</span> {viewingLesson.textTitle}</p>
                  <p><span className="font-semibold text-slate-900">Hiz:</span> {viewingLesson.wordsPerMinute} kelime/dk</p>
                  <p><span className="font-semibold text-slate-900">Anlama:</span> %{viewingLesson.comprehensionScore}</p>
                  <p><span className="font-semibold text-slate-900">Odaklanma:</span> {viewingLesson.focusScore === null ? "—" : `%${viewingLesson.focusScore}`}</p>
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

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Kacinci Ders Gunu</span>
                    <select
                      value={form.lessonNo}
                      onChange={(event) => setForm((previous) => ({ ...previous, lessonNo: event.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      required
                    >
                      {LESSON_DAY_OPTIONS.map((option) => (
                        <option key={`modal-day-${option}`} value={String(option)}>{option}. Gun</option>
                      ))}
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Metnin Adi</span>
                    <div ref={textSelectorRef} className="relative mt-1">
                      <button
                        type="button"
                        onClick={() => setIsTextSelectorOpen((previous) => !previous)}
                        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-800"
                        aria-expanded={isTextSelectorOpen}
                        aria-label="Metin seciciyi ac"
                      >
                        <span className="truncate">{form.textTitle || "Metin secin"}</span>
                        <span className="text-xs font-semibold text-slate-500">Sec</span>
                      </button>

                      {isTextSelectorOpen ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                          <input
                            value={textSearchTerm}
                            onChange={(event) => setTextSearchTerm(event.target.value)}
                            placeholder="Metin ara"
                            className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                          />

                          <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                            {isTextLibraryLoading ? (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Metinler yukleniyor...</div>
                            ) : textLibraryErrorMessage ? (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">Metin kutuphanesi yuklenemedi.</div>
                            ) : filteredLibraryTextOptions.length === 0 ? (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Anlama testi kutuphanesinde kullanilabilir metin bulunamadi.</div>
                            ) : (
                              filteredLibraryTextOptions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectLibraryText(item)}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-red-200 hover:bg-red-50"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-900">{item.title}</p>
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.timesRead > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                                      {item.timesRead > 0 ? `${item.timesRead} kez okundu` : "Yeni"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    {item.category}
                                    {item.level ? ` · Seviye ${item.level}` : ""}
                                    {item.lastReadDate ? ` · Son: ${formatDate(item.lastReadDate)}` : ""}
                                  </p>
                                  {item.lastReadLessonNo !== null ? (
                                    <p className="text-xs text-slate-500">{item.lastReadLessonNo}. Gun · {item.lastReadSpeed ?? "-"} kelime/dk · %{item.lastReadComprehension ?? "-"} anlama · Odak %{item.lastReadFocus ?? "-"}</p>
                                  ) : null}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <input
                      value={form.textTitle}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setForm((previous) => ({ ...previous, textTitle: nextValue, selectedTextId: "" }));
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      placeholder="Gerekirse metin adini duzenleyin"
                      required
                    />
                    {textPickerInfoMessage ? (
                      <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{textPickerInfoMessage}</p>
                    ) : null}
                    {selectedTextReadInfo ? (
                      <p className="mt-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                        Bu metin daha once {selectedTextReadInfo.count} kez okundu. Son kayit: {selectedTextReadInfo.lessonNo}. Gun · {selectedTextReadInfo.speed} kelime/dk · %{selectedTextReadInfo.comprehension} anlama · Odak %{selectedTextReadInfo.focus ?? "-"}
                      </p>
                    ) : null}
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

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Odaklanma Puani</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.focusScore}
                      onChange={(event) => setForm((previous) => ({ ...previous, focusScore: event.target.value }))}
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
