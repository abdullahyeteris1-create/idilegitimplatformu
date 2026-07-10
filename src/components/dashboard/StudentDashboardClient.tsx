"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PanelCard } from "@/components/ui/PanelCard";
import { getCurrentStudent } from "@/lib/auth/auth";
import { getReadingTestsForCurrentUser, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import {
  getExerciseResultsForCurrentUser,
  getExerciseResultsForCurrentUserWithRemote,
} from "@/lib/results/resultStorage";
import type { ExerciseResult } from "@/lib/results/types";
import type { Student } from "@/lib/students/types";

type IconName =
  | "arrow-right"
  | "book"
  | "check"
  | "clock"
  | "eye"
  | "focus"
  | "layers"
  | "memory"
  | "play"
  | "rocket"
  | "scan"
  | "sparkles"
  | "test"
  | "trophy"
  | "word";

type DashboardCategory = {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: IconName;
  examples: string[];
  theme: {
    card: string;
    wash: string;
    icon: string;
    badge: string;
    dot: string;
    button: string;
  };
};

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  iconClassName: string;
  accentClassName: string;
};

const quickLinks = [
  { href: "/egzersizler", label: "Egzersizlere Başla", icon: "play" as const },
  { href: "/sonuc", label: "Sonuçlarımı Gör", icon: "trophy" as const },
  { href: "/egzersizler/anlama-testi", label: "Okuma Testlerim", icon: "book" as const },
];

const studyCategories: DashboardCategory[] = [
  {
    id: "eye",
    title: "Göz Egzersizleri",
    description: "Göz takibi, kas kontrolü ve göz-beyin koordinasyonunu güçlendiren çalışmalar.",
    count: 2,
    icon: "eye",
    examples: ["Göz Beyin Çalışması", "Göz Kaslarını Geliştirme"],
    theme: {
      card: "border-cyan-100 hover:border-cyan-200 hover:shadow-cyan-100/80",
      wash: "from-blue-50 via-cyan-50 to-white",
      icon: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-200",
      badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
      dot: "bg-cyan-500",
      button: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
    },
  },
  {
    id: "attention",
    title: "Göz Algılama Çalışmaları",
    description: "Görsel algı, hızlı fark etme ve seçici dikkat becerilerini destekleyen çalışmalar.",
    count: 2,
    icon: "scan",
    examples: ["Takistoskop", "Benzer Kelimeler"],
    theme: {
      card: "border-rose-100 hover:border-rose-200 hover:shadow-rose-100/80",
      wash: "from-red-50 via-rose-50 to-white",
      icon: "bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-rose-200",
      badge: "border-rose-200 bg-rose-50 text-rose-800",
      dot: "bg-rose-500",
      button: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
    },
  },
  {
    id: "fluency",
    title: "Metin Çalışmaları",
    description: "Okuma alanını genişleten, metin takibini ve akıcılığı geliştiren çalışmalar.",
    count: 4,
    icon: "book",
    examples: ["Blok Okuma", "Gölgeleme", "Odaklı Okuma", "Kelime Bulma"],
    theme: {
      card: "border-emerald-100 hover:border-emerald-200 hover:shadow-emerald-100/80",
      wash: "from-teal-50 via-emerald-50 to-white",
      icon: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-emerald-200",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
      button: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700",
    },
  },
  {
    id: "focus",
    title: "Odaklanma Çalışmaları",
    description: "Dikkati sürdürme, hedefe odaklanma ve hızlı karar verme becerilerini geliştirir.",
    count: 3,
    icon: "focus",
    examples: ["Çift Taraflı Odak", "Dikkat Labirenti", "Harf / Rakam Sayma"],
    theme: {
      card: "border-violet-100 hover:border-violet-200 hover:shadow-violet-100/80",
      wash: "from-violet-50 via-purple-50 to-white",
      icon: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-200",
      badge: "border-violet-200 bg-violet-50 text-violet-800",
      dot: "bg-violet-500",
      button: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700",
    },
  },
  {
    id: "word-games",
    title: "Kelime Oyunları",
    description: "Kelime bilgisi, dikkat, hafıza ve hızlı karar verme becerilerini destekler.",
    count: 3,
    icon: "word",
    examples: ["Kelime Tahmin", "Aynı Olanı Yakala", "Adam Asmaca"],
    theme: {
      card: "border-amber-100 hover:border-amber-200 hover:shadow-amber-100/80",
      wash: "from-amber-50 via-orange-50 to-white",
      icon: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-200",
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      dot: "bg-amber-500",
      button: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
    },
  },
  {
    id: "assessment",
    title: "Okuma ve Anlama Testleri",
    description: "Okuma hızını, anlama performansını ve çalışma sonuçlarını birlikte değerlendirir.",
    count: 2,
    icon: "test",
    examples: ["Anlama Testi", "Sonuç Özeti"],
    theme: {
      card: "border-indigo-100 hover:border-indigo-200 hover:shadow-indigo-100/80",
      wash: "from-indigo-50 via-blue-50 to-white",
      icon: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-200",
      badge: "border-indigo-200 bg-indigo-50 text-indigo-800",
      dot: "bg-indigo-500",
      button: "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700",
    },
  },
  {
    id: "memory",
    title: "Hafıza Teknikleri",
    description: "Görsel hafıza, eşleştirme ve parça-bütün algısını geliştiren oyunlu çalışmalar.",
    count: 4,
    icon: "memory",
    examples: ["Hafıza Geliştirme", "Kart Eşleştirme", "Kart Hafıza", "Görsel Puzzle"],
    theme: {
      card: "border-fuchsia-100 hover:border-fuchsia-200 hover:shadow-fuchsia-100/80",
      wash: "from-pink-50 via-fuchsia-50 to-white",
      icon: "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-fuchsia-200",
      badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
      dot: "bg-fuchsia-500",
      button: "bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-700 hover:to-fuchsia-700",
    },
  },
];

function safeSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function toTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getReadingResultTitle(result: ExerciseResult): string | null {
  const title = result.details?.textTitle;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function isSameReadingSession(result: ExerciseResult, test: ReadingTestResult): boolean {
  if (result.exerciseType !== "reading-comprehension") {
    return false;
  }

  const completedAt = result.details?.completedAt;
  if (typeof completedAt === "string" && completedAt === test.date) {
    return true;
  }

  const resultTimestamp = toTimestamp(result.date);
  const testTimestamp = toTimestamp(test.date);
  if (resultTimestamp === null || testTimestamp === null || Math.abs(resultTimestamp - testTimestamp) > 10_000) {
    return false;
  }

  const resultTitle = getReadingResultTitle(result);
  return !resultTitle || resultTitle === test.textTitle;
}

function calculateTotalStudySeconds(results: ExerciseResult[], tests: ReadingTestResult[]): number {
  const unmatchedTests = [...tests];
  let totalSeconds = 0;

  results.forEach((result) => {
    const resultSeconds = safeSeconds(result.durationSeconds);

    if (result.exerciseType !== "reading-comprehension") {
      totalSeconds += resultSeconds;
      return;
    }

    const matchingIndex = unmatchedTests.findIndex((test) => isSameReadingSession(result, test));
    if (matchingIndex < 0) {
      totalSeconds += resultSeconds;
      return;
    }

    const [matchingTest] = unmatchedTests.splice(matchingIndex, 1);
    totalSeconds += Math.max(resultSeconds, safeSeconds(matchingTest.readingDurationSeconds));
  });

  return unmatchedTests.reduce(
    (total, test) => total + safeSeconds(test.readingDurationSeconds),
    totalSeconds,
  );
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "Henüz veri yok";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} dk ${seconds} sn` : `${minutes} dk`;
  }

  return `${seconds} sn`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Tarih bilgisi yok";
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatReadingScore(test: ReadingTestResult | undefined): string {
  return test ? `${test.readingSpeedWpm} k/dk` : "Henüz veri yok";
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
  const totalStudySeconds = useMemo(
    () => calculateTotalStudySeconds(allResults, readingTests),
    [allResults, readingTests],
  );
  const lastResult = recentResults[0];
  const lastReadingTest = recentReadingTests[0];

  if (!isMounted) {
    return (
      <PanelCard title="Öğrenci Paneli" subtitle="Bilgiler yükleniyor...">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Panel verileri yükleniyor">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      </PanelCard>
    );
  }

  if (!student) {
    return (
      <PanelCard title="Öğrenci girişi gerekli" subtitle="Devam etmek için öğrenci hesabınla giriş yapmalısın.">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Giriş Sayfasına Git
          <DashboardIcon name="arrow-right" className="h-4 w-4" />
        </Link>
      </PanelCard>
    );
  }

  const completedExerciseValue = allResults.length > 0 ? allResults.length.toLocaleString("tr-TR") : "Henüz veri yok";
  const lastSuccessValue = lastResult ? `%${clampPercentage(lastResult.successRate)}` : "Henüz veri yok";

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_30%),linear-gradient(to_bottom,#fff7f7,#f8fafc)]">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 md:space-y-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-red-600 via-rose-600 to-orange-500 px-5 py-6 text-white shadow-xl shadow-red-200/60 md:px-8 md:py-8">
          <div aria-hidden="true" className="absolute -left-20 -top-20 h-52 w-52 rounded-full border-[28px] border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-amber-300/20 blur-2xl" />
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-white/10" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)] lg:items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-red-50 backdrop-blur-sm">
                <DashboardIcon name="sparkles" className="h-4 w-4" />
                Öğrenci Paneli
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">
                Hoş geldin, {student.name}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-red-50 md:text-base">
                Her çalışma hızına, odağına ve okuma gücüne yeni bir adım ekler. Bugünkü ilerlemeni başlatmaya hazır mısın?
              </p>

              {student.classLevel ? (
                <p className="mt-3 inline-flex rounded-full border border-white/20 bg-black/10 px-3 py-1 text-xs font-semibold text-white/90">
                  Sınıf düzeyi: {student.classLevel}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {quickLinks.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      index === 0
                        ? "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-red-700 shadow-lg shadow-red-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50"
                        : "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                    }
                  >
                    <DashboardIcon name={item.icon} className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div aria-hidden="true" className="relative hidden min-h-52 items-center justify-center lg:flex">
              <div className="absolute h-48 w-48 rounded-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md" />
              <div className="absolute h-36 w-36 rounded-full border border-white/30 bg-white/10" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white text-red-600 shadow-2xl shadow-red-950/20 rotate-3">
                <DashboardIcon name="rocket" className="h-12 w-12 -rotate-3" />
              </div>
              <span className="absolute left-2 top-5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-md">Odak</span>
              <span className="absolute bottom-6 right-1 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-md">Anlama</span>
              <span className="absolute right-2 top-8 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-md">Hız</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="dashboard-stats-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-red-700">İlerleme Özeti</p>
              <h3 id="dashboard-stats-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">Gerçek çalışma verilerin</h3>
            </div>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">Kayıtlı sonuçlarına göre güncellenir</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tamamlanan Çalışma"
              value={completedExerciseValue}
              detail={allResults.length > 0 ? "Kaydedilen egzersiz sonucu" : "İlk çalışmanı tamamla"}
              icon="check"
              iconClassName="bg-emerald-100 text-emerald-700"
              accentClassName="from-emerald-500 to-teal-500"
            />
            <StatCard
              label="Toplam Çalışma Süresi"
              value={formatDuration(totalStudySeconds)}
              detail={totalStudySeconds > 0 ? "Egzersiz ve okuma kayıtları" : "Henüz süre kaydı bulunmuyor"}
              icon="clock"
              iconClassName="bg-blue-100 text-blue-700"
              accentClassName="from-blue-500 to-cyan-500"
            />
            <StatCard
              label="Son Başarı Oranı"
              value={lastSuccessValue}
              detail={lastResult ? lastResult.exerciseTitle : "İlk sonucunu oluştur"}
              icon="trophy"
              iconClassName="bg-amber-100 text-amber-700"
              accentClassName="from-amber-500 to-orange-500"
            />
            <StatCard
              label="Güncel Seri / Seviye"
              value="Veri yok"
              detail="Seri veya seviye kaydı bulunmuyor"
              icon="layers"
              iconClassName="bg-violet-100 text-violet-700"
              accentClassName="from-violet-500 to-fuchsia-500"
            />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-5 text-white shadow-lg shadow-violet-200/50 md:px-6">
          <div aria-hidden="true" className="absolute -right-12 -top-20 h-56 w-56 rounded-full border-[30px] border-white/10" />
          <div aria-hidden="true" className="absolute bottom-0 right-40 h-24 w-24 rounded-full bg-pink-300/20 blur-xl" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
                <DashboardIcon name="sparkles" className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-violet-100">Bugünün Önerisi</p>
                <h3 className="mt-1 text-lg font-black tracking-tight md:text-xl">Kısa bir odak çalışmasıyla başla</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-violet-50">
                  Dikkatini ısıttıktan sonra bir metin çalışması seçerek okuma ritmini güçlendirebilirsin.
                </p>
              </div>
            </div>
            <Link
              href={{ pathname: "/egzersizler", query: { category: "focus" } }}
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-violet-700 shadow-lg shadow-violet-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-50 md:w-auto"
            >
              Çalışmaya Başla
              <DashboardIcon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="study-categories-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-red-700">Kendine Uygun Çalışmayı Seç</p>
              <h3 id="study-categories-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Egzersiz kategorileri</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Göz, dikkat, okuma ve hafıza becerilerini adım adım geliştir.</p>
            </div>
            <Link href="/egzersizler" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50">
              Tümünü Gör
              <DashboardIcon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {studyCategories.map((category) => (
              <Link
                key={category.id}
                href={{ pathname: "/egzersizler", query: { category: category.id } }}
                className={`group relative flex min-h-[270px] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${category.theme.card}`}
              >
                <div className={`relative border-b border-white/80 bg-gradient-to-br px-4 py-4 ${category.theme.wash}`}>
                  <div aria-hidden="true" className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/70" />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${category.theme.icon}`}>
                      <DashboardIcon name={category.icon} className="h-6 w-6" />
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${category.theme.badge}`}>
                      {category.count} çalışma
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h4 className="text-[18px] font-black tracking-tight text-slate-950">{category.title}</h4>
                  <p className="mt-1.5 text-sm leading-5 text-slate-600">{category.description}</p>
                  <ul className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-600">
                    {category.examples.slice(0, 2).map((example) => (
                      <li key={example} className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${category.theme.dot}`} />
                        <span>{example}</span>
                      </li>
                    ))}
                    {category.examples.length > 2 ? (
                      <li className="pl-3.5 text-slate-400">+{category.examples.length - 2} çalışma daha</li>
                    ) : null}
                  </ul>
                  <span className={`mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-all duration-300 group-hover:shadow-md ${category.theme.button}`}>
                    Çalışmaları Gör
                    <DashboardIcon name="arrow-right" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">İlerleme Geçmişi</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Son çalışmalarım</h3>
              </div>
              <Link href="/sonuc" className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                Tüm sonuçlar
                <DashboardIcon name="arrow-right" className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentResults.length === 0 ? (
              <EmptyState
                icon="rocket"
                title="Henüz çalışma sonucun yok"
                description="İlk egzersizini tamamladığında puanın ve başarı oranın burada görünecek."
                href="/egzersizler"
                actionLabel="İlk Çalışmayı Başlat"
              />
            ) : (
              <div className="mt-4 grid gap-3">
                {recentResults.map((result) => {
                  const successRate = clampPercentage(result.successRate);

                  return (
                    <article key={result.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-300 hover:border-emerald-200 hover:bg-white hover:shadow-md">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-950">{result.exerciseTitle}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(result.date)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2 text-xs font-extrabold">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">Puan {result.score}</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">%{successRate}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>Başarı</span>
                          <span>%{successRate}</span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-200"
                          role="progressbar"
                          aria-label={`${result.exerciseTitle} başarı oranı`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={successRate}
                        >
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-500" style={{ width: `${successRate}%` }} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-700">Okuma Performansı</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Son okuma testim</h3>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <DashboardIcon name="book" className="h-5 w-5" />
              </span>
            </div>

            {recentReadingTests.length === 0 ? (
              <EmptyState
                icon="book"
                title="Henüz okuma testi yok"
                description="Bir anlama testi tamamlayarak okuma hızını ve anlama oranını ölçebilirsin."
                href="/egzersizler/anlama-testi"
                actionLabel="Okuma Testine Başla"
              />
            ) : (
              <div className="mt-4 grid gap-3">
                {recentReadingTests.map((test) => {
                  const comprehensionScore = clampPercentage(test.comprehensionScore);

                  return (
                    <article key={test.id} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 transition-all duration-300 hover:border-indigo-200 hover:shadow-md">
                      <p className="text-sm font-extrabold text-slate-950">{test.textTitle}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(test.date)}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-extrabold">
                        <span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-2 text-center text-blue-700">{test.readingSpeedWpm} k/dk</span>
                        <span className="rounded-xl border border-indigo-200 bg-indigo-100/70 px-2.5 py-2 text-center text-indigo-700">Anlama %{comprehensionScore}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label={`${test.textTitle} anlama oranı`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={comprehensionScore}>
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500" style={{ width: `${comprehensionScore}%` }} />
                      </div>
                    </article>
                  );
                })}
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500">
                  Son okuma hızı: <span className="font-extrabold text-slate-800">{formatReadingScore(lastReadingTest)}</span>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, icon, iconClassName, accentClassName }: StatCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClassName}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-black tracking-tight text-slate-950 md:text-2xl">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          <DashboardIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 truncate text-xs font-medium text-slate-500" title={detail}>{detail}</p>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm ring-1 ring-slate-200">
        <DashboardIcon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
      <Link href={href} className="mt-4 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-red-800">
        {actionLabel}
        <DashboardIcon name="arrow-right" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function DashboardIcon({ name, className }: { name: IconName; className: string }): ReactNode {
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "arrow-right":
      return <svg {...commonProps}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "book":
      return <svg {...commonProps}><path d="M4 5.5A2.5 2.5 0 016.5 3H11v16H6.5A2.5 2.5 0 004 21.5v-16zM20 5.5A2.5 2.5 0 0017.5 3H13v16h4.5a2.5 2.5 0 012.5 2.5v-16z" /></svg>;
    case "check":
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>;
    case "clock":
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
    case "eye":
      return <svg {...commonProps}><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "focus":
      return <svg {...commonProps}><circle cx="12" cy="12" r="4" /><path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4" /></svg>;
    case "layers":
      return <svg {...commonProps}><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3zM4 12l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" /></svg>;
    case "memory":
      return <svg {...commonProps}><path d="M9.5 4.5A3 3 0 006 7.4 3.5 3.5 0 004.5 14a3.5 3.5 0 004.8 3.3V20M14.5 4.5A3 3 0 0118 7.4a3.5 3.5 0 011.5 6.6 3.5 3.5 0 01-4.8 3.3V20M12 4v16M8.5 9.5H12M12 14.5h3.5" /></svg>;
    case "play":
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8z" /></svg>;
    case "rocket":
      return <svg {...commonProps}><path d="M14 5c2.4-2.4 5.8-2 5.8-2s.4 3.4-2 5.8l-5.5 5.5-4-4L14 5z" /><path d="m9 10-4.2.8L3 12.6l4.4 1M14 15l-.8 4.2-1.8 1.8-1-4.4M15.5 7.5h.01M6 18l-2 2M5 15l-2 2" /></svg>;
    case "scan":
      return <svg {...commonProps}><path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4M7 12h10" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "sparkles":
      return <svg {...commonProps}><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3zM18.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2zM6 13.5l.7 1.8 1.8.7-1.8.7L6 18.5l-.7-1.8-1.8-.7 1.8-.7.7-1.8z" /></svg>;
    case "test":
      return <svg {...commonProps}><path d="M8 4h8M9 3v3h6V3M7 5H5.5A1.5 1.5 0 004 6.5v13A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0018.5 5H17M8 11h8M8 15h5" /></svg>;
    case "trophy":
      return <svg {...commonProps}><path d="M8 4h8v4a4 4 0 01-8 0V4zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 12v5M8 21h8M9 17h6v4" /></svg>;
    case "word":
      return <svg {...commonProps}><path d="M4 19 9.5 5h2L17 19M6 14h9M18 6h2M19 5v10M17 15h4" /></svg>;
  }
}
