import type { EducationProgramCategory } from "@/lib/education-programs/types";

export type EducationProgramCategoryDefinition = {
  value: EducationProgramCategory;
  label: string;
};

export const EDUCATION_PROGRAM_CATEGORIES: readonly EducationProgramCategoryDefinition[] = [
  { value: "grade_1", label: "1. sınıf" },
  { value: "grade_2", label: "2. sınıf" },
  { value: "grade_3", label: "3. sınıf" },
  { value: "grade_4", label: "4. sınıf" },
  { value: "grade_5_6", label: "5–6. sınıf" },
  { value: "grade_7_8", label: "7–8. sınıf" },
  { value: "high_school", label: "Lise" },
  { value: "general_adult", label: "Genel/Yetişkin" },
] as const;

const CATEGORY_VALUES = new Set<string>(
  EDUCATION_PROGRAM_CATEGORIES.map((category) => category.value),
);

const CATEGORY_LABELS = new Map<EducationProgramCategory, string>(
  EDUCATION_PROGRAM_CATEGORIES.map((category) => [category.value, category.label]),
);

export function isEducationProgramCategory(value: unknown): value is EducationProgramCategory {
  return typeof value === "string" && CATEGORY_VALUES.has(value);
}

export function getEducationProgramCategoryLabel(category: EducationProgramCategory): string {
  return CATEGORY_LABELS.get(category) ?? category;
}
