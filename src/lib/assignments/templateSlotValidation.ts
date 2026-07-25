import {
  getAssignmentExerciseDefinition,
  isAssignmentCatalogExerciseSlug,
  isAssignmentReadyExerciseSlug,
} from "@/lib/assignments/assignmentExerciseCatalog";
import {
  validateDurationSeconds,
  validateExerciseSettings,
  validateStartingLevel,
  type ValidationResult,
} from "@/lib/assignments/assignmentValidation";
import type { ProgramTemplateSlot } from "@/lib/assignments/types";

export const TASKS_PER_DAY = 5;
export const MIN_PROGRAM_DAYS = 1;
export const MAX_PROGRAM_DAYS = 60;

const NOT_READY_MESSAGE = "Bu çalışma henüz ödev programına hazır değil.";

function fail<T>(message: string): ValidationResult<T> {
  return { ok: false, message };
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export function validateProgramDays(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < MIN_PROGRAM_DAYS || value > MAX_PROGRAM_DAYS) {
    return fail(`Gun sayisi ${MIN_PROGRAM_DAYS} ile ${MAX_PROGRAM_DAYS} arasinda tam sayi olmalidir.`);
  }
  return { ok: true, value };
}

export function validateDayNumber(value: unknown, programDays: number): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < 1 || value > programDays) {
    return fail(`dayNumber 1 ile ${programDays} arasinda tam sayi olmalidir.`);
  }
  return { ok: true, value };
}

export function validateTaskOrder(value: unknown): ValidationResult<number> {
  if (!isFiniteInteger(value) || value < 1 || value > TASKS_PER_DAY) {
    return fail(`taskOrder 1 ile ${TASKS_PER_DAY} arasinda tam sayi olmalidir.`);
  }
  return { ok: true, value };
}

/**
 * Client'tan gelen ham bir slot girdisini katalog karsisinda dogrular ve
 * kaydedilebilir bir ProgramTemplateSlot uretir.
 *
 * GUVENLIK: `category` client'tan ASLA okunmaz - her zaman sunucudaki
 * katalog tanimindan turetilir. Yalniz integrationStatus="ready" olan
 * egzersizler kabul edilir; katalogda gorunen ama hazir olmayanlar (ör.
 * Okuma/Anlama grubu) ic detay sizdirmayan sabit bir mesajla reddedilir.
 */
export function validateTemplateSlotInput(
  raw: unknown,
  programDays: number,
): ValidationResult<ProgramTemplateSlot> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return fail("Her slot bir nesne olmalidir.");
  }

  const item = raw as Record<string, unknown>;

  const dayResult = validateDayNumber(item.dayNumber, programDays);
  if (!dayResult.ok) {
    return fail(dayResult.message);
  }

  const orderResult = validateTaskOrder(item.taskOrder);
  if (!orderResult.ok) {
    return fail(`Gun ${dayResult.value}: ${orderResult.message}`);
  }

  const slotLabel = `Gun ${dayResult.value} / sira ${orderResult.value}`;

  const exerciseSlug = typeof item.exerciseSlug === "string" ? item.exerciseSlug.trim() : "";
  if (!isAssignmentCatalogExerciseSlug(exerciseSlug)) {
    return fail(`${slotLabel}: gecersiz egzersiz (${exerciseSlug || "bos"}).`);
  }
  if (!isAssignmentReadyExerciseSlug(exerciseSlug)) {
    return fail(`${slotLabel}: ${NOT_READY_MESSAGE}`);
  }

  const definition = getAssignmentExerciseDefinition(exerciseSlug);
  if (!definition) {
    return fail(`${slotLabel}: gecersiz egzersiz (${exerciseSlug}).`);
  }

  const levelResult = validateStartingLevel(
    item.startingLevel ?? 1,
    definition.supportsLevel ? (definition.levelMin ?? 1) : 1,
    definition.supportsLevel ? definition.levelMax : undefined,
  );
  if (!levelResult.ok) {
    return fail(`${slotLabel}: ${levelResult.message}`);
  }

  const durationResult = validateDurationSeconds(item.durationSeconds ?? 300);
  if (!durationResult.ok) {
    return fail(`${slotLabel}: ${durationResult.message}`);
  }

  const settingsResult = validateExerciseSettings(item.settings, definition.settingsSchema);
  if (!settingsResult.ok) {
    return fail(`${slotLabel}: ${settingsResult.message}`);
  }

  return {
    ok: true,
    value: {
      dayNumber: dayResult.value,
      taskOrder: orderResult.value,
      exerciseSlug,
      category: definition.category,
      startingLevel: levelResult.value,
      durationSeconds: durationResult.value,
      settings: settingsResult.value,
    },
  };
}

/**
 * Bir slot listesini toptan dogrular. Yapisal kurallar (ayni gun/sira ikilisi
 * tekrar edemez, ayni gun icinde ayni egzersiz tekrar edemez) burada da
 * kontrol edilir - DB'deki unique constraint'ler son savunma katmanidir, ama
 * kullaniciya anlasilir bir mesaj donebilmek icin burada erken yakalanir.
 */
export function validateTemplateSlotList(
  rawSlots: unknown,
  programDays: number,
): ValidationResult<ProgramTemplateSlot[]> {
  if (!Array.isArray(rawSlots)) {
    return fail("slots bir dizi olmalidir.");
  }

  const maxSlots = programDays * TASKS_PER_DAY;
  if (rawSlots.length > maxSlots) {
    return fail(`Sablon en fazla ${maxSlots} slot icerebilir.`);
  }

  const slots: ProgramTemplateSlot[] = [];
  const seenPositions = new Set<string>();
  const seenDaySlugs = new Set<string>();

  for (const raw of rawSlots) {
    const result = validateTemplateSlotInput(raw, programDays);
    if (!result.ok) {
      return fail(result.message);
    }

    const slot = result.value;

    const positionKey = `${slot.dayNumber}:${slot.taskOrder}`;
    if (seenPositions.has(positionKey)) {
      return fail(`Gun ${slot.dayNumber} / sira ${slot.taskOrder} birden fazla kez gonderildi.`);
    }
    seenPositions.add(positionKey);

    const daySlugKey = `${slot.dayNumber}:${slot.exerciseSlug}`;
    if (seenDaySlugs.has(daySlugKey)) {
      return fail(`Gun ${slot.dayNumber} icinde ayni egzersiz birden fazla kez kullanilamaz.`);
    }
    seenDaySlugs.add(daySlugKey);

    slots.push(slot);
  }

  return { ok: true, value: slots };
}
