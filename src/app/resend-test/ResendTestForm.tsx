"use client";

import { type FormEvent, useState } from "react";

type Feedback = {
  tone: "success" | "error";
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function ResendTestForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          html: message,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const apiMessage =
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "E-posta gönderilemedi.";

        setFeedback({ tone: "error", message: apiMessage });
        return;
      }

      const emailId =
        isRecord(payload) && typeof payload.id === "string"
          ? payload.id
          : null;

      if (!emailId) {
        setFeedback({
          tone: "error",
          message: "İşlem tamamlandı ancak e-posta kimliği alınamadı.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        message: `E-posta gönderildi. ID: ${emailId}`,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "Sunucuya ulaşılamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fee2e2_0%,#fff7f4_38%,#f8fafc_100%)] px-4 py-10 text-slate-950">
      <section className="mx-auto w-full max-w-2xl rounded-[28px] border border-red-100 bg-white/95 p-5 shadow-[0_22px_70px_rgba(153,27,27,0.12)] backdrop-blur md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Yalnızca geliştirme ortamı
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Resend e-posta testi
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Form, sunucu tarafındaki <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/send-email</code> endpoint&apos;ini çağırır.
        </p>

        <form className="mt-7 grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">
              Alıcı e-posta adresi
            </span>
            <input
              type="email"
              name="to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="alici@example.com"
              autoComplete="email"
              className="min-h-[50px] w-full rounded-xl border border-red-100 bg-white px-4 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Konu</span>
            <input
              type="text"
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Test e-postası"
              className="min-h-[50px] w-full rounded-xl border border-red-100 bg-white px-4 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">
              Mesaj
            </span>
            <textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="<strong>Merhaba!</strong> Bu bir Resend testidir."
              rows={8}
              className="w-full resize-y rounded-xl border border-red-100 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              required
            />
            <span className="text-xs text-slate-500">
              Mesaj alanında HTML kullanılabilir.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[52px] cursor-pointer touch-manipulation items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_50%,#991b1b_100%)] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Gönderiliyor…" : "E-posta Gönder"}
          </button>

          {feedback ? (
            <p
              role={feedback.tone === "error" ? "alert" : "status"}
              aria-live="polite"
              className={
                feedback.tone === "success"
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              }
            >
              {feedback.message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
