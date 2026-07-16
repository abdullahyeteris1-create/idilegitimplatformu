import {
  ASSIGNMENT_EXERCISE_CATALOG,
  type AssignmentExerciseDefinition,
} from "@/lib/assignments/exerciseCatalog";
import {
  EDUCATION_LEVEL_LABELS,
  type EducationLevel,
} from "@/lib/assignments/educationLevels";
import { GRADE_EXERCISE_PROFILES } from "@/lib/assignments/gradeExerciseProfiles";
import {
  createDailyAssignment,
  getDailyAssignmentByDate,
  getStudentAssignmentProfile,
  listComprehensionTextCandidates,
  listRecentAssignments,
  listRecentResultsByExerciseSlug,
} from "@/lib/assignments/assignmentRepository";
import type {
  AssignmentItemCategory,
  AssignmentSettings,
  DailyAssignment,
  GenerateDailyAssignmentInput,
} from "@/lib/assignments/assignmentTypes";
import { applyPerformanceAdjustment, calculateAverageSuccessRate } from "@/lib/assignments/performanceAdjustment";
import { compareTurkishTextTitles } from "@/lib/text-library/sorting";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const TURKIYE_TIMEZONE = "Europe/Istanbul";
const DEFAULT_COMPREHENSION_DAYS = [1, 3, 5];

type PickContext = {
  recentAssignments: DailyAssignment[];
  chosenSlugs: Set<string>;
};

function toIstanbulDate(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURKIYE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function seededHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}

function pickDeterministic<T>(items: T[], seed: string): T | null {
  if (items.length === 0) {
    return null;
  }

  const index = seededHash(seed) % items.length;
  return items[index] ?? null;
}

function normalizeCategory(textCategory: unknown): string {
  const value = String(textCategory ?? "").trim().toLocaleLowerCase("tr-TR");

  return value
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function getEducationCategoryKeywords(level: EducationLevel): string[] {
  switch (level) {
    case "primary_1":
      return ["ilkokul 1", "ilkokul", "1. sinif"];
    case "primary_2":
      return ["ilkokul 2", "ilkokul", "2. sinif"];
    case "primary_3":
      return ["ilkokul 3", "ilkokul", "3. sinif"];
    case "primary_4":
      return ["ilkokul 4", "ilkokul", "4. sinif"];
    case "middle_5_6":
      return ["ortaokul", "5", "6"];
    case "middle_7_8":
      return ["ortaokul", "7", "8"];
    case "high_school":
      return ["lise"];
    case "adult":
      return ["yetiskin", "adult"];
  }
}

function isComprehensionDay(assignmentDate: string): boolean {
  const day = new Date(`${assignmentDate}T12:00:00+03:00`).getDay();
  return DEFAULT_COMPREHENSION_DAYS.includes(day === 0 ? 7 : day);
}

function getCategoryPool(category: AssignmentItemCategory): AssignmentExerciseDefinition[] {
  return ASSIGNMENT_EXERCISE_CATALOG.filter(
    (item) => item.category === category && item.assignmentEnabled && item.route,
  );
}

function hasThreeDayStreak(
  context: PickContext,
  slug: string,
): boolean {
  const recentThree = context.recentAssignments.slice(0, 3);
  if (recentThree.length < 3) {
    return false;
  }

  return recentThree.every((assignment) =>
    assignment.items.some((item) => item.exerciseSlug === slug),
  );
}

function pickExerciseFromCategory(
  category: AssignmentItemCategory,
  seed: string,
  context: PickContext,
): AssignmentExerciseDefinition | null {
  const pool = getCategoryPool(category).filter((item) => !context.chosenSlugs.has(item.slug));

  const filtered = pool.filter((item) => !hasThreeDayStreak(context, item.slug));
  const candidates = filtered.length > 0 ? filtered : pool;

  return pickDeterministic(candidates, seed);
}

function buildAssignmentSettings(
  educationLevel: EducationLevel,
  slug: string,
): AssignmentSettings {
  return { ...(GRADE_EXERCISE_PROFILES[educationLevel]?.[slug] ?? {}) };
}

function getTargetForSettings(settings: AssignmentSettings): { type?: string; value?: number } {
  if (typeof settings.targetCorrect === "number") {
    return { type: "target_correct", value: settings.targetCorrect };
  }

  if (typeof settings.targetScore === "number") {
    return { type: "target_score", value: settings.targetScore };
  }

  if (typeof settings.targetSuccessRate === "number") {
    return { type: "target_success_rate", value: settings.targetSuccessRate };
  }

  if (typeof settings.durationMinutes === "number") {
    return { type: "duration_minutes", value: settings.durationMinutes };
  }

  return {};
}

function pickComprehensionText(
  texts: Array<Record<string, unknown>>,
  educationLevel: EducationLevel,
  recentAssignments: DailyAssignment[],
  seed: string,
): { textId?: string; textTitle?: string; isRepeat: boolean; warningMessage?: string } {
  const usedTextIds = new Set(
    recentAssignments
      .flatMap((assignment) => assignment.items)
      .filter((item) => item.exerciseSlug === "anlama-testi")
      .map((item) => item.assignedTextId)
      .filter((item): item is string => Boolean(item)),
  );

  const keywords = getEducationCategoryKeywords(educationLevel);
  const eligible = texts.filter((text) => {
    const textEducation = String(text.education_level ?? "").trim();
    if (textEducation) {
      return textEducation === educationLevel;
    }

    const normalizedCategory = normalizeCategory(text.category);
    return keywords.some((keyword) => normalizedCategory.includes(normalizeCategory(keyword)));
  });

  const unseen = eligible.filter((text) => !usedTextIds.has(String(text.id ?? "")));
  const pool = unseen.length > 0 ? unseen : eligible;

  const sorted = [...pool].sort((left, right) =>
    compareTurkishTextTitles(String(left.title ?? ""), String(right.title ?? "")),
  );

  const selected = pickDeterministic(sorted, `${seed}-comprehension`);
  if (!selected) {
    return {
      isRepeat: false,
      warningMessage: "Uygun anlama metni bulunamadi.",
    };
  }

  const selectedId = String(selected.id ?? "");
  return {
    textId: selectedId,
    textTitle: String(selected.title ?? ""),
    isRepeat: usedTextIds.has(selectedId),
  };
}

export async function generateDailyAssignment(
  input: GenerateDailyAssignmentInput,
): Promise<DailyAssignment | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const assignmentDate = input.assignmentDate || toIstanbulDate();

  if (!input.forceRegenerate) {
    const existing = await getDailyAssignmentByDate(supabase, input.studentId, assignmentDate);
    if (existing) {
      return existing;
    }
  }

  const student = await getStudentAssignmentProfile(supabase, input.studentId);
  if (!student || student.assignmentMode === "manual") {
    return null;
  }

  const educationLevel = student.educationLevel;
  if (!educationLevel) {
    return null;
  }

  const recentAssignments = await listRecentAssignments(supabase, input.studentId, assignmentDate, 7);
  const context: PickContext = {
    recentAssignments,
    chosenSlugs: new Set<string>(),
  };

  const slotCategories: AssignmentItemCategory[] = ["speed", "attention", "eye", "memory"];

  const variableCategory: AssignmentItemCategory = isComprehensionDay(assignmentDate)
    ? "comprehension"
    : (pickDeterministic(["speed", "memory", "attention", "eye"], `${input.studentId}-${assignmentDate}-var`) as AssignmentItemCategory) ?? "memory";

  slotCategories.push(variableCategory);

  const items: Array<{
    exerciseSlug: string;
    exerciseTitle: string;
    category: AssignmentItemCategory;
    sortOrder: number;
    settingsJson: AssignmentSettings;
    status: "pending";
    targetType?: "target_correct" | "target_score" | "target_success_rate" | "duration_minutes" | "custom";
    targetValue?: number;
    assignedTextId?: string;
    assignedTextTitle?: string;
    isRepeat?: boolean;
  }> = [];

  const comprehensionTexts = variableCategory === "comprehension"
    ? await listComprehensionTextCandidates(supabase)
    : [];

  let warningMessage: string | undefined;

  for (let index = 0; index < slotCategories.length; index += 1) {
    const category = slotCategories[index];
    const seed = `${input.studentId}-${assignmentDate}-${category}-${index}`;
    let picked = pickExerciseFromCategory(category, seed, context);

    if (!picked) {
      picked = pickExerciseFromCategory("memory", `${seed}-fallback`, context);
      warningMessage = warningMessage ?? "Kategori fallback secimi kullanildi.";
    }

    if (!picked) {
      continue;
    }

    context.chosenSlugs.add(picked.slug);

    const baseSettings = buildAssignmentSettings(educationLevel, picked.slug);
    const recentResults = await listRecentResultsByExerciseSlug(supabase, input.studentId, picked.slug, 5);
    const averageSuccessRate = calculateAverageSuccessRate(recentResults);
    const adjustedSettings = applyPerformanceAdjustment(baseSettings, averageSuccessRate);

    const target = getTargetForSettings(adjustedSettings);

    const nextItem: (typeof items)[number] = {
      exerciseSlug: picked.slug,
      exerciseTitle: picked.title,
      category: picked.category,
      sortOrder: index + 1,
      settingsJson: adjustedSettings,
      status: "pending",
      targetType: target.type as (typeof items)[number]["targetType"],
      targetValue: target.value,
      isRepeat: false,
    };

    if (picked.slug === "anlama-testi") {
      const selectedText = pickComprehensionText(
        comprehensionTexts,
        educationLevel,
        recentAssignments,
        `${input.studentId}-${assignmentDate}`,
      );

      if (!selectedText.textId) {
        warningMessage = selectedText.warningMessage ?? warningMessage;
      } else {
        nextItem.assignedTextId = selectedText.textId;
        nextItem.assignedTextTitle = selectedText.textTitle;
        nextItem.isRepeat = selectedText.isRepeat;
      }
    }

    items.push(nextItem);
  }

  const uniqueSlugs = new Set(items.map((item) => item.exerciseSlug));
  if (items.length < 5 || uniqueSlugs.size < 5) {
    const fallbackPool = ASSIGNMENT_EXERCISE_CATALOG.filter(
      (exercise) =>
        exercise.assignmentEnabled &&
        exercise.route &&
        !uniqueSlugs.has(exercise.slug) &&
        !hasThreeDayStreak(context, exercise.slug),
    );

    while (items.length < 5 && fallbackPool.length > 0) {
      const fallback = fallbackPool.shift();
      if (!fallback) {
        break;
      }

      const settings = buildAssignmentSettings(educationLevel, fallback.slug);
      const target = getTargetForSettings(settings);

      items.push({
        exerciseSlug: fallback.slug,
        exerciseTitle: fallback.title,
        category: fallback.category,
        sortOrder: items.length + 1,
        settingsJson: settings,
        status: "pending",
        targetType: target.type as (typeof items)[number]["targetType"],
        targetValue: target.value,
        isRepeat: false,
      });
      uniqueSlugs.add(fallback.slug);
    }
  }

  const finalItems = items.slice(0, 5).map((item, index) => ({
    ...item,
    sortOrder: index + 1,
  }));

  return createDailyAssignment(supabase, {
    ...input,
    assignmentDate,
    title: `${EDUCATION_LEVEL_LABELS[educationLevel]} - Gunluk Odev`,
    status: "pending",
    generationMode: "automatic",
    educationLevel,
    warningMessage,
    items: finalItems,
  });
}

export function getAssignmentDateForTimezone(timezone = TURKIYE_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}
