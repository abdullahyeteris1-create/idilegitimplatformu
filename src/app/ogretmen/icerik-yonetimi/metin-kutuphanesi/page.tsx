import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { TextLibraryClient } from "./TextLibraryClient";

export default function TextLibraryPage() {
  return (
    <AppShell
      title="Metin Kutuphanesi"
      subtitle="Tum okuma calismalarinda ortak kullanilacak metinleri ekle, duzenle ve filtrele."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/ogretmen/icerik-yonetimi"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
        >
          Icerik Yonetimine Don
        </Link>
        <p className="text-sm font-semibold text-slate-500">Bu alan yalnizca ogretmen ve panel sahibi icindir.</p>
      </div>
      <TextLibraryClient />
    </AppShell>
  );
}
