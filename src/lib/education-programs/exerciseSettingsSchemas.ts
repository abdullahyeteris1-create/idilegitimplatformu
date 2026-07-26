import type { EducationProgramTaskSettings } from "@/lib/education-programs/types";

// Faz 1 kapsaminda yalniz 3 egzersiz icin ogretmen tarafindan gorev bazinda
// duzenlenebilir ayar semasi tanimlanir: goz-egzersizleri-kolonlar,
// kelime-bulma, kare-gorme-alani. Alan adlari ve izin verilen degerler ilgili
// egzersiz client component'lerindeki gercek state/option tanimlarindan
// birebir alinmistir (bkz. ColumnEyeExerciseClient.tsx, WordFindingExerciseClient.tsx,
// SquareVisionExerciseClient.tsx). Sure (durationSeconds) ve seviye
// (startingLevel) zaten ayri kolonlar/prop'lar uzerinden calistigi icin bu
// semanin disindadir. Bu dosya "use client" icermez, hem sunucu (server
// action/validation) hem istemci (egzersiz client'lari, sablon editoru)
// tarafindan guvenle import edilebilir.
export type ExerciseSettingsFieldType = "integer" | "enum";

export type ExerciseSettingsFieldDef = {
  key: string;
  label: string;
  type: ExerciseSettingsFieldType;
  options: readonly (number | string)[];
  defaultValue: number | string;
  unit?: string;
};

export type ExerciseSettingsSchema = {
  exerciseSlug: string;
  fields: readonly ExerciseSettingsFieldDef[];
};

const EYE_COLUMNS_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "goz-egzersizleri-kolonlar",
  fields: [
    {
      key: "jumpSpeed",
      label: "Geçiş Hızı",
      type: "integer",
      options: [200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
      defaultValue: 1000,
      unit: "ms",
    },
    {
      key: "columnCount",
      label: "Kolon Sayısı",
      type: "integer",
      options: [3, 4, 5, 6, 7],
      defaultValue: 5,
    },
    {
      key: "flowDirection",
      label: "Akış Yönü",
      type: "enum",
      options: ["column", "row"],
      defaultValue: "column",
    },
  ],
};

const WORD_FINDING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "kelime-bulma",
  fields: [
    {
      key: "targetWordsPerText",
      label: "Metin Başına Kelime Sayısı",
      type: "integer",
      options: [3, 4, 5, 6],
      defaultValue: 3,
    },
  ],
};

const SQUARE_VISION_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "kare-gorme-alani",
  fields: [
    {
      key: "gridSize",
      label: "Kare Boyutu",
      type: "integer",
      options: [7, 9, 11, 13, 15],
      defaultValue: 13,
    },
  ],
};

const EXERCISE_SETTINGS_SCHEMAS_BY_SLUG = new Map<string, ExerciseSettingsSchema>(
  [EYE_COLUMNS_SETTINGS_SCHEMA, WORD_FINDING_SETTINGS_SCHEMA, SQUARE_VISION_SETTINGS_SCHEMA].map(
    (schema) => [schema.exerciseSlug, schema],
  ),
);

export function getExerciseSettingsSchema(
  exerciseSlug: string,
): ExerciseSettingsSchema | undefined {
  return EXERCISE_SETTINGS_SCHEMAS_BY_SLUG.get(exerciseSlug);
}

function optionsInclude(options: readonly (number | string)[], value: number | string): boolean {
  return options.some((option) => option === value);
}

// Yalnizca semada tanimli alanlari, semadaki izin verilen degerlerle
// eslesiyorsa kabul eder; tanimsiz alan veya gecersiz deger sessizce
// atlanir (hata firlatilmaz - cagiran taraf boylece kismi/eski {} settings
// kayitlariyla da guvenle calisir).
export function validateExerciseSettingsValue(
  schema: ExerciseSettingsSchema,
  raw: Record<string, unknown>,
): EducationProgramTaskSettings {
  const cleaned: EducationProgramTaskSettings = {};

  for (const field of schema.fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") continue;

    const normalized = field.type === "integer" ? Number(value) : String(value);
    if (field.type === "integer" && !Number.isFinite(normalized)) continue;
    if (!optionsInclude(field.options, normalized)) continue;

    cleaned[field.key] = normalized;
  }

  return cleaned;
}

export function readExerciseSettingsFromFormData(
  schema: ExerciseSettingsSchema,
  formData: FormData,
  keyPrefix: string,
): EducationProgramTaskSettings {
  const raw: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const value = formData.get(`${keyPrefix}${field.key}`);
    if (typeof value === "string" && value.trim()) {
      raw[field.key] = value;
    }
  }

  return validateExerciseSettingsValue(schema, raw);
}

// Ogrenci egzersiz client'larinda Egitim Programi launch settings'inden
// (veya eksikse/gecersizse mevcut client varsayilanindan) baslangic state
// degeri secmek icin kullanilir - egzersiz hicbir zaman crash olmaz.
export function pickEducationProgramSettingOption<T extends number | string>(
  settings: EducationProgramTaskSettings | undefined,
  key: string,
  options: readonly T[],
  fallback: T,
): T {
  const value = settings?.[key];
  if (value === undefined) return fallback;
  return optionsInclude(options, value as number | string) ? (value as T) : fallback;
}
