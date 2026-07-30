import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import EyeMuscleExerciseClient from "./EyeMuscleExerciseClient";

const EXERCISE_SLUG = "goz-kaslari";
const LAUNCH_QUERY_PARAM = "educationLaunch";

export const dynamic = "force-dynamic";

type EyeMusclePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function EyeMusclePage({ searchParams }: EyeMusclePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return <EyeMuscleExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} />;
}