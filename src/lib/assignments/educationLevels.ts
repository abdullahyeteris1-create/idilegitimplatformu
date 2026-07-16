export type EducationLevel =
  | "primary_1"
  | "primary_2"
  | "primary_3"
  | "primary_4"
  | "middle_5_6"
  | "middle_7_8"
  | "high_school"
  | "adult";

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  primary_1: "Ilkokul 1",
  primary_2: "Ilkokul 2",
  primary_3: "Ilkokul 3",
  primary_4: "Ilkokul 4",
  middle_5_6: "Ortaokul 5-6",
  middle_7_8: "Ortaokul 7-8",
  high_school: "Lise",
  adult: "Yetiskin",
};

export const EDUCATION_LEVELS = Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[];

const CLASS_LEVEL_MATCHERS: Array<{ pattern: RegExp; value: EducationLevel }> = [
  { pattern: /\b1\b/, value: "primary_1" },
  { pattern: /\b2\b/, value: "primary_2" },
  { pattern: /\b3\b/, value: "primary_3" },
  { pattern: /\b4\b/, value: "primary_4" },
  { pattern: /\b5\b|\b6\b/, value: "middle_5_6" },
  { pattern: /\b7\b|\b8\b/, value: "middle_7_8" },
  { pattern: /lise|high\s*school/, value: "high_school" },
  { pattern: /yetiskin|adult/, value: "adult" },
];

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === "string" && value in EDUCATION_LEVEL_LABELS;
}

export function normalizeEducationLevel(value: unknown): EducationLevel | undefined {
  if (isEducationLevel(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  for (const matcher of CLASS_LEVEL_MATCHERS) {
    if (matcher.pattern.test(normalized)) {
      return matcher.value;
    }
  }

  return undefined;
}
