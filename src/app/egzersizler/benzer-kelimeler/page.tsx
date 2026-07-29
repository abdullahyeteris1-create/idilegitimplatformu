import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { loadSimilarWordPools } from "@/lib/similar-word-pools/similarWordPoolsRepository";
import { SimilarWordsExerciseClient } from "./SimilarWordsExerciseClient";

const EXERCISE_SLUG = "benzer-kelimeler";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type SimilarWordsPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function SimilarWordsPage({ searchParams }: SimilarWordsPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );
  const similarWordPools = (await loadSimilarWordPools()).pools;

  return (
    <SimilarWordsExerciseClient
      educationProgramLaunch={educationProgramLaunch ?? undefined}
      similarWordPools={similarWordPools}
    />
  );
}
