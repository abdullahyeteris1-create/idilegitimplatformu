"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { ASSIGNMENT_CLASS_GROUP_LABELS, type AssignmentClassGroup } from "@/lib/assignments/classGroups";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import type {
  AssignmentExerciseDefinition,
  AssignmentSettingsFieldSchema,
  ProgramClassTemplate,
  ProgramTemplateSlot,
} from "@/lib/assignments/types";
import {
  CARD_SURFACE_CLASS,
  INPUT_CLASS,
  MUTED_TEXT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TASK_ORDERS,
  dayNumbers,
  formatDurationLabel,
  getSettingFieldLabel,
  indexSlots,
  slotKey,
  usedSlugsForDay,
} from "../templateUi";

type EditorResponse = {
  ok?: boolean;
  message?: string;
  template?: ProgramClassTemplate;
  slots?: ProgramTemplateSlot[];
  expectedSlotCount?: number;
  catalog?: AssignmentExerciseDefinition[];
};

type SlotDraft = {
  exerciseSlug: string;
  startingLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
};

type TemplateData = {
  template: ProgramClassTemplate | null;
  slots: ProgramTemplateSlot[];
  catalog: AssignmentExerciseDefinition[];
  error: string | null;
};

/**
 * Saf veri getirme - hicbir setState cagirmaz, yalniz sonucu doner. Boylece
 * effect govdesinde senkron setState olmaz (mevcut TodaysProgramTasksCard
 * deseniyle ayni).
 */
async function fetchTemplateData(templateId: string): Promise<TemplateData> {
  try {
    const response = await fetch(`/api/admin/assignment-program/template-library/${encodeURIComponent(templateId)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json()) as EditorResponse;

    if (!response.ok || !payload.ok || !payload.template) {
      return { template: null, slots: [], catalog: [], error: payload.message ?? "Şablon yüklenemedi." };
    }

    return {
      template: payload.template,
      slots: payload.slots ?? [],
      catalog: payload.catalog ?? [],
      error: null,
    };
  } catch {
    return { template: null, slots: [], catalog: [], error: "Şablon yüklenemedi. Lütfen tekrar deneyin." };
  }
}

function SettingInput({
  fieldKey,
  schema,
  value,
  onChange,
}: {
  fieldKey: string;
  schema: AssignmentSettingsFieldSchema;
  value: string | number | boolean;
  onChange: (next: string | number | boolean) => void;
}) {
  const label = getSettingFieldLabel(fieldKey);
  const inputId = `slot-setting-${fieldKey}`;

  if (schema.kind === "boolean") {
    return (
      <label htmlFor={inputId} className="flex min-h-[44px] items-center justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={value === true}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
      </label>
    );
  }

  if (schema.kind === "enum") {
    return (
      <label htmlFor={inputId} className="grid gap-1 text-sm font-medium">
        <span>{label}</span>
        <select
          id={inputId}
          value={String(value)}
          onChange={(event) => {
            const raw = event.target.value;
            const matched = schema.values.find((option) => String(option) === raw);
            onChange(matched ?? raw);
          }}
          className={INPUT_CLASS}
        >
          {schema.values.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label htmlFor={inputId} className="grid gap-1 text-sm font-medium">
      <span>
        {label}
        {typeof schema.max === "number" ? ` (${schema.min}-${schema.max})` : ` (en az ${schema.min})`}
      </span>
      <input
        id={inputId}
        type="number"
        min={schema.min}
        max={schema.max}
        step={1}
        value={typeof value === "number" ? value : Number(value) || schema.min}
        onChange={(event) => onChange(Number(event.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}

export function TemplateEditorClient({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<ProgramClassTemplate | null>(null);
  const [slots, setSlots] = useState<ProgramTemplateSlot[]>([]);
  const [catalog, setCatalog] = useState<AssignmentExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ dayNumber: number; taskOrder: number } | null>(null);
  const [draft, setDraft] = useState<SlotDraft | null>(null);

  const readyExercises = useMemo(
    () => catalog.filter((definition) => definition.integrationStatus === "ready"),
    [catalog],
  );
  const definitionBySlug = useMemo(
    () => new Map(catalog.map((definition) => [definition.exerciseSlug, definition])),
    [catalog],
  );
  const slotIndex = useMemo(() => indexSlots(slots), [slots]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await fetchTemplateData(templateId);
      if (cancelled) return;

      setTemplate(data.template);
      setSlots(data.slots);
      setCatalog(data.catalog);
      setError(data.error);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const openSlot = (dayNumber: number, taskOrder: number) => {
    setSuccess(null);
    setError(null);
    setSelected({ dayNumber, taskOrder });

    const existing = slotIndex.get(slotKey(dayNumber, taskOrder));
    if (existing) {
      setDraft({
        exerciseSlug: existing.exerciseSlug,
        startingLevel: existing.startingLevel,
        durationSeconds: existing.durationSeconds,
        settings: { ...existing.settings },
      });
      return;
    }

    const used = usedSlugsForDay(slots, dayNumber);
    const firstAvailable = readyExercises.find((definition) => !used.has(definition.exerciseSlug));
    setDraft(
      firstAvailable
        ? {
            exerciseSlug: firstAvailable.exerciseSlug,
            startingLevel: firstAvailable.supportsLevel ? (firstAvailable.levelMin ?? 1) : 1,
            durationSeconds: template?.defaultTaskDurationSeconds ?? 300,
            settings: { ...firstAvailable.defaultSettings },
          }
        : null,
    );
  };

  const changeExercise = (exerciseSlug: string) => {
    const definition = definitionBySlug.get(exerciseSlug);
    if (!definition) return;
    setDraft({
      exerciseSlug,
      startingLevel: definition.supportsLevel ? (definition.levelMin ?? 1) : 1,
      durationSeconds: template?.defaultTaskDurationSeconds ?? 300,
      settings: { ...definition.defaultSettings },
    });
  };

  const saveSlot = async () => {
    if (!selected || !draft) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      // Tek slot kaydi, koleksiyon rotasina PATCH ile gider; konum bilgisi
      // (dayNumber/taskOrder) govdededir - bkz. slots/route.ts basindaki not.
      const response = await fetch(
        `/api/admin/assignment-program/template-library/${encodeURIComponent(templateId)}/slots`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, dayNumber: selected.dayNumber, taskOrder: selected.taskOrder }),
        },
      );
      const payload = (await response.json()) as { ok?: boolean; message?: string; slot?: ProgramTemplateSlot };
      if (!response.ok || !payload.ok || !payload.slot) {
        setError(payload.message ?? "Çalışma kaydedilemedi.");
        return;
      }

      const saved = payload.slot;
      setSlots((current) => [
        ...current.filter(
          (slot) => !(slot.dayNumber === saved.dayNumber && slot.taskOrder === saved.taskOrder),
        ),
        saved,
      ]);
      setSuccess(`${saved.dayNumber}. gün / ${saved.taskOrder}. çalışma kaydedildi.`);
      setSelected(null);
      setDraft(null);
    } catch {
      setError("Çalışma kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const clearSlot = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/admin/assignment-program/template-library/${encodeURIComponent(templateId)}/slots?dayNumber=${selected.dayNumber}&taskOrder=${selected.taskOrder}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Çalışma silinemedi.");
        return;
      }
      setSlots((current) =>
        current.filter((slot) => !(slot.dayNumber === selected.dayNumber && slot.taskOrder === selected.taskOrder)),
      );
      setSuccess(`${selected.dayNumber}. gün / ${selected.taskOrder}. çalışma boşaltıldı.`);
      setSelected(null);
      setDraft(null);
    } catch {
      setError("Çalışma silinemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const expectedSlotCount = template ? template.programDays * template.tasksPerDay : 0;
  const selectedDefinition = draft ? definitionBySlug.get(draft.exerciseSlug) : undefined;
  const usedInSelectedDay = selected ? usedSlugsForDay(slots, selected.dayNumber, selected.taskOrder) : new Set<string>();

  return (
    <AppShell
      title={template ? template.name : "Şablon Düzenle"}
      subtitle="Her günün 5 çalışmasını ve ayarlarını tek tek belirleyin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <TeacherOnly>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/ogretmen/idil-panel/odev-programi" className={SECONDARY_BUTTON_CLASS}>
              ← Şablon kütüphanesi
            </Link>
            {template ? (
              <p className={MUTED_TEXT_CLASS}>
                {ASSIGNMENT_CLASS_GROUP_LABELS[template.classGroup as AssignmentClassGroup] ?? template.classGroup} ·{" "}
                {template.programDays} gün · <strong>{slots.length}</strong> / {expectedSlotCount} çalışma dolu
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {success}
            </p>
          ) : null}

          {selected && template ? (
            <PanelCard
              title={`${selected.dayNumber}. Gün — ${selected.taskOrder}. Çalışma`}
              subtitle="Çalışmayı, seviyesini, süresini ve ayarlarını belirleyin"
            >
              {!draft ? (
                <p className={MUTED_TEXT_CLASS}>
                  Bu güne eklenebilecek başka çalışma kalmadı — her çalışma bir günde yalnız bir kez kullanılabilir.
                </p>
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label htmlFor="slot-exercise" className="grid gap-1 text-sm font-medium">
                      <span>Çalışma</span>
                      <select
                        id="slot-exercise"
                        value={draft.exerciseSlug}
                        onChange={(event) => changeExercise(event.target.value)}
                        className={INPUT_CLASS}
                      >
                        {readyExercises.map((definition) => (
                          <option
                            key={definition.exerciseSlug}
                            value={definition.exerciseSlug}
                            disabled={usedInSelectedDay.has(definition.exerciseSlug)}
                          >
                            {definition.title}
                            {usedInSelectedDay.has(definition.exerciseSlug) ? " — bu günde kullanılıyor" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedDefinition?.supportsLevel ? (
                      <label htmlFor="slot-level" className="grid gap-1 text-sm font-medium">
                        <span>
                          Seviye ({selectedDefinition.levelMin ?? 1}
                          {typeof selectedDefinition.levelMax === "number" ? `-${selectedDefinition.levelMax}` : "+"})
                        </span>
                        <input
                          id="slot-level"
                          type="number"
                          min={selectedDefinition.levelMin ?? 1}
                          max={selectedDefinition.levelMax}
                          step={1}
                          value={draft.startingLevel}
                          onChange={(event) =>
                            setDraft({ ...draft, startingLevel: Number(event.target.value) })
                          }
                          className={INPUT_CLASS}
                        />
                      </label>
                    ) : null}

                    <label htmlFor="slot-duration" className="grid gap-1 text-sm font-medium">
                      <span>Süre (saniye)</span>
                      <input
                        id="slot-duration"
                        type="number"
                        min={1}
                        step={30}
                        value={draft.durationSeconds}
                        onChange={(event) => setDraft({ ...draft, durationSeconds: Number(event.target.value) })}
                        className={INPUT_CLASS}
                      />
                      <span className={MUTED_TEXT_CLASS}>{formatDurationLabel(draft.durationSeconds)}</span>
                    </label>
                  </div>

                  {selectedDefinition && Object.keys(selectedDefinition.settingsSchema).length > 0 ? (
                    <fieldset className="grid gap-3 border-none p-0 sm:grid-cols-3">
                      <legend className="mb-1 text-sm font-semibold">Çalışma ayarları</legend>
                      {Object.entries(selectedDefinition.settingsSchema).map(([fieldKey, fieldSchema]) => (
                        <SettingInput
                          key={fieldKey}
                          fieldKey={fieldKey}
                          schema={fieldSchema}
                          value={draft.settings[fieldKey] ?? selectedDefinition.defaultSettings[fieldKey] ?? ""}
                          onChange={(next) =>
                            setDraft({ ...draft, settings: { ...draft.settings, [fieldKey]: next } })
                          }
                        />
                      ))}
                    </fieldset>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={saveSlot} disabled={busy}>
                      Kaydet
                    </button>
                    <button
                      type="button"
                      className={SECONDARY_BUTTON_CLASS}
                      onClick={() => {
                        setSelected(null);
                        setDraft(null);
                      }}
                      disabled={busy}
                    >
                      Vazgeç
                    </button>
                    {slotIndex.has(slotKey(selected.dayNumber, selected.taskOrder)) ? (
                      <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={clearSlot} disabled={busy}>
                        Boşalt
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </PanelCard>
          ) : null}

          <PanelCard title="Günlük Program" subtitle="Bir hücreye tıklayarak o günün çalışmasını belirleyin">
            {loading ? (
              <p aria-busy="true" className={MUTED_TEXT_CLASS}>
                Şablon yükleniyor...
              </p>
            ) : !template ? (
              <p className={MUTED_TEXT_CLASS}>Şablon bulunamadı.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[720px] gap-2">
                  {dayNumbers(template.programDays).map((dayNumber) => {
                    const dayFilled = TASK_ORDERS.filter((order) => slotIndex.has(slotKey(dayNumber, order))).length;
                    return (
                      <div key={dayNumber} className="grid grid-cols-[80px_repeat(5,1fr)] items-stretch gap-2">
                        <div className="flex flex-col justify-center">
                          <span className="text-sm font-semibold">{dayNumber}. gün</span>
                          <span
                            className={`text-[11px] font-semibold ${
                              dayFilled === 5 ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {dayFilled}/5
                          </span>
                        </div>

                        {TASK_ORDERS.map((taskOrder) => {
                          const slot = slotIndex.get(slotKey(dayNumber, taskOrder));
                          const definition = slot ? definitionBySlug.get(slot.exerciseSlug) : undefined;
                          const isSelected =
                            selected?.dayNumber === dayNumber && selected?.taskOrder === taskOrder;
                          return (
                            <button
                              key={taskOrder}
                              type="button"
                              onClick={() => openSlot(dayNumber, taskOrder)}
                              aria-label={`${dayNumber}. gün ${taskOrder}. çalışma${slot ? `: ${definition?.title ?? slot.exerciseSlug}` : " (boş)"}`}
                              className={`${CARD_SURFACE_CLASS} min-h-[64px] cursor-pointer p-2 text-left transition hover:border-red-300 ${
                                isSelected ? "ring-2 ring-red-400" : ""
                              } ${slot ? "" : "border-dashed"}`}
                            >
                              {slot ? (
                                <>
                                  <span className="block text-xs font-semibold leading-tight">
                                    {definition?.title ?? slot.exerciseSlug}
                                  </span>
                                  <span className={`mt-1 block ${MUTED_TEXT_CLASS}`}>
                                    Sv. {slot.startingLevel} · {Math.round(slot.durationSeconds / 60)} dk
                                  </span>
                                </>
                              ) : (
                                <span className={MUTED_TEXT_CLASS}>Boş</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </PanelCard>
        </div>
      </TeacherOnly>
    </AppShell>
  );
}
