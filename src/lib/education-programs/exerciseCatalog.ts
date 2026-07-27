export type EducationProgramExerciseDefinition = {
  slug: string;
  title: string;
  resultExerciseType: string;
  supportsLevel: boolean;
  levelMin?: number;
  levelMax?: number;
  defaultDurationSeconds: number;
  settingsSchemaVersion: number;
  settingsPlaceholder: string;
};

const READONLY_SETTINGS_PLACEHOLDER = "Egzersize özel ayarlar sonraki fazda düzenlenecek.";

/**
 * Education Program alanına ait bağımsız katalog.
 *
 * Bu katalog başka bir program/ödev alanından import edilmez. Faz 1'de yalnız
 * yönetici şablon editörünün temel egzersiz, süre ve seviye alanlarını besler;
 * egzersiz çalıştırma entegrasyonu yapmaz.
 */
export const EDUCATION_PROGRAM_EXERCISE_CATALOG: readonly EducationProgramExerciseDefinition[] = [
  {
    slug: "kare-gorme-alani",
    title: "Kare Görme Alanı",
    resultExerciseType: "square-vision",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 9,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "ayni-olani-yakala",
    title: "Aynı Olanı Yakala",
    resultExerciseType: "catch-same",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "benzer-kelimeler",
    title: "Benzer Kelimeler",
    resultExerciseType: "similar-words",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kelime-bulma",
    title: "Kelime Bulma",
    resultExerciseType: "word-finding",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "goz-egzersizleri-kolonlar",
    title: "Göz Egzersizleri Kolonlar",
    resultExerciseType: "eye-columns",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "takistoskop",
    title: "Takistoskop",
    resultExerciseType: "tachistoscope",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 15,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "harf-rakam-sayma",
    title: "Harf Rakam Sayma",
    resultExerciseType: "letter-number-counting-focus",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 4,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "hafiza-gelistirme",
    title: "Hafıza Geliştirme",
    resultExerciseType: "memory-game",
    supportsLevel: true,
    levelMin: 2,
    levelMax: 10,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kart-eslestirme",
    title: "Kart Eşleştirme",
    resultExerciseType: "card-matching",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "blok-okuma",
    title: "Blok Okuma",
    resultExerciseType: "block-reading",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "golgeleme",
    title: "Gölgeleme",
    resultExerciseType: "shadow-reading",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
] as const;

export const EDUCATION_PROGRAM_EXERCISE_BY_SLUG = new Map<
  string,
  EducationProgramExerciseDefinition
>(
  EDUCATION_PROGRAM_EXERCISE_CATALOG.map((exercise) => [exercise.slug, exercise]),
);

export function getEducationProgramExercise(
  slug: string,
): EducationProgramExerciseDefinition | undefined {
  return EDUCATION_PROGRAM_EXERCISE_BY_SLUG.get(slug);
}
