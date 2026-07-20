"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EDUCATION_LEVEL_LABELS, EDUCATION_LEVELS, type EducationLevel } from "@/lib/assignments/educationLevels";
import {
  generateStudentPassword,
  generateUsernameFromName,
  isStudentUsernameAvailable,
  syncStudentInLocalCache,
} from "@/lib/students/studentStorage";
import {
  getIstanbulDateString,
  isEducationDateRangeValid,
} from "@/lib/students/studentAccessDates";
import type { EducationStatus, Student, StudentStatus } from "@/lib/students/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResultMessage = {
  tone: "success" | "warning";
  text: string;
};

type StudentApiResponse = {
  ok: boolean;
  message?: string;
  student?: Student;
};

async function readStudentApiResponse(response: Response): Promise<StudentApiResponse> {
  try {
    return (await response.json()) as StudentApiResponse;
  } catch {
    return { ok: false };
  }
}

export function NewStudentFormClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [educationStartDate, setEducationStartDate] = useState(() => getIstanbulDateString());
  const [accessEndDate, setAccessEndDate] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [educationStatus, setEducationStatus] = useState<EducationStatus>("general");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState<ResultMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting || isCompleted) {
      return;
    }

    setError("");
    setResultMessage(null);

    if (!name.trim() || !username.trim() || !password.trim()) {
      setError("Ad soyad, kullanici adi ve sifre zorunludur.");
      return;
    }

    if (!educationLevel) {
      setError("Egitim duzeyi secimi zorunludur.");
      return;
    }

    if (!educationStartDate || !accessEndDate) {
      setError("Başlangıç ve bitiş tarihlerini seçin.");
      return;
    }

    const dateRange = isEducationDateRangeValid(educationStartDate, accessEndDate);
    if (!dateRange.valid) {
      setError(dateRange.message);
      return;
    }

    const normalizedParentEmail = parentEmail.trim();

    if (sendWelcomeEmail && !normalizedParentEmail) {
      setError("E-posta gönderimi için veli e-posta adresi zorunludur.");
      return;
    }

    if (normalizedParentEmail && !EMAIL_PATTERN.test(normalizedParentEmail)) {
      setError("Geçerli bir veli e-posta adresi girin.");
      return;
    }

    if (!isStudentUsernameAvailable(username)) {
      setError("Bu kullanici adi zaten kullaniliyor.");
      return;
    }

    const submittedPassword = password;

    setIsSubmitting(true);

    let created: Student;

    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          username,
          password: submittedPassword,
          classLevel,
          parentName,
          parentPhone,
          parentEmail: normalizedParentEmail,
          birthDate,
          status,
          educationStatus,
          educationLevel,
          notes,
          educationStartDate,
          accessEndDate,
          welcomeEmailStatus: sendWelcomeEmail ? undefined : "not_requested",
        }),
      });
      const result = await readStudentApiResponse(response);

      if (!response.ok || !result.ok || !result.student) {
        setError(result.message ?? "Öğrenci Supabase'e kaydedilemedi. Lütfen tekrar deneyin.");
        setIsSubmitting(false);
        return;
      }

      created = result.student;
      syncStudentInLocalCache(created);
    } catch {
      setError("Öğrenci Supabase'e kaydedilemedi. Lütfen tekrar deneyin.");
      setIsSubmitting(false);
      return;
    }

    if (!sendWelcomeEmail) {
      setResultMessage({
        tone: "success",
        text: "Öğrenci oluşturuldu.",
      });
      setIsCompleted(true);
      setIsSubmitting(false);
      return;
    }

    let emailSent = false;

    try {
      const response = await fetch("/api/admin/send-student-welcome-email", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: created.name,
          parentEmail: normalizedParentEmail,
          username: created.username,
              temporaryPassword: submittedPassword,
        }),
      });

      emailSent = response.ok;
    } catch {
      emailSent = false;
    }

    try {
      const statusResponse = await fetch(`/api/admin/students/${encodeURIComponent(created.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcomeEmailStatus: emailSent ? "sent" : "failed",
          welcomeEmailSentAt: emailSent ? new Date().toISOString() : "",
        }),
      });
      const statusResult = await readStudentApiResponse(statusResponse);
      if (statusResponse.ok && statusResult.ok && statusResult.student) {
        syncStudentInLocalCache(statusResult.student);
      }
    } catch {
      // Öğrenci kaydı korunur; e-posta sonucu kullanıcıya yine bildirilir.
    }

    setResultMessage(
      emailSent
        ? {
            tone: "success",
            text: "Öğrenci oluşturuldu ve veliye giriş bilgileri gönderildi.",
          }
        : {
            tone: "warning",
            text: "Öğrenci oluşturuldu ancak e-posta gönderilemedi.",
          },
    );
    setIsCompleted(true);
    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Ad Soyad (Zorunlu)
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Ornek: Ceren Bora"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sinif Duzeyi (Opsiyonel)
          <input
            value={classLevel}
            onChange={(event) => setClassLevel(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Ornek: 4-A"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Kullanici Adi (Zorunlu)
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Ornek: ceren.bora"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Kullanici Adi Olustur</p>
          <button
            type="button"
            onClick={() => setUsername(generateUsernameFromName(name))}
            className="min-h-[56px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-100"
            style={{ touchAction: "manipulation" }}
          >
            Otomatik Kullanici Adi Olustur
          </button>
        </div>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sifre (Zorunlu)
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Sifre"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Sifre Olustur</p>
          <button
            type="button"
            onClick={() => setPassword(generateStudentPassword())}
            className="min-h-[56px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-100"
            style={{ touchAction: "manipulation" }}
          >
            Otomatik Sifre Olustur
          </button>
        </div>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli Adi (Opsiyonel)
          <input
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Ornek: Seda Bora"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli Telefonu (Opsiyonel)
          <input
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="Ornek: 05550000000"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli E-posta Adresi {sendWelcomeEmail ? "(Zorunlu)" : "(Opsiyonel)"}
          <input
            type="email"
            name="parentEmail"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="veli@example.com"
            autoComplete="email"
            required={sendWelcomeEmail}
          />
        </label>

        <label className="flex min-h-[56px] items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-slate-800 md:col-span-2">
          <input
            type="checkbox"
            name="sendWelcomeEmail"
            checked={sendWelcomeEmail}
            onChange={(event) => setSendWelcomeEmail(event.target.checked)}
            disabled={isSubmitting || isCompleted}
            className="h-5 w-5 shrink-0 accent-red-600"
          />
          <span>Öğrenci oluşturulunca veliye giriş bilgilerini e-posta ile gönder</span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Dogum Tarihi (Opsiyonel)
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Eğitim Başlangıç Tarihi (Zorunlu)
          <input
            type="date"
            value={educationStartDate}
            onChange={(event) => setEducationStartDate(event.target.value)}
            required
            className="min-h-[56px] min-w-0 rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Erişim Bitiş Tarihi (Zorunlu)
          <input
            type="date"
            value={accessEndDate}
            min={educationStartDate || undefined}
            onChange={(event) => setAccessEndDate(event.target.value)}
            required
            className="min-h-[56px] min-w-0 rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Durum
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StudentStatus)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          >
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Egitim Durumu (Opsiyonel)
          <select
            value={educationStatus}
            onChange={(event) => setEducationStatus(event.target.value as EducationStatus)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          >
            <option value="general">Genel</option>
            <option value="speed-reading">Hizli Okuma</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Egitim Duzeyi (Zorunlu)
          <select
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value as EducationLevel | "")}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          >
            <option value="">Seciniz</option>
            {EDUCATION_LEVELS.map((value) => (
              <option key={value} value={value}>
                {EDUCATION_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm font-semibold">
        Notlar (Opsiyonel)
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[120px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          placeholder="Ogrenciyle ilgili notlar"
        />
      </label>

      {error ? <p className="text-sm font-semibold text-[var(--bad)]">{error}</p> : null}

      {resultMessage ? (
        <p
          role="status"
          aria-live="polite"
          className={
            resultMessage.tone === "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
              : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
          }
        >
          {resultMessage.text}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isSubmitting || isCompleted}
        >
          {isSubmitting ? "Kaydediliyor..." : isCompleted ? "Öğrenci Kaydedildi" : "Ogrenciyi Kaydet"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/ogretmen/idil-panel/ogrenci-takip")}
        >
          Öğrenci Takibine Dön
        </Button>
      </div>
    </div>
  );
}
