"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { AccentPicker } from "@/components/theme/AccentPicker";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { getResolvedCurrentUser, type CurrentUser } from "@/lib/auth/auth";
import { LoginForm } from "@/components/auth/LoginForm";

const FEATURE_PILLS = [
  { title: "Okuma akiciligini artir", tone: "violet" },
  { title: "Anlama becerini guclendir", tone: "amber" },
  { title: "Kisisel gelisimi takip et", tone: "blue" },
  { title: "Guvenli veri korumali", tone: "green" },
];

const HERO_STATS = [
  { label: "Aktif Ogrenci", value: "50K+" },
  { label: "Egzersiz ve Test", value: "1.200+" },
  { label: "Tamamlanan Calisma", value: "2.5M+" },
  { label: "Basari Orani", value: "%92" },
];

export function PortalLoginPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentUser(getResolvedCurrentUser());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const homeHref = currentUser?.role === "teacher" ? "/ogretmen" : "/ogrenci";
  const homeLabel = currentUser?.role === "teacher" ? "Ogretmen Paneline Git" : "Ogrenci Paneline Git";

  return (
    <IdilThemeProvider className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <main className="relative isolate min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(56,189,248,0.2),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(168,85,247,0.2),transparent_32%),#030712] px-4 py-5 md:px-6 md:py-7">
        <div className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-[30px] border border-slate-800/80 bg-[linear-gradient(140deg,#020617_0%,#060b1f_44%,#090f2a_100%)] shadow-[0_40px_120px_rgba(2,6,23,0.7)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 px-6 py-4 lg:px-8">
            <div className="inline-flex items-center gap-3">
              <Image src="/logo-idil.png" alt="Idil Hizli Okuma logosu" width={180} height={54} className="h-10 w-auto" priority />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Egitim Platformu</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeSwitcher />
              <div className="hidden md:block">
                <AccentPicker />
              </div>
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/50 text-sm font-bold text-violet-200">DE</span>
                <div>
                  <p className="text-sm font-bold text-slate-100">Demo Ogrenci</p>
                  <p className="text-xs text-slate-400">7. Sinif</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
            <section className="relative border-b border-slate-800/70 p-6 lg:border-b-0 lg:border-r lg:p-10">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_55%_35%,rgba(99,102,241,0.22),transparent_42%),radial-gradient(circle_at_26%_80%,rgba(236,72,153,0.18),transparent_34%)]" />

              <div className="relative z-10">
                <p className="text-[clamp(2rem,3.2vw,3.1rem)] font-extrabold tracking-[-0.03em] text-red-500">Idil Hizli Okuma</p>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                  Hizli Oku, Daha Fazlasini Anla
                </p>
                <h1 className="mt-4 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-400 bg-clip-text text-[clamp(2.45rem,4.9vw,4.35rem)] font-black leading-[0.96] tracking-[-0.04em] text-transparent md:whitespace-nowrap">
                  Hos geldin.
                </h1>
                <p className="mt-3 max-w-[30ch] text-[clamp(1.15rem,1.95vw,1.7rem)] font-semibold leading-[1.24] tracking-[-0.015em] text-slate-100">
                  Ogrenci ve ogretmenler icin hizli okuma egzersiz platformu.
                </p>

                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {FEATURE_PILLS.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/55 px-4 py-3 text-sm font-medium tracking-[-0.01em] text-slate-200">
                      {item.title}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-[26px] border border-slate-700/60 bg-slate-900/45 p-6">
                  <div className="relative mx-auto h-72 max-w-[560px] overflow-hidden rounded-[24px] border border-violet-400/20 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.22),transparent_52%),radial-gradient(circle_at_28%_78%,rgba(59,130,246,0.2),transparent_46%),#0b1024]">
                    <Image src="/logo-idil.png" alt="Idil Hizli Okuma logosu" width={680} height={200} className="absolute left-1/2 top-1/2 h-auto w-[78%] -translate-x-1/2 -translate-y-1/2 object-contain" priority />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[22px] border border-slate-700/70 bg-slate-950/55 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
                  {HERO_STATS.map((item) => (
                    <div key={item.label}>
                      <p className="text-[clamp(1.8rem,2.7vw,2.35rem)] font-black leading-none tracking-[-0.03em] text-slate-100">{item.value}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>

                {currentUser ? (
                  <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-slate-600/80 bg-slate-900/60 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-200">Aktif oturum bulundu.</p>
                    <Link
                      href={homeHref}
                      className="inline-flex min-h-[40px] items-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white"
                    >
                      {homeLabel}
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="relative p-5 md:p-7 lg:p-8">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.14),transparent_38%),radial-gradient(circle_at_80%_15%,rgba(249,115,22,0.16),transparent_34%)]" />

              <div className="relative z-10 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="rounded-[22px] border border-violet-500/20 bg-slate-900/60 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-indigo-500/30 text-violet-100 ring-1 ring-violet-400/30">
                        <StudentIcon />
                      </span>
                      <div>
                        <p className="text-2xl font-black text-slate-100">Ogrenci Girisi</p>
                        <p className="mt-2 text-sm leading-6 tracking-[-0.01em] text-slate-300">Kendi egzersizlerine, sonuclarina ve okuma testlerine hizli erisim.</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-12 rounded-full bg-violet-400" />
                  </article>
                  <article className="rounded-[22px] border border-amber-500/20 bg-slate-900/60 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/40 to-orange-500/30 text-amber-100 ring-1 ring-amber-400/30">
                        <TeacherIcon />
                      </span>
                      <div>
                        <p className="text-2xl font-black text-slate-100">Ogretmen Girisi</p>
                        <p className="mt-2 text-sm leading-6 tracking-[-0.01em] text-slate-300">Ogrenci takibi, icerik yonetimi ve raporlama tek ekranda.</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-12 rounded-full bg-amber-400" />
                  </article>
                </div>

                <article className="rounded-[22px] border border-emerald-500/20 bg-slate-900/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/35 to-lime-500/25 text-emerald-100 ring-1 ring-emerald-400/30">
                      <ShieldIcon />
                    </span>
                    <div>
                      <p className="text-2xl font-black text-slate-100">Kisisel ve Guvenli</p>
                      <p className="mt-2 text-sm leading-6 tracking-[-0.01em] text-slate-300">Yonetici girisi guvenli oturum ile korunur, ogrenci girisi mevcut sistemle devam eder.</p>
                    </div>
                  </div>
                </article>

                <div className="rounded-[24px] border border-slate-700/70 bg-slate-900/50 p-3 md:p-4">
                  <Suspense
                    fallback={
                      <section className="rounded-[20px] border border-slate-700/60 bg-slate-900/55 p-4 text-sm text-slate-300">
                        Giris formu yukleniyor...
                      </section>
                    }
                  >
                    <LoginForm />
                  </Suspense>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </IdilThemeProvider>
  );
}

function StudentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5 12 4l8 4.5L12 13 4 8.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.2v3.1c0 1 2.2 2.2 5 2.2s5-1.1 5-2.2v-3.1" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="8" r="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 18a4.5 4.5 0 0 1 9 0M13 17.5a3.7 3.7 0 0 1 7.4 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5.5 6v5.2c0 4 2.7 7.7 6.5 9.8 3.8-2 6.5-5.7 6.5-9.8V6L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.2 12.3 2 2 3.6-3.9" />
    </svg>
  );
}