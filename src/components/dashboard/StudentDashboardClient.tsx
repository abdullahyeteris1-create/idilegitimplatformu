"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/ui/PanelCard";
import { getCurrentStudent } from "@/lib/auth/auth";
import { getReadingTestsForCurrentUser, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import {
  getExerciseResultsForCurrentUser,
  getExerciseResultsForCurrentUserWithRemote,
} from "@/lib/results/resultStorage";
import type { ExerciseResult } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";

type DashboardCategory = {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: string;
  examples: string[];
  theme: {
    border: string;
    bg: string;
    icon: string;
    badge: string;
    button: string;
  };
};

const quickLinks = [
  { href: "/egzersizler", label: "Calismaya Basla" },
  { href: "/sonuc", label: "Sonuclarim" },
  { href: "/egzersizler/anlama-testi", label: "Okuma Testlerim" },
];

const studyCategories: DashboardCategory[] = [
  {
    id: "eye",
    title: "Goz Egzersizleri",
    description: "Goz takip, kas ve koordinasyon becerilerini guclendiren kisa calismalar.",
    count: 2,
    icon: "👁️",
    examples: ["Goz Kaslarini Gelistirme", "Goz Beyin Calismasi"],
    theme: {
      border: "border-emerald-100 hover:border-emerald-200",
      bg: "bg-emerald-50/70",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
  },
  {
    id: "attention",
    title: "Goz Algilama Calismalari",
    description: "Hizli fark etme, gorsel algi ve secici dikkat becerilerini destekler.",
    count: 2,
    icon: "⚡",
    examples: ["Takistoskop", "Benzer Kelimeler"],
    theme: {
      border: "border-rose-100 hover:border-rose-200",
      bg: "bg-rose-50/70",
      icon: "bg-rose-100 text-rose-700",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      button: "bg-rose-600 hover:bg-rose-700",
    },
  },
  {
    id: "fluency",
    title: "Metin Calismalari",
    description: "Okuma alanini genisletir, metin takibini ve akiciligi artirmaya yardim eder.",
    count: 4,
    icon: "📖",
    examples: ["Blok Okuma", "Golgeleme", "Odakli Okuma"],
    theme: {
      border: "border-sky-100 hover:border-sky-200",
      bg: "bg-sky-50/70",
      icon: "bg-sky-100 text-sky-700",
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      button: "bg-sky-600 hover:bg-sky-700",
    },
  },
  {
    id: "focus",
    title: "Odaklanma Calismalari",
    description: "Dikkati surdurme, hedefe odaklanma ve hizli karar verme pratikleri.",
    count: 3,
    icon: "🎯",
    examples: ["Cift Tarafli Odak", "Harf / Rakam Sayma"],
    theme: {
      border: "border-violet-100 hover:border-violet-200",
      bg: "bg-violet-50/70",
      icon: "bg-violet-100 text-violet-700",
      badge: "border-violet-200 bg-violet-50 text-violet-700",
      button: "bg-violet-600 hover:bg-violet-700",
    },
  },
  {
    id: "word-games",
    title: "Kelime Oyunlari",
    description: "Kelime bilgisi, dikkat ve hizli karar verme oyunlari.",
    count: 3,
    icon: "🔤",
    examples: ["Kelime Tahmin", "Ayni Olani Yakala", "Adam Asmaca"],
    theme: {
      border: "border-lime-100 hover:border-lime-200",
      bg: "bg-lime-50/70",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "border-lime-200 bg-lime-50 text-emerald-700",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
  },
  {
    id: "assessment",
    title: "Okuma ve Anlama Testleri",
    description: "Okuma hizini, anlama performansini ve ilerleme hissini birlikte olcer.",
    count: 2,
    icon: "🧠",
    examples: ["Okuma Hizi Testi", "Anlama Testi"],
    theme: {
      border: "border-indigo-100 hover:border-indigo-200",
      bg: "bg-indigo-50/70",
      icon: "bg-indigo-100 text-indigo-700",
      badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
      button: "bg-indigo-600 hover:bg-indigo-700",
    },
  },
  {
    id: "memory",
    title: "Hafiza Teknikleri",
    description: "Gorsel hafiza, eslestirme ve parca-butun algisini guclendiren oyunlu calismalar.",
    count: 3,
    icon: "🧩",
    examples: ["Kart Eslestirme", "Gorsel Puzzle", "Hafiza Gelistirme"],
    theme: {
      border: "border-amber-100 hover:border-amber-200",
      bg: "bg-amber-50/70",
      icon: "bg-amber-100 text-amber-800",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      button: "bg-amber-500 hover:bg-amber-600",
    },
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReadingScore(test: ReadingTestResult | undefined): string {
  if (!test) {
    return "-";
  }

  return `${test.readingSpeedWpm} k/dk`;
}

export function StudentDashboardClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [allResults, setAllResults] = useState<ExerciseResult[]>([]);
  const [readingTests, setReadingTests] = useState<ReadingTestResult[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const currentStudent = getCurrentStudent();
        setStudent(currentStudent);

        const scopedResults = await getExerciseResultsForCurrentUserWithRemote();
        setAllResults(scopedResults.length > 0 ? scopedResults : getExerciseResultsForCurrentUser());
        setReadingTests(getReadingTestsForCurrentUser());
        setIsMounted(true);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const recentResults = useMemo<ExerciseResult[]>(() => allResults.slice(0, 3), [allResults]);
  const recentReadingTests = useMemo<ReadingTestResult[]>(() => readingTests.slice(0, 2), [readingTests]);
  const lastResult = recentResults[0];
  const lastReadingTest = recentReadingTests[0];
  const totalStudyCount = allResults.length + readingTests.length;

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
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Giris Sayfasina Git
        </Link>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-5 rounded-[2rem] bg-slate-50/80 p-1 md:p-2">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">Ogrenci Paneli</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-950 md:text-[34px]">
              Hos geldin, {student.name} 👋
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Bugun kisa bir calisma secerek baslayabilir veya sonuclarini inceleyebilirsin.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {quickLinks.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    index === 0
                      ? "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-red-800"
                      : "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Toplam Calisma</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{totalStudyCount}</p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Son Basari</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{lastResult ? `${lastResult.successRate}%` : "-"}</p>
            </article>
            <article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Son Okuma Hizi</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{formatReadingScore(lastReadingTest)}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm md:flex md:items-center md:justify-between md:gap-5 md:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Bugunun Onerisi</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Dikkatini guclendirmek icin kisa bir odak calismasiyla basla, ardindan metin calismalariyla devam et.
          </p>
        </div>
        <Link
          href={{ pathname: "/egzersizler", query: { category: "focus" } }}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-violet-700 md:mt-0 md:w-auto md:shrink-0"
        >
          Odaklanma Calismalarina Git
        </Link>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight text-slate-950">Calisma Kategorileri</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Dikkat, okuma, hafiza ve anlama calismalarindan birini sec.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {studyCategories.map((category) => (
            <Link
              key={category.id}
              href={{ pathname: "/egzersizler", query: { category: category.id } }}
              className={`group flex min-h-[300px] flex-col rounded-3xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${category.theme.border}`}
            >
              <div className={`rounded-2xl p-3 ${category.theme.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex h-12 min-w-12 items-center justify-center rounded-2xl text-2xl font-extrabold ${category.theme.icon}`}>
                    {category.icon}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${category.theme.badge}`}>
                    {category.count} calisma
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col pt-3">
                <h4 className="text-[18px] font-semibold tracking-tight text-slate-950">{category.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{category.description}</p>
                <ul className="mt-3 grid gap-1.5 text-sm text-slate-700">
                  {category.examples.map((example) => (
                    <li key={example} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${category.theme.icon}`} />
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
                <span
                  className={`mt-auto inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-200 ${category.theme.button}`}
                >
                  Calismaya Git
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div>
          <h3 className="text-[18px] font-semibold text-slate-950">Son Calismalarim</h3>
          {recentResults.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Henuz calisma sonucun yok. Bir egzersiz secerek baslayabilirsin.
            </p>
          ) : (
            <div className="mt-2 grid gap-2.5">
              {recentResults.map((result) => (
                <article key={result.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{result.exerciseTitle}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(result.date)}</p>
                    </div>
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        Puan {result.score}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        {result.successRate}%
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-slate-950">Son Okuma Testim</h3>
          {recentReadingTests.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Henuz okuma testi yok.
            </p>
          ) : (
            <div className="mt-2 grid gap-2.5">
              {recentReadingTests.map((test) => (
                <article key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">{test.textTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(test.date)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                      {test.readingSpeedWpm} k/dk
                    </span>
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700">
                      Anlama {test.comprehensionScore}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
