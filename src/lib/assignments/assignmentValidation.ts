import { isAssignmentClassGroup, type AssignmentClassGroup } from "@/lib/assignments/classGroups";
import type { AssignmentSettingsSchema } from "@/lib/assignments/types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function fail<T>(message: string): ValidationResult<T> {
  return { ok: false, message };
}

/** Prototype pollution'a karsi: bu anahtarlar hicbir settings objesinde kabul edilmez. */
const FORBIDDEN_SETTINGS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export function validateClassGroup(value: unknown): ValidationResult<AssignmentClassGroup> {
  if (!isAssignmentClassGroup(value)) {
    return fail("Gecersiz sinif grubu.");
  }
  return ok(value);
}

export function validateStartingLevel(value: unknown, min = 1, max?: number): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < min || (typeof max === "number" && value > max)) {
    return fail(
      typeof max === "number"
        ? `startingLevel ${min} ile ${max} arasinda tam sayi olmalidir.`
        : `startingLevel en az ${min} olan tam sayi olmalidir.`,
    );
  }
  return ok(value);
}

export function validateDurationSeconds(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value <= 0) {
    return fail("durationSeconds pozitif bir tam sayi olmalidir.");
  }
  return ok(value);
}

export function validateDailyWeight(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < 0) {
    return fail("dailyWeight sifir veya pozitif bir tam sayi olmalidir.");
  }
  return ok(value);
}

export function validateRepeatCooldownDays(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < 0) {
    return fail("repeatCooldownDays sifir veya pozitif bir tam sayi olmalidir.");
  }
  return ok(value);
}

export function validateMaxOccurrencesPerProgram(value: unknown): ValidationResult<number | null> {
  if (value === null || value === undefined) {
    return ok(null);
  }
  if (!isFiniteInteger(value) || value <= 0) {
    return fail("maxOccurrencesPerProgram null veya pozitif bir tam sayi olmalidir.");
  }
  return ok(value);
}

export function validateDisplayOrder(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < 0) {
    return fail("displayOrder sifir veya pozitif bir tam sayi olmalidir.");
  }
  return ok(value);
}

/**
 * Bir egzersizin settings objesini, o egzersizin allowlist'teki
 * settingsSchema'sina gore dogrular:
 *  - object olmali (array/null olamaz)
 *  - __proto__/prototype/constructor anahtarlari reddedilir
 *  - semada TANIMLI OLMAYAN hicbir anahtar kabul edilmez (sessizce filtrelemek
 *    yerine acikca reddedilir)
 *  - her tanimli anahtarin degeri kendi alan semasina uymalidir (enum/integer/boolean)
 * Basarili sonucta yalniz semadaki anahtarlari iceren, guvenli bir kopya doner.
 */
export function validateExerciseSettings(
  value: unknown,
  schema: AssignmentSettingsSchema,
): ValidationResult<Record<string, string | number | boolean>> {
  const input = value === undefined ? {} : value;

  if (!isPlainObject(input)) {
    return fail("settings duz bir JSON nesnesi olmalidir.");
  }

  const result: Record<string, string | number | boolean> = {};

  for (const key of Object.keys(input)) {
    if (FORBIDDEN_SETTINGS_KEYS.has(key)) {
      return fail(`settings icinde izin verilmeyen anahtar: ${key}.`);
    }
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      return fail(`Bilinmeyen settings anahtari: ${key}.`);
    }
  }

  for (const [key, fieldSchema] of Object.entries(schema)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      continue;
    }

    const fieldValue = input[key];

    if (fieldSchema.kind === "enum") {
      if (
        (typeof fieldValue !== "string" && typeof fieldValue !== "number") ||
        !fieldSchema.values.includes(fieldValue as never)
      ) {
        return fail(`settings.${key} icin izin verilen bir deger degil.`);
      }
      result[key] = fieldValue;
      continue;
    }

    if (fieldSchema.kind === "integer") {
      const hasMax = typeof fieldSchema.max === "number";
      if (
        !isFiniteInteger(fieldValue) ||
        fieldValue < fieldSchema.min ||
        (hasMax && fieldValue > (fieldSchema.max as number))
      ) {
        return fail(
          hasMax
            ? `settings.${key} ${fieldSchema.min} ile ${fieldSchema.max} arasinda tam sayi olmalidir.`
            : `settings.${key} en az ${fieldSchema.min} olan tam sayi olmalidir.`,
        );
      }
      result[key] = fieldValue;
      continue;
    }

    if (typeof fieldValue !== "boolean") {
      return fail(`settings.${key} true/false olmalidir.`);
    }
    result[key] = fieldValue;
  }

  return ok(result);
}
