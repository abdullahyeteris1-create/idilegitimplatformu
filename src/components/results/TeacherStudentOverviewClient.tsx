"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getExerciseResults, getExerciseResultsWithRemote } from "@/lib/results/resultStorage";
import { activateStudent, deactivateStudent, getStudents, getStudentsWithRemote } from "@/lib/students/studentStorage";
import type { StudentStatus } from "@/lib/students/types";

type FilterType = "all" | StudentStatus;

export function TeacherStudentOverviewClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<ReturnType<typeof getStudents>>([]);
  const [allResults, setAllResults] = useState<ReturnType<typeof getExerciseResults>>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const [nextStudents, nextResults] = await Promise.all([
          getStudentsWithRemote(),
          getExerciseResultsWithRemote(),
        ]);

        setStudents(nextStudents);
        setAllResults(nextResults);
        setIsMounted(true);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const studentSummaries = useMemo(() => {
    const filteredStudents =
      filter === "all" ? students : students.filter((student) => student.status === filter);

    return filteredStudents.map((student) => {
      const byStudentId = allResults.filter((result) => result.studentId === student.id);
      const studentResults =
        byStudentId.length > 0
          ? byStudentId
          : allResults.filter(
              (result) => result.studentName?.toLocaleLowerCase("tr-TR") === student.name.toLocaleLowerCase("tr-TR"),
            );
      const lastResult = studentResults[0] ?? null;

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        classLevel: student.classLevel ?? "-",
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        status: student.status,
        resultCount: studentResults.length,
        lastScore: lastResult?.score ?? null,
        lastSuccessRate: lastResult?.successRate ?? null,
        lastExerciseTitle: lastResult?.exerciseTitle ?? null,
        lastExerciseDate: lastResult?.date ?? null,
      };
    });
  }, [allResults, filter, students]);

  const refreshStudents = () => {
    setStudents(getStudents());
    setAllResults(getExerciseResults());
  };

  const handleDeactivate = (studentId: string) => {
    const confirmed = window.confirm(
      "Bu öğrenciyi pasife almak istediğinize emin misiniz? Sonuçları silinmeyecek.",
    );

    if (!confirmed) {
      return;
    }

    const updated = deactivateStudent(studentId);
    if (!updated) {
      return;
    }

    refreshStudents();
  };

  const handleActivate = (studentId: string) => {
    const confirmed = window.confirm("Bu öğrenciyi tekrar aktif yapmak istiyor musunuz?");

    if (!confirmed) {
      return;
    }

    const updated = activateStudent(studentId);
    if (!updated) {
      return;
    }

    refreshStudents();
  };

  if (!isMounted) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Ogrenciler yukleniyor...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/ogretmen/ogrenciler/yeni"
          className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-900/30 bg-[var(--brand)] px-5 py-3 text-base font-bold text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)]"
        >
          Yeni Ogrenci Olustur
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "active", "passive"].map((item) => {
          const label = item === "all" ? "Tumu" : item === "active" ? "Aktif" : "Pasif";
          const isSelected = filter === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item as FilterType)}
              className={`min-h-[48px] rounded-xl border px-4 py-2 text-sm font-bold transition ${
                isSelected
                  ? "border-red-800 bg-red-600 text-white"
                  : "border-red-200 bg-white text-red-800 hover:bg-red-50"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {studentSummaries.map((item) => (
          <article key={item.id} className="rounded-2xl border border-red-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-red-700">{item.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Kullanici adi: {item.username}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.status === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {item.status === "active" ? "Aktif" : "Pasif"}
              </span>
            </div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Sinif {item.classLevel}</p>
            {item.parentName ? <p className="mt-1 text-xs text-slate-500">Veli: {item.parentName}</p> : null}
            {item.parentPhone ? <p className="mt-1 text-xs text-slate-500">Telefon: {item.parentPhone}</p> : null}

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
              <p>
                Sonuc Sayisi: <span className="text-slate-900">{item.resultCount}</span>
              </p>
              <p>
                Son Puan: <span className="text-[var(--brand)]">{item.lastScore ?? "-"}</span>
              </p>
              <p>
                Son Basari:{" "}
                <span className="text-slate-900">
                  {item.lastSuccessRate !== null ? `${item.lastSuccessRate}%` : "-"}
                </span>
              </p>
              <p>
                Son Calisma: <span className="text-slate-900">{item.lastExerciseTitle ?? "-"}</span>
              </p>
            </div>

            {item.lastExerciseDate ? (
              <p className="mt-2 text-xs text-slate-500">{new Date(item.lastExerciseDate).toLocaleString("tr-TR")}</p>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link
                href={`/ogretmen/ogrenciler/${item.id}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-50"
              >
                Detay
              </Link>
              <Link
                href={`/ogretmen/ogrenciler/${item.id}/duzenle`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
              >
                Duzenle
              </Link>
              {item.status === "active" ? (
                <button
                  type="button"
                  onClick={() => handleDeactivate(item.id)}
                  className="min-h-[48px] rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                  style={{ touchAction: "manipulation" }}
                >
                  Pasife Al
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleActivate(item.id)}
                  className="min-h-[48px] rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                  style={{ touchAction: "manipulation" }}
                >
                  Aktif Yap
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
