import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { ColumnEyeExerciseClient } from "./ColumnEyeExerciseClient";

const EXERCISE_SLUG = "goz-egzersizleri-kolonlar";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type ColumnEyeExercisePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function ColumnEyeExercisePage({ searchParams }: ColumnEyeExercisePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch}><ColumnEyeExerciseClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
