export type EducationProgramExerciseDefinition = {
  slug: string;
  title: string;
  supportsLevel: boolean;
  levelMin?: number;
  levelMax?: number;
  defaultDurationSeconds: number;
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
    supportsLevel: true,
    levelMin: 1,
    levelMax: 9,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "ayni-olani-yakala",
    title: "Aynı Olanı Yakala",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "benzer-kelimeler",
    title: "Benzer Kelimeler",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kelime-bulma",
    title: "Kelime Bulma",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "goz-egzersizleri-kolonlar",
    title: "Göz Egzersizleri Kolonlar",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "takistoskop",
    title: "Takistoskop",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 15,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "harf-rakam-sayma",
    title: "Harf Rakam Sayma",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 4,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "hafiza-gelistirme",
    title: "Hafıza Geliştirme",
    supportsLevel: true,
    levelMin: 2,
    levelMax: 10,
    defaultDurationSeconds: 300,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kart-eslestirme",
    title: "Kart Eşleştirme",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    defaultDurationSeconds: 300,
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
