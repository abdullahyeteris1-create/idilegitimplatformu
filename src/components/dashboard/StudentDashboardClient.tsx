"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PanelCard } from "@/components/ui/PanelCard";
import { clearCurrentUser, getCurrentStudent } from "@/lib/auth/auth";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import { getResultsByStudent } from "@/lib/results/resultStorage";
import type { ExerciseResult } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";

const quickLinks = [
  {
    href: "/egzersizler",
    title: "Egzersizlere Git",
    description: "Tum dikkat, okuma ve hafiza calismalarini ac.",
    tone: "bg-[var(--brand)] text-white border-red-900/20 shadow-red-200",
  },
  {
    href: "/sonuc",
    title: "Sonuclarim",
    description: "Tamamladigin calismalarin skorlarini incele.",
    tone: "bg-white text-red-800 border-red-200",
  },
  {
    href: "/egzersizler/anlama-testi",
    title: "Okuma Testlerim",
    description: "Okuma hizi ve anlama oranini birlikte olc.",
    tone: "bg-white text-red-800 border-red-200",
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString("tr-TR");
}

export function StudentDashboardClient() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [allResults, setAllResults] = useState<ExerciseResult[]>([]);
  const [readingTests, setReadingTests] = useState<ReadingTestResult[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentStudent = getCurrentStudent();
      setStudent(currentStudent);
      setAllResults(currentStudent ? getResultsByStudent(currentStudent.id, currentStudent.name) : []);
      setReadingTests(currentStudent ? getReadingTestsByStudent(currentStudent.id, currentStudent.name) : []);
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const recentResults = useMemo<ExerciseResult[]>(() => allResults.slice(0, 4), [allResults]);
  const lastResult = recentResults[0];
  const lastReadingTest = readingTests[0];

  const handleLogout = () => {
    clearCurrentUser();
    router.push("/");
  };

  if (!isMounted) {
    return (
      <PanelCard title="Ogrenci Paneli" subtitle="Bilgiler yukleniyor...">
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-[var(--muted)]">
          Panel verileri yukleniyor...
        </p>
      </PanelCard>
    );
  }

  if (!student) {
    return (
      <PanelCard title="Ogrenci girisi gerekli" subtitle="Devam etmek icin ogrenci hesabinla giris yapmalisin.">
        <Link
          href="/"
          className="inline-flex min-h-[42px] items-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Giris Sayfasina Git
        </Link>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title={`Hos geldin, ${student.name}`}
      subtitle={`${student.classLevel ?? "Belirtilmedi"} • Kisa bir calisma ile devam et`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-[18px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">Bugunku odak</p>
          <p className="mt-1 text-[18px] font-semibold text-slate-950 md:text-[20px]">Kisa dikkat ve okuma akiciligi calismasi</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Bugun en hizli yol: egzersize gir, bir calisma tamamla, sonra sonucunu kontrol et.
          </p>
        </section>

        <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">Toplam sonuc</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{allResults.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">Okuma testi</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{readingTests.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">Son basari</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{lastResult ? `${lastResult.successRate}%` : "-"}</p>
          </article>
        </section>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-[18px] ${item.tone}`}
          >
            <span className="block text-[18px] font-semibold leading-6">{item.title}</span>
            <span className="mt-1 block text-sm leading-5 opacity-80">{item.description}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <h3 className="text-[18px] font-semibold text-slate-950">Son Sonuclarim</h3>
          {recentResults.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-[var(--muted)]">
              Sonuc bulunamadi.
            </p>
          ) : (
            <div className="mt-2 grid gap-2.5">
              {recentResults.slice(0, 3).map((result) => (
                <article key={result.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">{result.exerciseTitle}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(result.date)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-medium text-slate-700">
                    <p>Puan: <span className="text-slate-950">{result.score}</span></p>
                    <p>Basari: <span className="text-slate-950">{result.successRate}%</span></p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-[18px] font-semibold text-slate-950">Son Okuma Testlerim</h3>
          {readingTests.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-[var(--muted)]">
              Okuma testi yok.
            </p>
          ) : (
            <div className="mt-2 grid gap-2.5">
              {readingTests.slice(0, 3).map((test) => (
                <article key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">{test.textTitle}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(test.date)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-medium text-slate-700">
                    <p>Hiz: <span className="text-slate-950">{test.readingSpeedWpm}</span></p>
                    <p>Anlama: <span className="text-slate-950">{test.comprehensionScore}</span></p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleLogout} className="md:w-auto">
          Cikis Yap
        </Button>
        {lastReadingTest ? (
          <p className="self-center text-sm text-[var(--muted)]">
            Son okuma testi: {lastReadingTest.readingSpeedWpm} kelime/dk, {lastReadingTest.comprehensionScore} anlama.
          </p>
        ) : null}
      </div>
    </PanelCard>
  );
}
