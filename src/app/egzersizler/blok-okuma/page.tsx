import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { BlockReadingExerciseClient } from "./BlockReadingExerciseClient";

const EXERCISE_SLUG = "blok-okuma";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type BlockReadingPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function BlockReadingPage({ searchParams }: BlockReadingPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch}><BlockReadingExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
