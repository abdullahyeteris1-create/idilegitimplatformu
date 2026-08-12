"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCurrentStudent, setCurrentUser } from "@/lib/auth/auth";
import type { Student } from "@/lib/students/types";

type LoginMode = "student" | "teacher";

export const STUDENT_LOGIN_GENERATION_KEY = "idil_student_login_generation";

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
    const timeoutId = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const resetForm = (nextMode: LoginMode) => {
    setMode(nextMode);
    setUsername("");
    setPassword("");
    setMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    if (!cleanUsername || !cleanPassword) {
      setMessage("Lütfen kullanıcı adı ve şifre alanlarını doldurun.");
      return;
    }

    if (mode === "teacher") {
      const response = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
      if (response.ok) {
        const nextParam = searchParams.get("next");
        setCurrentUser({ role: "teacher", username: cleanUsername });
        router.replace(nextParam?.startsWith("/") ? nextParam : "/ogretmen");
        return;
      }
      setMessage("Kullanıcı adı veya şifre hatalı.");
      return;
    }

    console.info("[student-login] submit_started");
    const response = await fetch("/api/student-session", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
    const payload = (await response.json()) as { ok?: boolean; message?: string; student?: Student };
    if (!response.ok || !payload.ok || !payload.student) {
      setMessage(payload.message ?? "Kullanıcı adı veya şifre hatalı.");
      return;
    }
    console.info("[student-login] api_success");
    setCurrentStudent(payload.student);
    setCurrentUser({ role: "student", username: payload.student.username, studentId: payload.student.id, studentName: payload.student.name });
    try {
      window.sessionStorage.setItem(STUDENT_LOGIN_GENERATION_KEY, String(Date.now()));
    } catch {
      // Session storage is an optimization for suppressing stale watcher races.
    }
    console.info("[student-login] replace_ogrenci");
    router.replace("/ogrenci");
  };

  const reasonMessage = searchParams.get("reason") === "password-changed" ? "Şifreniz değiştirildi. Yeni şifrenizle tekrar giriş yapın." : "";

  return (
    <div className="login-form-shell">
      <div className="login-mode-switch" role="tablist" aria-label="Giriş türü">
        <button type="button" role="tab" aria-selected={mode === "student"} onClick={() => resetForm("student")} className={mode === "student" ? "is-active" : ""}>Öğrenci girişi</button>
        <button type="button" role="tab" aria-selected={mode === "teacher"} onClick={() => resetForm("teacher")} className={mode === "teacher" ? "is-active" : ""}>Kurum / öğretmen</button>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <label><span>{mode === "student" ? "Öğrenci adı / kullanıcı adı" : "Kullanıcı adı / e-posta"}</span><div className="login-input-wrap"><UserIcon /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={mode === "student" ? "kayıtlı kullanıcı adın" : "yönetici kullanıcı adı"} autoComplete="username" autoCapitalize="none" spellCheck={false} /></div></label>
        <label><span>Şifre</span><div className="login-input-wrap"><LockIcon /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" /></div></label>
        <div className="login-form__options"><label className="login-check"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>Beni hatırla</span></label><button type="button" onClick={() => setMessage("Bu özellik yakında eklenecek.")} className="login-forgot">Şifremi unuttum</button></div>
        {reasonMessage ? <p className="login-message login-message--success" role="status">{reasonMessage}</p> : null}
        {message ? <p className="login-message" role="alert">{message}</p> : null}
        <button type="submit" disabled={!isMounted} className="login-submit">Giriş yap <span aria-hidden="true">→</span></button>
      </form>
    </div>
  );
}

function UserIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeWidth="1.8" d="M20 21a8 8 0 10-16 0" /><circle cx="12" cy="7.5" r="3.5" strokeWidth="1.8" /></svg>; }
function LockIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="10" width="14" height="10" rx="2.5" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="M8 10V7.5a4 4 0 118 0V10" /></svg>; }
