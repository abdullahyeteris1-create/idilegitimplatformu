"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearCurrentUser, getResolvedCurrentUser, type CurrentUser } from "@/lib/auth/auth";

type NavItem = {
  href: string;
  label: string;
};

type RoleAwareNavProps = {
  fallbackItems: NavItem[];
  compactHeader?: boolean;
};

const STUDENT_NAV_ITEMS: NavItem[] = [
  { href: "/ogrenci", label: "Ana Sayfa" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclarim" },
  { href: "/egzersizler/anlama-testi", label: "Okuma Testlerim" },
];

const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: "/ogretmen", label: "Ana Sayfa" },
  { href: "/ogretmen", label: "Ogretmen" },
  { href: "/ogretmen/idil-panel", label: "Idil Panel" },
  { href: "/ogretmen#ogrenciler", label: "Ogrenciler" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclar" },
  { href: "/ogretmen/icerik-yonetimi", label: "Icerik Yonetimi" },
];

export function RoleAwareNav({ fallbackItems, compactHeader = false }: RoleAwareNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

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
    if (user?.role === "teacher" || pathname.startsWith("/ogretmen")) {
      await fetch("/api/admin-logout", { method: "POST" });
      clearCurrentUser();
      setUser(null);
      router.replace("/giris");
      return;
    }

    clearCurrentUser();
    setUser(null);
    router.replace("/");
  };

  return (
    <nav className={`relative z-10 ${compactHeader ? "mt-2.5" : "mt-3"} flex flex-wrap gap-2 pb-0.5`}>
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[13px] font-medium text-slate-700 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
        >
          {item.label}
        </Link>
      ))}
      {isMounted && user ? (
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[13px] font-medium text-red-800 transition duration-200 hover:bg-red-100"
          style={{ touchAction: "manipulation" }}
        >
          Cikis
        </button>
      ) : null}
    </nav>
  );
}
