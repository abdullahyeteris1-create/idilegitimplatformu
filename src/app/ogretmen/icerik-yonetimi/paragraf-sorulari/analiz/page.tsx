import type { Metadata } from "next";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { loadParagraphAnalytics } from "@/lib/paragraph-exercises/paragraphAnalyticsRepository";
import { ParagraphAnalyticsClient } from "./ParagraphAnalyticsClient";

export const metadata: Metadata = {
  title: "Paragraf Performans Analizi | İDİL Eğitim",
  description: "Paragraf soru bankasının gerçek öğrenci performansını inceleyin.",
};

export const dynamic = "force-dynamic";

export default async function ParagraphAnalyticsPage() {
  await requireTeacherSession();

  let analytics = null;
  let errorMessage: string | null = null;
  try {
    analytics = await loadParagraphAnalytics();
  } catch {
    errorMessage = "Analiz verileri şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.";
  }

  return (
    <AppShell
      title="Paragraf Performans Analizi"
      subtitle="Soru ve kategori bazında gerçek öğrenci kullanım verilerini inceleyin."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <TeacherOnly>
        {analytics ? (
          <ParagraphAnalyticsClient initialAnalytics={analytics} />
        ) : (
          <section className="idil-card p-6" role="alert">
            <p className="text-sm font-semibold text-red-700">Paragraf analizi yüklenemedi.</p>
            <p className="mt-1 text-sm text-slate-600">{errorMessage}</p>
          </section>
        )}
      </TeacherOnly>
    </AppShell>
  );
}
