"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PanelCard } from "@/components/ui/PanelCard";
import { clearCurrentStudent, getCurrentStudent } from "@/lib/auth/auth";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import { getResultsByStudent } from "@/lib/results/resultStorage";
import type { ExerciseResult } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";

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
      setAllResults(currentStudent ? getResultsByStudent(currentStudent.id) : []);
      setReadingTests(currentStudent ? getReadingTestsByStudent(currentStudent.id) : []);
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const recentResults = useMemo<ExerciseResult[]>(() => {
    if (!student) {
      return [];
    }

    return allResults.slice(0, 5);
  }, [allResults, student]);

  const handleLogout = () => {
    clearCurrentStudent();
    router.push("/giris");
  };

  if (!isMounted) {
    return (
      <PanelCard title="Ogrenci Paneli" subtitle="Bilgiler yukleniyor...">
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">Panel verileri yukleniyor...</p>
      </PanelCard>
    );
  }

  if (!student) {
    return (
      <PanelCard title="Ogrenci secimi gerekli" subtitle="Devam etmek icin giris ekranindan bir ogrenci secmelisin.">
        <Link href="/giris" className="inline-flex min-h-[56px] items-center rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white">
          Giris Sayfasina Git
        </Link>
      </PanelCard>
    );
  }

  return (
    <PanelCard title={`Hos geldin, ${student.name}`} subtitle={`Sinif Duzeyi: ${student.classLevel ?? "Belirtilmedi"}`}>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Bugunku Calismam</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Takistoskop + Benzer Kelimeler + Blok Okuma + Golgeleme + Odaklı Okuma + Cift Tarafli Odak + Hafıza Geliştirme</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Bugun odak: hizli algi, dikkat, ritimli goz takibi, odakli okuma ve anlik kelime karsilastirmasi.</p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Egzersizler</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Aktif Egzersizler: Takistoskop, Benzer Kelimeler, Blok Okuma, Golgeleme, Odaklı Okuma, Cift Tarafli Odak, Hafıza Geliştirme</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Yedi egzersize de panelden hizli erisebilirsin.</p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Sonuclarim</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Son skorlarini karsilastir</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Her tur sonunda sonuc ekranina yonlendirilirsin.</p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Gelisimim</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Haftalik ilerleme takibi</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Dogruluk ve hiz trendin burada birikir.</p>
        </article>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/egzersizler"
          className="w-full min-h-[56px] rounded-2xl border border-red-900/30 bg-[var(--brand)] px-4 py-4 text-center text-base font-bold text-white shadow-md shadow-red-200 transition hover:bg-[var(--brand-strong)]"
        >
          Egzersizlere Git
        </Link>
        <Link
          href="/egzersizler/takistoskop"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Takistoskop Baslat
        </Link>
        <Link
          href="/egzersizler/benzer-kelimeler"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Benzer Kelimeler Baslat
        </Link>
        <Link
          href="/egzersizler/blok-okuma"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Blok Okuma Baslat
        </Link>
        <Link
          href="/egzersizler/golgeleme"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Golgeleme Baslat
        </Link>
        <Link
          href="/egzersizler/odakli-okuma"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Odaklı Okuma Başlat
        </Link>
        <Link
          href="/egzersizler/cift-tarafli-odak"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Cift Tarafli Odak Baslat
        </Link>
        <Link
          href="/egzersizler/hafiza-gelistirme"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Hafıza Geliştirme Baslat
        </Link>
        <Link
          href="/egzersizler/anlama-testi"
          className="w-full min-h-[56px] rounded-2xl border border-red-200 bg-white px-4 py-4 text-center text-base font-bold text-red-800 transition hover:bg-red-50"
        >
          Anlama Testi Baslat
        </Link>
      </div>
      <div className="mt-4 md:mt-6">
        <Button variant="secondary" onClick={handleLogout} className="md:w-auto">
          Cikis Yap
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold">Son Sonuclarim</h3>
        {recentResults.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Henuz sonuc yok.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {recentResults.map((result) => (
              <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">{result.exerciseTitle}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{new Date(result.date).toLocaleString("tr-TR")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <p>Puan: <span className="text-[var(--brand)]">{result.score}</span></p>
                  <p>Basari: <span className="text-slate-900">{result.successRate}%</span></p>
                  <p>Dogru: <span className="text-[var(--ok)]">{result.correctCount}</span></p>
                  <p>Yanlis: <span className="text-[var(--bad)]">{result.wrongCount}</span></p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold">Son Okuma Testlerim</h3>
        {readingTests.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Henuz okuma testi sonucu yok.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {readingTests.slice(0, 3).map((test) => (
              <article key={test.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">{test.textTitle}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{new Date(test.date).toLocaleString("tr-TR")}</p>
                <div className="mt-3 grid gap-1 text-sm font-semibold">
                  <p>Hiz: <span className="text-slate-900">{test.readingSpeedWpm} kelime/dk</span></p>
                  <p>Anlama: <span className="text-[var(--brand)]">{test.comprehensionScore}</span></p>
                  <p>Sure: <span className="text-slate-900">{test.readingDurationSeconds} sn</span></p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PanelCard>
  );
}
