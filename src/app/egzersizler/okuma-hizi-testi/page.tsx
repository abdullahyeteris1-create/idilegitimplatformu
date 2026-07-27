import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { ReadingSpeedTestClient } from "./ReadingSpeedTestClient";

const EXERCISE_SLUG = "okuma-hizi-testi";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type ReadingSpeedTestPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function ReadingSpeedTestPage({ searchParams }: ReadingSpeedTestPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <ReadingSpeedTestClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
