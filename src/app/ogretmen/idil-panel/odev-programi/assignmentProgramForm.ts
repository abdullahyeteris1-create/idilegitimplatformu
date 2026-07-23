import {
  validateDailyWeight,
  validateDisplayOrder,
  validateDurationSeconds,
  validateExerciseSettings,
  validateMaxOccurrencesPerProgram,
  validateRepeatCooldownDays,
  validateStartingLevel,
} from "@/lib/assignments/assignmentValidation";
import type {
  AssignmentExerciseDefinition,
  AssignmentSettingsSchema,
  ProgramClassExerciseSetting,
} from "@/lib/assignments/types";

/**
 * "20 Gunluk Odev Programi" ogretmen ekrani icin SAF (React/DOM'suz) form
 * yardimcilari. Bu dosya yalniz veri donusumu/dogrulama icerir - hicbir JSX
 * yoktur, bu yuzden node:test ile dogrudan test edilebilir.
 */

export const INTEGRATION_STATUS_LABELS: Record<string, string> = {
  ready: "Hazır",
  needs_minor_changes: "Entegrasyon gerekli",
  needs_major_changes: "Gelişmiş entegrasyon gerekiyor",
  disabled: "Pasif",
};

/** Gercek katalog `category` degerinden ogretmen ekranindaki grup basligina. */
export const CATEGORY_GROUP_LABELS: Record<string, string> = {
  speed: "Hız / Okuma",
  comprehension: "Anlama",
  attention: "Dikkat / Odak",
  memory: "Hafıza",
  eye: "Göz / Görsel Algı",
};

export function getCategoryGroupLabel(category: string): string {
  return CATEGORY_GROUP_LABELS[category] ?? category;
}

/** Bilinen settings anahtarlari icin Turkce, birimli etiketler. Uydurma anahtar EKLENMEZ. */
const SETTINGS_FIELD_LABELS: Record<string, string> = {
  gridSize: "Kare Boyutu",
  soundEnabled: "Ses",
  mode: "Mod",
  speed: "Hız (ms)",
  boxCount: "Kutu Sayısı",
  targetDifferentCount: "Farklı Hedef Sayısı",
  targetWordsPerText: "Metin Başına Hedef Kelime",
  jumpSpeed: "Atlama Hızı (ms)",
  columnCount: "Kolon Sayısı",
  flowDirection: "Akış Yönü",
  speedMs: "Gösterim Hızı (ms)",
  workMode: "Çalışma Modu",
  contentType: "İçerik Türü",
  difficulty: "Zorluk",
  speedSeconds: "Tur Süresi (sn)",
  gridLayout: "Izgara Düzeni",
  displayMs: "Gösterim Süresi (ms)",
  fontSize: "Yazı Boyutu (px)",
  previewDurationMs: "Önizleme Süresi (ms)",
  flipBackDelayMs: "Kapanma Süresi (ms)",
  blockSize: "Blok Boyutu",
  speedMode: "Hız Modu",
  intervalMs: "Aralık (ms)",
  wordsPerMinute: "Dakikadaki Kelime (WPM)",
  groupSize: "Grup Boyutu",
  displayMode: "Gösterim Modu",
  scrollMode: "Kaydırma Modu",
  customMilliseconds: "Özel Süre (ms)",
  customWordsPerMinute: "Özel WPM",
};

/** Bilinen bir settings anahtari icin insan-okunur etiket; bilinmeyen anahtarlar camelCase'den humanize edilir. */
export function getSettingFieldLabel(key: string): string {
  const known = SETTINGS_FIELD_LABELS[key];
  if (known) {
    return known;
  }
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.length > 0 ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}

/** 300 -> "5 dakika", 330 -> "5 dk 30 sn". Yalniz gosterim icindir - API'ye hep saniye gider. */
export function formatDurationLabel(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "-";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (seconds === 0) {
    return `${minutes} dakika`;
  }
  return `${minutes} dk ${seconds} sn`;
}

export type ExerciseFormState = {
  enabled: boolean;
  startingLevel: number;
  durationSeconds: number;
  dailyWeight: number;
  repeatCooldownDays: number;
  maxOccurrencesPerProgram: number | null;
  displayOrder: number;
  settings: Record<string, string | number | boolean>;
};

/** Kaydedilmis bir ayar hic yoksa (yeni taslak) kullanilacak varsayilan form durumu. */
export function buildDefaultExerciseFormState(
  definition: Pick<AssignmentExerciseDefinition, "levelMin" | "defaultSettings">,
  defaultDurationSeconds: number,
  displayOrder: number,
): ExerciseFormState {
  return {
    enabled: false,
    startingLevel: definition.levelMin ?? 1,
    durationSeconds: defaultDurationSeconds,
    dailyWeight: 1,
    repeatCooldownDays: 0,
    maxOccurrencesPerProgram: null,
    displayOrder,
    settings: { ...definition.defaultSettings },
  };
}

/** DB'den gelen mevcut bir satirdan form durumu kurar. */
export function exerciseFormStateFromSetting(setting: ProgramClassExerciseSetting): ExerciseFormState {
  return {
    enabled: setting.enabled,
    startingLevel: setting.startingLevel,
    durationSeconds: setting.durationSeconds,
    dailyWeight: setting.dailyWeight,
    repeatCooldownDays: setting.repeatCooldownDays,
    maxOccurrencesPerProgram: setting.maxOccurrencesPerProgram,
    displayOrder: setting.displayOrder,
    settings: { ...setting.settings },
  };
}

export type TemplateFormValidationError = { field: string; message: string };

/**
 * PUT gonderilmeden once client-side on-dogrulama. Yalniz UX icindir -
 * nihai dogrulama her zaman sunucu API'sindedir (bkz. templates/route.ts).
 * Mumkun oldugunca ayni assignmentValidation.ts fonksiyonlarini kullanir,
 * boylece iki ayri dogrulama mantigi birbirinden sapmaz.
 */
export function validateTemplateFormClientSide(input: {
  name: string;
  defaultTaskDurationSeconds: number;
  readyExerciseSlugs: readonly string[];
  exerciseForms: Readonly<Record<string, ExerciseFormState>>;
  settingsSchemaBySlug: Readonly<Record<string, AssignmentSettingsSchema>>;
}): TemplateFormValidationError[] {
  const errors: TemplateFormValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({ field: "name", message: "Şablon adı boş olamaz." });
  }

  const durationResult = validateDurationSeconds(input.defaultTaskDurationSeconds);
  if (!durationResult.ok) {
    errors.push({ field: "defaultTaskDurationSeconds", message: durationResult.message });
  }

  for (const slug of input.readyExerciseSlugs) {
    const form = input.exerciseForms[slug];
    if (!form) {
      continue;
    }

    const levelResult = validateStartingLevel(form.startingLevel);
    if (!levelResult.ok) {
      errors.push({ field: `${slug}.startingLevel`, message: `${slug}: ${levelResult.message}` });
    }

    const exerciseDurationResult = validateDurationSeconds(form.durationSeconds);
    if (!exerciseDurationResult.ok) {
      errors.push({ field: `${slug}.durationSeconds`, message: `${slug}: ${exerciseDurationResult.message}` });
    }

    const weightResult = validateDailyWeight(form.dailyWeight);
    if (!weightResult.ok) {
      errors.push({ field: `${slug}.dailyWeight`, message: `${slug}: ${weightResult.message}` });
    }

    const cooldownResult = validateRepeatCooldownDays(form.repeatCooldownDays);
    if (!cooldownResult.ok) {
      errors.push({ field: `${slug}.repeatCooldownDays`, message: `${slug}: ${cooldownResult.message}` });
    }

    const maxOccurrencesResult = validateMaxOccurrencesPerProgram(form.maxOccurrencesPerProgram);
    if (!maxOccurrencesResult.ok) {
      errors.push({ field: `${slug}.maxOccurrencesPerProgram`, message: `${slug}: ${maxOccurrencesResult.message}` });
    }

    const displayOrderResult = validateDisplayOrder(form.displayOrder);
    if (!displayOrderResult.ok) {
      errors.push({ field: `${slug}.displayOrder`, message: `${slug}: ${displayOrderResult.message}` });
    }

    const schema = input.settingsSchemaBySlug[slug];
    if (schema) {
      const settingsResult = validateExerciseSettings(form.settings, schema);
      if (!settingsResult.ok) {
        errors.push({ field: `${slug}.settings`, message: `${slug}: ${settingsResult.message}` });
      }
    }
  }

  return errors;
}

/**
 * PUT govdesindeki `exercises` dizisini kurar - YALNIZ "ready" slug'lari
 * icerir (hazir olmayanlar hic gonderilmez, bkz. templates/route.ts'nin
 * kendi ready-kontrolu ile ayni kural). category/title asla gonderilmez.
 */
export function buildExercisesPayload(
  readyExerciseSlugs: readonly string[],
  exerciseForms: Readonly<Record<string, ExerciseFormState>>,
): Array<{
  exerciseSlug: string;
  enabled: boolean;
  startingLevel: number;
  durationSeconds: number;
  dailyWeight: number;
  repeatCooldownDays: number;
  maxOccurrencesPerProgram: number | null;
  displayOrder: number;
  settings: Record<string, string | number | boolean>;
}> {
  return readyExerciseSlugs
    .map((exerciseSlug) => {
      const form = exerciseForms[exerciseSlug];
      if (!form) {
        return null;
      }
      return {
        exerciseSlug,
        enabled: form.enabled,
        startingLevel: form.startingLevel,
        durationSeconds: form.durationSeconds,
        dailyWeight: form.dailyWeight,
        repeatCooldownDays: form.repeatCooldownDays,
        maxOccurrencesPerProgram: form.maxOccurrencesPerProgram,
        displayOrder: form.displayOrder,
        settings: form.settings,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/** Programda tam 5 gorevlik gunler uretebilmek icin en az kac ready+enabled egzersiz onerilir. */
export const MINIMUM_ENABLED_READY_EXERCISES = 5;

export function countEnabledReadyExercises(
  readyExerciseSlugs: readonly string[],
  exerciseForms: Readonly<Record<string, ExerciseFormState>>,
): number {
  return readyExerciseSlugs.filter((slug) => exerciseForms[slug]?.enabled && exerciseForms[slug].dailyWeight > 0).length;
}
