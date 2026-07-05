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
};

export function AppShell({ title, subtitle, navItems, children, compactHeader = false, wide = false }: AppShellProps) {
  const hasHomeNav = navItems.some((item) => item.href === "/");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] pb-8">
      <div className={wide ? "mx-auto w-full max-w-[1500px] px-3 py-3 md:w-[calc(100%_-_32px)] md:px-4 md:py-4" : "idil-shell"}>
        <header className={`idil-card relative overflow-hidden ${compactHeader ? "p-2.5 md:p-3" : "p-3.5 md:p-4"}`}>
          <div className={`relative z-10 flex flex-col gap-2 md:flex-row md:items-start md:justify-between ${compactHeader ? "" : ""}`}>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Idil Hizli Okuma</p>
              <h1 className={`${compactHeader ? "mt-0.5 text-[24px] md:text-[28px]" : "mt-0.5 text-[26px] md:text-[30px]"} max-w-4xl font-semibold tracking-tight text-slate-950`}>
                {title}
              </h1>
              <p className={`${compactHeader ? "mt-0.5 text-[12px] md:text-sm" : "mt-0.5 text-[13px] md:text-sm"} max-w-3xl leading-5 text-[var(--muted)]`}>
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

          <RoleAwareNav fallbackItems={navItems} compactHeader={compactHeader} />
        </header>
        <main className={`${compactHeader ? "mt-3 gap-3" : "mt-4 gap-4"} flex flex-col`}>{children}</main>
      </div>
    </div>
  );
}
