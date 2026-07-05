"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getResolvedCurrentUser } from "@/lib/auth/auth";

type TeacherOnlyProps = {
  children: ReactNode;
};

export function TeacherOnly({ children }: TeacherOnlyProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [message, setMessage] = useState("Yetki kontrol ediliyor...");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const user = getResolvedCurrentUser();

      if (user?.role === "teacher") {
        setIsAllowed(true);
        return;
      }

      if (user?.role === "student") {
        setMessage("Bu alan sadece ogretmen hesabi icindir.");
        window.setTimeout(() => router.replace("/ogrenci"), 1200);
        return;
      }

      setMessage("Bu alana erismek icin ogretmen hesabi ile giris yapmalisin.");
      window.setTimeout(() => router.replace("/"), 1200);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  if (!isAllowed) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        {message}
      </section>
    );
  }

  return <>{children}</>;
}
