import Link from "next/link";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AIContentGeneratorForm } from "@/components/ai/AIContentGeneratorForm";
import { AppShell } from "@/components/layout/AppShell";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export default function AIContentGeneratorPage() {
  return (
    <IdilThemeProvider>
      <AppShell
        title="AI İçerik Üreticisi"
        subtitle="Sınıf düzeyine uygun Türkçe okuma metinleri, hedef kelimeler ve anlama soruları hazırlayın."
        navItems={TEACHER_NAV_ITEMS}
        compactHeader
        wide
      >
        <TeacherOnly>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Link href="/ogretmen/icerik-yonetimi" className="inline-flex min-h-[40px] items-center rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--idil-text)] hover:border-red-200 hover:text-red-700">
              ← İçerik Yönetimine Dön
            </Link>
            <ThemeSwitcher />
          </div>
          <AIContentGeneratorForm />
        </TeacherOnly>
      </AppShell>
    </IdilThemeProvider>
  );
}
