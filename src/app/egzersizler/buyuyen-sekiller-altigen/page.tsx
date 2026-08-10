import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { GrowingShapesHexagonExerciseClient } from "./GrowingShapesHexagonExerciseClient";

const EXERCISE_SLUG = "buyuyen-sekiller-altigen";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type GrowingShapesHexagonPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function GrowingShapesHexagonPage({
  searchParams,
}: GrowingShapesHexagonPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}><GrowingShapesHexagonExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
