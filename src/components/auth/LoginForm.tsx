"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PanelCard } from "@/components/ui/PanelCard";
import { setCurrentStudent } from "@/lib/auth/auth";
import { getStudents } from "@/lib/students/studentStorage";

export function LoginForm() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState("");
  const [students, setStudents] = useState<ReturnType<typeof getStudents>>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStudents(getStudents());
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStudentId) {
      setError("Lutfen bir ogrenci sec.");
      return;
    }

    const student = students.find((item) => item.id === selectedStudentId && item.status === "active");

    if (!student) {
      setError("Secili ogrenci aktif degil. Lutfen aktif bir ogrenci sec.");
      return;
    }

    setCurrentStudent(student);

    router.push("/ogrenci");
  };

  return (
    <PanelCard
      title="Ogrenci Girisi"
      subtitle="Mock ogrenci listesinden bir ogrenci secerek egzersiz akisini baslat."
      className="mx-auto w-full max-w-xl"
    >
      {!isMounted ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-[var(--muted)]">
          Ogrenci listesi yukleniyor...
        </p>
      ) : (
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <p className="mb-2 text-sm font-semibold">Ogrenci Secimi</p>
          <div className="grid gap-3">
            {students.map((student) => {
              const isActive = student.status === "active";
              const isSelected = selectedStudentId === student.id;

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    if (!isActive) {
                      return;
                    }

                    setSelectedStudentId(student.id);
                    setError("");
                  }}
                  disabled={!isActive}
                  className={`relative z-50 w-full min-h-[56px] rounded-2xl border px-4 py-4 text-left text-base font-semibold transition ${
                    isSelected
                      ? "border-red-800 bg-red-600 text-white"
                      : "border-red-200 bg-white text-slate-800 hover:bg-red-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  style={{ touchAction: "manipulation" }}
                >
                  <p className="font-bold">{student.name}</p>
                  <p className={`text-sm ${isSelected ? "text-red-50" : "text-[var(--muted)]"}`}>
                    Sinif: {student.classLevel}
                  </p>
                  <p className={`text-xs ${isSelected ? "text-red-100" : "text-slate-500"}`}>
                    Kullanici adi: {student.username}
                  </p>
                  <p className={`text-xs ${isSelected ? "text-red-100" : "text-slate-500"}`}>
                    Durum: {student.status === "active" ? "Aktif" : "Pasif"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {error ? <p className="text-sm font-semibold text-[var(--bad)]">{error}</p> : null}

        <Button type="submit" className="mt-1">
          Giris Yap
        </Button>

        <Button type="button" variant="ghost" className="mt-1" onClick={() => router.push("/ogretmen")}>
          Ogretmen Paneline Gec
        </Button>
      </form>
      )}
    </PanelCard>
  );
}
