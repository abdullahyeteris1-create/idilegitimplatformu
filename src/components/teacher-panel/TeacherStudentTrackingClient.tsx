"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PanelCard } from "@/components/ui/PanelCard";
import type { TeacherStudentAccountStatus, TeacherStudentListItem } from "@/lib/teachers/studentTrackingTypes";

type StatusFilter = "all" | TeacherStudentAccountStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "passive", label: "Pasif" },
];

function normalizeSearchValue(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i");
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const sameDay =
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) ===
    new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  if (sameDay) {
    return `Bugün · ${new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(date)}`;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) ===
    new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterday);

  if (isYesterday) {
    return `Dün · ${new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(date)}`;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusBadgeClass(status: TeacherStudentAccountStatus): string {
  return status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100"
    : "border-slate-200 bg-slate-100 text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300";
}

function getStatusDotClass(status: TeacherStudentAccountStatus): string {
  return status === "active" ? "bg-emerald-500" : "bg-slate-400";
}

function getAvatarTone(name: string): string {
  const palette = [
    "from-red-500 to-rose-400",
    "from-orange-500 to-amber-400",
    "from-emerald-500 to-teal-400",
    "from-sky-500 to-cyan-400",
    "from-violet-500 to-fuchsia-400",
    "from-slate-600 to-slate-500",
  ];

  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "Ö";
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  }

  return `${words[0]![0] ?? ""}${words[words.length - 1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

function ProgressBar({ value }: { value: number | null }) {
  const safeValue = value === null ? null : Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 [data-idil-theme=dark]:bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-400 transition-all"
        style={{ width: `${safeValue ?? 0}%` }}
      />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarTone(
        name,
      )} text-sm font-black text-white shadow-sm ring-1 ring-white/60`}
    >
      {getInitials(name)}
    </span>
  );
}

function MiniBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-300">
      {label}
    </span>
  );
}

function FilterChip({
  active,
  children,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex min-h-[42px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
        active
          ? "border-red-700 bg-red-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function ActionLink({
  href,
  children,
  tone = "default",
}: {
  href: string;
  children: string;
  tone?: "default" | "soft";
}) {
  const base =
    tone === "soft"
      ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
      : "border-red-200 bg-white text-red-800 hover:bg-red-50";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${base}`}
    >
      {children}
    </Link>
  );
}

export function TeacherStudentTrackingClient({
  initialStudents,
  loadError = null,
}: {
  initialStudents: TeacherStudentListItem[];
  loadError?: string | null;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [studentToDelete, setStudentToDelete] = useState<TeacherStudentListItem | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const classOptions = useMemo(() => {
    const values = Array.from(new Set(students.map((student) => student.classLabel ?? "").filter(Boolean)));
    return values.sort((left, right) => left.localeCompare(right, "tr"));
  }, [students]);

  const levelOptions = useMemo(() => {
    const values = Array.from(new Set(students.map((student) => student.level).filter((value) => Number.isFinite(value))));
    return values.sort((left, right) => left - right);
  }, [students]);

  const summary = useMemo(() => {
    const activeCount = students.filter((student) => student.accountStatus === "active").length;
    const totalXp = students.reduce((sum, student) => sum + student.totalXp, 0);
    const activePrograms = students.filter((student) => Boolean(student.activeProgramName)).length;

    return {
      total: students.length,
      active: activeCount,
      passive: students.length - activeCount,
      totalXp,
      activePrograms,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchText).trim();

    return students.filter((student) => {
      const matchesStatus = statusFilter === "all" || student.accountStatus === statusFilter;
      const matchesClass = classFilter === "all" || (student.classLabel ?? "") === classFilter;
      const matchesLevel = levelFilter === "all" || String(student.level) === levelFilter;
      const searchableText = normalizeSearchValue(
        [
          student.fullName,
          student.classLabel ?? "",
          student.levelTitle,
          student.activeProgramName ?? "",
          String(student.totalXp),
        ].join(" "),
      );

      return matchesStatus && matchesClass && matchesLevel && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [classFilter, levelFilter, searchText, statusFilter, students]);

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setClassFilter("all");
    setLevelFilter("all");
  };

  const handleDeleteStart = (student: TeacherStudentListItem) => {
    setErrorMessage("");
    setSuccessMessage("");
    setStudentToDelete(student);
  };

  const handleDeleteCancel = () => {
    if (deletingStudentId) {
      return;
    }

    setStudentToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete || deletingStudentId) {
      return;
    }

    setDeletingStudentId(studentToDelete.studentId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(studentToDelete.studentId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("delete-failed");
      }

      setStudents((previous) => previous.filter((student) => student.studentId !== studentToDelete.studentId));
      setStudentToDelete(null);
      setSuccessMessage("Öğrenci başarıyla silindi.");
    } catch {
      setErrorMessage("Öğrenci silinemedi. Lütfen yeniden deneyin.");
    } finally {
      setDeletingStudentId(null);
    }
  };

  const filterCount = [
    statusFilter !== "all",
    classFilter !== "all",
    levelFilter !== "all",
    Boolean(searchText.trim()),
  ].filter(Boolean).length;

  if (loadError) {
    return (
      <PanelCard className="border border-rose-200 bg-rose-50/80 shadow-[0_18px_50px_rgba(15,23,42,0.06)] [data-idil-theme=dark]:border-rose-400/20 [data-idil-theme=dark]:bg-rose-400/10">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700 [data-idil-theme=dark]:text-rose-200">
              Öğrenci Takip
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
              Öğrenci verileri yüklenemedi
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700 [data-idil-theme=dark]:text-slate-200">
              {loadError}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Sayfayı Yenile
          </button>
        </div>
      </PanelCard>
    );
  }

  return (
    <div className="grid gap-4">
      <PanelCard className="overflow-hidden border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,244,244,0.98)_100%)] shadow-[0_18px_50px_rgba(15,23,42,0.06)] [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.96)_100%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--brand)]">Öğrenci Takip</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50 md:text-[30px]">
              XP, seviye ve aktif program görünümü
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 [data-idil-theme=dark]:text-slate-300">
              Öğrencileri hızlı tarayın, filtreleyin ve detay ekranına tek tıkla geçin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/ogretmen/idil-panel"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200"
            >
              Geri Dön
            </Link>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </PanelCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Toplam Öğrenci", summary.total],
          ["Aktif Öğrenci", summary.active],
          ["Pasif Öğrenci", summary.passive],
          ["Toplam XP", summary.totalXp],
          ["Aktif Program", summary.activePrograms],
        ].map(([label, value], index) => (
          <article
            key={String(label)}
            className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 ${
              index === 0 ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,245,245,0.98)_100%)]" : ""
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{value}</p>
          </article>
        ))}
      </section>

      <PanelCard title="Filtreler" subtitle="Arama, durum, sınıf ve seviye ile hızlı daraltma yapın">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <label className="block">
            <span className="sr-only">Öğrenci ara</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100"
              placeholder="Ad, sınıf, seviye, program veya XP ara..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.value}
                  active={statusFilter === filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  ariaLabel={`${filter.label} öğrencileri filtrele`}
                >
                  {filter.label}
                </FilterChip>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
                Sınıf
              </span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100"
              >
                <option value="all">Tüm sınıflar</option>
                {classOptions.map((classLabel) => (
                  <option key={classLabel} value={classLabel}>
                    {classLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
                Seviye
              </span>
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100"
              >
                <option value="all">Tüm seviyeler</option>
                {levelOptions.map((level) => (
                  <option key={level} value={String(level)}>
                    Seviye {level}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex min-h-[48px] items-end justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
              <span>{filteredStudents.length} sonuç</span>
              <span>{filterCount > 0 ? `${filterCount} filtre aktif` : "Filtre yok"}</span>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {filteredStudents.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
            Bu filtrelerle eşleşen öğrenci bulunamadı.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:hidden">
              {filteredStudents.map((student) => (
                <article key={student.studentId} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <Avatar name={student.fullName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{student.fullName}</h3>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
                            {student.classLabel ?? "-"}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(student.accountStatus)}`}>
                          <span className={`h-2 w-2 rounded-full ${getStatusDotClass(student.accountStatus)}`} aria-hidden="true" />
                          {student.accountStatus === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
                                Seviye
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                                {student.level} · {student.levelTitle}
                              </p>
                            </div>
                            <MiniBadge label={`XP ${student.totalXp}`} />
                          </div>
                          <div className="mt-2">
                            <ProgressBar value={student.programProgressPercent} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-2xl bg-slate-50 px-3 py-3 [data-idil-theme=dark]:bg-slate-800">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Son aktivite</p>
                            <p className="mt-1 font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">{formatDateTime(student.lastActivityAt)}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-3 [data-idil-theme=dark]:bg-slate-800">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Program</p>
                            <p className="mt-1 truncate font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">{student.activeProgramName ?? "Program yok"}</p>
                          </div>
                        </div>

                        <ActionLink href={`/ogretmen/ogrenciler/${student.studentId}`} tone="soft">
                          Detayları Gör
                        </ActionLink>
                        <ActionLink href={`/ogretmen/ogrenciler/${student.studentId}/duzenle`}>
                          Düzenle
                        </ActionLink>
                        <button
                          type="button"
                          onClick={() => handleDeleteStart(student)}
                          disabled={Boolean(deletingStudentId)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deletingStudentId === student.studentId ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:block [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-400">
                  <tr>
                    {["Öğrenci", "Seviye", "XP", "Son Aktivite", "Program", "Erişim", "Durum", "İşlemler"].map((column) => (
                      <th key={column} className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.studentId} className="border-b border-slate-100 transition hover:bg-red-50/50 last:border-0 [data-idil-theme=dark]:border-slate-800 [data-idil-theme=dark]:hover:bg-slate-800/70">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <Avatar name={student.fullName} />
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{student.fullName}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
                              {student.classLabel ?? "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 [data-idil-theme=dark]:border-red-400/30 [data-idil-theme=dark]:bg-red-400/10 [data-idil-theme=dark]:text-red-100">
                          S{student.level} · {student.levelTitle}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[180px]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{student.totalXp}</p>
                            <span className="text-xs font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-400">
                              %{student.programProgressPercent ?? 0}
                            </span>
                          </div>
                          <div className="mt-2">
                            <ProgressBar value={student.programProgressPercent} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 [data-idil-theme=dark]:text-slate-300">{formatDateTime(student.lastActivityAt)}</td>
                      <td className="px-4 py-4">
                        <p className="max-w-[220px] truncate font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                          {student.activeProgramName ?? "Program yok"}
                        </p>
                        {student.programProgressPercent !== null ? (
                          <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                            İlerleme %{student.programProgressPercent}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-700 [data-idil-theme=dark]:text-slate-300">{student.accessEndsAt ? formatDateTime(student.accessEndsAt) : "-"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(student.accountStatus)}`}>
                          <span className={`h-2 w-2 rounded-full ${getStatusDotClass(student.accountStatus)}`} aria-hidden="true" />
                          {student.accountStatus === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <ActionLink href={`/ogretmen/ogrenciler/${student.studentId}`} tone="soft">
                            Detay
                          </ActionLink>
                          <ActionLink href={`/ogretmen/ogrenciler/${student.studentId}/duzenle`}>
                            Düzenle
                          </ActionLink>
                          <button
                            type="button"
                            onClick={() => handleDeleteStart(student)}
                            disabled={Boolean(deletingStudentId)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingStudentId === student.studentId ? "Siliniyor..." : "Sil"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PanelCard>

      {studentToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Öğrenci silme onayı"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Öğrenciyi silmek istediğinize emin misiniz?</h3>
            <p className="mt-2 text-sm text-slate-700 [data-idil-theme=dark]:text-slate-300">
              Bu işlem geri alınamaz. Öğrenciye ait ders kayıtları ve egzersiz sonuçları da silinebilir.
            </p>
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-100">
              {studentToDelete.fullName}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={Boolean(deletingStudentId)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={Boolean(deletingStudentId)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingStudentId ? "Siliniyor..." : "Öğrenciyi Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
