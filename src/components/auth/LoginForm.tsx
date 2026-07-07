"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCurrentStudent, setCurrentUser } from "@/lib/auth/auth";
import { getStudentByUsername, getStudentByUsernameWithRemote, getStudents } from "@/lib/students/studentStorage";

type LoginMode = "student" | "teacher";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<LoginMode>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const resetForm = (nextMode: LoginMode) => {
    setMode(nextMode);
    setUsername("");
    setPassword("");
    setMessage("");
  };

  const handleForgotPassword = () => {
    setMessage("Bu ozellik yakinda eklenecek.");
  };

  const normalizeLoginValue = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    return trimmed
      .toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/İ/g, "i")
      .replace(/[^a-z0-9]/g, "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setMessage("Lutfen kullanici adi ve sifre alanlarini doldur.");
      return;
    }

    if (mode === "teacher") {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      if (response.ok) {
        const nextParam = searchParams.get("next");
        const nextPath = nextParam?.startsWith("/") ? nextParam : "/ogretmen";
        setCurrentUser({ role: "teacher", username: cleanUsername });
        router.replace(nextPath);
        return;
      }

      setMessage("Kullanıcı adı veya şifre hatalı.");
      return;
    }

    const normalizedUsername = normalizeLoginValue(cleanUsername);
    const normalizedPassword = cleanPassword.trim();

    if (normalizedUsername === "ogrenci" && normalizedPassword === "1234") {
      const demoStudent =
        (await getStudentByUsernameWithRemote("ogrenci")) ??
        getStudentByUsername("ogrenci") ??
        getStudents().find((item) => item.id === "demo-student") ?? {
        id: "demo-student",
        name: "Demo Öğrenci",
        username: "ogrenci",
        password: "1234",
        className: "Demo",
        classLevel: "Demo",
        parentName: "",
        phone: "",
        parentPhone: "",
        status: "active" as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setCurrentStudent(demoStudent);
      setCurrentUser({
        role: "student",
        studentId: demoStudent.id,
        studentName: demoStudent.name,
        username: demoStudent.username,
      });
      router.replace("/ogrenci");
      return;
    }

    const student =
      (await getStudentByUsernameWithRemote(cleanUsername)) ??
      getStudentByUsername(cleanUsername) ??
      getStudents().find((item) => normalizeLoginValue(item.name) === normalizedUsername) ??
      null;

    if (!student) {
      setMessage("Kullanıcı adı veya şifre hatalı.");
      return;
    }

    if (student.password.trim() !== normalizedPassword) {
      setMessage("Kullanıcı adı veya şifre hatalı.");
      return;
    }

    const isActive = student.isActive ?? student.status === "active";

    if (!isActive) {
      setMessage("Bu öğrenci hesabı pasif durumda. Lütfen öğretmeninizle iletişime geçin.");
      return;
    }

    setCurrentStudent(student);
    setCurrentUser({
      role: "student",
      username: student.username,
      studentId: student.id,
      studentName: student.name,
    });
    router.replace("/ogrenci");
  };

  return (
    <section className="mx-auto w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)] md:p-6">
      <div className="grid grid-cols-2 gap-2 rounded-[1.1rem] bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => resetForm("student")}
          className={`min-h-[44px] rounded-[0.9rem] px-3 text-sm font-semibold transition ${mode === "student" ? "bg-white text-red-800 shadow-sm" : "text-slate-600 hover:text-red-700"}`}
          style={{ touchAction: "manipulation" }}
        >
          Ogrenci Girisi
        </button>
        <button
          type="button"
          onClick={() => resetForm("teacher")}
          className={`min-h-[44px] rounded-[0.9rem] px-3 text-sm font-semibold transition ${mode === "teacher" ? "bg-white text-red-800 shadow-sm" : "text-slate-600 hover:text-red-700"}`}
          style={{ touchAction: "manipulation" }}
        >
          Kurum / Ogretmen Girisi
        </button>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
          {mode === "student" ? "Ogrenci oturumu" : "Kurum oturumu"}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          {mode === "student" ? "Kendi calismalarina hizli giris" : "Kurum paneline giris"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {mode === "student"
            ? "Kullanici adin ve sifrenle kendi egzersizlerine ve sonuclarina eris."
            : "Ogretmen panelinden ogrencileri, sonuclari ve icerikleri yonet."}
        </p>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-700">
            {mode === "student" ? "Ogrenci adi / kullanici adi" : "Kullanici adi / e-posta"}
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <UserIcon />
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="min-h-[50px] w-full rounded-xl border border-slate-200 bg-white px-3 pl-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
              placeholder={mode === "student" ? "ogrenci veya kayitli kullanici adi" : "yonetici kullanici adi"}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-700">Sifre</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <LockIcon />
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-[50px] w-full rounded-xl border border-slate-200 bg-white px-3 pl-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
              placeholder="********"
              type="password"
              autoComplete="current-password"
            />
          </div>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-200"
            />
            Beni hatirla
          </label>
          <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-red-700 hover:text-red-900">
            Sifremi Unuttum
          </button>
        </div>

        {message ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {message}
          </p>
        ) : null}

        {!isMounted ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Giris bilgileri hazirlaniyor...</p>
        ) : null}

        <button
          type="submit"
          disabled={!isMounted}
          className="mt-1 min-h-[50px] rounded-xl border border-red-900/20 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_42%,#991b1b_100%)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ touchAction: "manipulation" }}
        >
          Giris Yap
        </button>

        <p className="text-center text-xs text-slate-500">
          Ogrenci test hesabi: <span className="font-semibold">ogrenci / 1234</span>
        </p>
      </form>
    </section>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 10-16 0" />
      <circle cx="12" cy="7.5" r="3.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7.5a4 4 0 118 0V10" />
    </svg>
  );
}
