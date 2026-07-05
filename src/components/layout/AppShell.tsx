import Link from "next/link";
import type { ReactNode } from "react";

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
  return (
    <div className="min-h-screen bg-[var(--background)] pb-8">
      <div className={wide ? "mx-auto w-full max-w-[1536px] px-3 py-3 md:w-[calc(100%_-_48px)] md:px-6 md:py-4" : "idil-shell"}>
        <header className={`idil-card ${compactHeader ? "p-3 md:p-4" : "p-5 md:p-7"}`}>
          <div className={`flex flex-col md:flex-row md:items-end md:justify-between ${compactHeader ? "gap-2" : "gap-4"}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--brand)]">Idil Hizli Okuma</p>
              <h1 className={`${compactHeader ? "mt-1 text-xl md:text-3xl" : "mt-2 text-2xl md:text-4xl"} font-bold`}>{title}</h1>
              <p className={`${compactHeader ? "mt-0.5 text-xs md:text-sm" : "mt-1 text-sm md:text-base"} text-[var(--muted)]`}>{subtitle}</p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-[40px] w-fit items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
            >
              Ana Sayfa
            </Link>
          </div>
          <nav className={`${compactHeader ? "mt-3" : "mt-5"} grid grid-cols-2 gap-2 sm:flex sm:flex-wrap`}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="min-h-[38px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-800 transition hover:bg-red-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className={`${compactHeader ? "mt-3 gap-3" : "mt-5 gap-5"} flex flex-col`}>{children}</main>
      </div>
    </div>
  );
}
