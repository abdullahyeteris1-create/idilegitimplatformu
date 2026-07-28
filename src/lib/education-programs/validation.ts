import { isEducationProgramCategory } from "@/lib/education-programs/categories";
import { getEducationProgramExercise } from "@/lib/education-programs/exerciseCatalog";
import {
  getExerciseSettingsSchema,
  validateExerciseSettingsValueDetailed,
} from "@/lib/education-programs/exerciseSettingsSchemas";
import type {
  EducationProgramTaskSettings,
  EducationProgramTemplate,
  EducationProgramTemplateMetadataInput,
  EducationProgramTemplateTaskInput,
  EducationProgramValidationIssue,
  EducationProgramValidationResult,
} from "@/lib/education-programs/types";

export const MIN_EDUCATION_PROGRAM_DAYS = 1;
export const MAX_EDUCATION_PROGRAM_DAYS = 60;
export const EDUCATION_PROGRAM_TASKS_PER_DAY = 5;
export const MAX_EDUCATION_PROGRAM_DURATION_SECONDS = 21_600;

function failure<T>(
  issues: EducationProgramValidationIssue[],
): EducationProgramValidationResult<T> {
  return {
    ok: false,
    message: issues[0]?.message ?? "Eğitim programı bilgileri geçerli değil.",
    issues,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeSettings(value: unknown): EducationProgramTaskSettings | null {
  if (!isPlainObject(value)) return null;

  const normalized: EducationProgramTaskSettings = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      !key.trim() ||
      (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean")
    ) {
      return null;
    }
    normalized[key] = item;
  }

  return normalized;
}

export function validateEducationProgramTemplateMetadata(
  value: unknown,
): EducationProgramValidationResult<EducationProgramTemplateMetadataInput> {
  if (!isPlainObject(value)) {
    return failure([{ field: "form", message: "Program bilgileri geçerli değil." }]);
  }

  const issues: EducationProgramValidationIssue[] = [];
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description =
    typeof value.adminDescription === "string" && value.adminDescription.trim()
      ? value.adminDescription.trim()
      : null;
  const dayCount = value.dayCount;

  if (!name) {
    issues.push({ field: "name", message: "Program adı zorunludur." });
  } else if (name.length > 120) {
    issues.push({ field: "name", message: "Program adı en fazla 120 karakter olabilir." });
  }

  if (!isEducationProgramCategory(value.category)) {
    issues.push({ field: "category", message: "Kategori zorunludur." });
  }

  if (
    typeof dayCount !== "number" ||
    !Number.isInteger(dayCount) ||
    dayCount < MIN_EDUCATION_PROGRAM_DAYS ||
    dayCount > MAX_EDUCATION_PROGRAM_DAYS
  ) {
    issues.push({ field: "dayCount", message: "Gün sayısı 1 ile 60 arasında olmalıdır." });
  }

  if (description && description.length > 2000) {
    issues.push({ field: "adminDescription", message: "Açıklama en fazla 2000 karakter olabilir." });
  }

  if (issues.length > 0 || !isEducationProgramCategory(value.category) || typeof dayCount !== "number") {
    return failure(issues);
  }

  return {
    ok: true,
    value: {
      name,
      adminDescription: description,
      category: value.category,
      dayCount,
    },
  };
}

export function validateEducationProgramDayTasks(
  value: unknown,
  options: { allowIncomplete: boolean; dayNumber?: number },
): EducationProgramValidationResult<EducationProgramTemplateTaskInput[]> {
  const dayNumber = options.dayNumber;
  if (!Array.isArray(value) || value.length !== EDUCATION_PROGRAM_TASKS_PER_DAY) {
    return failure([
      {
        field: "tasks",
        message: `${dayNumber ? `Gün ${dayNumber}: ` : ""}Her gün tam 5 çalışma içermelidir.`,
        dayNumber,
      },
    ]);
  }

  const issues: EducationProgramValidationIssue[] = [];
  const normalized: EducationProgramTemplateTaskInput[] = [];
  const usedOrders = new Set<number>();
  const usedExercises = new Set<string>();

  value.forEach((raw, index) => {
    const fallbackOrder = index + 1;
    if (!isPlainObject(raw)) {
      issues.push({
        field: "task",
        message: `Çalışma ${fallbackOrder} geçerli değil.`,
        dayNumber,
        orderNumber: fallbackOrder,
      });
      return;
    }

    const orderNumber = raw.orderNumber;
    if (
      typeof orderNumber !== "number" ||
      !Number.isInteger(orderNumber) ||
      orderNumber < 1 ||
      orderNumber > EDUCATION_PROGRAM_TASKS_PER_DAY ||
      usedOrders.has(orderNumber)
    ) {
      issues.push({
        field: "orderNumber",
        message: `Çalışma sırası 1–5 arasında ve tekil olmalıdır.`,
        dayNumber,
        orderNumber: typeof orderNumber === "number" ? orderNumber : fallbackOrder,
      });
      return;
    }
    usedOrders.add(orderNumber);

    const exerciseSlug =
      typeof raw.exerciseSlug === "string" && raw.exerciseSlug.trim()
        ? raw.exerciseSlug.trim()
        : null;

    if (!exerciseSlug) {
      if (!options.allowIncomplete) {
        issues.push({
          field: "exerciseSlug",
          message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: Egzersiz seçilmelidir.`,
          dayNumber,
          orderNumber,
        });
      }

      normalized.push({
        orderNumber,
        exerciseSlug: null,
        durationSeconds: null,
        startingLevel: null,
        settings: {},
      });
      return;
    }

    const definition = getEducationProgramExercise(exerciseSlug);
    if (!definition) {
      issues.push({
        field: "exerciseSlug",
        message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: Egzersiz geçerli değil.`,
        dayNumber,
        orderNumber,
      });
      return;
    }

    if (usedExercises.has(exerciseSlug)) {
      issues.push({
        field: "exerciseSlug",
        message: `Gün ${dayNumber ?? "-"} içinde aynı egzersiz birden fazla seçilemez.`,
        dayNumber,
        orderNumber,
      });
    }
    usedExercises.add(exerciseSlug);

    const durationSeconds = raw.durationSeconds;
    if (
      typeof durationSeconds !== "number" ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > MAX_EDUCATION_PROGRAM_DURATION_SECONDS
    ) {
      issues.push({
        field: "durationSeconds",
        message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: Süre 1–21600 saniye olmalıdır.`,
        dayNumber,
        orderNumber,
      });
    }

    let startingLevel: number | null = null;
    if (definition.supportsLevel) {
      const level = raw.startingLevel;
      const levelMin = definition.levelMin ?? 1;
      const levelMax = definition.levelMax ?? Number.MAX_SAFE_INTEGER;
      if (
        typeof level !== "number" ||
        !Number.isInteger(level) ||
        level < levelMin ||
        level > levelMax
      ) {
        issues.push({
          field: "startingLevel",
          message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: Seviye ${levelMin}–${levelMax} arasında olmalıdır.`,
          dayNumber,
          orderNumber,
        });
      } else {
        startingLevel = level;
      }
    }

    const genericSettings = normalizeSettings(raw.settings);
    if (!genericSettings) {
      issues.push({
        field: "settings",
        message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: Ayarlar geçerli değil.`,
        dayNumber,
        orderNumber,
      });
    }

    // Yalniz ilk surumde ayar semasi tanimli egzersizler (eye-columns,
    // word-finding, square-vision, blok-okuma, golgeleme, gruplama-calismasi
    // vb.) gorev bazinda ayar kaydedebilir; diger egzersizler icin settings
    // her zaman bos kalir (mevcut/eski {} kayitlarla ayni davranis, geriye
    // donuk uyumlu). integer-range alanlari (ornegin serbest kelime/dakika
    // girisi) icin validateExerciseSettingsValueDetailed ayrica acik bir
    // hata listesi doner - bu, enum/integer alanlarinin mevcut "sessizce
    // atla" davranisini DEGISTIRMEZ, yalniz integer-range icin devreye girer.
    const settingsSchema = getExerciseSettingsSchema(exerciseSlug);
    let settings: EducationProgramTaskSettings = {};
    if (settingsSchema) {
      const settingsResult = validateExerciseSettingsValueDetailed(settingsSchema, genericSettings ?? {});
      settings = settingsResult.settings;
      for (const settingsIssue of settingsResult.issues) {
        issues.push({
          field: settingsIssue.field,
          message: `Gün ${dayNumber ?? "-"}, çalışma ${orderNumber}: ${settingsIssue.message}`,
          dayNumber,
          orderNumber,
        });
      }
    }

    normalized.push({
      orderNumber,
      exerciseSlug,
      durationSeconds:
        typeof durationSeconds === "number" && Number.isInteger(durationSeconds)
          ? durationSeconds
          : null,
      startingLevel,
      settings,
    });
  });

  if (usedOrders.size !== EDUCATION_PROGRAM_TASKS_PER_DAY) {
    issues.push({
      field: "orderNumber",
      message: `${dayNumber ? `Gün ${dayNumber}: ` : ""}Çalışma sıraları 1, 2, 3, 4 ve 5 olmalıdır.`,
      dayNumber,
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return {
    ok: true,
    value: normalized.sort((first, second) => first.orderNumber - second.orderNumber),
  };
}

export function validateCompleteEducationProgramTemplate(
  template: EducationProgramTemplate,
): EducationProgramValidationResult<EducationProgramTemplate> {
  const issues: EducationProgramValidationIssue[] = [];
  const daysByNumber = new Map(template.days.map((day) => [day.dayNumber, day]));

  for (let dayNumber = 1; dayNumber <= template.dayCount; dayNumber += 1) {
    const day = daysByNumber.get(dayNumber);
    if (!day) {
      issues.push({
        field: "day",
        message: `Gün ${dayNumber} eksik.`,
        dayNumber,
      });
      continue;
    }

    const taskResult = validateEducationProgramDayTasks(day.tasks, {
      allowIncomplete: false,
      dayNumber,
    });
    if (!taskResult.ok) {
      issues.push(...taskResult.issues);
    }
  }

  const extraDays = template.days.filter(
    (day) => day.dayNumber < 1 || day.dayNumber > template.dayCount,
  );
  for (const day of extraDays) {
    issues.push({
      field: "day",
      message: `Gün ${day.dayNumber}, program gün sayısının dışında.`,
      dayNumber: day.dayNumber,
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return { ok: true, value: template };
}
