import {
  ASSIGNMENT_CLASS_GROUP_LABELS,
  type AssignmentClassGroup,
} from "@/lib/assignments/classGroups";

/** The first ten correct answers use the game's actual combo scoring steps. */
export const TATLI_DUKKANI_SCORE_RANGES = [
  { min: 0, max: 399, label: "Başlangıç", tone: "starter" },
  { min: 400, max: 849, label: "Gelişiyor", tone: "growing" },
  { min: 850, max: 1_399, label: "İyi", tone: "good" },
  { min: 1_400, max: 2_299, label: "Çok İyi", tone: "veryGood" },
  { min: 2_300, max: null, label: "Mükemmel", tone: "excellent" },
] as const;

export type TatliDukkaniScoreRange = (typeof TATLI_DUKKANI_SCORE_RANGES)[number];

export function getTatliDukkaniScoreRange(score: number): TatliDukkaniScoreRange {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return TATLI_DUKKANI_SCORE_RANGES.find(
    (range) => safeScore >= range.min && (range.max === null || safeScore <= range.max),
  ) ?? TATLI_DUKKANI_SCORE_RANGES[0];
}

export function getTatliDukkaniScoreEvaluation(
  score: number,
  classGroup: AssignmentClassGroup | null,
) {
  return {
    score,
    range: getTatliDukkaniScoreRange(score),
    classGroup,
    classLabel: classGroup ? ASSIGNMENT_CLASS_GROUP_LABELS[classGroup] : null,
  };
}
