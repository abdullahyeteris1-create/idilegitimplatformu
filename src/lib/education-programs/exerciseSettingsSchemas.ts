import type { EducationProgramTaskSettings } from "@/lib/education-programs/types";

// Ogretmen tarafindan gorev bazinda duzenlenebilir ayar semasi tanimlanmis
// egzersizler: goz-egzersizleri-kolonlar, kelime-bulma, kare-gorme-alani,
// ayni-olani-yakala, benzer-kelimeler. Alan adlari ve izin verilen degerler
// ilgili egzersiz client component'lerindeki gercek state/option
// tanimlarindan birebir alinmistir (bkz. ColumnEyeExerciseClient.tsx,
// WordFindingExerciseClient.tsx, SquareVisionExerciseClient.tsx,
// CatchSameExerciseClient.tsx, SimilarWordsExerciseClient.tsx). Sure
// (durationSeconds) ve seviye (startingLevel) zaten ayri kolonlar/prop'lar
// uzerinden calistigi icin bu semanin disindadir. Bu dosya "use client"
// icermez, hem sunucu (server action/validation) hem istemci (egzersiz
// client'lari, sablon editoru) tarafindan guvenle import edilebilir.
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

const CATCH_SAME_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "ayni-olani-yakala",
  fields: [
    {
      key: "mode",
      label: "Mod",
      type: "enum",
      options: ["word", "letter", "symbol", "number"],
      defaultValue: "word",
    },
    {
      key: "speed",
      label: "Hız",
      type: "integer",
      options: [1500, 1000, 750, 500],
      defaultValue: 1000,
      unit: "ms",
    },
  ],
};

const SIMILAR_WORDS_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "benzer-kelimeler",
  fields: [
    {
      key: "boxCount",
      label: "Kutu Sayısı",
      type: "integer",
      options: [12, 16, 20, 24],
      defaultValue: 16,
    },
    {
      key: "targetDifferentCount",
      label: "Hedef Kelime Sayısı",
      type: "integer",
      options: [3, 4, 5, 6, 7, 8],
      defaultValue: 4,
    },
  ],
};

const TACHISTOSCOPE_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "takistoskop",
  fields: [
    {
      key: "speedMs",
      label: "Gösterim Hızı",
      type: "integer",
      options: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
      defaultValue: 300,
      unit: "ms",
    },
    {
      key: "workMode",
      label: "Çalışma Şekli",
      type: "enum",
      options: ["automatic", "manual"],
      defaultValue: "manual",
    },
    {
      key: "contentType",
      label: "İçerik Türü",
      type: "enum",
      options: ["letter", "number", "mixed"],
      defaultValue: "letter",
    },
  ],
};

const LETTER_NUMBER_COUNTING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "harf-rakam-sayma",
  fields: [
    {
      key: "mode",
      label: "Mod",
      type: "enum",
      options: ["letters", "numbers", "mixed"],
      defaultValue: "letters",
    },
    {
      key: "difficulty",
      label: "Zorluk",
      type: "enum",
      options: ["normal", "hard"],
      defaultValue: "normal",
    },
    {
      key: "speedSeconds",
      label: "Hız",
      type: "integer",
      options: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      defaultValue: 8,
      unit: "saniye",
    },
  ],
};

const MEMORY_GAME_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "hafiza-gelistirme",
  fields: [
    {
      key: "gridLayout",
      label: "Izgara Düzeni",
      type: "enum",
      options: ["5x5", "5x10", "10x10"],
      defaultValue: "5x5",
    },
    {
      key: "displayMs",
      label: "Gösterim Süresi",
      type: "integer",
      options: [500, 750, 1000, 1500, 2000],
      defaultValue: 1000,
      unit: "ms",
    },
  ],
};

const CARD_MATCHING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "kart-eslestirme",
  fields: [
    {
      key: "previewDurationMs",
      label: "Kartları Görme Süresi",
      type: "integer",
      options: [2000, 3000, 4000, 5000, 7000, 10000],
      defaultValue: 4000,
      unit: "ms",
    },
    {
      key: "flipBackDelayMs",
      label: "Yanlış Eşleşme Kapanma Süresi",
      type: "integer",
      options: [500, 750, 1000, 1250, 1500, 2000],
      defaultValue: 1000,
      unit: "ms",
    },
  ],
};

// intervalMs ve wordsPerMinute ikisi de her zaman semada bulunur: mevcut
// ExerciseSettingsFieldDef yapisi kosullu/bagimli alan (bir alanin baska bir
// alanin degerine gore gorunur/gecerli olmasi) desteklemez - yalniz duz
// "type: integer|enum" + sabit options listesi vardir. Bu yuzden speedMode'a
// gore yalniz biri anlamli olsa da iki alan da bagimsiz sekilde tanimlanir;
// BlockReadingExerciseClient yalniz aktif speedMode ile eslesen degeri
// gercekten kullanir, digeri sessizce goz ardi edilir.
const BLOCK_READING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "blok-okuma",
  fields: [
    {
      key: "blockSize",
      label: "Blok Boyutu",
      type: "integer",
      options: [1, 2, 3, 4, 5],
      defaultValue: 3,
    },
    {
      key: "speedMode",
      label: "Hız Modu",
      type: "enum",
      options: ["interval", "wpm"],
      defaultValue: "interval",
    },
    {
      key: "intervalMs",
      label: "Blok Aralığı",
      type: "integer",
      options: [250, 500, 750, 1000, 1500, 2000, 3000, 5000],
      defaultValue: 750,
      unit: "ms",
    },
    {
      key: "wordsPerMinute",
      label: "Dakikadaki Kelime Sayısı",
      type: "integer",
      options: [50, 100, 150, 200, 250, 300, 400, 500],
      defaultValue: 150,
    },
  ],
};

// Golgeleme'nin intervalMs alani, Blok Okuma'nin aksine GERCEK bir sabit
// secim listesidir (client'ta serbest input degil, <select> ile JUMP_SPEED_OPTIONS
// kullanilir) - bu yuzden buradaki options listesi kurasyon degil, ShadowReadingExerciseClient.tsx
// icindeki JUMP_SPEED_OPTIONS ile birebir aynidir.
const SHADOW_READING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "golgeleme",
  fields: [
    {
      key: "blockSize",
      label: "Blok Boyutu",
      type: "integer",
      options: [1, 2, 3, 4, 5],
      defaultValue: 2,
    },
    {
      key: "speedMode",
      label: "Hız Modu",
      type: "enum",
      options: ["interval", "wpm"],
      defaultValue: "interval",
    },
    {
      key: "intervalMs",
      label: "Atlama Hızı",
      type: "integer",
      options: [
        50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
        950, 1000, 1100, 2000, 5000,
      ],
      defaultValue: 500,
      unit: "ms",
    },
    {
      key: "wordsPerMinute",
      label: "Dakikadaki Kelime Sayısı",
      type: "integer",
      options: [50, 100, 150, 200, 250, 300, 400, 500],
      defaultValue: 150,
    },
  ],
};

const EXERCISE_SETTINGS_SCHEMAS_BY_SLUG = new Map<string, ExerciseSettingsSchema>(
  [
    EYE_COLUMNS_SETTINGS_SCHEMA,
    WORD_FINDING_SETTINGS_SCHEMA,
    SQUARE_VISION_SETTINGS_SCHEMA,
    CATCH_SAME_SETTINGS_SCHEMA,
    SIMILAR_WORDS_SETTINGS_SCHEMA,
    TACHISTOSCOPE_SETTINGS_SCHEMA,
    LETTER_NUMBER_COUNTING_SETTINGS_SCHEMA,
    MEMORY_GAME_SETTINGS_SCHEMA,
    CARD_MATCHING_SETTINGS_SCHEMA,
    BLOCK_READING_SETTINGS_SCHEMA,
    SHADOW_READING_SETTINGS_SCHEMA,
  ].map((schema) => [schema.exerciseSlug, schema]),
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
