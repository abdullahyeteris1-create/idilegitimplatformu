import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { loadTachistoscopeWords } from "@/lib/tachistoscope/tachistoscopeRepository";
import { TachistoscopeExerciseClient } from "@/components/exercises/TachistoscopeExerciseClient";

const EXERCISE_SLUG = "takistoskop";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type TakistoskopPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function TakistoskopPage({ searchParams }: TakistoskopPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );
  const tachistoscopeWords = (await loadTachistoscopeWords()).wordsByLevel;

  return (
    <TachistoscopeExerciseClient
      educationProgramLaunch={educationProgramLaunch ?? undefined}
      tachistoscopeWords={tachistoscopeWords}
    />
  );
}
