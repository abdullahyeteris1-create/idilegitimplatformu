"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getResolvedCurrentUser, type CurrentUser } from "@/lib/auth/auth";
import { LoginForm } from "@/components/auth/LoginForm";

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
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#7f1d1d_0%,#991b1b_28%,#f8fafc_28%,#f8fafc_100%)]">
      <section className="relative isolate overflow-hidden px-4 pb-28 pt-10 text-white md:px-6 lg:pb-32">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32rem)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(127,29,29,0.96)_0%,rgba(185,28,28,0.92)_48%,rgba(245,158,11,0.84)_120%)]" />
        <div aria-hidden="true" className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="absolute right-0 top-10 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-red-100">Idil Hizli Okuma</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
              Idil Hizli Okuma
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-red-50 md:text-lg">
              Ogrenci ve ogretmenler icin hizli okuma egzersiz platformu.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "Okuma akiciligi",
                "Kendi sonuclarin",
                "Kurum yonetimi",
                "Mobil uyumlu arayuz",
              ].map((item) => (
                <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white/95 backdrop-blur-sm">
                  {item}
                </span>
              ))}
            </div>

            {currentUser ? (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-100">Aktif oturum</p>
                  <p className="text-sm font-bold text-white">
                    {currentUser.role === "teacher" ? "Ogretmen hesabi" : currentUser.studentName ?? "Ogrenci hesabi"}
                  </p>
                </div>
                <Link
                  href={homeHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-bold text-red-800 transition duration-200 hover:bg-red-50"
                >
                  {homeLabel}
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="rounded-[2rem] border border-white/15 bg-white/12 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">Ogrenci girisi</p>
                <p className="mt-2 text-sm leading-6 text-red-50">
                  Kendi egzersizlerine, sonuclarina ve okuma testlerine hizli erisim.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">Ogretmen girisi</p>
                <p className="mt-2 text-sm leading-6 text-red-50">
                  Ogrenci takibi, icerik yonetimi ve raporlama tek ekranda.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/10 p-4 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">Kisa not</p>
                <p className="mt-2 text-sm leading-6 text-red-50">
                  Gecici test hesabi ile giris yapabilir, rol bazli arayuzu hemen deneyebilirsin.
                </p>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative z-10 -mt-20 px-4 pb-12 md:px-6">
        <div className="mx-auto flex max-w-[520px] justify-center">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}