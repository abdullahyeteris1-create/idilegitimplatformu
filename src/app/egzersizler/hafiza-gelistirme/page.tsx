import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { MemoryGameExerciseClient } from "./MemoryGameExerciseClient";

const EXERCISE_SLUG = "hafiza-gelistirme";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type MemoryGamePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function MemoryGamePage({ searchParams }: MemoryGamePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}><MemoryGameExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
