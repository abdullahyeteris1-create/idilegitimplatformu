"use client";

import { useState } from "react";

export function TeacherParagraphAccess({ studentId, initialEnabled }: { studentId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleChange(nextEnabled: boolean) {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    setError(false);
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphExercisesEnabled: nextEnabled }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; student?: { paragraphExercisesEnabled?: boolean } } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Erişim ayarı güncellenemedi.");
      }
      const saved = payload.student?.paragraphExercisesEnabled === true;
      setEnabled(saved);
      setFeedback(saved ? "Paragraf Çalışmaları öğrenci için aktif edildi." : "Paragraf Çalışmaları öğrenci için pasif edildi.");
    } catch (changeError) {
      setError(true);
      setFeedback(changeError instanceof Error ? changeError.message : "Erişim ayarı güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="additional-exercise-access" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="additional-exercise-access" className="text-lg font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">Ek Çalışma Erişimleri</h2>
          <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">Öğrenciye özel, öğretmen kontrollü ek çalışma alanları.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${enabled ? "text-emerald-700 [data-idil-theme=dark]:text-emerald-300" : "text-slate-500 [data-idil-theme=dark]:text-slate-400"}`}>{enabled ? "Aktif" : "Pasif"}</span>
          <button type="button" role="switch" aria-checked={enabled} aria-label="Paragraf Çalışmaları erişimini değiştir" disabled={saving} onClick={() => void handleChange(!enabled)} className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${enabled ? "bg-emerald-600" : "bg-slate-300 [data-idil-theme=dark]:bg-slate-700"} disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]`}>
            <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
        <p className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">Paragraf Çalışmaları</p>
        <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">İleri düzey paragraf ve anlama çalışmaları.</p>
      </div>
      {feedback ? <p className={`mt-3 text-sm font-semibold ${error ? "text-red-700 [data-idil-theme=dark]:text-red-300" : "text-emerald-700 [data-idil-theme=dark]:text-emerald-300"}`} role={error ? "alert" : "status"}>{feedback}</p> : null}
    </section>
  );
}
