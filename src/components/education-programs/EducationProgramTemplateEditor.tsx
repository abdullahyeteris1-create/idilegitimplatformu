"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveEducationProgramDayAction } from "@/app/ogretmen/idil-panel/egitim-programlari/actions";
import {
  EDUCATION_PROGRAM_EXERCISE_CATALOG,
  getEducationProgramExercise,
} from "@/lib/education-programs/exerciseCatalog";
import type {
  EducationProgramActionState,
  EducationProgramTemplate,
} from "@/lib/education-programs/types";

type SlotDraft = {
  exerciseSlug: string;
  durationSeconds: string;
  startingLevel: string;
};

type DraftsByDay = Record<number, SlotDraft[]>;

const INITIAL_STATE: EducationProgramActionState = {
  status: "idle",
  message: "",
};

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-50";

function createDrafts(template: EducationProgramTemplate): DraftsByDay {
  const result: DraftsByDay = {};

  for (let dayNumber = 1; dayNumber <= template.dayCount; dayNumber += 1) {
    const day = template.days.find((item) => item.dayNumber === dayNumber);
    result[dayNumber] = Array.from({ length: 5 }, (_, index) => {
      const task = day?.tasks.find((item) => item.orderNumber === index + 1);
      const definition = task?.exerciseSlug
        ? getEducationProgramExercise(task.exerciseSlug)
        : undefined;

      return {
        exerciseSlug: task?.exerciseSlug ?? "",
        durationSeconds: task?.durationSeconds
          ? String(task.durationSeconds)
          : String(definition?.defaultDurationSeconds ?? 300),
        startingLevel:
          task?.startingLevel !== null && task?.startingLevel !== undefined
            ? String(task.startingLevel)
            : definition?.supportsLevel
              ? String(definition.levelMin ?? 1)
              : "",
      };
    });
  }

  return result;
}

export function EducationProgramTemplateEditor({
  template,
}: {
  template: EducationProgramTemplate;
}) {
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [draftsByDay, setDraftsByDay] = useState<DraftsByDay>(() => createDrafts(template));
  const boundAction = useMemo(
    () => saveEducationProgramDayAction.bind(null, template.id, selectedDayNumber),
    [selectedDayNumber, template.id],
  );
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);

  const selectedSlots = draftsByDay[selectedDayNumber] ?? [];
  const selectedExerciseSlugs = new Set(
    selectedSlots.map((slot) => slot.exerciseSlug).filter(Boolean),
  );

  const updateSlot = (index: number, update: Partial<SlotDraft>) => {
    setDraftsByDay((current) => ({
      ...current,
      [selectedDayNumber]: (current[selectedDayNumber] ?? []).map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...update } : slot,
      ),
    }));
  };

  const handleExerciseChange = (index: number, exerciseSlug: string) => {
    const definition = getEducationProgramExercise(exerciseSlug);
    updateSlot(index, {
      exerciseSlug,
      durationSeconds: definition ? String(definition.defaultDurationSeconds) : "300",
      startingLevel: definition?.supportsLevel ? String(definition.levelMin ?? 1) : "",
    });
  };

  const filledCountByDay = (dayNumber: number) =>
    (draftsByDay[dayNumber] ?? []).filter((slot) => slot.exerciseSlug).length;

  return (
    <div className="grid min-h-[680px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/70">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Program günleri</p>
          <p className="mt-1 text-xs text-slate-500">Düzenlemek istediğiniz günü seçin.</p>
        </div>
        <nav className="max-h-[620px] space-y-1.5 overflow-y-auto pr-1" aria-label="Program günleri">
          {Array.from({ length: template.dayCount }, (_, index) => {
            const dayNumber = index + 1;
            const filledCount = filledCountByDay(dayNumber);
            const selected = selectedDayNumber === dayNumber;

            return (
              <button
                key={dayNumber}
                type="button"
                onClick={() => setSelectedDayNumber(dayNumber)}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  selected
                    ? "border-red-500 bg-red-600 text-white shadow-sm"
                    : filledCount === 5
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50"
                }`}
              >
                <span>Gün {dayNumber}</span>
                <span className={`text-xs ${selected ? "text-red-100" : "text-slate-500"}`}>
                  {filledCount}/5
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Seçilen gün</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
              Gün {selectedDayNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Her gün tam beş çalışma seçilmelidir.</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
              template.status === "published"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {template.status === "published" ? "Yayında" : "Taslak"}
          </span>
        </div>

        <form action={formAction} className="space-y-4">
          {state.status !== "idle" ? (
            <div
              role={state.status === "error" ? "alert" : "status"}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                state.status === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p>{state.message}</p>
              {state.issues?.length ? (
                <ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5">
                  {state.issues.slice(0, 30).map((issue, index) => (
                    <li key={`${issue.dayNumber ?? "form"}-${issue.orderNumber ?? 0}-${index}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {selectedSlots.map((slot, index) => {
            const orderNumber = index + 1;
            const definition = slot.exerciseSlug
              ? getEducationProgramExercise(slot.exerciseSlug)
              : undefined;

            return (
              <article
                key={`${selectedDayNumber}-${orderNumber}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                      Çalışma {orderNumber}
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                      {definition?.title ?? "Egzersiz seçilmedi"}
                    </h3>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                    {orderNumber}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                      Egzersiz seç
                    </span>
                    <select
                      name={`task-${orderNumber}-exerciseSlug`}
                      value={slot.exerciseSlug}
                      onChange={(event) => handleExerciseChange(index, event.target.value)}
                      className={FIELD_CLASS}
                    >
                      <option value="">Egzersiz seçin</option>
                      {EDUCATION_PROGRAM_EXERCISE_CATALOG.map((exercise) => (
                        <option
                          key={exercise.slug}
                          value={exercise.slug}
                          disabled={
                            selectedExerciseSlugs.has(exercise.slug) &&
                            slot.exerciseSlug !== exercise.slug
                          }
                        >
                          {exercise.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                      Süre (saniye)
                    </span>
                    <input
                      name={`task-${orderNumber}-durationSeconds`}
                      type="number"
                      min={1}
                      max={21600}
                      step={1}
                      disabled={!definition}
                      value={slot.durationSeconds}
                      onChange={(event) => updateSlot(index, { durationSeconds: event.target.value })}
                      className={FIELD_CLASS}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                      Seviye
                    </span>
                    <input
                      name={`task-${orderNumber}-startingLevel`}
                      type="number"
                      min={definition?.levelMin ?? 1}
                      max={definition?.levelMax}
                      step={1}
                      disabled={!definition?.supportsLevel}
                      value={definition?.supportsLevel ? slot.startingLevel : ""}
                      onChange={(event) => updateSlot(index, { startingLevel: event.target.value })}
                      placeholder={definition ? "Bu egzersizde seviye yok" : "Önce egzersiz seçin"}
                      className={FIELD_CLASS}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                      Egzersize özel ayarlar
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={
                        definition?.settingsPlaceholder ??
                        "Ayarları görmek için egzersiz seçin."
                      }
                      className={`${FIELD_CLASS} cursor-not-allowed bg-slate-100 text-xs text-slate-500`}
                    />
                  </label>
                </div>
              </article>
            );
          })}

          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:justify-end [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/95">
            <Link
              href="/ogretmen/idil-panel/egitim-programlari"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="min-h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Taslak Kaydet"}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="min-h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
            >
              {pending ? "Doğrulanıyor..." : "Yayınla"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
