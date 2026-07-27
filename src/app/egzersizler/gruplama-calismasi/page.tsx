import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { GroupingExerciseClient } from "./GroupingExerciseClient";

const EXERCISE_SLUG = "gruplama-calismasi";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type GroupingExercisePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function GroupingExercisePage({ searchParams }: GroupingExercisePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <GroupingExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
