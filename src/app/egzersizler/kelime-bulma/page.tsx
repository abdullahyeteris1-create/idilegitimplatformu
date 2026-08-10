import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { WordFindingExerciseClient } from "./WordFindingExerciseClient";

const EXERCISE_SLUG = "kelime-bulma";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type WordFindingPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function WordFindingPage({ searchParams }: WordFindingPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}><WordFindingExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
