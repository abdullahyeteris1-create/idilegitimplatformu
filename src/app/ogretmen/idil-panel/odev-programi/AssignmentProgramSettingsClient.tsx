"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TeacherOnly } from "@/components/auth/TeacherOnly";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import {
  ASSIGNMENT_CLASS_GROUPS,
  ASSIGNMENT_CLASS_GROUP_LABELS,
  mapEducationLevelToClassGroup,
  type AssignmentClassGroup,
} from "@/lib/assignments/classGroups";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import type {
  AssignmentExerciseDefinition,
  AssignmentSettingsFieldSchema,
  ProgramClassTemplate,
  ProgramClassTemplateWithSettings,
  ProgramClassExerciseSetting,
  ProgramPreview,
} from "@/lib/assignments/types";
import {
  buildDefaultExerciseFormState,
  buildExercisesPayload,
  countEnabledReadyExercises,
  exerciseFormStateFromSetting,
  formatDurationLabel,
  getCategoryGroupLabel,
  getSettingFieldLabel,
  INTEGRATION_STATUS_LABELS,
  MINIMUM_ENABLED_READY_EXERCISES,
  validateTemplateFormClientSide,
  type ExerciseFormState,
} from "./assignmentProgramForm";

type TemplatesGetResponse = {
  ok?: boolean;
  message?: string;
  templates?: ProgramClassTemplateWithSettings[];
  catalog?: AssignmentExerciseDefinition[];
};

type TemplatesPutResponse = {
  ok?: boolean;
  message?: string;
  template?: ProgramClassTemplate;
  exerciseSettings?: ProgramClassExerciseSetting[];
  warning?: string | null;
};

type PreviewPostResponse = {
  ok?: boolean;
  message?: string;
  preview?: ProgramPreview;
};

type AssignableStudent = {
  id: string;
  name: string;
  educationLevel: string;
  isActive: boolean;
  status: string;
  hasActiveProgram: boolean;
  activeProgramId: string | null;
};

// Sunucudan gelen ham ogrenci kaydi - hasActiveProgram/activeProgramId eski
// veya eksik bir yanit surumunde bulunmayabilir, bu yuzden opsiyonel tanimlanir
// ve fetchAssignableStudents icinde guvenli varsayilanlarla normalize edilir.
type RawAssignableStudent = Omit<AssignableStudent, "hasActiveProgram" | "activeProgramId"> & {
  hasActiveProgram?: boolean;
  activeProgramId?: string | null;
};

type StudentsGetResponse = {
  ok?: boolean;
  message?: string;
  students?: RawAssignableStudent[];
};

type ProgramsPostResponse = {
  ok?: boolean;
  message?: string;
  program?: { id: string };
};

type FeedbackMessage = { tone: "success" | "error" | "warning"; text: string };

type FormSnapshot = {
  name: string;
  description: string;
  defaultTaskDurationSeconds: number;
  exerciseForms: Record<string, ExerciseFormState>;
};

function buildSnapshot(
  name: string,
  description: string,
  defaultTaskDurationSeconds: number,
  exerciseForms: Record<string, ExerciseFormState>,
): string {
  const snapshot: FormSnapshot = { name, description, defaultTaskDurationSeconds, exerciseForms };
  return JSON.stringify(snapshot);
}

const CARD_SURFACE_CLASS =
  "rounded-2xl border border-[var(--idil-border,#e2e8f0)] bg-[var(--idil-surface,#ffffff)] p-4 text-[var(--idil-text,#0f172a)] shadow-sm transition";

const STATUS_BADGE_CLASS: Record<string, string> = {
  ready:
    "border border-emerald-200 bg-emerald-50 text-emerald-800 [data-idil-theme=dark]:border-emerald-700/60 [data-idil-theme=dark]:bg-emerald-900/40 [data-idil-theme=dark]:text-emerald-300",
  needs_minor_changes:
    "border border-amber-200 bg-amber-50 text-amber-800 [data-idil-theme=dark]:border-amber-700/60 [data-idil-theme=dark]:bg-amber-900/40 [data-idil-theme=dark]:text-amber-300",
  needs_major_changes:
    "border border-orange-200 bg-orange-50 text-orange-800 [data-idil-theme=dark]:border-orange-700/60 [data-idil-theme=dark]:bg-orange-900/40 [data-idil-theme=dark]:text-orange-300",
  disabled:
    "border border-slate-300 bg-slate-100 text-slate-600 [data-idil-theme=dark]:border-slate-600/60 [data-idil-theme=dark]:bg-slate-800/60 [data-idil-theme=dark]:text-slate-400",
};

const INPUT_CLASS =
  "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100 [data-idil-theme=dark]:disabled:bg-slate-800";

const NOT_READY_MESSAGE: Record<string, string> = {
  needs_minor_changes: "20 günlük görev sistemine uyarlanıyor",
  needs_major_changes: "Gelişmiş entegrasyon gerekiyor",
  disabled: "Pasif",
};

function buildFormsFromCatalog(
  catalog: AssignmentExerciseDefinition[],
  existing: ProgramClassTemplateWithSettings | null,
  defaultDurationSeconds: number,
): Record<string, ExerciseFormState> {
  const savedBySlug = new Map((existing?.exerciseSettings ?? []).map((setting) => [setting.exerciseSlug, setting]));
  const forms: Record<string, ExerciseFormState> = {};

  catalog.forEach((definition, index) => {
    const saved = savedBySlug.get(definition.exerciseSlug);
    forms[definition.exerciseSlug] = saved
      ? exerciseFormStateFromSetting(saved)
      : buildDefaultExerciseFormState(definition, defaultDurationSeconds, index);
  });

  return forms;
}

type TemplateLoadResult =
  | { ok: true; catalog: AssignmentExerciseDefinition[]; existing: ProgramClassTemplateWithSettings | null }
  | { ok: false; message: string };

/**
 * Module-scope, hook-free network cagrisi - hicbir setState icermez. Effect
 * icinde tetiklenen data-fetching'in setState'i dogrudan effect'in kendi
 * gövdesinde yapmasi gerektigi (bkz. odevler/page.tsx'teki ayni desen)
 * icin, gercek fetch/veri-donusturme mantigi burada, setState cagrilari
 * ise cagiran effect/handler icinde tutulur.
 */
async function fetchTemplateData(group: AssignmentClassGroup): Promise<TemplateLoadResult> {
  try {
    const response = await fetch(`/api/admin/assignment-program/templates?classGroup=${encodeURIComponent(group)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json()) as TemplatesGetResponse;

    if (!response.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Şablon yüklenemedi." };
    }

    const existing = (data.templates ?? []).find((entry) => entry.template.isActive) ?? (data.templates ?? [])[0] ?? null;
    return { ok: true, catalog: data.catalog ?? [], existing };
  } catch {
    return { ok: false, message: "Şablon yüklenemedi. Lütfen tekrar deneyin." };
  }
}

type StudentsLoadResult = { ok: true; students: AssignableStudent[] } | { ok: false; message: string };

/** fetchTemplateData ile ayni desen: setState icermeyen, saf network cagrisi. */
async function fetchAssignableStudents(): Promise<StudentsLoadResult> {
  try {
    const response = await fetch("/api/admin/assignment-program/students", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json()) as StudentsGetResponse;

    if (!response.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Öğrenci listesi alınamadı." };
    }

    // Katı normalize: yalnız gerçek boolean true "aktif program var" sayılır.
    // API zaten boolean donduruyor, ama beklenmeyen bir tip (ör. string
    // "true", 1, undefined) gelirse GUVENLI TARAF secilir - yani ogrenci
    // "aktif degil" (false) kabul edilir; asil guvenlik agi zaten API'nin
    // 409 kontrolu oldugu icin UI tarafinda "false" varsayimi risksizdir.
    const students: AssignableStudent[] = (data.students ?? []).map((student) => ({
      ...student,
      hasActiveProgram: student.hasActiveProgram === true,
      activeProgramId: typeof student.activeProgramId === "string" ? student.activeProgramId : null,
    }));

    return { ok: true, students };
  } catch {
    return { ok: false, message: "Öğrenci listesi alınamadı. Lütfen tekrar deneyin." };
  }
}

function SettingInput({
  fieldKey,
  schema,
  value,
  disabled,
  onChange,
}: {
  fieldKey: string;
  schema: AssignmentSettingsFieldSchema;
  value: string | number | boolean;
  disabled: boolean;
  onChange: (nextValue: string | number | boolean) => void;
}) {
  const label = getSettingFieldLabel(fieldKey);
  const inputId = `setting-${fieldKey}`;

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
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 disabled:cursor-not-allowed"
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
          disabled={disabled}
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
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function ExerciseCard({
  definition,
  form,
  onChange,
}: {
  definition: AssignmentExerciseDefinition;
  form: ExerciseFormState;
  onChange: (next: ExerciseFormState) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isReady = definition.integrationStatus === "ready";
  const badgeClass = STATUS_BADGE_CLASS[definition.integrationStatus] ?? STATUS_BADGE_CLASS.disabled;
  const statusLabel = INTEGRATION_STATUS_LABELS[definition.integrationStatus] ?? definition.integrationStatus;

  const update = (patch: Partial<ExerciseFormState>) => onChange({ ...form, ...patch });
  const updateSetting = (key: string, value: string | number | boolean) =>
    onChange({ ...form, settings: { ...form.settings, [key]: value } });

  return (
    <article className={`${CARD_SURFACE_CLASS} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">{definition.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--idil-muted,#64748b)]">
            {getCategoryGroupLabel(definition.category)} · <code>{definition.exerciseSlug}</code>
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
          <span className="sr-only">{definition.title} etkin</span>
          <input
            type="checkbox"
            role="switch"
            aria-checked={form.enabled}
            checked={form.enabled}
            disabled={!isReady}
            onChange={(event) => update({ enabled: event.target.checked })}
            className="h-5 w-5 rounded border-slate-300 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {!isReady ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-800/50 [data-idil-theme=dark]:text-slate-300">
          {NOT_READY_MESSAGE[definition.integrationStatus] ?? "Bu çalışma henüz program görevlerine atanamaz."} — bu
          çalışma henüz program görevlerine atanamaz.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            className="flex min-h-[36px] items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold text-slate-600 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-800/60 [data-idil-theme=dark]:text-slate-300"
          >
            <span>
              Seviye {definition.supportsLevel ? form.startingLevel : "—"} · {formatDurationLabel(form.durationSeconds)} · Ağırlık{" "}
              {form.dailyWeight}
            </span>
            <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
          </button>

          {isOpen ? (
            <fieldset className="grid gap-3 border-none p-0 sm:grid-cols-2" disabled={!form.enabled}>
              <legend className="sr-only">{definition.title} ayarları</legend>

              {definition.supportsLevel ? (
                <label className="grid gap-1 text-sm font-medium">
                  <span>Başlangıç seviyesi{definition.levelMax ? ` (${definition.levelMin ?? 1}-${definition.levelMax})` : ""}</span>
                  <input
                    type="number"
                    min={definition.levelMin ?? 1}
                    max={definition.levelMax}
                    value={form.startingLevel}
                    onChange={(event) => update({ startingLevel: Number(event.target.value) })}
                    className={INPUT_CLASS}
                  />
                </label>
              ) : (
                <p className="grid gap-1 text-sm font-medium text-[var(--idil-muted,#64748b)]">
                  <span>Başlangıç seviyesi</span>
                  <span className="min-h-[44px] rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm">
                    Bu çalışma seviye kullanmıyor
                  </span>
                </p>
              )}

              <label className="grid gap-1 text-sm font-medium">
                <span>Görev süresi ({formatDurationLabel(form.durationSeconds)})</span>
                <input
                  type="number"
                  min={60}
                  step={30}
                  value={form.durationSeconds}
                  onChange={(event) => update({ durationSeconds: Number(event.target.value) })}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                <span>Günlük ağırlık</span>
                <input
                  type="number"
                  min={0}
                  value={form.dailyWeight}
                  onChange={(event) => update({ dailyWeight: Number(event.target.value) })}
                  className={INPUT_CLASS}
                />
                <span className="text-xs text-[var(--idil-muted,#64748b)]">Yüksek değer, programda daha sık seçilmesini sağlar.</span>
              </label>

              <label className="grid gap-1 text-sm font-medium">
                <span>Tekrar bekleme günü</span>
                <input
                  type="number"
                  min={0}
                  value={form.repeatCooldownDays}
                  onChange={(event) => update({ repeatCooldownDays: Number(event.target.value) })}
                  className={INPUT_CLASS}
                />
                <span className="text-xs text-[var(--idil-muted,#64748b)]">
                  Aynı çalışmanın tekrar atanması için tercih edilen gün aralığı.
                </span>
              </label>

              <label className="grid gap-1 text-sm font-medium">
                <span>Programdaki maksimum kullanım</span>
                <input
                  type="number"
                  min={1}
                  value={form.maxOccurrencesPerProgram ?? ""}
                  placeholder="Sınırsız"
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    update({ maxOccurrencesPerProgram: raw ? Number(raw) : null });
                  }}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                <span>Görüntü sırası</span>
                <input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(event) => update({ displayOrder: Number(event.target.value) })}
                  className={INPUT_CLASS}
                />
              </label>

              {Object.entries(definition.settingsSchema).map(([key, fieldSchema]) => (
                <SettingInput
                  key={key}
                  fieldKey={key}
                  schema={fieldSchema}
                  value={form.settings[key] ?? definition.defaultSettings[key]}
                  disabled={!form.enabled}
                  onChange={(nextValue) => updateSetting(key, nextValue)}
                />
              ))}
            </fieldset>
          ) : null}
        </>
      )}
    </article>
  );
}

export function AssignmentProgramSettingsClient() {
  const [classGroup, setClassGroup] = useState<AssignmentClassGroup>("grade_1");
  const [catalog, setCatalog] = useState<AssignmentExerciseDefinition[]>([]);

  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultTaskDurationSeconds, setDefaultTaskDurationSeconds] = useState(300);
  const [exerciseForms, setExerciseForms] = useState<Record<string, ExerciseFormState>>({});
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);

  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<FeedbackMessage | null>(null);

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProgramPreview | null>(null);
  const [activeDay, setActiveDay] = useState(1);

  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<FeedbackMessage | null>(null);
  // Yalniz "secili ogrenci sonradan aktif programli oldu mu" degisiklik
  // tespiti icin - React'in resmi "render sirasinda state ayarlama" deseni
  // (bkz. asagidaki if bloğu) icin gereken "onceki deger" referansi. Ref
  // DEGIL, bilerek useState kullaniliyor: bu proje/eslint konfigurasyonu
  // render sirasinda ref okuma/yazmayi yasakliyor (react-hooks/refs).
  const [lastCheckedStudents, setLastCheckedStudents] = useState(students);
  // Aktif programli bir option'a fare/klavye ile ulasildiginda bazi
  // tarayicilarda native <select>'in DOM .value'su, React'in onChange'i
  // calistirmasindan ONCE tarayici tarafindan degistiriliyor. onChange
  // guard'i setSelectedStudentId'yi CAGIRMADIGI icin (state degismedigi
  // icin) React bu dugumu yeniden render ETMEZ - dolayisiyla DOM kendiliginden
  // eski gecerli degere donmez, secim gorsel olarak "tutunmus" gibi kalir.
  // Bu yuzden onChange icinde DOM degerini bu ref uzerinden ELDEYLE
  // (imperatif) geri yaziyoruz - yalniz event handler icinde okunur/yazilir,
  // render sirasinda DEGIL (render sirasinda ref erisimi bu projede
  // yasaktir, bkz. yukaridaki lastCheckedStudents yorumu).
  const studentSelectRef = useRef<HTMLSelectElement | null>(null);

  const currentSnapshot = useMemo(
    () => buildSnapshot(name, description, defaultTaskDurationSeconds, exerciseForms),
    [name, description, defaultTaskDurationSeconds, exerciseForms],
  );
  const isDirty = savedSnapshot !== "" ? currentSnapshot !== savedSnapshot : false;

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    // Not: yukleme/hata/onizleme durumlarinin senkron sifirlanmasi kasitli
    // olarak BURADA yapilmiyor - bir effect govdesinde senkron setState
    // cagrisi "cascading render" riski tasidigi icin (bkz. odevler/page.tsx
    // ile ayni desen), o sifirlama islemleri classGroup'u degistiren
    // handleClassGroupChange'de (bir olay isleyicisi, effect degil) yapilir.
    // Ilk yuklemede zaten useState varsayilanlari (isLoadingTemplate=true,
    // digerleri null) ayni sonucu verir.
    let cancelled = false;

    void (async () => {
      const result = await fetchTemplateData(classGroup);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setTemplateError(result.message);
        setIsLoadingTemplate(false);
        return;
      }

      const duration = result.existing?.template.defaultTaskDurationSeconds ?? 300;
      const forms = buildFormsFromCatalog(result.catalog, result.existing, duration);
      const nextName = result.existing?.template.name ?? `${ASSIGNMENT_CLASS_GROUP_LABELS[classGroup]} Programı`;
      const nextDescription = result.existing?.template.description ?? "";

      setCatalog(result.catalog);
      setTemplateId(result.existing?.template.id);
      setName(nextName);
      setDescription(nextDescription);
      setDefaultTaskDurationSeconds(duration);
      setExerciseForms(forms);
      setSavedSnapshot(result.existing ? buildSnapshot(nextName, nextDescription, duration, forms) : "");
      setSavedTemplateId(result.existing?.template.id ?? null);
      setIsLoadingTemplate(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [classGroup]);

  useEffect(() => {
    // Atanabilecek ogrenci listesi sinif grubundan bagimsiz, bir kez
    // yuklenir (siniflara gore daraltma asagida studentsForClassGroup ile
    // yalniz goruntulemede yapilir) - bu yuzden bagimlilik dizisi bostur.
    let cancelled = false;

    void (async () => {
      const result = await fetchAssignableStudents();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setStudentsError(result.message);
        setIsLoadingStudents(false);
        return;
      }

      setStudents(result.students);
      setStudentsError(null);
      setIsLoadingStudents(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Secili ogrenci, liste (yeniden) yuklendiginde artik aktif programli ise
  // (ör. baska bir sekmede/oturumda o arada program atanmissa) secimi
  // otomatik temizle - "eski secim guvenligi". Bir useEffect icinde senkron
  // setState cagirmak "cascading render" riski tasidigi icin (bkz. dosyanin
  // basindaki ayni gerekcenin kullanildigi diger yorum), React'in resmi
  // "render sirasinda state ayarlama" deseni kullanilir: students referansi
  // degistiginde render govdesinde kosullu olarak setState cagrilir.
  // lastCheckedStudents yalniz degisiklik tespiti icindir; referans ayni
  // kaldigi surece govde calismaz, bu yuzden sonsuz donguye yol acmaz.
  if (students !== lastCheckedStudents) {
    setLastCheckedStudents(students);
    const selected = selectedStudentId ? students.find((student) => student.id === selectedStudentId) : null;
    if (selected?.hasActiveProgram === true) {
      setSelectedStudentId("");
      setAssignMessage({
        tone: "warning",
        text: "Seçili öğrencinin artık aktif bir programı var, lütfen başka bir öğrenci seçin.",
      });
    }
  }

  const handleRetryLoad = () => {
    setIsLoadingTemplate(true);
    setTemplateError(null);

    void (async () => {
      const result = await fetchTemplateData(classGroup);
      if (!result.ok) {
        setTemplateError(result.message);
        setIsLoadingTemplate(false);
        return;
      }

      const duration = result.existing?.template.defaultTaskDurationSeconds ?? 300;
      const forms = buildFormsFromCatalog(result.catalog, result.existing, duration);
      const nextName = result.existing?.template.name ?? `${ASSIGNMENT_CLASS_GROUP_LABELS[classGroup]} Programı`;
      const nextDescription = result.existing?.template.description ?? "";

      setCatalog(result.catalog);
      setTemplateId(result.existing?.template.id);
      setName(nextName);
      setDescription(nextDescription);
      setDefaultTaskDurationSeconds(duration);
      setExerciseForms(forms);
      setSavedSnapshot(result.existing ? buildSnapshot(nextName, nextDescription, duration, forms) : "");
      setSavedTemplateId(result.existing?.template.id ?? null);
      setIsLoadingTemplate(false);
    })();
  };

  const handleClassGroupChange = (nextGroup: AssignmentClassGroup) => {
    if (nextGroup === classGroup) {
      return;
    }
    if (isDirty && typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Kaydedilmemiş değişiklikleriniz var. Sınıf grubunu değiştirirseniz bu değişiklikler kaybolacak. Devam edilsin mi?",
      );
      if (!confirmed) {
        return;
      }
    }
    setIsLoadingTemplate(true);
    setTemplateError(null);
    setPreview(null);
    setPreviewError(null);
    setSaveMessage(null);
    setSelectedStudentId("");
    setAssignMessage(null);
    setClassGroup(nextGroup);
  };

  const studentsForClassGroup = useMemo(
    () =>
      students.filter((student) => {
        const mapped = mapEducationLevelToClassGroup(student.educationLevel);
        return mapped.ok && mapped.value === classGroup;
      }),
    [students, classGroup],
  );

  const readyExerciseSlugs = useMemo(
    () => catalog.filter((definition) => definition.integrationStatus === "ready").map((definition) => definition.exerciseSlug),
    [catalog],
  );

  const enabledReadyCount = countEnabledReadyExercises(readyExerciseSlugs, exerciseForms);

  const settingsSchemaBySlug = useMemo(
    () => Object.fromEntries(catalog.map((definition) => [definition.exerciseSlug, definition.settingsSchema])),
    [catalog],
  );

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, AssignmentExerciseDefinition[]>();
    for (const definition of catalog) {
      const list = groups.get(definition.category) ?? [];
      list.push(definition);
      groups.set(definition.category, list);
    }
    return Array.from(groups.entries());
  }, [catalog]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const errors = validateTemplateFormClientSide({
      name,
      defaultTaskDurationSeconds,
      readyExerciseSlugs,
      exerciseForms,
      settingsSchemaBySlug,
    });

    if (errors.length > 0) {
      setSaveMessage({ tone: "error", text: errors[0].message });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/admin/assignment-program/templates", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          classGroup,
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          defaultTaskDurationSeconds,
          exercises: buildExercisesPayload(readyExerciseSlugs, exerciseForms),
        }),
      });
      const data = (await response.json()) as TemplatesPutResponse;

      if (!response.ok || !data.ok || !data.template) {
        setSaveMessage({ tone: "error", text: data.message ?? "Şablon kaydedilemedi." });
        return;
      }

      setTemplateId(data.template.id);
      setSavedTemplateId(data.template.id);
      setSavedSnapshot(buildSnapshot(name, description, defaultTaskDurationSeconds, exerciseForms));
      setSaveMessage({
        tone: data.warning ? "warning" : "success",
        text: data.warning ? `Şablon başarıyla kaydedildi. ${data.warning}` : "Şablon başarıyla kaydedildi.",
      });
    } catch {
      setSaveMessage({ tone: "error", text: "Şablon kaydedilemedi. Lütfen tekrar deneyin." });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async (options: { reuseSeed: boolean }) => {
    if (!savedTemplateId || isGeneratingPreview) {
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/admin/assignment-program/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: savedTemplateId,
          ...(options.reuseSeed && preview ? { generationSeed: preview.generationSeed } : {}),
        }),
      });
      const data = (await response.json()) as PreviewPostResponse;

      if (!response.ok || !data.ok || !data.preview) {
        setPreviewError(data.message ?? "Program önizlemesi oluşturulamadı.");
        setPreview(null);
        return;
      }

      setPreview(data.preview);
      setActiveDay(1);
    } catch {
      setPreviewError("Program önizlemesi oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const previewDisabledReason = !savedTemplateId
    ? "Önizleme oluşturmadan önce şablonu kaydedin."
    : isDirty
      ? "Kaydedilmemiş değişiklikler var — önce şablonu kaydedin."
      : null;

  const handleAssignProgram = async () => {
    if (isAssigning || !selectedStudentId || !preview || !savedTemplateId) {
      return;
    }

    // Buton normalde aktif programli bir ogrenci icin disabled kalir (bkz.
    // assignDisabledReason), ama bu, "eski/stale state uzerinden" veya baska
    // bir yoldan handleAssignProgram yine de cagrilsa dahi POST'un asla
    // gitmemesini garanti eden BAGIMSIZ, son bir kontrol - butonun disabled
    // durumuna guvenmez, students listesinden anlik olarak yeniden okur.
    const targetStudent = students.find((student) => student.id === selectedStudentId);
    if (targetStudent?.hasActiveProgram === true) {
      setAssignMessage({ tone: "error", text: "Bu öğrencinin zaten aktif bir ödev programı var." });
      return;
    }

    setIsAssigning(true);
    setAssignMessage(null);

    try {
      const response = await fetch("/api/admin/assignment-program/programs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          templateId: savedTemplateId,
          generationSeed: preview.generationSeed,
        }),
      });
      const data = (await response.json()) as ProgramsPostResponse;

      if (!response.ok || !data.ok) {
        setAssignMessage({ tone: "error", text: data.message ?? "Program oluşturulamadı." });
        return;
      }

      // Basariyla atandiktan sonra secimi temizle - "ayni programin tekrar
      // gonderilmesi" yalniz teknik olarak (isAssigning kilidi + RPC'nin
      // kendi 409'u ile) degil, ogretmenin bilincli olarak yeni bir ogrenci
      // secmesini zorunlu kilarak da engellenir.
      setSelectedStudentId("");
      setAssignMessage({ tone: "success", text: "Program başarıyla atandı." });
    } catch {
      setAssignMessage({ tone: "error", text: "Program oluşturulamadı. Lütfen tekrar deneyin." });
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  const assignDisabledReason = !selectedStudentId
    ? "Program atamak için önce bir öğrenci seçin."
    : selectedStudent?.hasActiveProgram === true
      ? "Bu öğrencinin zaten aktif bir ödev programı var."
      : !preview
        ? "Program atamadan önce 20 günlük önizlemeyi oluşturun."
        : isDirty
          ? "Kaydedilmemiş değişiklikler var — önce şablonu kaydedin ve önizlemeyi yeniden oluşturun."
          : null;

  return (
    <AppShell title="20 Günlük Ödev Programı" subtitle="Sınıf gruplarına göre çalışma ayarlarını düzenleyin ve program önizlemesi oluşturun." navItems={TEACHER_NAV_ITEMS} wide>
      <TeacherOnly>
        <main className="grid gap-4">
          <PanelCard>
            <ul className="grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
              <li>• 20 gün</li>
              <li>• Her gün 5 çalışma</li>
              <li>• Toplam 100 görev</li>
              <li>• Gün içindeki 5 görev aynı anda erişilebilir</li>
              <li className="sm:col-span-2">• Sonraki gün, önceki gün tamamlanmadan açılmaz</li>
            </ul>
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Bu aşamada yalnız şablon ayarları ve önizleme hazırlanır.
            </p>
          </PanelCard>

          <PanelCard title="Sınıf Grubu" subtitle="Ayarlanacak sınıf grubunu seçin">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sınıf grubu">
              {ASSIGNMENT_CLASS_GROUPS.map((group) => {
                const isActive = group === classGroup;
                return (
                  <button
                    key={group}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleClassGroupChange(group)}
                    className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200"
                    }`}
                  >
                    {ASSIGNMENT_CLASS_GROUP_LABELS[group]}
                  </button>
                );
              })}
            </div>
          </PanelCard>

          <PanelCard title="Öğrenci Seçimi" subtitle="Programı atayacağınız aktif öğrenciyi seçin">
            {isLoadingStudents ? (
              <p aria-busy="true" className="animate-pulse text-sm text-slate-500">
                Öğrenciler yükleniyor...
              </p>
            ) : studentsError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <p>{studentsError}</p>
              </div>
            ) : studentsForClassGroup.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-800/50 [data-idil-theme=dark]:text-slate-300">
                Bu sınıf grubu için atanabilecek aktif öğrenci bulunamadı.
              </p>
            ) : (
              <label className="grid gap-1 text-sm font-semibold">
                <span>Öğrenci</span>
                <select
                  ref={studentSelectRef}
                  value={selectedStudentId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    // Native <option disabled> normal akista secilemez, ama
                    // bazi tarayicilarda fare tiklamasi bu korumayi atlayip
                    // DOM'un .value'sunu yine de degistirebiliyor - bu yuzden
                    // aktif programli bir ogrenci burada da KESIN olarak
                    // reddedilir.
                    const nextStudent = studentsForClassGroup.find((student) => student.id === nextId);
                    if (nextStudent && nextStudent.hasActiveProgram === true) {
                      // selectedStudentId DEGISMEDIGI (onceki gecerli deger
                      // - varsa o, yoksa bos - korunuyor) icin React bu
                      // dugumu yeniden render ETMEYECEK; DOM'un .value'su
                      // ise tarayici tarafindan zaten degistirilmis olabilir.
                      // Bu yuzden DOM'u eldeyle eski gecerli degere geri
                      // yaziyoruz - boylece secim gorsel olarak da "tutunmus"
                      // gibi kalmaz.
                      if (studentSelectRef.current) {
                        studentSelectRef.current.value = selectedStudentId;
                      }
                      setAssignMessage({ tone: "error", text: "Bu öğrencinin zaten aktif bir ödev programı var." });
                      return;
                    }
                    setSelectedStudentId(nextId);
                    setAssignMessage(null);
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">Öğrenci seçin...</option>
                  {studentsForClassGroup.map((student) => (
                    <option key={student.id} value={student.id} disabled={student.hasActiveProgram === true}>
                      {student.hasActiveProgram === true ? `${student.name} — 🔒 Aktif Ödev Programı` : student.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedStudentId ? (
              <p className="mt-2 text-xs text-[var(--idil-muted,#64748b)]">
                Seçili öğrenci: {studentsForClassGroup.find((student) => student.id === selectedStudentId)?.name ?? selectedStudentId}
              </p>
            ) : null}
          </PanelCard>

          <PanelCard title="Şablon Genel Ayarları">
            {isLoadingTemplate ? (
              <p aria-busy="true" className="animate-pulse text-sm text-slate-500">
                Şablon yükleniyor...
              </p>
            ) : templateError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <p>{templateError}</p>
                <button
                  type="button"
                  onClick={handleRetryLoad}
                  className="mt-2 min-h-[36px] rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-700"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">
                  <span>Şablon adı</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} />
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  <span>Varsayılan görev süresi ({formatDurationLabel(defaultTaskDurationSeconds)})</span>
                  <input
                    type="number"
                    min={60}
                    step={30}
                    value={defaultTaskDurationSeconds}
                    onChange={(event) => setDefaultTaskDurationSeconds(Number(event.target.value))}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold md:col-span-2">
                  <span>Açıklama</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    className={`${INPUT_CLASS} min-h-[72px]`}
                  />
                </label>

                <p className="grid gap-1 text-sm font-semibold text-[var(--idil-muted,#64748b)]">
                  <span>Program gün sayısı</span>
                  <span className="min-h-[44px] rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm">20 gün (sabit)</span>
                </p>
                <p className="grid gap-1 text-sm font-semibold text-[var(--idil-muted,#64748b)]">
                  <span>Günlük görev sayısı</span>
                  <span className="min-h-[44px] rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm">5 görev (sabit)</span>
                </p>

                <p className="text-sm font-semibold md:col-span-2" aria-live="polite">
                  Etkin ve hazır egzersiz sayısı: {enabledReadyCount}
                  {enabledReadyCount < MINIMUM_ENABLED_READY_EXERCISES ? (
                    <span className="ml-2 font-normal text-amber-700">
                      (20×5 önizleme için en az {MINIMUM_ENABLED_READY_EXERCISES} etkin, hazır egzersiz önerilir)
                    </span>
                  ) : null}
                </p>

                <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || isLoadingTemplate}
                    className="min-h-[44px] rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Kaydediliyor..." : "Şablonu Kaydet"}
                  </button>
                  {isDirty ? <span className="text-xs font-semibold text-amber-700">Kaydedilmemiş değişiklikler var</span> : null}
                </div>

                {saveMessage ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`md:col-span-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      saveMessage.tone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : saveMessage.tone === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {saveMessage.text}
                  </p>
                ) : null}
              </div>
            )}
          </PanelCard>

          {!isLoadingTemplate && !templateError
            ? groupedCatalog.map(([category, definitions]) => (
                <PanelCard key={category} title={getCategoryGroupLabel(category)}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {definitions.map((definition) => (
                      <ExerciseCard
                        key={definition.exerciseSlug}
                        definition={definition}
                        form={
                          exerciseForms[definition.exerciseSlug] ??
                          buildDefaultExerciseFormState(definition, defaultTaskDurationSeconds, 0)
                        }
                        onChange={(next) =>
                          setExerciseForms((current) => ({ ...current, [definition.exerciseSlug]: next }))
                        }
                      />
                    ))}
                  </div>
                </PanelCard>
              ))
            : null}

          <PanelCard title="20 Günlük Program Önizleme" subtitle="Kaydedilmiş şablona göre salt-okunur bir önizleme oluşturur">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handlePreview({ reuseSeed: false })}
                disabled={!!previewDisabledReason || isGeneratingPreview}
                className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingPreview ? "Oluşturuluyor..." : "20 Günlük Programı Önizle"}
              </button>
              {preview ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handlePreview({ reuseSeed: false })}
                    disabled={isGeneratingPreview}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Farklı Program Üret
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePreview({ reuseSeed: true })}
                    disabled={isGeneratingPreview}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aynı Programı Yeniden Göster
                  </button>
                </>
              ) : null}
            </div>

            {previewDisabledReason ? <p className="mt-2 text-xs text-slate-500">{previewDisabledReason}</p> : null}

            {previewError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
                <p className="font-semibold">{previewError}</p>
                <p className="mt-1">Önce şablondaki etkin, hazır egzersiz sayısını artırmayı deneyin.</p>
              </div>
            ) : null}

            {preview ? (
              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Gün", value: preview.totalDays },
                    { label: "Günlük Çalışma", value: preview.tasksPerDay },
                    { label: "Toplam Görev", value: preview.totalTasks },
                    { label: "Benzersiz Egzersiz", value: preview.summary.uniqueExerciseCount },
                  ].map((stat) => (
                    <div key={stat.label} className={CARD_SURFACE_CLASS}>
                      <p className="text-xs uppercase tracking-wide text-[var(--idil-muted,#64748b)]">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <details className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 [data-idil-theme=dark]:border-slate-600">
                  <summary className="cursor-pointer font-semibold">Teknik detay (generationSeed)</summary>
                  <p className="mt-1 break-all">{preview.generationSeed}</p>
                </details>

                {preview.summary.warnings.length > 0 ? (
                  <div className="grid gap-2">
                    {preview.summary.warnings.map((warning, index) => (
                      <p
                        key={`${index}-${warning.slice(0, 20)}`}
                        role="status"
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 [data-idil-theme=dark]:border-amber-700/60 [data-idil-theme=dark]:bg-amber-900/30 [data-idil-theme=dark]:text-amber-300"
                      >
                        ⚠ {warning}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold">Kategori Dağılımı</h3>
                  <div className="mt-2 grid gap-1.5">
                    {preview.categorySummary.map((entry) => {
                      const percent = Math.round((entry.count / preview.totalTasks) * 100);
                      return (
                        <div key={entry.category} className="grid grid-cols-[120px_1fr_40px] items-center gap-2 text-xs">
                          <span className="truncate font-medium">{getCategoryGroupLabel(entry.category)}</span>
                          <span className="h-2.5 overflow-hidden rounded-full bg-slate-200 [data-idil-theme=dark]:bg-slate-700">
                            <span className="block h-full rounded-full bg-red-500" style={{ width: `${percent}%` }} />
                          </span>
                          <span className="text-right text-[var(--idil-muted,#64748b)]">{entry.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Egzersiz Kullanım Sayıları</h3>
                  <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {preview.exerciseSummary.map((entry) => (
                      <li key={entry.exerciseSlug} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1 [data-idil-theme=dark]:bg-slate-800/60">
                        <span>{catalog.find((d) => d.exerciseSlug === entry.exerciseSlug)?.title ?? entry.exerciseSlug}</span>
                        <span className="font-semibold">{entry.count}×</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">20 Günlük Plan</h3>
                    <label className="flex items-center gap-2 text-xs font-semibold sm:hidden">
                      <span>Gün</span>
                      <select
                        value={activeDay}
                        onChange={(event) => setActiveDay(Number(event.target.value))}
                        className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2"
                      >
                        {preview.days.map((day) => (
                          <option key={day.dayNumber} value={day.dayNumber}>
                            {day.dayNumber}. gün
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-2 hidden gap-2 overflow-x-auto pb-1 sm:flex" role="tablist" aria-label="Gün seçici">
                    {preview.days.map((day) => (
                      <button
                        key={day.dayNumber}
                        type="button"
                        role="tab"
                        aria-selected={activeDay === day.dayNumber}
                        onClick={() => setActiveDay(day.dayNumber)}
                        className={`min-h-[36px] shrink-0 rounded-lg border px-2.5 text-xs font-semibold ${
                          activeDay === day.dayNumber
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-slate-300 bg-white text-slate-600 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900"
                        }`}
                      >
                        {day.dayNumber}
                      </button>
                    ))}
                  </div>

                  {preview.days
                    .filter((day) => day.dayNumber === activeDay)
                    .map((day) => (
                      <div key={day.dayNumber} className={`${CARD_SURFACE_CLASS} mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3`}>
                        {day.tasks.map((task) => (
                          <div key={task.taskOrder} className="rounded-xl border border-slate-200 p-3 [data-idil-theme=dark]:border-slate-700">
                            <p className="text-xs font-semibold text-[var(--idil-muted,#64748b)]">Görev {task.taskOrder}</p>
                            <p className="mt-0.5 text-sm font-semibold">{task.exerciseTitle}</p>
                            <p className="text-xs text-[var(--idil-muted,#64748b)]">{getCategoryGroupLabel(task.category)}</p>
                            <p className="mt-1 text-xs">
                              Seviye {task.startingLevel} · {formatDurationLabel(task.durationSeconds)}
                            </p>
                            {Object.keys(task.settings).length > 0 ? (
                              <p className="mt-1 truncate text-[11px] text-[var(--idil-muted,#64748b)]">
                                {Object.entries(task.settings)
                                  .map(([key, value]) => `${getSettingFieldLabel(key)}: ${value}`)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ))}
                </div>

                <div className="border-t border-slate-200 pt-4 [data-idil-theme=dark]:border-slate-700">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleAssignProgram()}
                      disabled={!!assignDisabledReason || isAssigning}
                      className="min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAssigning ? "Atanıyor..." : "Programı Ata"}
                    </button>
                    {assignDisabledReason ? <p className="text-xs text-slate-500">{assignDisabledReason}</p> : null}
                  </div>

                  {assignMessage ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        assignMessage.tone === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      {assignMessage.text}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </PanelCard>
        </main>
      </TeacherOnly>
    </AppShell>
  );
}
