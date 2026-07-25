import Link from "next/link";
import type { StudentEducationProgramSummary } from "@/lib/education-programs/studentProgramTypes";

const STATUS_LABELS = {
  active: "Aktif",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
} as const;

function formatDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export function StudentEducationProgramList({
  programs,
  errorMessage,
}: {
  programs: StudentEducationProgramSummary[];
  errorMessage?: string;
}) {
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800">
        {errorMessage}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/60">
        <h2 className="text-xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
          Henüz öğrenci programı bulunmuyor
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
          Yayınlanmış bir şablonu aktif bir öğrenciye atayarak başlayın.
        </p>
        <Link
          href="/ogretmen/idil-panel/egitim-programlari/ata"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)]"
        >
          Öğrenciye Program Ata
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 [data-idil-theme=dark]:border-slate-700">
      <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
          <tr>
            <th className="px-4 py-3">Öğrenci</th>
            <th className="px-4 py-3">Program adı</th>
            <th className="px-4 py-3">Kaynak şablon</th>
            <th className="px-4 py-3">Toplam gün</th>
            <th className="px-4 py-3">Mevcut gün</th>
            <th className="px-4 py-3">Tamamlanan gün</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Atanma tarihi</th>
            <th className="px-4 py-3">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white [data-idil-theme=dark]:divide-slate-700 [data-idil-theme=dark]:bg-slate-900">
          {programs.map((program) => (
            <tr
              key={program.id}
              className="align-top transition hover:bg-slate-50 [data-idil-theme=dark]:hover:bg-slate-800/70"
            >
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                  {program.studentName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {program.studentClassName ?? "Sınıf bilgisi yok"}
                </p>
              </td>
              <td className="px-4 py-4 font-semibold">{program.visibleName}</td>
              <td className="px-4 py-4">
                <p>{program.sourceTemplateName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Snapshot sürümü v{program.sourceTemplateVersion}
                </p>
              </td>
              <td className="px-4 py-4 font-semibold">{program.totalDays}</td>
              <td className="px-4 py-4 font-semibold">
                {program.currentDayNumber}
              </td>
              <td className="px-4 py-4 font-semibold">
                {program.completedDays}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    program.status === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : program.status === "completed"
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_LABELS[program.status]}
                </span>
              </td>
              <td className="px-4 py-4 text-xs text-slate-600 [data-idil-theme=dark]:text-slate-300">
                {formatDate(program.assignedAt)}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/ogretmen/idil-panel/ogrenci-programlari/${program.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 transition hover:bg-red-100"
                >
                  Görüntüle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
