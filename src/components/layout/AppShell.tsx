"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { RoleAwareNav } from "@/components/auth/RoleAwareNav";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { Icon, type IconName } from "@/components/student-panel-preview/icons";
import { TEACHER_NAV_GROUPS, type TeacherNavGroup } from "@/lib/constants/teacherNavigation";
import { clearCurrentUser, getResolvedCurrentUser } from "@/lib/auth/auth";

const TEACHER_USERNAME_FALLBACK = "Öğretmen";

function subscribeToStoredUser(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readTeacherUsername(): string {
  const user = getResolvedCurrentUser();
  return user?.role === "teacher" && user.username.trim() ? user.username.trim() : TEACHER_USERNAME_FALLBACK;
}

function readTeacherUsernameOnServer(): string {
  return TEACHER_USERNAME_FALLBACK;
}

type NavItem = { href: string; label: string };

type AppShellProps = {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
  compactHeader?: boolean;
  wide?: boolean;
  headerVariant?: "default" | "student-vibrant";
};

function TeacherBrand() {
  return (
    <div className="teacher-brand">
      <div className="teacher-brand-mark" aria-hidden="true"><Icon name="eye" className="h-5 w-5" /></div>
      <div><strong>İDİL</strong><span>Eğitim Platformu</span></div>
    </div>
  );
}

function TeacherNavigation({ groups, isActive, onNavigate }: { groups: TeacherNavGroup[]; isActive: (href: string) => boolean; onNavigate?: () => void }) {
  return (
    <nav className="teacher-navigation" aria-label="Öğretmen menüsü">
      {groups.map((group) => (
        <div key={group.label} className="teacher-nav-group">
          <p className="teacher-nav-group-label">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`teacher-nav-link ${active ? "is-active" : ""}`}>
                    <Icon name={item.icon as IconName} className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TeacherSidebarFooter({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="teacher-sidebar-footer">
      <ThemeSwitcher />
      <button type="button" onClick={() => void onLogout()} className="teacher-logout-button">
        <Icon name="arrow" className="h-4 w-4 rotate-180" />
        Çıkış Yap
      </button>
    </div>
  );
}

export function AppShell({ title, subtitle, navItems, children, compactHeader = false, wide = false, headerVariant = "default" }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerCloseRef = useRef<HTMLButtonElement>(null);
  const hasTeacherNavigation = navItems.some((item) => item.href.startsWith("/ogretmen"));
  const teacherUsername = useSyncExternalStore(subscribeToStoredUser, readTeacherUsername, readTeacherUsernameOnServer);

  const isTeacherItemActive = (href: string): boolean => {
    const baseHref = href.split(/[?#]/)[0];
    if (baseHref === "/ogretmen") return pathname === "/ogretmen";
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  };

  const handleTeacherLogout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    clearCurrentUser();
    router.replace("/giris");
  };

  const quickActionHref = useMemo(() => pathname === "/ogretmen/idil-panel/ders-kayitlari" ? "/ogretmen/idil-panel/ogrenci-takip" : "/ogretmen/idil-panel/ders-kayitlari", [pathname]);
  const quickActionLabel = pathname === "/ogretmen/idil-panel/ders-kayitlari" ? "Öğrenciler" : "Ders Kaydı";
  const teacherNavGroups = useMemo(() => {
    const availableHrefs = new Set(navItems.map((item) => item.href));
    return TEACHER_NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => availableHrefs.has(item.href)) })).filter((group) => group.items.length > 0);
  }, [navItems]);
  const activeTeacherItem = teacherNavGroups.flatMap((group) => group.items).find((item) => isTeacherItemActive(item.href));

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    mobileDrawerCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    mobileMenuButtonRef.current?.focus();
  };

  if (hasTeacherNavigation) {
    return (
      <IdilThemeProvider className="teacher-shell min-h-screen bg-[var(--teacher-background)] text-[var(--teacher-text-primary)]">
        <div className="min-h-screen bg-[var(--teacher-background)]">
          <a href="#teacher-main" className="teacher-skip-link">İçeriğe geç</a>
          <div className="mx-auto flex w-full max-w-[1600px] gap-4 p-3 md:p-4 lg:gap-6">
            <aside className="teacher-sidebar sticky top-4 hidden h-[calc(100vh-32px)] w-64 shrink-0 overflow-hidden lg:flex lg:flex-col" aria-label="Öğretmen paneli menüsü">
              <TeacherBrand />
              <TeacherNavigation groups={teacherNavGroups} isActive={isTeacherItemActive} />
              <TeacherSidebarFooter onLogout={handleTeacherLogout} />
            </aside>

            {isMobileMenuOpen ? <button type="button" className="teacher-drawer-backdrop fixed inset-0 z-40 lg:hidden" aria-label="Menüyü kapat" onClick={closeMobileMenu} /> : null}
            <aside id="teacher-mobile-navigation" className={`teacher-sidebar teacher-sidebar-mobile fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100vw-32px)] overflow-y-auto p-4 lg:hidden ${isMobileMenuOpen ? "is-open" : ""}`} aria-label="Mobil öğretmen paneli menüsü" aria-hidden={!isMobileMenuOpen}>
              <div className="flex items-start justify-between gap-3">
                <TeacherBrand />
                <button ref={mobileDrawerCloseRef} type="button" className="teacher-icon-button" aria-label="Menüyü kapat" onClick={closeMobileMenu}><Icon name="close" className="h-5 w-5" /></button>
              </div>
              <TeacherNavigation groups={teacherNavGroups} isActive={isTeacherItemActive} onNavigate={closeMobileMenu} />
              <TeacherSidebarFooter onLogout={handleTeacherLogout} />
            </aside>

            <div className="min-w-0 flex-1">
              <header className="teacher-header">
                <div className="flex min-w-0 items-start gap-3">
                  <button ref={mobileMenuButtonRef} type="button" className="teacher-icon-button lg:hidden" aria-label="Menüyü aç" aria-expanded={isMobileMenuOpen} aria-controls="teacher-mobile-navigation" onClick={() => setIsMobileMenuOpen(true)}><Icon name="menu" className="h-5 w-5" /></button>
                  <div className="min-w-0">
                    <nav className="teacher-breadcrumb" aria-label="Sayfa yolu"><span>Öğretmen Alanı</span>{activeTeacherItem ? <><span aria-hidden="true">/</span><span aria-current="page">{activeTeacherItem.label}</span></> : null}</nav>
                    <h1 className="teacher-page-title">{title}</h1>
                    <p className="teacher-page-subtitle">{subtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <ThemeSwitcher />
                  <Link href={quickActionHref} className="teacher-header-action">{quickActionLabel}</Link>
                  <div className="teacher-user-chip"><Icon name="user" className="h-4 w-4" />{teacherUsername}</div>
                </div>
              </header>
              <main id="teacher-main" className={`${compactHeader ? "mt-4 gap-4" : "mt-5 gap-5"} flex min-w-0 flex-col`}>{children}</main>
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
        <header data-app-shell-header className={hasVibrantStudentHeader ? "relative overflow-hidden rounded-[28px] border border-red-200/40 bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_38%,#f43f5e_68%,#f97316_100%)] px-5 py-5 text-white shadow-[0_20px_60px_rgba(185,28,28,0.24)] md:px-7" : `idil-card relative overflow-hidden ${compactHeader ? "p-2.5 md:p-3" : "p-3.5 md:p-4"}`}>
          {hasVibrantStudentHeader ? <><div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" /><div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-orange-300/20 blur-2xl" /><div className="pointer-events-none absolute right-1/3 top-0 h-28 w-28 rounded-full bg-pink-300/10 blur-2xl" /></> : null}
          <div className={hasVibrantStudentHeader ? "relative z-10" : "relative z-10 flex flex-col gap-2 md:flex-row md:items-start md:justify-between"}>
            <div className="min-w-0">
              <p className={hasVibrantStudentHeader ? "text-xs font-black uppercase tracking-[0.22em] text-red-100" : "text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand)]"}>İdil Hızlı Okuma</p>
              <h1 className={hasVibrantStudentHeader ? "mt-1 max-w-4xl text-2xl font-black tracking-tight text-white md:text-3xl" : `${compactHeader ? "mt-0.5 text-[24px] md:text-[28px]" : "mt-0.5 text-[26px] md:text-[30px]"} max-w-4xl font-semibold tracking-tight text-slate-950`}>{title}</h1>
              <p className={hasVibrantStudentHeader ? "mt-1 max-w-3xl text-sm leading-5 text-red-50/90" : `${compactHeader ? "mt-0.5 text-[12px] md:text-sm" : "mt-0.5 text-[13px] md:text-sm"} max-w-3xl leading-5 text-[var(--muted)]`}>{subtitle}</p>
            </div>
            {!hasHomeNav ? <Link href="/" className="inline-flex min-h-[38px] w-fit shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-50">Ana Sayfa</Link> : null}
          </div>
          <RoleAwareNav fallbackItems={navItems} compactHeader={compactHeader} variant={hasVibrantStudentHeader ? "vibrant" : "default"} />
        </header>
        <main className={`${compactHeader ? "mt-3 gap-3" : "mt-4 gap-4"} flex flex-col`}>{children}</main>
      </div>
    </IdilThemeProvider>
  );
}
