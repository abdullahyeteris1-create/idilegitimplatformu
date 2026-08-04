import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { WordRaceExerciseClient } from "./WordRaceExerciseClient";

const EXERCISE_SLUG = "kelime-yarisi";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type WordRacePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function WordRacePage({ searchParams }: WordRacePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return <WordRaceExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />;
}
