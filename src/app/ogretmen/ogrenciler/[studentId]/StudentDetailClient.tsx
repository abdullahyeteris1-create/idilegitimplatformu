"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StudentAnalysisCard } from "@/components/ai/StudentAnalysisCard";
import { downloadResultsXlsx } from "@/lib/results/resultExport";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import { getResultsByStudent } from "@/lib/results/resultStorage";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import {
  getStudentById,
  removeStudentFromLocalCache,
  updateStudentWelcomeEmailStatus,
} from "@/lib/students/studentStorage";
import type { WelcomeEmailStatus } from "@/lib/students/types";

type ExerciseSummary = {
  exerciseType: ExerciseType;
  title: string;
  count: number;
  averageSuccess: number;
  maxScore: number;
  lastScore: number;
  lastDate: string;
};

function SpinnerIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

function toDisplayDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("tr-TR");
}

function getWelcomeEmailStatusLabel(status: WelcomeEmailStatus | undefined): string {
  if (status === "sent") {
    return "Gönderildi";
  }

  if (status === "failed") {
    return "Gönderilemedi";
  }

  return "Gönderilmedi";
}

function getWelcomeEmailStatusClass(status: WelcomeEmailStatus | undefined): string {
  if (status === "sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getExerciseTitle(type: ExerciseType): string {
  if (type === "tachistoscope") {
    return "Takistoskop";
  }

  if (type === "similar-words") {
    return "Benzer Kelimeler";
  }

  if (type === "shadow-reading") {
    return "Golgeleme";
  }

  if (type === "focused-reading") {
    return "Odaklı Okuma Çalışması";
  }

  if (type === "two-side-focus") {
    return "Cift Tarafli Odak";
  }

  if (type === "attention-maze") {
    return "Dikkat Labirenti";
  }

  if (type === "memory-game") {
    return "Hafıza Geliştirme";
  }

  if (type === "word-finding") {
    return "Kelime Bulma Calismasi";
  }

  if (type === "eye-muscle") {
    return "Goz Kaslarini Gelistirme Calismasi";
  }

  if (type === "reading-comprehension") {
    return "Anlama Testi";
  }

  if (type === "letter-number-counting-focus") {
    return "Harf / Rakam Sayma Odak Calismasi";
  }

  if (type === "card-matching") {
    return "Kart Eslestirme Calismasi";
  }

  if (type === "visual-puzzle") {
    return "Gorsel Puzzle Calismasi";
  }

  if (type === "eye-brain") {
    return "Göz Beyin Çalışması";
  }

  if (type === "word-guess") {
    return "Kelime Tahmin";
  }

  if (type === "catch-same") {
    return "Ayni Olani Yakala";
  }

  if (type === "hangman") {
    return "Adam Asmaca";
  }

  return "Blok Okuma";
}

export function StudentDetailClient() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const studentId = params.studentId;

  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<ReturnType<typeof getStudentById>>(null);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [readingTests, setReadingTests] = useState<ReadingTestResult[]>([]);
  const [isSendingWelcomeEmail, setIsSendingWelcomeEmail] = useState(false);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentStudent = getStudentById(studentId);
      setStudent(currentStudent);
      setResults(
        currentStudent
          ? getResultsByStudent(studentId, currentStudent.name, currentStudent.username)
          : getResultsByStudent(studentId),
      );
      setReadingTests(
        currentStudent
          ? getReadingTestsByStudent(studentId, currentStudent.name, currentStudent.username)
          : getReadingTestsByStudent(studentId),
      );
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [studentId]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.date.localeCompare(a.date));
  }, [results]);

  const performance = useMemo(() => {
    const totalStudy = sortedResults.length;
    const totalScore = sortedResults.reduce((sum, item) => sum + item.score, 0);
    const totalSuccess = sortedResults.reduce((sum, item) => sum + item.successRate, 0);
    const averageSuccess = totalStudy > 0 ? Math.round(totalSuccess / totalStudy) : 0;

    return {
      totalStudy,
      totalScore,
      averageSuccess,
      lastDate: sortedResults[0]?.date ?? null,
    };
  }, [sortedResults]);

  const exerciseSummaries = useMemo<ExerciseSummary[]>(() => {
    const types: ExerciseType[] = [
      "tachistoscope",
      "similar-words",
      "block-reading",
      "shadow-reading",
      "focused-reading",
      "two-side-focus",
      "attention-maze",
      "memory-game",
      "word-finding",
      "eye-muscle",
      "reading-comprehension",
      "letter-number-counting-focus",
      "card-matching",
      "visual-puzzle",
      "eye-brain",
      "word-guess",
      "catch-same",
      "hangman",
    ];

    return types.map((type) => {
      const byType = sortedResults.filter((result) => result.exerciseType === type);
      const count = byType.length;
      const averageSuccess = count > 0 ? Math.round(byType.reduce((sum, item) => sum + item.successRate, 0) / count) : 0;
      const maxScore = count > 0 ? Math.max(...byType.map((item) => item.score)) : 0;
      const lastResult = byType[0] ?? null;

      return {
        exerciseType: type,
        title: getExerciseTitle(type),
        count,
        averageSuccess,
        maxScore,
        lastScore: lastResult?.score ?? 0,
        lastDate: lastResult?.date ?? "",
      };
    });
  }, [sortedResults]);

  const handleResendWelcomeEmail = async () => {
    const parentEmail = student?.parentEmail ?? student?.email ?? "";

    if (!student || !parentEmail || isSendingWelcomeEmail) {
      return;
    }

    setIsSendingWelcomeEmail(true);
    setEmailFeedback(null);

    let emailSent = false;

    try {
      const response = await fetch("/api/admin/send-student-welcome-email", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: student.name,
          parentEmail,
          username: student.username,
          temporaryPassword: student.password,
        }),
      });

      emailSent = response.ok;
    } catch {
      emailSent = false;
    }

    const sentAt = emailSent ? new Date().toISOString() : undefined;
    let statusUpdatedStudent: Awaited<ReturnType<typeof updateStudentWelcomeEmailStatus>> = null;

    try {
      statusUpdatedStudent = await updateStudentWelcomeEmailStatus(
        student.id,
        emailSent ? "sent" : "failed",
        sentAt,
      );
    } catch {
      // Yerel durum aşağıdaki fallback ile güncellenir.
    }

    setStudent(
      statusUpdatedStudent ?? {
        ...student,
        welcomeEmailSentAt: sentAt,
        welcomeEmailStatus: emailSent ? "sent" : "failed",
      },
    );
    setEmailFeedback(
      emailSent
        ? {
            tone: "success",
            text: "Veliye giriş bilgileri yeniden gönderildi.",
          }
        : {
            tone: "error",
            text: "E-posta gönderilemedi. Öğrenci kaydı korunuyor.",
          },
    );
    setIsSendingWelcomeEmail(false);
  };

  const handleDeleteStudent = async () => {
    if (!student || isDeletingStudent) {
      return;
    }

    setDeleteErrorMessage("");
    setIsDeletingStudent(true);

    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(student.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("delete-failed");
      }

      removeStudentFromLocalCache(student.id);
      router.push("/ogretmen/idil-panel/ogrenci-takip");
    } catch {
      setDeleteErrorMessage("Ogrenci silinemedi. Lutfen yeniden deneyin.");
    } finally {
      setIsDeletingStudent(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (!isMounted) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Ogrenci verileri yukleniyor...
      </p>
    );
  }

  if (!student) {
    return (
      <div className="grid gap-3">
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">Ogrenci bulunamadi.</p>
        <Link
          href="/ogretmen"
          className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-50"
        >
          Ogretmen Paneline Don
        </Link>
      </div>
    );
  }

  const parentEmail = student.parentEmail ?? student.email;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-red-100 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-red-700">{student.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Kullanici adi: {student.username}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
            {student.status === "active" ? "Aktif" : "Pasif"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <p>Sinif Duzeyi: <span className="font-semibold">{student.classLevel ?? "-"}</span></p>
          <p>Veli Adi: <span className="font-semibold">{student.parentName ?? "-"}</span></p>
          <p>Veli Telefonu: <span className="font-semibold">{student.parentPhone ?? "-"}</span></p>
          <p>Veli E-posta: <span className="font-semibold">{parentEmail ?? "-"}</span></p>
          <p>Kayit Tarihi: <span className="font-semibold">{toDisplayDate(student.createdAt)}</span></p>
          <p>Egitim Durumu: <span className="font-semibold">{student.educationStatus ?? "-"}</span></p>
          <p className="flex flex-wrap items-center gap-2">
            E-posta Durumu:
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getWelcomeEmailStatusClass(student.welcomeEmailStatus)}`}>
              {getWelcomeEmailStatusLabel(student.welcomeEmailStatus)}
            </span>
          </p>
          <p>
            Son E-posta Tarihi:{" "}
            <span className="font-semibold">
              {toDisplayDate(student.welcomeEmailSentAt ?? null)}
            </span>
          </p>
        </div>

        {student.notes ? (
          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--muted)]">
            Notlar: {student.notes}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/ogretmen/ogrenciler/${student.id}/duzenle`}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
          >
            Ogrenciyi Duzenle
          </Link>
          <button
            type="button"
            onClick={() => downloadResultsXlsx(sortedResults, `${slugify(student.name)}-sonuclari.xlsx`)}
            className="min-h-[48px] rounded-xl border border-red-900/30 bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
            style={{ touchAction: "manipulation" }}
          >
            Bu Ogrencinin Sonuclarini Excel Indir
          </button>
          <button
            type="button"
            onClick={() => void handleResendWelcomeEmail()}
            disabled={!parentEmail || isSendingWelcomeEmail}
            className="min-h-[48px] rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
            title={parentEmail ? "Veliye giriş bilgilerini yeniden gönder" : "Önce veli e-posta adresi ekleyin"}
          >
            {isSendingWelcomeEmail
              ? "E-posta Gönderiliyor..."
              : "Veliye E-postayı Yeniden Gönder"}
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeletingStudent}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ touchAction: "manipulation" }}
          >
            {isDeletingStudent ? (
              <>
                <SpinnerIcon />
                Siliniyor...
              </>
            ) : "Ogrenciyi Sil"}
          </button>
        </div>

        {emailFeedback ? (
          <p
            role={emailFeedback.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            className={
              emailFeedback.tone === "success"
                ? "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
                : "mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
            }
          >
            {emailFeedback.text}
          </p>
        ) : null}

        {deleteErrorMessage ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
          >
            {deleteErrorMessage}
          </p>
        ) : null}
      </section>

      <StudentAnalysisCard studentId={student.id} />

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Toplam Calisma</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{performance.totalStudy}</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ortalama Basari</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{performance.averageSuccess}%</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Toplam Puan</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--brand)]">{performance.totalScore}</p>
        </article>
        <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Son Calisma</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{toDisplayDate(performance.lastDate)}</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {exerciseSummaries.map((summary) => (
          <article key={summary.exerciseType} className="rounded-2xl border border-red-100 bg-white p-4">
            <h4 className="text-base font-bold text-red-700">{summary.title}</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
              <p>Calisma Sayisi: <span className="text-slate-900">{summary.count}</span></p>
              <p>Ortalama Basari: <span className="text-slate-900">{summary.averageSuccess}%</span></p>
              <p>En Yuksek Puan: <span className="text-[var(--brand)]">{summary.maxScore}</span></p>
              <p>Son Puan: <span className="text-[var(--brand)]">{summary.lastScore}</span></p>
            </div>
            <p className="mt-2 text-xs text-slate-500">Son Calisma: {toDisplayDate(summary.lastDate || null)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-4">
        <h4 className="text-lg font-bold">Okuma Testleri</h4>
        {readingTests.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Bu ogrencinin henuz okuma testi sonucu yok.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="border-b border-red-100 px-3 py-2">Tarih</th>
                  <th className="border-b border-red-100 px-3 py-2">Metin</th>
                  <th className="border-b border-red-100 px-3 py-2">Kelime</th>
                  <th className="border-b border-red-100 px-3 py-2">Sure</th>
                  <th className="border-b border-red-100 px-3 py-2">Hiz</th>
                  <th className="border-b border-red-100 px-3 py-2">Anlama Orani</th>
                </tr>
              </thead>
              <tbody>
                {readingTests.map((test) => (
                  <tr key={test.id} className="font-semibold text-slate-800">
                    <td className="border-b border-red-50 px-3 py-2">{toDisplayDate(test.date)}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.textTitle}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.totalWords}</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.readingDurationSeconds} sn</td>
                    <td className="border-b border-red-50 px-3 py-2">{test.readingSpeedWpm} kelime/dk</td>
                    <td className="border-b border-red-50 px-3 py-2 text-[var(--brand)]">{test.comprehensionScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-lg font-bold">Sonuc Gecmisi</h4>
        {sortedResults.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
            Bu ogrenci henuz egzersiz tamamlamadi.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {sortedResults.map((result) => (
              <article key={result.id} className="rounded-2xl border border-red-100 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-red-700">{result.exerciseTitle}</p>
                  <p className="text-xs text-slate-500">{toDisplayDate(result.date)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <p>
                    Dogru/Yanlis: <span className="text-slate-900">{result.correctCount}/{result.wrongCount}</span>
                  </p>
                  <p>
                    Puan: <span className="text-[var(--brand)]">{result.score}</span>
                  </p>
                  <p>
                    Basari: <span className="text-slate-900">{result.successRate}%</span>
                  </p>
                  <p>
                    Sure: <span className="text-slate-900">{result.durationSeconds} sn</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4" role="dialog" aria-modal="true" aria-label="Ogrenci silme onayi">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">Ogrenciyi silmek istediginize emin misiniz?</h3>
            <p className="mt-2 text-sm text-slate-700">
              Bu islem geri alinamaz. Ogrenciye ait ders kayitlari ve egzersiz sonuclari da silinebilir.
            </p>
            <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
              Ogrenci: {student.name}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingStudent) {
                    setIsDeleteModalOpen(false);
                  }
                }}
                disabled={isDeletingStudent}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteStudent()}
                disabled={isDeletingStudent}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingStudent ? (
                  <>
                    <SpinnerIcon />
                    Siliniyor...
                  </>
                ) : "Ogrenciyi Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
