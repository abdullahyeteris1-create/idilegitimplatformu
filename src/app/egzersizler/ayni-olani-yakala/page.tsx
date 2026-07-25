import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { CatchSameExerciseClient } from "./CatchSameExerciseClient";

const EXERCISE_SLUG = "ayni-olani-yakala";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type CatchSamePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function CatchSamePage({ searchParams }: CatchSamePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <CatchSameExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
