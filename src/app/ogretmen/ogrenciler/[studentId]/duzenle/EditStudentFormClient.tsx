"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EDUCATION_LEVEL_LABELS, EDUCATION_LEVELS, type EducationLevel } from "@/lib/assignments/educationLevels";
import {
  generateStudentPassword,
  generateUsernameFromName,
  getStudentById,
  isStudentUsernameAvailable,
  updateStudent,
} from "@/lib/students/studentStorage";
import type { EducationStatus, StudentStatus } from "@/lib/students/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditStudentFormClient() {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const student = useMemo(() => getStudentById(studentId), [studentId]);

  const [name, setName] = useState(student?.name ?? "");
  const [username, setUsername] = useState(student?.username ?? "");
  const [password, setPassword] = useState(student?.password ?? "");
  const [classLevel, setClassLevel] = useState(student?.classLevel ?? "");
  const [parentName, setParentName] = useState(student?.parentName ?? "");
  const [parentPhone, setParentPhone] = useState(student?.parentPhone ?? "");
  const [parentEmail, setParentEmail] = useState(student?.parentEmail ?? student?.email ?? "");
  const [birthDate, setBirthDate] = useState(student?.birthDate ?? "");
  const [status, setStatus] = useState<StudentStatus>(student?.status ?? "active");
  const [educationStatus, setEducationStatus] = useState<EducationStatus>(student?.educationStatus ?? "general");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">(student?.educationLevel ?? "");
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [error, setError] = useState("");

  const handleUpdate = () => {
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

    const updated = updateStudent(studentId, {
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
    });

    if (!updated) {
      setError("Ogrenci guncellenemedi. Kullanici adi veya kayit kontrol et.");
      return;
    }

    router.push("/ogretmen");
  };

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
        <Button type="button" onClick={handleUpdate}>
          Guncelle
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/ogretmen") }>
          Geri Don
        </Button>
      </div>
    </div>
  );
}
