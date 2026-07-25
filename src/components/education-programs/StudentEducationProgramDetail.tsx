import type {
  StudentEducationProgramDayStatus,
  StudentEducationProgramDetail as StudentEducationProgramDetailValue,
  StudentEducationProgramStatus,
} from "@/lib/education-programs/studentProgramTypes";

const PROGRAM_STATUS_LABELS: Record<StudentEducationProgramStatus, string> = {
  active: "Aktif",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const DAY_STATUS_LABELS: Record<StudentEducationProgramDayStatus, string> = {
  locked: "Kilitli",
  available: "Hazır",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
};

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  if (seconds % 60 === 0) return `${seconds / 60} dk`;
  return `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`;
}

function formatSettings(settings: Record<string, string | number | boolean>): string {
  const entries = Object.entries(settings);
  if (entries.length === 0) return "Varsayılan ayarlar";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

export function StudentEducationProgramDetail({
  program,
}: {
  program: StudentEducationProgramDetailValue;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/70">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Öğrenci
          </p>
          <p className="mt-1 font-semibold">{program.studentName}</p>
          <p className="text-xs text-slate-500">
            {program.studentClassName ?? "Sınıf bilgisi yok"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Program
          </p>
          <p className="mt-1 font-semibold">{program.visibleName}</p>
          <p className="text-xs text-slate-500">
            {program.sourceTemplateName} · v{program.sourceTemplateVersion}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Durum / ilerleme
          </p>
          <p className="mt-1 font-semibold">{PROGRAM_STATUS_LABELS[program.status]}</p>
          <p className="text-xs text-slate-500">
            {program.completedDays}/{program.totalDays} gün · Gün{" "}
            {program.currentDayNumber}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Atama
          </p>
          <p className="mt-1 font-semibold">{formatDate(program.assignedAt)}</p>
          <p className="text-xs text-slate-500">
            Atayan: {program.assignedBy ?? "—"}
          </p>
        </div>
      </section>

      {program.studentMessage || program.adminNote ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <p className="font-semibold">Öğrenci mesajı</p>
            <p className="mt-2 whitespace-pre-wrap">
              {program.studentMessage ?? "Mesaj eklenmemiş."}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Yönetici notu</p>
            <p className="mt-2 whitespace-pre-wrap">
              {program.adminNote ?? "Not eklenmemiş."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {program.days.map((day) => (
          <article
            key={day.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                  Gün {day.dayNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {day.title ?? `Program günü ${day.dayNumber}`}
                </h2>
                {day.description ? (
                  <p className="mt-1 text-sm text-slate-500">{day.description}</p>
                ) : null}
              </div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {DAY_STATUS_LABELS[day.status]}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-5">
              {day.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800/70"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Çalışma {task.orderNumber}
                  </p>
                  <p className="mt-1 font-semibold">{task.exerciseTitle}</p>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    <div className="flex justify-between gap-2">
                      <dt>Süre</dt>
                      <dd className="font-semibold">{formatDuration(task.durationSeconds)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Seviye</dt>
                      <dd className="font-semibold">{task.startingLevel ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Durum</dt>
                      <dd className="font-semibold">{DAY_STATUS_LABELS[task.status]}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 break-words border-t border-slate-200 pt-2 text-xs text-slate-500">
                    {formatSettings(task.settings)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
