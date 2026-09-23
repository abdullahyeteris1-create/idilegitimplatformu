import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { OneMinuteOralReadingClient } from "./OneMinuteOralReadingClient";

const EXERCISE_SLUG = "bir-dakika-sesli-okuma";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type PageProps = {
  searchParams: Promise<{ [LAUNCH_QUERY_PARAM]?: string }>;
};

export default async function OneMinuteOralReadingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}>
      <OneMinuteOralReadingClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
