import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { ShadowReadingExerciseClient } from "./ShadowReadingExerciseClient";

const EXERCISE_SLUG = "golgeleme";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type ShadowReadingPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function ShadowReadingPage({ searchParams }: ShadowReadingPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <ShadowReadingExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
