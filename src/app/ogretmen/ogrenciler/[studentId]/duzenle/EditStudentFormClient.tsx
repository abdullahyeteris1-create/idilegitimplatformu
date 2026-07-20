"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { EDUCATION_LEVEL_LABELS, EDUCATION_LEVELS, type EducationLevel } from "@/lib/assignments/educationLevels";
import {
  generateStudentPassword,
  generateUsernameFromName,
  getStudentById,
  isStudentUsernameAvailable,
  syncStudentInLocalCache,
} from "@/lib/students/studentStorage";
import { isEducationDateRangeValid } from "@/lib/students/studentAccessDates";
import type { EducationStatus, Student, StudentStatus } from "@/lib/students/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function subscribeToHydration(): () => void {
  return () => undefined;
}

export function EditStudentFormClient() {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  if (!isHydrated) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
        Öğrenci bilgileri yükleniyor...
      </p>
    );
  }

  const student = getStudentById(studentId);
  if (!student) {
    return (
      <div className="grid gap-3">
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">Ogrenci bulunamadi.</p>
        <Button type="button" variant="secondary" onClick={() => router.push("/ogretmen") }>
          Geri Don
        </Button>
      </div>
    );
  }

  return <EditStudentForm studentId={studentId} student={student} />;
}

function EditStudentForm({ studentId, student }: { studentId: string; student: Student }) {
  const router = useRouter();

  const [name, setName] = useState(student.name);
  const [username, setUsername] = useState(student.username);
  const [password, setPassword] = useState(student.password);
  const [classLevel, setClassLevel] = useState(student.classLevel ?? "");
  const [parentName, setParentName] = useState(student.parentName ?? "");
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? "");
  const [parentEmail, setParentEmail] = useState(student.parentEmail ?? student.email ?? "");
  const [birthDate, setBirthDate] = useState(student.birthDate ?? "");
  const [educationStartDate, setEducationStartDate] = useState(student.educationStartDate ?? "");
  const [accessEndDate, setAccessEndDate] = useState(student.accessEndDate ?? "");
  const [status, setStatus] = useState<StudentStatus>(student.status ?? "active");
  const [educationStatus, setEducationStatus] = useState<EducationStatus>(student.educationStatus ?? "general");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">(student.educationLevel ?? "");
  const [notes, setNotes] = useState(student.notes ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (isSubmitting) {
      return;
    }

    setError("");

    if (!name.trim() || !username.trim() || !password.trim()) {
      setError("Ad soyad, kullanici adi ve sifre zorunludur.");
      return;
    }

    if (parentEmail.trim() && !EMAIL_PATTERN.test(parentEmail.trim())) {
      setError("Geçerli bir veli e-posta adresi girin.");
      return;
    }

    if (!isStudentUsernameAvailable(username, studentId)) {
      setError("Bu kullanici adi baska bir ogrenci tarafindan kullaniliyor.");
      return;
    }

    if (!educationLevel) {
      setError("Egitim duzeyi secimi zorunludur.");
      return;
    }

    const dateRange = isEducationDateRangeValid(
      educationStartDate || null,
      accessEndDate || null,
    );
    if (!dateRange.valid) {
      setError(dateRange.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          username,
          password,
          classLevel,
          parentName,
          parentPhone,
          parentEmail,
          birthDate,
          status,
          educationStatus,
          educationLevel,
          notes,
          educationStartDate,
          accessEndDate,
        }),
      });
      const result = await readStudentApiResponse(response);

      if (!response.ok || !result.ok || !result.student) {
        setError(result.message ?? "Öğrenci güncellenemedi. Lütfen tekrar deneyin.");
        setIsSubmitting(false);
        return;
      }

      syncStudentInLocalCache(result.student, student.username);
    } catch {
      setError("Öğrenci güncellenemedi. Lütfen tekrar deneyin.");
      setIsSubmitting(false);
      return;
    }

    router.push("/ogretmen");
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
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sinif Duzeyi (Opsiyonel)
          <input
            value={classLevel}
            onChange={(event) => setClassLevel(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Kullanici Adi (Zorunlu)
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <button
          type="button"
          onClick={() => setUsername(generateUsernameFromName(name))}
          className="min-h-[56px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-100"
          style={{ touchAction: "manipulation" }}
        >
          Otomatik Kullanici Adi Olustur
        </button>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sifre (Zorunlu)
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <button
          type="button"
          onClick={() => setPassword(generateStudentPassword())}
          className="min-h-[56px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 transition hover:bg-red-100"
          style={{ touchAction: "manipulation" }}
        >
          Otomatik Sifre Olustur
        </button>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli Adi (Opsiyonel)
          <input
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli Telefonu (Opsiyonel)
          <input
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Veli E-posta Adresi (Opsiyonel)
          <input
            type="email"
            name="parentEmail"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            className="min-h-[56px] rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
            placeholder="veli@example.com"
            autoComplete="email"
          />
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
          Eğitim Başlangıç Tarihi
          <input
            type="date"
            value={educationStartDate}
            onChange={(event) => setEducationStartDate(event.target.value)}
            className="min-h-[56px] min-w-0 rounded-xl border border-red-200 bg-white px-4 py-3 text-base outline-none ring-red-200 transition focus:ring"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Erişim Bitiş Tarihi
          <input
            type="date"
            value={accessEndDate}
            min={educationStartDate || undefined}
            onChange={(event) => setAccessEndDate(event.target.value)}
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
        />
      </label>

      {error ? <p className="text-sm font-semibold text-[var(--bad)]">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" onClick={() => void handleUpdate()} disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Guncelle"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/ogretmen") }>
          Geri Don
        </Button>
      </div>
    </div>
  );
}
