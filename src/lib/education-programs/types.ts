export type EducationProgramCategory =
  | "grade_1"
  | "grade_2"
  | "grade_3"
  | "grade_4"
  | "grade_5_6"
  | "grade_7_8"
  | "high_school"
  | "general_adult";

export type EducationProgramTemplateStatus = "draft" | "published";

export type EducationProgramTaskSettings = Record<string, string | number | boolean>;

// Bu tipler yalniz UI/istemci tarafinda tipli okuma/varsayilan degerler icin
// kullanilir - DB katmani her zaman jenerik EducationProgramTaskSettings
// (jsonb) tutar. Alan adlari ve degerler ilgili egzersiz client
// component'lerindeki gercek state/option tanimlarindan birebir alinmistir
// (bkz. src/lib/education-programs/exerciseSettingsSchemas.ts).
export type EyeColumnsTaskSettings = {
  jumpSpeed?: 200 | 400 | 600 | 800 | 1000 | 1500 | 2000 | 2500 | 3000 | 3500 | 4000 | 4500 | 5000;
  columnCount?: 3 | 4 | 5 | 6 | 7;
  flowDirection?: "column" | "row";
};

export type WordFindingTaskSettings = {
  targetWordsPerText?: 3 | 4 | 5 | 6;
};

export type SquareVisionTaskSettings = {
  gridSize?: 7 | 9 | 11 | 13 | 15;
};

export type CatchSameTaskSettings = {
  mode?: "word" | "letter" | "symbol" | "number";
  speed?: 1500 | 1000 | 750 | 500;
};

export type SimilarWordsTaskSettings = {
  boxCount?: 12 | 16 | 20 | 24;
  targetDifferentCount?: 3 | 4 | 5 | 6 | 7 | 8;
};

export type TachistoscopeTaskSettings = {
  speedMs?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
  workMode?: "automatic" | "manual";
  contentType?: "letter" | "number" | "mixed";
};

export type LetterNumberCountingFocusTaskSettings = {
  mode?: "letters" | "numbers" | "mixed";
  difficulty?: "normal" | "hard";
  speedSeconds?: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
};

export type MemoryGameTaskSettings = {
  gridLayout?: "5x5" | "5x10" | "10x10";
  displayMs?: 500 | 750 | 1000 | 1500 | 2000;
};

export type CardMatchingTaskSettings = {
  previewDurationMs?: 2000 | 3000 | 4000 | 5000 | 7000 | 10000;
  flipBackDelayMs?: 500 | 750 | 1000 | 1250 | 1500 | 2000;
};

// intervalMs ve wordsPerMinute her ikisi de semada bagimsiz alan olarak
// bulunur (bkz. exerciseSettingsSchemas.ts) - client yalniz aktif speedMode
// ile eslesen degeri kullanir; semada kosullu/bagimli alan destegi yoktur.
export type BlockReadingTaskSettings = {
  blockSize?: 1 | 2 | 3 | 4 | 5;
  speedMode?: "interval" | "wpm";
  intervalMs?: 250 | 500 | 750 | 1000 | 1500 | 2000 | 3000 | 5000;
  wordsPerMinute?: 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500;
};

// intervalMs burada GERCEK client secim listesidir (ShadowReadingExerciseClient.tsx
// icindeki JUMP_SPEED_OPTIONS ile birebir ayni) - Blok Okuma'daki kurasyon
// listeden farklidir.
export type ShadowReadingTaskSettings = {
  blockSize?: 1 | 2 | 3 | 4 | 5;
  speedMode?: "interval" | "wpm";
  intervalMs?:
    | 50 | 100 | 150 | 200 | 250 | 300 | 350 | 400 | 450 | 500 | 550 | 600 | 650 | 700 | 750
    | 800 | 850 | 900 | 950 | 1000 | 1100 | 2000 | 5000;
  wordsPerMinute?: 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500;
};

// displayMode ve scrollMode BILEREK bu tipe dahil edilmedi - gercek client
// kodu incelendiginde bunlarin yalniz gorsel/kisisel tercih oldugu (fontSize
// ile ayni kategoride) goruldu, ogretmen ayari olarak semaya alinmadi (bkz.
// exerciseSettingsSchemas.ts).
export type GroupingReadingTaskSettings = {
  groupSize?: 2 | 3 | 4 | 5;
  speedMode?: "milliseconds" | "wordsPerMinute";
  customMilliseconds?: 100 | 250 | 500 | 750 | 1000 | 1500 | 2000 | 3000 | 5000 | 7500 | 10000;
  customWordsPerMinute?: 100 | 150 | 200 | 250 | 300 | 400 | 500 | 600 | 800 | 1000;
};

export type TwoSideFocusTaskSettings = {
  speed?: 1500 | 1200 | 900 | 650 | 450;
};

export type EducationProgramTemplateTask = {
  id: string;
  templateDayId: string;
  orderNumber: number;
  exerciseSlug: string | null;
  exerciseTitle: string | null;
  resultExerciseType: string | null;
  durationSeconds: number | null;
  startingLevel: number | null;
  settingsSchemaVersion: number;
  settings: EducationProgramTaskSettings;
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplateDay = {
  id: string;
  templateId: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
  tasks: EducationProgramTemplateTask[];
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplateSummary = {
  id: string;
  name: string;
  adminDescription: string | null;
  category: EducationProgramCategory;
  dayCount: number;
  status: EducationProgramTemplateStatus;
  isActive: boolean;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EducationProgramTemplate = EducationProgramTemplateSummary & {
  days: EducationProgramTemplateDay[];
};

export type EducationProgramTemplateMetadataInput = {
  name: string;
  adminDescription: string | null;
  category: EducationProgramCategory;
  dayCount: number;
};

export type EducationProgramTemplateTaskInput = {
  orderNumber: number;
  exerciseSlug: string | null;
  durationSeconds: number | null;
  startingLevel: number | null;
  settings: EducationProgramTaskSettings;
};

export type EducationProgramValidationIssue = {
  field: string;
  message: string;
  dayNumber?: number;
  orderNumber?: number;
};

export type EducationProgramValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; issues: EducationProgramValidationIssue[] };

export type EducationProgramRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "configuration" | "not_found" | "validation" | "database"; message: string };

export type EducationProgramActionState = {
  status: "idle" | "success" | "warning" | "error";
  message: string;
  issues?: EducationProgramValidationIssue[];
};
