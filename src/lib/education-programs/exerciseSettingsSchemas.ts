import type { EducationProgramTaskSettings } from "@/lib/education-programs/types";
import { READING_SPEED_OPTIONS } from "@/lib/exercises/readingSpeedOptions";

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
export type ExerciseSettingsFieldType = "integer" | "enum" | "integer-range";

export type ExerciseSettingsOptionFieldDef = {
  key: string;
  label: string;
  type: "integer" | "enum";
  options: readonly (number | string)[];
  defaultValue: number | string;
  unit?: string;
};

// "Kelime/Dakika" gibi sabit secenek listesine sigmayan, ogretmenin serbestce
// bir tam sayi girebilmesi gereken alanlar icin - options yerine min/max/step
// araligiyla tanimlanir (bkz. BLOCK_READING_SETTINGS_SCHEMA.wordsPerMinute).
export type ExerciseSettingsRangeFieldDef = {
  key: string;
  label: string;
  type: "integer-range";
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
};

export type ExerciseSettingsFieldDef = ExerciseSettingsOptionFieldDef | ExerciseSettingsRangeFieldDef;

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
      options: [50, 100, 150, 200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
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

// intervalMs ve wordsPerMinute ikisi de her zaman semada bulunur: speedMode'a
// gore yalniz biri anlamli olsa da iki alan da bagimsiz sekilde tanimlanir;
// BlockReadingExerciseClient yalniz aktif speedMode ile eslesen degeri
// gercekten kullanir, digeri sessizce goz ardi edilir. wordsPerMinute,
// bagimsiz ekrandaki serbest sayisal girisle birebir ayni davranmasi icin
// "integer-range" tipindedir (sabit options listesi degil, min/max/step).
const BLOCK_READING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "blok-okuma",
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
      label: "Blok Aralığı",
      type: "integer",
      options: READING_SPEED_OPTIONS,
      defaultValue: 500,
      unit: "ms",
    },
    {
      key: "wordsPerMinute",
      label: "Dakikadaki Kelime Sayısı",
      type: "integer-range",
      min: 1,
      max: 2000,
      step: 1,
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
      options: READING_SPEED_OPTIONS,
      defaultValue: 500,
      unit: "ms",
    },
    {
      key: "wordsPerMinute",
      label: "Dakikadaki Kelime Sayısı",
      type: "integer-range",
      min: 1,
      max: 2000,
      step: 1,
      defaultValue: 150,
    },
  ],
};

// Gruplama Calismasi'nda displayMode ("keep"/"fade" - gecmis gruplarin
// solarak/solmadan gorunmesi) ve scrollMode ("line"/"page" - otomatik
// kaydirmanin hedef hizalamasi) BILEREK semaya EKLENMEDI: gercek client
// kodu incelendiginde (GroupingExerciseClient.tsx) bu ikisinin yalniz
// GORSEL/kisisel bir tercih oldugu goruldu - okuma zorlugunu, hizini veya
// egzersiz mekanigini degistirmiyorlar (fontSize ile ayni kategoride).
// Ogretmenin pedagojik olarak belirledigi gercek zorluk/hiz alanlari
// yalnizca groupSize, speedMode, customMilliseconds, customWordsPerMinute'tir.
const GROUPING_READING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "gruplama-calismasi",
  fields: [
    {
      key: "groupSize",
      label: "Grup Boyutu",
      type: "integer",
      options: [2, 3, 4, 5],
      defaultValue: 2,
    },
    {
      key: "speedMode",
      label: "Hız Menüsü",
      type: "enum",
      options: ["milliseconds", "wordsPerMinute"],
      defaultValue: "milliseconds",
    },
    {
      key: "customMilliseconds",
      label: "Milisaniye",
      type: "integer",
      options: READING_SPEED_OPTIONS,
      defaultValue: 500,
      unit: "ms",
    },
    {
      key: "customWordsPerMinute",
      label: "Okuma Hızı (kelime/dk)",
      type: "integer-range",
      min: 1,
      max: 2000,
      step: 1,
      defaultValue: 300,
    },
  ],
};

const TWO_SIDE_FOCUS_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "cift-tarafli-odak",
  fields: [
    {
      key: "speed",
      label: "Hız",
      type: "integer",
      options: [5000, 3000, 1500, 900, 450],
      defaultValue: 5000,
      unit: "ms",
    },
  ],
};

const THIRTEEN_POINT_EMOJI_TRACKING_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "13-nokta-emoji-takip",
  fields: [
    { key: "speed", label: "Hız", type: "integer", options: [5000, 3000, 2000, 1500, 1000, 700, 450, 300], defaultValue: 1500, unit: "ms" },
    { key: "emoji", label: "Emoji", type: "enum", options: ["⭐", "❤️", "🔵", "🟢", "🔴", "🐱", "🦋", "🚀", "⚽", "🍎", "👁️", "💎"], defaultValue: "⭐" },
    { key: "emojiMode", label: "Emoji Modu", type: "enum", options: ["fixed", "random"], defaultValue: "fixed" },
    { key: "movementPattern", label: "Hareket Düzeni", type: "enum", options: ["sequential", "reverse", "random", "center-out", "outer-center"], defaultValue: "sequential" },
    { key: "soundEnabled", label: "Ses", type: "enum", options: ["true", "false"], defaultValue: "false" },
  ],
};

const GROWING_SHAPES_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "buyuyen-sekiller-altigen",
  fields: [
    { key: "speedMode", label: "Hız Modu", type: "enum", options: ["fixed", "variable"], defaultValue: "fixed" },
    { key: "jumpDurationMs", label: "Sıçrama Süresi", type: "integer", options: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], defaultValue: 500, unit: "ms" },
    { key: "jumpEndDurationMs", label: "Bitiş Süresi", type: "integer", options: [50, 100, 150, 200, 250, 300], defaultValue: 100, unit: "ms" },
    { key: "clearMode", label: "Silme Modu", type: "enum", options: ["without-clearing", "with-clearing"], defaultValue: "without-clearing" },
    { key: "showMetronome", label: "Metronom", type: "enum", options: ["true", "false"], defaultValue: "false" },
    { key: "showFocusPoint", label: "Odak Noktası", type: "enum", options: ["true", "false"], defaultValue: "true" },
    { key: "showCorners", label: "Köşeleri Göster", type: "enum", options: ["true", "false"], defaultValue: "false" },
  ],
};

const MENTAL_ARITHMETIC_TARGET_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "hedef-toplam",
  fields: [
    { key: "speed", label: "Hız", type: "enum", options: ["relaxed", "normal", "fast"], defaultValue: "normal" },
    { key: "rounds", label: "Tur Sayısı", type: "integer", options: [5, 10, 15], defaultValue: 10 },
  ],
};

const MENTAL_ARITHMETIC_CHAIN_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "zincir-islem",
  fields: [
    { key: "speed", label: "Hız", type: "enum", options: ["relaxed", "normal", "fast"], defaultValue: "relaxed" },
    { key: "rounds", label: "Tur Sayısı", type: "integer", options: [5, 10, 15], defaultValue: 10 },
  ],
};

const MENTAL_ARITHMETIC_MARKET_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "para-kasasi",
  fields: [
    { key: "mode", label: "Oyun Türü", type: "enum", options: ["shopping", "change", "budget"], defaultValue: "shopping" },
    { key: "rounds", label: "Tur Sayısı", type: "integer", options: [5, 10, 15], defaultValue: 10 },
  ],
};

const MENTAL_ARITHMETIC_VAULT_SETTINGS_SCHEMA: ExerciseSettingsSchema = {
  exerciseSlug: "hazine-kasasi",
  fields: [
    { key: "speed", label: "Hız", type: "enum", options: ["relaxed", "normal", "fast"], defaultValue: "normal" },
    { key: "mode", label: "Oyun Türü", type: "enum", options: ["mixed-operation", "logic-code"], defaultValue: "mixed-operation" },
    { key: "digits", label: "Şifre Uzunluğu", type: "integer", options: [2, 3, 4], defaultValue: 2 },
    { key: "rounds", label: "Tur Sayısı", type: "integer", options: [5, 10, 15], defaultValue: 10 },
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
    GROUPING_READING_SETTINGS_SCHEMA,
    TWO_SIDE_FOCUS_SETTINGS_SCHEMA,
    THIRTEEN_POINT_EMOJI_TRACKING_SETTINGS_SCHEMA,
    GROWING_SHAPES_SETTINGS_SCHEMA,
    MENTAL_ARITHMETIC_TARGET_SETTINGS_SCHEMA,
    MENTAL_ARITHMETIC_CHAIN_SETTINGS_SCHEMA,
    MENTAL_ARITHMETIC_MARKET_SETTINGS_SCHEMA,
    MENTAL_ARITHMETIC_VAULT_SETTINGS_SCHEMA,
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

// integer-range alanlari icin: sonlu + tam sayi + [min,max] araliginda +
// step kuralina uygun mu kontrol eder. step tanimsizsa (veya 1 ise) her tam
// sayi gecerlidir. Bagimsiz ekranlardaki normalizeReadingSpeed (timing.ts)
// ile ayni "yuvarla, sinirlarin icinde tut" felsefesini paylasir, ama burada
// gecersiz deger SESSIZCE duzeltilmez - ya oldugu gibi kabul edilir ya da
// reddedilir (cagiran taraf reddedilen degeri nasil ele alacagina karar verir).
function isValidIntegerRangeValue(field: ExerciseSettingsRangeFieldDef, parsed: number): boolean {
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return false;
  if (parsed < field.min || parsed > field.max) return false;
  const step = field.step ?? 1;
  if (step > 1 && (parsed - field.min) % step !== 0) return false;
  return true;
}

// Yalnizca semada tanimli alanlari, semadaki izin verilen degerlerle
// eslesiyorsa kabul eder; tanimsiz alan veya gecersiz deger sessizce
// atlanir (hata firlatilmaz - cagiran taraf boylece kismi/eski {} settings
// kayitlariyla da guvenle calisir). integer-range alanlari icin de ayni
// "sessizce atla" sozlesmesi gecerlidir - acik hata uretimi isteyen cagiran
// taraf bunun yerine validateExerciseSettingsValueDetailed kullanmalidir.
export function validateExerciseSettingsValue(
  schema: ExerciseSettingsSchema,
  raw: Record<string, unknown>,
): EducationProgramTaskSettings {
  const cleaned: EducationProgramTaskSettings = {};

  for (const field of schema.fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") continue;

    if (field.type === "integer-range") {
      const parsed = Number(value);
      if (isValidIntegerRangeValue(field, parsed)) {
        cleaned[field.key] = parsed;
      }
      continue;
    }

    const normalized = field.type === "integer" ? Number(value) : String(value);
    if (field.type === "integer" && !Number.isFinite(normalized)) continue;
    if (!optionsInclude(field.options, normalized)) continue;

    cleaned[field.key] = normalized;
  }

  return cleaned;
}

export type ExerciseSettingsValidationIssue = {
  field: string;
  message: string;
};

// validateExerciseSettingsValue ile ayni temizleme mantigini kullanir, AMA
// integer-range alanlari icin ek olarak acik bir hata listesi de doner -
// bos birakilmis veya araligin/step'in disindaki bir deger gun/gorev
// validasyon mimarisine (validation.ts, EducationProgramValidationIssue)
// aktarilabilecek bir mesaja donusur. enum/integer alanlarinin mevcut
// "sessizce atla" davranisi DEGISMEZ - yalniz integer-range icin hata uretilir.
export function validateExerciseSettingsValueDetailed(
  schema: ExerciseSettingsSchema,
  raw: Record<string, unknown>,
): { settings: EducationProgramTaskSettings; issues: ExerciseSettingsValidationIssue[] } {
  const settings: EducationProgramTaskSettings = {};
  const issues: ExerciseSettingsValidationIssue[] = [];

  for (const field of schema.fields) {
    const value = raw[field.key];

    if (field.type === "integer-range") {
      const isEmpty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
      if (isEmpty) {
        issues.push({
          field: field.key,
          message: `${field.label} alanı boş bırakılamaz (${field.min}-${field.max} arasında bir tam sayı girin).`,
        });
        continue;
      }

      const parsed = Number(value);
      if (!isValidIntegerRangeValue(field, parsed)) {
        issues.push({
          field: field.key,
          message: `${field.label} ${field.min}-${field.max} arasında bir tam sayı olmalıdır.`,
        });
        continue;
      }

      settings[field.key] = parsed;
      continue;
    }

    if (value === undefined || value === null || value === "") continue;
    const normalized = field.type === "integer" ? Number(value) : String(value);
    if (field.type === "integer" && !Number.isFinite(normalized)) continue;
    if (!optionsInclude(field.options, normalized)) continue;
    settings[field.key] = normalized;
  }

  return { settings, issues };
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

// readExerciseSettingsFromFormData'dan farkli olarak alanlari DOGRULAMADAN,
// ham FormData string degerleriyle (bos string dahil) doner - integer-range
// alanlari icin "kullanici alani bosalttı" bilgisinin kaybolmamasi gerekir ki
// validateExerciseSettingsValueDetailed bunu acik bir hataya donusturebilsin.
// actions.ts::readTaskInputs bu fonksiyonu kullanir; asil dogrulama/hata
// uretimi tek noktada, validation.ts::validateEducationProgramDayTasks
// icinde validateExerciseSettingsValueDetailed araciligiyla yapilir.
export function readRawExerciseSettingsFromFormData(
  schema: ExerciseSettingsSchema,
  formData: FormData,
  keyPrefix: string,
): Record<string, string> {
  const raw: Record<string, string> = {};

  for (const field of schema.fields) {
    const value = formData.get(`${keyPrefix}${field.key}`);
    if (typeof value !== "string") continue;

    if (field.type === "integer-range" || value.trim()) {
      raw[field.key] = value;
    }
  }

  return raw;
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

// pickEducationProgramSettingOption'in integer-range karsiligi: kayitli
// deger [min,max] araliginda gecerli bir tam sayiysa aynen doner, eksik/
// gecersiz/aralik-disi ise (ornegin eski/bozuk bir kayit) client'in kendi
// guvenli varsayilanina duser - egzersiz hicbir zaman crash olmaz.
export function pickEducationProgramRangeSettingOption(
  settings: EducationProgramTaskSettings | undefined,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = settings?.[key];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}
