import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EmotionalReadingClient } from "./EmotionalReadingClient";

const EXERCISE_SLUG = "duygulu-okuma";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type PageProps = {
  searchParams: Promise<{ [LAUNCH_QUERY_PARAM]?: string }>;
};

export default async function EmotionalReadingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}>
      <EmotionalReadingClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
