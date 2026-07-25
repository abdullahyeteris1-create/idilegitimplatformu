import Link from "next/link";
import { getEducationProgramCategoryLabel } from "@/lib/education-programs/categories";
import type { EducationProgramTemplateSummary } from "@/lib/education-programs/types";

type EducationProgramTemplateListProps = {
  templates: EducationProgramTemplateSummary[];
  errorMessage?: string;
};

function formatDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export function EducationProgramTemplateList({
  templates,
  errorMessage,
}: EducationProgramTemplateListProps) {
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800">
        {errorMessage}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/60">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-700">
          +
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
          Henüz Eğitim Programı bulunmuyor
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
          Yeniden kullanılabilir program şablonunuzu oluşturarak günlük çalışmaları planlamaya başlayın.
        </p>
        <Link
          href="/ogretmen/idil-panel/egitim-programlari/yeni"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
        >
          Yeni Program Oluştur
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 [data-idil-theme=dark]:border-slate-700">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
          <tr>
            <th className="px-4 py-3">Ad</th>
            <th className="px-4 py-3">Kategori</th>
            <th className="px-4 py-3">Gün</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Oluşturma</th>
            <th className="px-4 py-3">Son güncelleme</th>
            <th className="px-4 py-3">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white [data-idil-theme=dark]:divide-slate-700 [data-idil-theme=dark]:bg-slate-900">
          {templates.map((template) => (
            <tr key={template.id} className="align-top transition hover:bg-slate-50 [data-idil-theme=dark]:hover:bg-slate-800/70">
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">{template.name}</p>
                {template.adminDescription ? (
                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                    {template.adminDescription}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4 text-slate-700 [data-idil-theme=dark]:text-slate-200">
                {getEducationProgramCategoryLabel(template.category)}
              </td>
              <td className="px-4 py-4 font-medium">{template.dayCount}</td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    template.status === "published"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {template.status === "published" ? "Yayında" : "Taslak"}
                </span>
              </td>
              <td className="px-4 py-4 text-xs text-slate-600 [data-idil-theme=dark]:text-slate-300">
                {formatDate(template.createdAt)}
              </td>
              <td className="px-4 py-4 text-xs text-slate-600 [data-idil-theme=dark]:text-slate-300">
                {formatDate(template.updatedAt)}
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ogretmen/idil-panel/egitim-programlari/template/${template.id}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 transition hover:bg-red-100"
                  >
                    Düzenle
                  </Link>
                  <button
                    type="button"
                    disabled
                    title="Kopyalama sonraki fazda etkinleştirilecek."
                    className="min-h-9 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-400"
                  >
                    Kopyala
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Silme sonraki fazda etkinleştirilecek."
                    className="min-h-9 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-400"
                  >
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
