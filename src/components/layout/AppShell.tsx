import Link from "next/link";
import type { ReactNode } from "react";
import { RoleAwareNav } from "@/components/auth/RoleAwareNav";

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
  const hasHomeNav = navItems.some((item) => item.href === "/");
  const hasVibrantStudentHeader = headerVariant === "student-vibrant";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] pb-8">
      <div className={wide ? "mx-auto w-full max-w-[1500px] px-3 py-3 md:w-[calc(100%_-_32px)] md:px-4 md:py-4" : "idil-shell"}>
        <header
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
    </div>
  );
}
