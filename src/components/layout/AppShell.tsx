"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { RoleAwareNav } from "@/components/auth/RoleAwareNav";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { clearCurrentUser, getResolvedCurrentUser } from "@/lib/auth/auth";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
  compactHeader?: boolean;
  wide?: boolean;
  headerVariant?: "default" | "student-vibrant";
};

export function AppShell({
  title,
  subtitle,
  navItems,
  children,
  compactHeader = false,
  wide = false,
  headerVariant = "default",
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasTeacherNavigation = navItems.some((item) => item.href.startsWith("/ogretmen"));
  const teacherUsername = useMemo(() => {
    const user = getResolvedCurrentUser();
    if (user?.role === "teacher" && user.username.trim()) {
      return user.username.trim();
    }

    return "Ogretmen";
  }, []);

  const isTeacherItemActive = (href: string): boolean => {
    const baseHref = href.split(/[?#]/)[0];

    if (baseHref === "/ogretmen") {
      return pathname === "/ogretmen";
    }

    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  };

  const handleTeacherLogout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    clearCurrentUser();
    router.replace("/giris");
  };

  const quickActionHref = useMemo(() => {
    if (pathname === "/ogretmen/idil-panel/ders-kayitlari") {
      return "/ogretmen/idil-panel/ogrenci-takip";
    }

    return "/ogretmen/idil-panel/ders-kayitlari";
  }, [pathname]);

  const quickActionLabel = pathname === "/ogretmen/idil-panel/ders-kayitlari" ? "Ogrenciler" : "Ders Kaydi";

  if (hasTeacherNavigation) {
    return (
      <IdilThemeProvider className="min-h-screen bg-[var(--background)] text-slate-900">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.1),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900 [data-idil-theme=dark]:bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.12),transparent_36%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] [data-idil-theme=dark]:text-slate-100">
          <div className="mx-auto flex w-full max-w-[1900px] gap-3 p-3 md:gap-4 md:p-4">
            <aside className="sticky top-4 hidden h-[calc(100vh-32px)] w-[248px] shrink-0 overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_56%,#111827_100%)] p-3 text-slate-100 shadow-xl lg:flex lg:flex-col">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Idil</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Egitim Platformu</h2>
              </div>

              <nav className="mt-3 flex-1 overflow-y-auto pr-1" aria-label="Ogretmen menusu">
                <ul className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = isTeacherItemActive(item.href);

                    return (
                      <li key={`${item.href}-${item.label}`}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? "bg-[var(--brand)] text-white shadow-[0_10px_20px_rgba(220,38,38,0.32)]"
                              : "text-slate-200 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span aria-hidden="true" className="text-xs opacity-70">•</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <ThemeSwitcher />
                <button
                  type="button"
                  onClick={() => void handleTeacherLogout()}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/30"
                >
                  Cikis Yap
                </button>
              </div>
            </aside>

            {isMobileMenuOpen ? (
              <div
                className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
              />
            ) : null}

            <aside
              className={`fixed inset-y-0 left-0 z-50 w-[248px] border-r border-slate-800 bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_56%,#111827_100%)] p-3 text-slate-100 shadow-2xl transition-transform lg:hidden ${
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              aria-label="Mobil ogretmen menusu"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Idil</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Egitim Platformu</h2>
              </div>

              <nav className="mt-3 overflow-y-auto" aria-label="Ogretmen menusu mobil">
                <ul className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = isTeacherItemActive(item.href);

                    return (
                      <li key={`mobile-${item.href}-${item.label}`}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                            isActive ? "bg-[var(--brand)] text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <ThemeSwitcher />
                <button
                  type="button"
                  onClick={() => void handleTeacherLogout()}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100"
                >
                  Cikis Yap
                </button>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm backdrop-blur [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/92">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100"
                        aria-label="Menuyu ac"
                      >
                        <span aria-hidden="true">☰</span>
                      </button>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Ogretmen Alani</p>
                    </div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50 md:text-[30px]">{title}</h1>
                    <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">{subtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <ThemeSwitcher />
                    <Link
                      href={quickActionHref}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 [data-idil-theme=dark]:border-red-400/50 [data-idil-theme=dark]:bg-red-500/20 [data-idil-theme=dark]:text-red-100"
                    >
                      {quickActionLabel}
                    </Link>
                    <div className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200">
                      {teacherUsername}
                    </div>
                  </div>
                </div>
              </header>
              <main className={`${compactHeader ? "mt-3 gap-3" : "mt-4 gap-4"} flex min-w-0 flex-col`}>{children}</main>
            </div>
          </div>
        </div>
      </IdilThemeProvider>
    );
  }

  const hasHomeNav = navItems.some((item) => item.href === "/");
  const hasVibrantStudentHeader = headerVariant === "student-vibrant";
  const shellClassName = hasVibrantStudentHeader
    ? "min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(168,85,247,0.16),transparent_32%),var(--idil-page-bg)] pb-8 text-[var(--idil-text)]"
    : "min-h-screen overflow-x-hidden bg-[var(--background)] pb-8";

  return (
    <IdilThemeProvider className={shellClassName}>
      <div className={wide ? "mx-auto w-full max-w-[1500px] px-3 py-3 md:w-[calc(100%_-_32px)] md:px-4 md:py-4" : "idil-shell"}>
        <header
          data-app-shell-header
          className={
            hasVibrantStudentHeader
              ? "relative overflow-hidden rounded-[28px] border border-red-200/40 bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_38%,#f43f5e_68%,#f97316_100%)] px-5 py-5 text-white shadow-[0_20px_60px_rgba(185,28,28,0.24)] md:px-7"
              : `idil-card relative overflow-hidden ${compactHeader ? "p-2.5 md:p-3" : "p-3.5 md:p-4"}`
          }
        >
          {hasVibrantStudentHeader ? (
            <>
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-orange-300/20 blur-2xl" />
              <div className="pointer-events-none absolute right-1/3 top-0 h-28 w-28 rounded-full bg-pink-300/10 blur-2xl" />
            </>
          ) : null}

          <div
            className={
              hasVibrantStudentHeader
                ? "relative z-10"
                : "relative z-10 flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
            }
          >
            <div className="min-w-0">
              <p
                className={
                  hasVibrantStudentHeader
                    ? "text-xs font-black uppercase tracking-[0.22em] text-red-100"
                    : "text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand)]"
                }
              >
                {hasVibrantStudentHeader ? "İdil Hızlı Okuma" : "Idil Hizli Okuma"}
              </p>
              <h1
                className={
                  hasVibrantStudentHeader
                    ? "mt-1 max-w-4xl text-2xl font-black tracking-tight text-white md:text-3xl"
                    : `${compactHeader ? "mt-0.5 text-[24px] md:text-[28px]" : "mt-0.5 text-[26px] md:text-[30px]"} max-w-4xl font-semibold tracking-tight text-slate-950`
                }
              >
                {title}
              </h1>
              <p
                className={
                  hasVibrantStudentHeader
                    ? "mt-1 max-w-3xl text-sm leading-5 text-red-50/90"
                    : `${compactHeader ? "mt-0.5 text-[12px] md:text-sm" : "mt-0.5 text-[13px] md:text-sm"} max-w-3xl leading-5 text-[var(--muted)]`
                }
              >
                {subtitle}
              </p>
            </div>
            {!hasHomeNav ? (
              <Link
                href="/"
                className="inline-flex min-h-[38px] w-fit shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-50"
              >
                Ana Sayfa
              </Link>
            ) : null}
          </div>

          <RoleAwareNav
            fallbackItems={navItems}
            compactHeader={compactHeader}
            variant={hasVibrantStudentHeader ? "vibrant" : "default"}
          />
        </header>
        <main className={`${compactHeader ? "mt-3 gap-3" : "mt-4 gap-4"} flex flex-col`}>{children}</main>
      </div>
    </IdilThemeProvider>
  );
}
