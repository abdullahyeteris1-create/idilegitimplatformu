"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { assignEducationProgramAction } from "@/app/ogretmen/idil-panel/egitim-programlari/actions";
import { getEducationProgramCategoryLabel } from "@/lib/education-programs/categories";
import type { StudentEducationProgramAssignmentOptions } from "@/lib/education-programs/studentProgramTypes";
import { DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME } from "@/lib/education-programs/studentProgramValidation";

const INITIAL_STATE = {
  status: "idle" as const,
  message: "",
};

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-50";

function formatDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export function EducationProgramAssignmentForm({
  options,
}: {
  options: StudentEducationProgramAssignmentOptions;
}) {
  const [state, formAction, pending] = useActionState(
    assignEducationProgramAction,
    INITIAL_STATE,
  );
  const [studentId, setStudentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const selectedStudent = options.students.find((student) => student.id === studentId);
  const selectedTemplate = options.templates.find(
    (template) => template.id === templateId,
  );
  const assignableStudentCount = options.students.filter(
    (student) => !student.activeProgramId,
  ).length;
  const canSubmit =
    Boolean(selectedStudent) &&
    !selectedStudent?.activeProgramId &&
    Boolean(selectedTemplate) &&
    !pending;

  return (
    <form action={formAction} className="space-y-5">
      {state.status !== "idle" ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <p>{state.message}</p>
          {state.issues?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.issues.map((issue, index) => (
                <li key={`${issue.field}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {assignableStudentCount === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Program atanabilecek aktif öğrenci bulunmuyor. Aktif programı olan
          öğrenciler, mevcut program tamamlanana veya iptal edilene kadar yeniden
          seçilemez.
        </div>
      ) : null}

      {options.templates.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Atanabilir yayınlanmış ve aktif bir şablon bulunmuyor. Önce{" "}
          <Link
            href="/ogretmen/idil-panel/egitim-programlari"
            className="font-semibold underline"
          >
            program şablonunu yayınlayın
          </Link>
          .
        </div>
      ) : null}

        <fieldset className="grid gap-4 border-0 p-0 lg:grid-cols-2">
          <legend className="sr-only">Öğrenci ve program seçimi</legend>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Öğrenci
          </span>
          <select
            name="studentId"
            required
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Öğrenci seçin</option>
            {options.students.map((student) => (
              <option
                key={student.id}
                value={student.id}
                disabled={Boolean(student.activeProgramId)}
              >
                {student.name}
                {student.className ? ` · ${student.className}` : ""}
                {student.activeProgramId
                  ? ` · Aktif programı var: ${student.activeProgramName ?? "Program"}`
                  : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Yalnız aktif öğrenciler gösterilir. Aktif programı olanlar işaretlenir
            ve seçilemez.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Program şablonu
          </span>
          <select
            name="templateId"
            required
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Yayınlanmış şablon seçin</option>
            {options.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {getEducationProgramCategoryLabel(template.category)}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Yalnız yayınlanmış ve aktif şablonlar atanabilir.
          </span>
        </label>
        </fieldset>

      {selectedTemplate ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/70">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Şablon
            </p>
            <p className="mt-1 font-semibold">{selectedTemplate.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kategori
            </p>
            <p className="mt-1 font-semibold">
              {getEducationProgramCategoryLabel(selectedTemplate.category)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Süre
            </p>
            <p className="mt-1 font-semibold">{selectedTemplate.dayCount} gün</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sürüm / güncelleme
            </p>
            <p className="mt-1 font-semibold">
              v{selectedTemplate.version} · {formatDate(selectedTemplate.updatedAt)}
            </p>
          </div>
        </div>
      ) : null}

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
          Öğrenciye görünen program adı
        </span>
        <input
          name="visibleName"
          type="text"
          required
          maxLength={120}
          defaultValue={DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME}
          className={FIELD_CLASS}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Öğrenci mesajı
          </span>
          <textarea
            name="studentMessage"
            rows={5}
            maxLength={1000}
            placeholder="Öğrenciye gösterilecek isteğe bağlı mesaj"
            className={FIELD_CLASS}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800 [data-idil-theme=dark]:text-slate-100">
            Yönetici notu
          </span>
          <textarea
            name="adminNote"
            rows={5}
            maxLength={2000}
            placeholder="Yalnız yöneticinin göreceği isteğe bağlı not"
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end [data-idil-theme=dark]:border-slate-700">
        <Link
          href="/ogretmen/idil-panel/egitim-programlari"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          İptal
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Program atanıyor..." : "Programı Ata"}
        </button>
      </div>
    </form>
  );
}
