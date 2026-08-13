import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { PREVIEW_EXERCISE_GROUPS } from "@/components/exercises-preview/exercisePreviewGroups";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";

const PANEL_RECOMMENDATION_SLUGS = ["hafiza-yarisi", "tatli-dukkani", "kayip-nesne"] as const;

export type StudentPanelRecommendation = {
  slug: string;
  title: string;
  href: string;
  description: string;
  category: string;
};

function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function previewDescription(slug: string): string {
  return PREVIEW_EXERCISE_GROUPS.flatMap((group) => group.exercises).find((exercise) => exercise.slug === slug)?.description
    ?? "Kısa bir oyunla bugün zihnini çalıştır.";
}

export function getStudentPanelRecommendation(results: ExerciseResult[], now = new Date()): StudentPanelRecommendation {
  const recentTypes = new Set<ExerciseType>(results.slice(0, 5).map((result) => result.exerciseType));
  const candidates = PANEL_RECOMMENDATION_SLUGS
    .map((slug) => {
      const catalog = ASSIGNMENT_EXERCISE_BY_SLUG.get(slug);
      if (!catalog) return null;
      return {
        slug,
        title: catalog.title,
        href: catalog.route,
        description: previewDescription(slug),
        category: "Akıl ve Zeka Oyunları",
        resultType: catalog.resultExerciseType as ExerciseType,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const unseen = candidates.filter((candidate) => !recentTypes.has(candidate.resultType));
  const pool = unseen.length > 0 ? unseen : candidates;
  const selected = pool[dayNumber(now) % pool.length] ?? pool[0];
  if (!selected) {
    return { slug: "egzersizler", title: "Egzersizler", href: "/egzersizler", description: "Bugün kısa bir çalışma seç.", category: "Serbest çalışma" };
  }
  return {
    slug: selected.slug,
    title: selected.title,
    href: selected.href,
    description: selected.description,
    category: selected.category,
  };
}
