import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { loadTwoSideFocusWordSets } from "@/lib/two-side-focus/twoSideFocusRepository";
import { TwoSideFocusExerciseClient } from "./TwoSideFocusExerciseClient";

const EXERCISE_SLUG = "cift-tarafli-odak";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type TwoSideFocusPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function TwoSideFocusPage({ searchParams }: TwoSideFocusPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );
  const { wordSets } = await loadTwoSideFocusWordSets();

  return (
    <TwoSideFocusExerciseClient
      educationProgramLaunch={educationProgramLaunch ?? undefined}
      initialWordSets={wordSets}
    />
  );
}
