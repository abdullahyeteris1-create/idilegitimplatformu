"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearCurrentUser, getResolvedCurrentUser, logoutCurrentStudent, type CurrentUser } from "@/lib/auth/auth";
import { TEACHER_NAV_ITEMS as SHARED_TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

type NavItem = {
  href: string;
  label: string;
};

type RoleAwareNavProps = {
  fallbackItems: NavItem[];
  compactHeader?: boolean;
  variant?: "default" | "vibrant";
};

const STUDENT_NAV_ITEMS: NavItem[] = [
  { href: "/ogrenci", label: "Ana Sayfa" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuçlarım" },
  { href: "/egzersizler/anlama-testi", label: "Okuma Testlerim" },
];

const TEACHER_NAV_ITEMS: NavItem[] = SHARED_TEACHER_NAV_ITEMS;

export function RoleAwareNav({ fallbackItems, compactHeader = false, variant = "default" }: RoleAwareNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUser(getResolvedCurrentUser());
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const items = isMounted && user?.role === "student"
    ? STUDENT_NAV_ITEMS
    : isMounted && user?.role === "teacher"
      ? TEACHER_NAV_ITEMS
      : fallbackItems;

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setLogoutError("");
    setIsLoggingOut(true);
    if (user?.role === "teacher" || pathname.startsWith("/ogretmen")) {
      await fetch("/api/admin-logout", { method: "POST" });
      clearCurrentUser();
      setUser(null);
      router.replace("/giris");
      return;
    }

    try {
      await logoutCurrentStudent();
      setUser(null);
      window.location.replace("/giris");
    } catch {
      setLogoutError("Çıkış şu anda tamamlanamadı. Lütfen tekrar deneyin.");
      setIsLoggingOut(false);
    }
  };

  const isVibrant = variant === "vibrant";

  const isItemActive = (href: string): boolean => {
    const baseHref = href.split(/[?#]/)[0];

    if (baseHref === "/") {
      return pathname === "/";
    }

    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  };

  return (
    <nav
      className={`relative z-10 ${isVibrant ? "mt-4" : compactHeader ? "mt-2.5" : "mt-3"} flex flex-wrap gap-2 pb-0.5`}
    >
      {items.map((item) => {
        const isActive = isVibrant && isItemActive(item.href);

        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isVibrant
                ? isActive
                  ? "inline-flex min-h-[40px] max-w-full shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-red-700 shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:px-4 sm:text-sm"
                  : "inline-flex min-h-[40px] max-w-full shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-center text-xs font-bold text-white shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/20 sm:px-4 sm:text-sm"
                : "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[13px] font-medium text-slate-700 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            }
          >
            {item.label}
          </Link>
        );
      })}
      {isMounted && user ? (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={
            isVibrant
              ? "inline-flex min-h-[40px] max-w-full shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/90 px-3 py-2 text-center text-xs font-black text-red-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:px-4 sm:text-sm"
              : "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[13px] font-medium text-red-800 transition duration-200 hover:bg-red-100"
          }
          style={{ touchAction: "manipulation" }}
        >
          {isLoggingOut ? "Çıkış yapılıyor..." : isVibrant ? "Çıkış" : "Cikis"}
        </button>
      ) : null}
      {logoutError ? <span role="alert" className={`w-full text-sm font-semibold ${isVibrant ? "text-red-100" : "text-red-700"}`}>{logoutError}</span> : null}
    </nav>
  );
}
