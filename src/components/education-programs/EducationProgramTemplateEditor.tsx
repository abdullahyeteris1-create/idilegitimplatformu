"use client";

import Link from "next/link";
import { type MouseEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveEducationProgramDayAction } from "@/app/ogretmen/idil-panel/egitim-programlari/actions";
import {
  EDUCATION_PROGRAM_EXERCISE_CATALOG,
  getEducationProgramExercise,
} from "@/lib/education-programs/exerciseCatalog";
import { getExerciseSettingsSchema } from "@/lib/education-programs/exerciseSettingsSchemas";
import type { ExerciseSettingsRangeFieldDef } from "@/lib/education-programs/exerciseSettingsSchemas";
import type {
  EducationProgramActionState,
  EducationProgramTemplate,
} from "@/lib/education-programs/types";

type SlotDraft = {
  exerciseSlug: string;
  durationSeconds: string;
  startingLevel: string;
  settings: Record<string, string>;
};

type DraftsByDay = Record<number, SlotDraft[]>;

const INITIAL_STATE: EducationProgramActionState = {
  status: "idle",
  message: "",
};

function errorStateFallback(): EducationProgramActionState {
  return {
    status: "error",
    message: "Gün kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
  };
}

const CATCH_SAME_MODE_LABELS: Record<string, string> = {
  word: "Kelime",
  letter: "Harf",
  symbol: "Sembol",
  number: "Rakam",
};

// Sema-guduml formda enum alanlarin ham (kod) degerleri yerine gosterilecek
// Turkce etiketler - anahtar "exerciseSlug:fieldKey" seklindedir, cunku ayni
// alan adi (orn. "mode") farkli egzersizlerde farkli deger kumelerine
// sahiptir. Eslesme yoksa ham deger (+ varsa unit) gosterilir.
const ENUM_OPTION_LABELS: Record<string, Record<string, string>> = {
  "goz-egzersizleri-kolonlar:flowDirection": { column: "Sütun Şeklinde", row: "Satır Şeklinde" },
  "ayni-olani-yakala:mode": CATCH_SAME_MODE_LABELS,
  "takistoskop:workMode": { automatic: "Otomatik", manual: "Manuel" },
  "takistoskop:contentType": { letter: "Harf", number: "Rakam", mixed: "Karışık" },
  "harf-rakam-sayma:mode": { letters: "Harfler", numbers: "Rakamlar", mixed: "Karışık" },
  "harf-rakam-sayma:difficulty": { normal: "Normal", hard: "Zor" },
  "hafiza-gelistirme:gridLayout": { "5x5": "5 x 5", "5x10": "5 x 10", "10x10": "10 x 10" },
  "blok-okuma:speedMode": { interval: "Atlama Hızı (ms)", wpm: "Kelime / Dakika" },
  "golgeleme:speedMode": { interval: "Atlama Hızı (ms)", wpm: "Kelime / Dakika" },
  "gruplama-calismasi:speedMode": { milliseconds: "Atlama Hızı (ms)", wordsPerMinute: "Okuma Hızı (kelime/dk)" },
};

// supportsDuration:false olan calismalarda (Anlama Testi, Okuma Hizi Testi)
// ogretmen sure alanini hic gormez; backend (validation.ts,
// studentProgramRepository.ts) ise HER gorev icin 1-21600 araliginda pozitif
// bir tam sayi zorunlu kilar. Bu sabit yalniz bu teknik zorunlulugu
// karsilamak icin gizli input'a yazilir - ilgili egzersiz client'lari bu
// degeri hicbir zaman okumaz/kullanmaz.
const DURATIONLESS_TASK_PLACEHOLDER_SECONDS = 60;

// integer-range alanlari (ornegin serbest kelime/dakika girisi) icin anlik
// istemci tarafi geri bildirim - sunucu tarafi asil dogrulama/kaydetme
// kararini validation.ts::validateExerciseSettingsValueDetailed ile verir,
// bu yalniz ogretmenin gecersiz bir deger yazdigini hemen gormesini saglar.
function isValidIntegerRangeInput(field: ExerciseSettingsRangeFieldDef, rawValue: string): boolean {
  if (!rawValue.trim()) return false;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return false;
  if (parsed < field.min || parsed > field.max) return false;
  const step = field.step ?? 1;
  return step <= 1 || (parsed - field.min) % step === 0;
}

const FIELD_CLASS =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-50";

function createSlotSettings(
  exerciseSlug: string,
  existingSettings?: Record<string, string | number | boolean>,
): Record<string, string> {
  const schema = getExerciseSettingsSchema(exerciseSlug);
  if (!schema) return {};

  const settings: Record<string, string> = {};
  for (const field of schema.fields) {
    const existing = existingSettings?.[field.key];
    settings[field.key] = existing !== undefined ? String(existing) : String(field.defaultValue);
  }
  return settings;
}

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
        durationSeconds:
          definition?.supportsDuration === false
            ? ""
            : task?.durationSeconds
              ? String(task.durationSeconds)
              : String(definition?.defaultDurationSeconds ?? 300),
        startingLevel:
          task?.startingLevel !== null && task?.startingLevel !== undefined
            ? String(task.startingLevel)
            : definition?.supportsLevel
              ? String(definition.levelMin ?? 1)
              : "",
        settings: task?.exerciseSlug
          ? createSlotSettings(task.exerciseSlug, task.settings)
          : {},
      };
    });
  }

  return result;
}

// Kaydedilmemis degisiklik (dirty) karsilastirmasi icin sabit alan sirali,
// deterministik bir string uretir - settings anahtarlari da sirali eklenir ki
// ayni icerik farkli ekleme sirasiyla girilse bile ayni serilestirme cikssin.
function serializeSlots(slots: SlotDraft[]): string {
  return JSON.stringify(
    slots.map((slot) => ({
      exerciseSlug: slot.exerciseSlug,
      durationSeconds: slot.durationSeconds,
      startingLevel: slot.startingLevel,
      settings: Object.keys(slot.settings)
        .sort()
        .map((key) => [key, slot.settings[key]]),
    })),
  );
}

// saveEducationProgramDayAction'in native form gonderiminde urettigi FormData
// ile birebir ayni alanlari programatik olarak uretir - readTaskInputs
// (actions.ts) bu alanlari degistirmeden okuyabilsin diye.
function buildDayFormData(slots: SlotDraft[], intent: "draft" | "publish"): FormData {
  const formData = new FormData();
  formData.set("intent", intent);

  slots.forEach((slot, index) => {
    const orderNumber = index + 1;
    const prefix = `task-${orderNumber}`;
    const definition = slot.exerciseSlug ? getEducationProgramExercise(slot.exerciseSlug) : undefined;
    formData.set(`${prefix}-exerciseSlug`, slot.exerciseSlug);
    formData.set(
      `${prefix}-durationSeconds`,
      definition?.supportsDuration === false
        ? String(DURATIONLESS_TASK_PLACEHOLDER_SECONDS)
        : slot.durationSeconds,
    );
    formData.set(`${prefix}-startingLevel`, slot.startingLevel);

    const schema = slot.exerciseSlug ? getExerciseSettingsSchema(slot.exerciseSlug) : undefined;
    if (schema) {
      for (const field of schema.fields) {
        formData.set(
          `${prefix}-settings-${field.key}`,
          slot.settings[field.key] ?? String(field.defaultValue),
        );
      }
    }
  });

  return formData;
}

export function EducationProgramTemplateEditor({
  template,
}: {
  template: EducationProgramTemplate;
}) {
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [draftsByDay, setDraftsByDay] = useState<DraftsByDay>(() => createDrafts(template));
  // Sunucudan gelen/en son basariyla kaydedilen durumun anlik goruntusu -
  // draftsByDay ile karsilastirilarak hangi gunlerin kaydedilmemis
  // (dirty) degisiklik tasidigi turetilir.
  const [savedSnapshotByDay, setSavedSnapshotByDay] = useState<DraftsByDay>(() =>
    createDrafts(template),
  );
  const [isSwitchingDay, setIsSwitchingDay] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switchNotice, setSwitchNotice] = useState<{ tone: "success" | "warning"; message: string } | null>(
    null,
  );
  // Efekt/olay handler'lari icinde stale closure olusmadan en son
  // draftsByDay'e erismek icin kullanilan referans - degeri yalnizca bir
  // efekt icinde (render disinda) guncellenir.
  const draftsByDayRef = useRef(draftsByDay);
  useEffect(() => {
    draftsByDayRef.current = draftsByDay;
  }, [draftsByDay]);

  const boundAction = useMemo(
    () => saveEducationProgramDayAction.bind(null, template.id, selectedDayNumber),
    [selectedDayNumber, template.id],
  );
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);

  // Native form (Taslak Kaydet/Yayinla) basariyla tamamlaninca ilgili gunun
  // saved snapshot'ini guncelle - boylece o gun artik dirty gorunmez.
  // Native submit hicbir zaman selectedDayNumber'i degistirmez (yalniz gun
  // secici handleDayChange bunu yapar), bu yuzden state degistiginde
  // selectedDayNumber halen kaydedilen gune aittir.
  useEffect(() => {
    if (state.status !== "success" && state.status !== "warning") return;

    const savedDay = selectedDayNumber;
    setSavedSnapshotByDay((current) => ({
      ...current,
      [savedDay]: draftsByDayRef.current[savedDay] ?? [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const selectedSlots = draftsByDay[selectedDayNumber] ?? [];
  const selectedExerciseSlugs = new Set(
    selectedSlots.map((slot) => slot.exerciseSlug).filter(Boolean),
  );

  const isDayDirty = (dayNumber: number): boolean => {
    const current = draftsByDay[dayNumber];
    const saved = savedSnapshotByDay[dayNumber];
    if (!current || !saved) return false;
    return serializeSlots(current) !== serializeSlots(saved);
  };

  const dirtyDayNumbers = Array.from({ length: template.dayCount }, (_, index) => index + 1).filter(
    (dayNumber) => isDayDirty(dayNumber),
  );

  async function handleDayChange(nextDayNumber: number) {
    if (nextDayNumber === selectedDayNumber || isSwitchingDay || pending) return;

    if (!isDayDirty(selectedDayNumber)) {
      setSwitchError(null);
      setSwitchNotice(null);
      setSelectedDayNumber(nextDayNumber);
      return;
    }

    setIsSwitchingDay(true);
    setSwitchError(null);
    setSwitchNotice(null);

    const currentDayNumber = selectedDayNumber;
    const currentSlots = draftsByDay[currentDayNumber] ?? [];

    let result: EducationProgramActionState;
    try {
      result = await saveEducationProgramDayAction(
        template.id,
        currentDayNumber,
        INITIAL_STATE,
        buildDayFormData(currentSlots, "draft"),
      );
    } catch {
      result = errorStateFallback();
    }

    setIsSwitchingDay(false);

    if (result.status === "error") {
      setSwitchError(result.message);
      return;
    }

    setSavedSnapshotByDay((current) => ({ ...current, [currentDayNumber]: currentSlots }));
    setSwitchNotice({
      tone: result.status === "warning" ? "warning" : "success",
      message: result.status === "warning" ? result.message : "Gün kaydedildi.",
    });
    setSelectedDayNumber(nextDayNumber);
  }

  function handlePublishClick(event: MouseEvent<HTMLButtonElement>) {
    const otherDirtyDays = dirtyDayNumbers.filter((dayNumber) => dayNumber !== selectedDayNumber);
    if (otherDirtyDays.length === 0) return;

    event.preventDefault();
    setSwitchError(
      `Kaydedilmemiş günler var. Lütfen bu günleri kaydedin: ${otherDirtyDays
        .map((dayNumber) => `${dayNumber}. gün`)
        .join(", ")}.`,
    );
  }

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
      durationSeconds:
        definition?.supportsDuration === false
          ? ""
          : definition
            ? String(definition.defaultDurationSeconds ?? 300)
            : "300",
      startingLevel: definition?.supportsLevel ? String(definition.levelMin ?? 1) : "",
      settings: exerciseSlug ? createSlotSettings(exerciseSlug) : {},
    });
  };

  const updateSlotSetting = (index: number, key: string, value: string) => {
    setDraftsByDay((current) => ({
      ...current,
      [selectedDayNumber]: (current[selectedDayNumber] ?? []).map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, settings: { ...slot.settings, [key]: value } } : slot,
      ),
    }));
  };

  const filledCountByDay = (dayNumber: number) =>
    (draftsByDay[dayNumber] ?? []).filter((slot) => slot.exerciseSlug).length;

  return (
    <div className="grid min-h-[680px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900/70">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Program günleri</p>
          <p className="mt-1 text-xs text-slate-500">
            {isSwitchingDay ? "Kaydediliyor..." : "Düzenlemek istediğiniz günü seçin."}
          </p>
        </div>
        <nav className="max-h-[620px] space-y-1.5 overflow-y-auto pr-1" aria-label="Program günleri">
          {Array.from({ length: template.dayCount }, (_, index) => {
            const dayNumber = index + 1;
            const filledCount = filledCountByDay(dayNumber);
            const selected = selectedDayNumber === dayNumber;
            const dirty = isDayDirty(dayNumber);

            return (
              <button
                key={dayNumber}
                type="button"
                onClick={() => void handleDayChange(dayNumber)}
                disabled={isSwitchingDay || pending}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-red-500 bg-red-600 text-white shadow-sm"
                    : filledCount === 5
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50"
                }`}
              >
                <span>
                  Gün {dayNumber}
                  {dirty ? <span aria-label="Kaydedilmemiş değişiklik" className={selected ? "text-amber-200" : "text-amber-600"}> •</span> : null}
                </span>
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
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
                template.status === "published"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {template.status === "published" ? "Yayında" : "Taslak"}
            </span>
            <p className="max-w-xs text-right text-xs text-slate-500 sm:text-right">
              {template.status === "published"
                ? "Bu şablon öğrencilere atanabilir."
                : "Taslak şablonlar öğrencilere atanamaz. Atamak için önce yayınlayın."}
            </p>
          </div>
        </div>

        {switchError ? (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            <p>{switchError}</p>
          </div>
        ) : switchNotice ? (
          <div
            role="status"
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
              switchNotice.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <p>{switchNotice.message}</p>
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          {state.status !== "idle" ? (
            <div
              role={state.status === "error" || state.status === "warning" ? "alert" : "status"}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                state.status === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : state.status === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
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
            const settingsSchema = slot.exerciseSlug
              ? getExerciseSettingsSchema(slot.exerciseSlug)
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

                  {definition && definition.supportsDuration === false ? (
                    <>
                      <input
                        type="hidden"
                        name={`task-${orderNumber}-durationSeconds`}
                        value={DURATIONLESS_TASK_PLACEHOLDER_SECONDS}
                      />
                      <label className="grid gap-1.5">
                        <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                          Süre (saniye)
                        </span>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value="Bu çalışmada süre yok"
                          className={FIELD_CLASS}
                        />
                      </label>
                    </>
                  ) : (
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
                  )}

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

                  {settingsSchema ? (
                    settingsSchema.fields.map((field) => {
                      if (field.type === "integer-range") {
                        const rawValue = slot.settings[field.key] ?? String(field.defaultValue);
                        const invalid = !isValidIntegerRangeInput(field, rawValue);
                        return (
                          <label key={field.key} className="grid gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                              {field.label}
                              {field.unit ? ` (${field.unit})` : ""}
                            </span>
                            <input
                              type="number"
                              name={`task-${orderNumber}-settings-${field.key}`}
                              min={field.min}
                              max={field.max}
                              step={field.step ?? 1}
                              value={rawValue}
                              onChange={(event) =>
                                updateSlotSetting(index, field.key, event.target.value)
                              }
                              className={FIELD_CLASS}
                            />
                            {invalid ? (
                              <p className="text-xs font-medium text-red-700">
                                {field.label} {field.min}-{field.max} arasında bir tam sayı olmalıdır.
                              </p>
                            ) : null}
                          </label>
                        );
                      }

                      return (
                        <label key={field.key} className="grid gap-1.5">
                          <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                            {field.label}
                            {field.unit ? ` (${field.unit})` : ""}
                          </span>
                          <select
                            name={`task-${orderNumber}-settings-${field.key}`}
                            value={slot.settings[field.key] ?? String(field.defaultValue)}
                            onChange={(event) =>
                              updateSlotSetting(index, field.key, event.target.value)
                            }
                            className={FIELD_CLASS}
                          >
                            {field.options.map((option) => {
                              const enumLabel =
                                ENUM_OPTION_LABELS[`${settingsSchema.exerciseSlug}:${field.key}`]?.[
                                  option as string
                                ];
                              return (
                                <option key={option} value={option}>
                                  {enumLabel ?? `${option}${field.unit ? ` ${field.unit}` : ""}`}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      );
                    })
                  ) : (
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">
                        Egzersize özel ayarlar
                      </span>
                      <input
                        type="text"
                        readOnly
                        value={
                          definition
                            ? "Bu egzersiz için özel ayarlar henüz desteklenmiyor. Egzersiz varsayılan ayarlarla çalışacaktır."
                            : "Ayarları görmek için egzersiz seçin."
                        }
                        className={`${FIELD_CLASS} cursor-not-allowed bg-slate-100 text-xs text-slate-500`}
                      />
                    </label>
                  )}
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
              disabled={pending || isSwitchingDay}
              className="min-h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Taslak Kaydet"}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending || isSwitchingDay}
              onClick={handlePublishClick}
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
