"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCurrentStudent, setCurrentUser } from "@/lib/auth/auth";
import { getStudentByUsername, getStudentByUsernameWithRemote, getStudents } from "@/lib/students/studentStorage";

type LoginMode = "student" | "teacher";
type TabDirection = "forward" | "backward";

const TAB_ORDER: LoginMode[] = ["student", "teacher"];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<LoginMode>("student");
  const [tabDirection, setTabDirection] = useState<TabDirection>("forward");
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
    const currentIndex = TAB_ORDER.indexOf(mode);
    const nextIndex = TAB_ORDER.indexOf(nextMode);
    setTabDirection(nextIndex >= currentIndex ? "forward" : "backward");
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

  const tabAnimationClass =
    tabDirection === "forward" ? "motion-safe:animate-idil-tab-forward" : "motion-safe:animate-idil-tab-backward";

  return (
    <section className="mx-auto w-full max-w-[560px] rounded-[20px] border border-slate-700/70 bg-[linear-gradient(160deg,rgba(12,18,34,0.96),rgba(8,13,27,0.96))] p-4 text-slate-100 shadow-[0_26px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl md:p-5">
      <div className="grid grid-cols-2 gap-2 rounded-[14px] border border-slate-700/80 bg-slate-900/65 p-1.5">
        <button
          type="button"
          onClick={() => resetForm("student")}
          className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold tracking-[-0.01em] transition ${mode === "student" ? "bg-gradient-to-r from-violet-600/85 to-indigo-600/85 text-white shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
          style={{ touchAction: "manipulation" }}
        >
          Ogrenci Girisi
        </button>
        <button
          type="button"
          onClick={() => resetForm("teacher")}
          className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold tracking-[-0.01em] transition ${mode === "teacher" ? "bg-gradient-to-r from-orange-600/85 to-amber-600/85 text-white shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
          style={{ touchAction: "manipulation" }}
        >
          Kurum / Ogretmen Girisi
        </button>
      </div>

      <div key={mode} className={`mt-4 ${tabAnimationClass}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300">
          {mode === "student" ? "Ogrenci oturumu" : "Kurum oturumu"}
        </p>
        <h2 className="mt-1 text-[clamp(1.85rem,3.2vw,2.35rem)] font-black leading-[1.1] tracking-[-0.03em] text-slate-100">
          {mode === "student" ? "Kendi calismalarina hizli giris" : "Kurum paneline giris"}
        </h2>
        <p className="mt-1 text-[15px] leading-7 tracking-[-0.01em] text-slate-400">
          {mode === "student"
            ? "Kullanici adin ve sifrenle kendi egzersizlerine ve sonuclarina eris."
            : "Ogretmen panelinden ogrencileri, sonuclari ve icerikleri yonet."}
        </p>
      </div>

      <form className={`idil-login-form mt-4 grid gap-3 ${tabAnimationClass}`} onSubmit={handleSubmit}>
        <label className="grid gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-200">
            {mode === "student" ? "Ogrenci adi / kullanici adi" : "Kullanici adi / e-posta"}
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <UserIcon />
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="idil-login-input min-h-[48px] w-full rounded-xl border border-slate-700/90 bg-slate-950/60 px-3 pl-11 text-sm text-slate-100 caret-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/20"
              placeholder={mode === "student" ? "ogrenci veya kayitli kullanici adi" : "yonetici kullanici adi"}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-200">Sifre</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <LockIcon />
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="idil-login-input min-h-[48px] w-full rounded-xl border border-slate-700/90 bg-slate-950/60 px-3 pl-11 text-sm text-slate-100 caret-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/20"
              placeholder="********"
              type="password"
              autoComplete="current-password"
            />
          </div>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-violet-500 focus:ring-violet-500/20"
            />
            Beni hatirla
          </label>
          <button type="button" onClick={handleForgotPassword} className="text-[15px] font-medium tracking-[-0.01em] text-violet-300 hover:text-violet-200">
            Sifremi Unuttum
          </button>
        </div>

        {message ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
            {message}
          </p>
        ) : null}

        {!isMounted ? (
          <p className="rounded-xl border border-slate-700/80 bg-slate-900/65 px-3 py-2 text-sm text-slate-400">Giris bilgileri hazirlaniyor...</p>
        ) : null}

        <button
          type="submit"
          disabled={!isMounted}
          className="mt-2 min-h-[50px] rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ touchAction: "manipulation" }}
        >
          Giris Yap
        </button>
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
