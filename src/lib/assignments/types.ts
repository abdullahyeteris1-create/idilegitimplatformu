import type { AssignmentClassGroup } from "@/lib/assignments/classGroups";

/**
 * Egzersize ozel bir settings alaninin izin verilen sekli. "integer" icin
 * `max` KASITLI olarak opsiyoneldir: bazi gercek egzersiz alanlarinin
 * (ör. wordsPerMinute) kodda yalniz alt siniri var, ust siniri yok
 * (`Number.MAX_SAFE_INTEGER` gibi bir "tasma onleyici" degil, gercek bir
 * ust sinir) - byle durumlarda uydurma bir "bilimsel" ust sinir yazmak
 * yerine yalniz finite/pozitif/integer kontrolu yapilir.
 */
export type AssignmentSettingsFieldSchema =
  | { readonly kind: "enum"; readonly values: readonly (string | number)[] }
  | { readonly kind: "integer"; readonly min: number; readonly max?: number }
  | { readonly kind: "boolean" };

export type AssignmentSettingsSchema = Readonly<Record<string, AssignmentSettingsFieldSchema>>;

/**
 * Bir egzersizin gercek "20 gunluk program" gorevine ne olcude hazir
 * oldugunu belirtir - bu, KATALOG GORUNURLUGUNDEN (assignmentEligible)
 * AYRI bir kavramdir:
 *   - "ready": bilesen kodu zaten surekli/5-dakikalik gorev moduna uygun,
 *     program uretim havuzuna girebilir.
 *   - "needs_minor_changes": bilesen kodunda kucuk degisiklik gerekir
 *     (ör. legacy->secure kayit gecisi, sure siniri eklenmesi) ama temel
 *     mimari (tek, temiz "bitis" kancasi) zaten uygun.
 *   - "needs_major_changes": bilesen kodunda otomatik bitis sinyali yok
 *     ve/veya skor modeli tek-seferlik bir yapiya kilitli - gercek bir
 *     yeniden tasarim gerekir.
 *   - "disabled": kullanici tarafindan pasif yapilmis veya Akil/Zeka
 *     Oyunlari nedeniyle kalici olarak dislanmis.
 * Yalniz "ready" olan kayitlar program uretim havuzuna (bkz.
 * programPreview.ts) girer - digerleri katalogda GORUNUR ama gercek
 * gorevlere ATANAMAZ. "Pilot havuz" bu yuzden KALICI bir dislama degildir;
 * bir egzersizin entegrasyonu tamamlaninca yalniz integrationStatus alani
 * "ready" olarak guncellenir.
 */
export type AssignmentIntegrationStatus = "ready" | "needs_minor_changes" | "needs_major_changes" | "disabled";

/** Odev sistemi kataloğunda GORUNEN bir egzersizin sunucu tarafi tanimi. */
export type AssignmentExerciseDefinition = {
  readonly exerciseSlug: string;
  readonly title: string;
  readonly route: string;
  readonly category: string;
  readonly resultExerciseType: string;
  /** Bu egzersiz genel olarak odev sistemine uygun bir aday mi? (katalog gorunurlugu) */
  readonly assignmentEligible: true;
  /** Su anda gercek 5 dakikalik program gorevine atanabilir mi? (bkz. AssignmentIntegrationStatus) */
  readonly integrationStatus: AssignmentIntegrationStatus;
  readonly supportsLevel: boolean;
  readonly levelMin?: number;
  readonly levelMax?: number;
  readonly supportsSpeed: boolean;
  readonly settingsSchema: AssignmentSettingsSchema;
  readonly defaultSettings: Readonly<Record<string, string | number | boolean>>;
};

/** program_class_templates tablosunun uygulama-katmani (camelCase) karsiligi. */
export type ProgramClassTemplate = {
  id: string;
  classGroup: AssignmentClassGroup;
  name: string;
  description: string | null;
  programDays: number;
  tasksPerDay: number;
  defaultTaskDurationSeconds: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** program_class_exercise_settings tablosunun uygulama-katmani karsiligi. */
export type ProgramClassExerciseSetting = {
  id: string;
  templateId: string;
  exerciseSlug: string;
  enabled: boolean;
  startingLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
  dailyWeight: number;
  repeatCooldownDays: number;
  maxOccurrencesPerProgram: number | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Bir sinif sablonu + o sablona bagli egzersiz ayarlari (GET yaniti icin). */
export type ProgramClassTemplateWithSettings = {
  template: ProgramClassTemplate;
  exerciseSettings: ProgramClassExerciseSetting[];
};

/** PUT /templates istek govdesindeki tek egzersiz satiri (dogrulanmamis, client'tan gelen ham girdi). */
export type AssignmentExerciseSettingInput = {
  exerciseSlug?: unknown;
  enabled?: unknown;
  startingLevel?: unknown;
  durationSeconds?: unknown;
  dailyWeight?: unknown;
  repeatCooldownDays?: unknown;
  maxOccurrencesPerProgram?: unknown;
  displayOrder?: unknown;
  settings?: unknown;
};

/** PUT /templates istek govdesi (dogrulanmamis, client'tan gelen ham girdi). */
export type ProgramClassTemplateUpsertInput = {
  templateId?: unknown;
  classGroup?: unknown;
  name?: unknown;
  description?: unknown;
  defaultTaskDurationSeconds?: unknown;
  exercises?: unknown;
};

/** POST /preview istek govdesi (dogrulanmamis, client'tan gelen ham girdi). */
export type ProgramPreviewRequestInput = {
  classGroup?: unknown;
  templateId?: unknown;
  generationSeed?: unknown;
};

/** Dogrulanmis preview istegi. */
export type ProgramPreviewRequest = {
  classGroup: AssignmentClassGroup;
  templateId?: string;
  generationSeed: string;
};

export type ProgramPreviewTask = {
  taskOrder: number;
  exerciseSlug: string;
  exerciseTitle: string;
  category: string;
  startingLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
};

export type ProgramPreviewDay = {
  dayNumber: number;
  tasks: ProgramPreviewTask[];
};

export type ProgramPreviewSummary = {
  totalDays: number;
  totalTasks: number;
  tasksPerDay: number;
  uniqueExerciseCount: number;
  categoryCounts: Record<string, number>;
  exerciseCounts: Record<string, number>;
  cooldownRelaxationCount: number;
  warnings: string[];
};

export type ProgramPreview = {
  generationSeed: string;
  classGroup: AssignmentClassGroup;
  totalDays: number;
  tasksPerDay: number;
  totalTasks: number;
  categorySummary: { category: string; count: number }[];
  exerciseSummary: { exerciseSlug: string; count: number }[];
  days: ProgramPreviewDay[];
  summary: ProgramPreviewSummary;
};
