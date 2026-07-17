"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { downloadResultsXlsx } from "@/lib/results/resultExport";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import { getResultsByStudent } from "@/lib/results/resultStorage";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import { getStudentById } from "@/lib/students/studentStorage";

type ExerciseSummary = {
  exerciseType: ExerciseType;
  title: string;
  count: number;
  averageSuccess: number;
  maxScore: number;
  lastScore: number;
  lastDate: string;
};

function toDisplayDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("tr-TR");
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getExerciseTitle(type: ExerciseType): string {
  if (type === "tachistoscope") {
    return "Takistoskop";
  }

  if (type === "similar-words") {
    return "Benzer Kelimeler";
  }

  if (type === "shadow-reading") {
    return "Golgeleme";
  }

  if (type === "focused-reading") {
    return "Odaklı Okuma Çalışması";
  }

  if (type === "two-side-focus") {
    return "Cift Tarafli Odak";
  }

  if (type === "attention-maze") {
    return "Dikkat Labirenti";
  }

  if (type === "memory-game") {
    return "Hafıza Geliştirme";
  }

  if (type === "word-finding") {
    return "Kelime Bulma Calismasi";
  }

  if (type === "eye-muscle") {
    return "Goz Kaslarini Gelistirme Calismasi";
  }

  if (type === "reading-comprehension") {
    return "Anlama Testi";
  }

  if (type === "letter-number-counting-focus") {
    return "Harf / Rakam Sayma Odak Calismasi";
  }

  if (type === "card-matching") {
    return "Kart Eslestirme Calismasi";
  }

  if (type === "visual-puzzle") {
    return "Gorsel Puzzle Calismasi";
  }

  if (type === "eye-brain") {
    return "Göz Beyin Çalışması";
  }

  if (type === "word-guess") {
    return "Kelime Tahmin";
  }

  if (type === "catch-same") {
    return "Ayni Olani Yakala";
  }

  if (type === "hangman") {
    return "Adam Asmaca";
  }

  if (type === "grouping-reading") {
    return "Gruplama Çalışması";
  }

  if (type === "eye-columns") {
    return "Kelime Kolonları";
  }

  if (type === "square-vision") {
    return "KAREL: Kare Görme Alanı";
  }

  if (type === "number-table") {
    return "Sayı Tablosu";
  }

  return "Blok Okuma";
}

export function StudentDetailClient() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<ReturnType<typeof getStudentById>>(null);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [readingTests, setReadingTests] = useState<ReadingTestResult[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentStudent = getStudentById(studentId);
      setStudent(currentStudent);
      setResults(
        currentStudent
          ? getResultsByStudent(studentId, currentStudent.name, currentStudent.username)
          : getResultsByStudent(studentId),
      );
      setReadingTests(
        currentStudent
          ? getReadingTestsByStudent(studentId, currentStudent.name, currentStudent.username)
          : getReadingTestsByStudent(studentId),
      );
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [studentId]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.date.localeCompare(a.date));
  }, [results]);

  const performance = useMemo(() => {
    const totalStudy = sortedResults.length;
    const totalScore = sortedResults.reduce((sum, item) => sum + item.score, 0);
    const totalSuccess = sortedResults.reduce((sum, item) => sum + item.successRate, 0);
    const averageSuccess = totalStudy > 0 ? Math.round(totalSuccess / totalStudy) : 0;

    return {
      totalStudy,
      totalScore,
      averageSuccess,
      lastDate: sortedResults[0]?.date ?? null,
    };
  }, [sortedResults]);

  const exerciseSummaries = useMemo<ExerciseSummary[]>(() => {
    const types: ExerciseType[] = [
      "tachistoscope",
      "similar-words",
      "block-reading",
      "shadow-reading",
      "focused-reading",
      "two-side-focus",
      "attention-maze",
      "memory-game",
      "word-finding",
      "eye-muscle",
      "reading-comprehension",
      "letter-number-counting-focus",
      "card-matching",
      "visual-puzzle",
      "eye-brain",
      "word-guess",
      "catch-same",
      "hangman",
      "grouping-reading",
      "eye-columns",
      "square-vision",
      "number-table",
    ];

    return types.map((type) => {
      const byType = sortedResults.filter((result) => result.exerciseType === type);
      const count = byType.length;
      const averageSuccess = count > 0 ? Math.round(byType.reduce((sum, item) => sum + item.successRate, 0) / count) : 0;
      const maxScore = count > 0 ? Math.max(...byType.map((item) => item.score)) : 0;
      const lastResult = byType[0] ?? null;

      return {
        exerciseType: type,
        title: getExerciseTitle(type),
        count,
        averageSuccess,
        maxScore,
        lastScore: lastResult?.score ?? 0,
        lastDate: lastResult?.date ?? "",
      };
    });
  }, [sortedResults]);

  if (!isMounted) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Ogrenci verileri yukleniyor...
      </p>
    );
  }

  if (!student) {
    return (
      <div className="grid gap-3">
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">Ogrenci bulunamadi.</p>
        <Link
          href="/ogretmen"
          className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-50"
        >
          Ogretmen Paneline Don
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-red-100 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-red-700">{student.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Kullanici adi: {student.username}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
            {student.status === "active" ? "Aktif" : "Pasif"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <p>Sinif Duzeyi: <span className="font-semibold">{student.classLevel ?? "-"}</span></p>
          <p>Veli Adi: <span className="font-semibold">{student.parentName ?? "-"}</span></p>
          <p>Veli Telefonu: <span className="font-semibold">{student.parentPhone ?? "-"}</span></p>
          <p>E-posta: <span className="font-semibold">{student.email ?? "-"}</span></p>
          <p>Kayit Tarihi: <span className="font-semibold">{toDisplayDate(student.createdAt)}</span></p>
          <p>Egitim Durumu: <span className="font-semibold">{student.educationStatus ?? "-"}</span></p>
        </div>

        {student.notes ? (
          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--muted)]">
            Notlar: {student.notes}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/ogretmen/ogrenciler/${student.id}/duzenle`}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
          >
            Ogrenciyi Duzenle
          </Link>
          <button
            type="button"
            onClick={() => downloadResultsXlsx(sortedResults, `${slugify(student.name)}-sonuclari.xlsx`)}
            className="min-h-[48px] rounded-xl border border-red-900/30 bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
            style={{ touchAction: "manipulation" }}
          >
            Bu Ogrencinin Sonuclarini Excel Indir
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Toplam Calisma</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{performance.totalStudy}</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ortalama Basari</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{performance.averageSuccess}%</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Toplam Puan</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--brand)]">{performance.totalScore}</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Son Calisma</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{toDisplayDate(performance.lastDate)}</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {exerciseSummaries.map((summary) => (
          <article key={summary.exerciseType} className="rounded-2xl border border-red-100 bg-white p-4">
            <h4 className="text-base font-bold text-red-700">{summary.title}</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
              <p>Calisma Sayisi: <span className="text-slate-900">{summary.count}</span></p>
              <p>Ortalama Basari: <span className="text-slate-900">{summary.averageSuccess}%</span></p>
              <p>En Yuksek Puan: <span className="text-[var(--brand)]">{summary.maxScore}</span></p>
              <p>Son Puan: <span className="text-[var(--brand)]">{summary.lastScore}</span></p>
            </div>
            <p className="mt-2 text-xs text-slate-500">Son Calisma: {toDisplayDate(summary.lastDate || null)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-4">
        <h4 className="text-lg font-bold">Okuma Testleri</h4>
        {readingTests.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Bu ogrencinin henuz okuma testi sonucu yok.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="border-b border-red-100 px-3 py-2">Tarih</th>
                  <th className="border-b border-red-100 px-3 py-2">Metin</th>
                  <th className="border-b border-red-100 px-3 py-2">Kelime</th>
                  <th className="border-b border-red-100 px-3 py-2">Sure</th>
                  <th className="border-b border-red-100 px-3 py-2">Hiz</th>
                  <th className="border-b border-red-100 px-3 py-2">Anlama Orani</th>
                </tr>
              </thead>
              <tbody>
                {readingTests.map((test) => (
                  <tr key={test.id} className="font-semibold text-slate-800">
                    <td className="border-b border-red-50 px-3 py-2">{toDisplayDate(test.date)}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.textTitle}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.totalWords}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.readingDurationSeconds} sn</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.readingSpeedWpm} kelime/dk</td>
                    <td className="border-b border-red-50 px-3 py-2 text-[var(--brand)]">{test.comprehensionScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-lg font-bold">Sonuc Gecmisi</h4>
        {sortedResults.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Bu ogrenci henuz egzersiz tamamlamadi.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {sortedResults.map((result) => (
              <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-red-700">{result.exerciseTitle}</p>
                  <p className="text-xs text-slate-500">{toDisplayDate(result.date)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <p>
                    Dogru/Yanlis: <span className="text-slate-900">{result.correctCount}/{result.wrongCount}</span>
                  </p>
                  <p>
                    Puan: <span className="text-[var(--brand)]">{result.score}</span>
                  </p>
                  <p>
                    Basari: <span className="text-slate-900">{result.successRate}%</span>
                  </p>
                  <p>
                    Sure: <span className="text-slate-900">{result.durationSeconds} sn</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
