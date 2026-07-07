"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { getStudents, getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { Student, StudentStatus } from "@/lib/students/types";

type StatusFilter = "all" | StudentStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "passive", label: "Pasif" },
];

function getStudentStatus(student: Student): StudentStatus {
  if (student.status === "passive" || student.isActive === false) {
    return "passive";
  }

  return "active";
}

function normalizeSearchValue(value: string | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i");
}

function getClassName(student: Student): string {
  return student.className ?? student.classLevel ?? "-";
}

function getParentPhone(student: Student): string {
  return student.phone ?? student.parentPhone ?? "-";
}

function getStatusBadgeClass(status: StudentStatus): string {
  return status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
}

function StudentActions({ studentId }: { studentId: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link
        href={`/ogretmen/ogrenciler/${studentId}`}
        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50"
      >
        Detay
      </Link>
      <Link
        href={`/ogretmen/ogrenciler/${studentId}/duzenle`}
        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
      >
        Düzenle
      </Link>
    </div>
  );
}

export default function StudentTrackingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextStudents = await getStudentsWithRemote();

        if (isMounted) {
          setStudents(nextStudents);
        }
      } catch {
        if (isMounted) {
          setStudents(getStudents());
          setErrorMessage("Öğrenci listesi uzaktan alınamadı. Yerel liste gösteriliyor.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activeCount = students.filter((student) => getStudentStatus(student) === "active").length;

    return {
      total: students.length,
      active: activeCount,
      passive: students.length - activeCount,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchText).trim();

    return students.filter((student) => {
      const status = getStudentStatus(student);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const searchableText = normalizeSearchValue(
        [
          student.name,
          getClassName(student),
          student.parentName,
          getParentPhone(student),
          student.username,
          student.notes,
        ].join(" "),
      );

      return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [searchText, statusFilter, students]);

  return (
    <AppShell
      title="Öğrenci Takip"
      subtitle="Öğrenci listesini görüntüle, yeni öğrenci ekle, düzenle ve toplu aktarım yap."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <PanelCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">Öğrenci Takip</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                Öğrenci listesini görüntüle, yeni öğrenci ekle, düzenle ve toplu aktarım yap.
              </p>
            </div>
            <Link
              href="/ogretmen/idil-panel"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Geri Dön
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="Hızlı İşlemler" subtitle="Öğrenci yönetimi için ana aksiyonlar">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <p className="text-sm leading-5 text-[var(--muted)]">
              Yeni kayıt, mevcut öğrenci düzenleme ve CSV ile toplu aktarımı bu merkezden yönetebilirsin.
            </p>
            <Link
              href="/ogretmen/ogrenciler/yeni"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Yeni Öğrenci Ekle
            </Link>
            <Link
              href="/ogretmen/idil-panel/toplu-ogrenci-aktar"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
            >
              Toplu Öğrenci Aktar
            </Link>
          </div>
        </PanelCard>

        <PanelCard title="Öğrenci Listesi" subtitle="Ada, sınıfa, veliye veya kullanıcı adına göre ara">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Toplam Öğrenci", summary.total],
              ["Aktif Öğrenci", summary.active],
              ["Pasif Öğrenci", summary.passive],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">{label}</p>
                <p className="mt-2 text-[30px] font-semibold leading-none text-slate-950">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="block">
              <span className="sr-only">Öğrenci ara</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                placeholder="Ad, sınıf, veli, telefon veya kullanıcı adı ara..."
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const isSelected = statusFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`min-h-[42px] rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-red-700 bg-red-600 text-white"
                        : "border-red-200 bg-white text-red-800 hover:bg-red-50"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[var(--muted)]">
              Öğrenciler yükleniyor...
            </div>
          ) : null}

          {!isLoading && filteredStudents.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
              Bu filtrelerle eşleşen öğrenci bulunamadı.
            </div>
          ) : null}

          {!isLoading && filteredStudents.length > 0 ? (
            <>
              <div className="mt-4 grid gap-3 md:hidden">
                {filteredStudents.map((student) => {
                  const status = getStudentStatus(student);

                  return (
                    <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">{student.name}</h3>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Kullanıcı adı: {student.username}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                          {status === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-slate-600">
                        <p>Sınıf: {getClassName(student)}</p>
                        <p>Veli: {student.parentName ?? "-"}</p>
                        <p>Telefon: {getParentPhone(student)}</p>
                      </div>
                      <div className="mt-4">
                        <StudentActions studentId={student.id} />
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      {["Ad Soyad", "Sınıf", "Veli", "Telefon", "Kullanıcı Adı", "Durum", "İşlemler"].map((column) => (
                        <th key={column} className="border-b border-slate-200 px-3 py-3 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const status = getStudentStatus(student);

                      return (
                        <tr key={student.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-3 font-semibold text-slate-950">{student.name}</td>
                          <td className="px-3 py-3 text-slate-700">{getClassName(student)}</td>
                          <td className="px-3 py-3 text-slate-700">{student.parentName ?? "-"}</td>
                          <td className="px-3 py-3 text-slate-700">{getParentPhone(student)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-800">{student.username}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                              {status === "active" ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <StudentActions studentId={student.id} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}
