import type { Metadata } from "next";
import { ParagraphExercisesClient } from "./ParagraphExercisesClient";
import { getParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";
import { loadStudentParagraphQuestions } from "@/lib/paragraph-exercises/paragraphQuestionRepository";
import Link from "next/link";

export const metadata: Metadata = { title: "Paragraf Çalışmaları | İDİL Eğitim", description: "Paragraf becerilerini geliştiren 10 soruluk çalışmalar." };

export default async function ParagraphExercisesPage() {
  const access = await getParagraphExerciseAccess();
  if (!access.authenticated) {
    return <AccessMessage title="Oturum açmanız gerekiyor." description="Paragraf Çalışmalarına devam etmek için giriş yapın." href="/giris" label="Giriş Yap" />;
  }
  if (!access.enabled) {
    return <AccessMessage title="Paragraf Çalışmaları henüz hesabın için aktif değil." description="Öğretmenin uygun gördüğünde bu çalışma alanını açacaktır." href="/egzersizler" label="Egzersizlere Dön" />;
  }
  if (!access.studentId) {
    return <AccessMessage title="Öğrenci bilgileri doğrulanamadı." description="Paragraf çalışmaları şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." href="/egzersizler" label="Egzersizlere Dön" />;
  }
  const questionPool = await loadStudentParagraphQuestions(access.studentId, access.studentClass);
  if (!questionPool.gradeBand) {
    return <AccessMessage title="Bu çalışma sınıf seviyen için hazır değil." description="Öğretmenin yeni çalışmalar eklediğinde burada uygun soruları görebilirsin." href="/egzersizler" label="Egzersizlere Dön" />;
  }
  if (questionPool.dbState === "error" && questionPool.questions.length === 0) {
    return <AccessMessage title="Paragraf soruları şu anda yüklenemiyor." description="Lütfen biraz sonra tekrar deneyin." href="/egzersizler" label="Egzersizlere Dön" />;
  }
  return <ParagraphExercisesClient questionPool={questionPool.questions} />;
}

function AccessMessage({ title, description, href, label }: { title: string; description: string; href: string; label: string }) {
  return <main className="flex min-h-[70vh] items-center justify-center bg-[var(--idil-page-bg)] px-4 py-12 text-[var(--idil-text)]"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p><Link className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white" href={href}>{label}</Link></section></main>;
}
