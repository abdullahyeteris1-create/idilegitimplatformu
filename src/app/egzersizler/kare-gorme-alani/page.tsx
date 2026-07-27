import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { SquareVisionExerciseClient } from "./SquareVisionExerciseClient";

const EXERCISE_SLUG = "kare-gorme-alani";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type SquareVisionExercisePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function SquareVisionExercisePage({
  searchParams,
}: SquareVisionExercisePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <SquareVisionExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
