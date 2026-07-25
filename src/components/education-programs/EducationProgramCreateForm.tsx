"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createEducationProgramAction } from "@/app/ogretmen/idil-panel/egitim-programlari/actions";
import { EDUCATION_PROGRAM_CATEGORIES } from "@/lib/education-programs/categories";
import type { EducationProgramActionState } from "@/lib/education-programs/types";

const INITIAL_STATE: EducationProgramActionState = {
  status: "idle",
  message: "",
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-50";

export function EducationProgramCreateForm() {
  const [state, formAction, pending] = useActionState(
    createEducationProgramAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <p>{state.message}</p>
          {state.issues && state.issues.length > 1 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.issues.map((issue, index) => (
                <li key={`${issue.field}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Program adı
          </span>
          <input
            name="name"
            type="text"
            maxLength={120}
            required
            autoFocus
            className={INPUT_CLASS}
            placeholder="Örn. 2. Sınıf Başlangıç Programı"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Kategori
          </span>
          <select name="category" required defaultValue="" className={INPUT_CLASS}>
            <option value="" disabled>Kategori seçin</option>
            {EDUCATION_PROGRAM_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">Kategori yalnız yönetici filtresi olarak kullanılır.</span>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
          Açıklama
        </span>
        <textarea
          name="adminDescription"
          maxLength={2000}
          rows={5}
          className={`${INPUT_CLASS} resize-y`}
          placeholder="Yöneticiye özel program açıklaması"
        />
      </label>

      <label className="grid max-w-xs gap-1.5">
        <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
          Gün sayısı
        </span>
        <input
          name="dayCount"
          type="number"
          min={1}
          max={60}
          step={1}
          required
          defaultValue={20}
          className={INPUT_CLASS}
        />
        <span className="text-xs text-slate-500">1–60 gün desteklenir; varsayılan 20 gündür.</span>
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end [data-idil-theme=dark]:border-slate-700">
        <Link
          href="/ogretmen/idil-panel/egitim-programlari"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          İptal
        </Link>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="min-h-11 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Taslak Kaydet"}
        </button>
        <button
          type="submit"
          name="intent"
          value="edit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
