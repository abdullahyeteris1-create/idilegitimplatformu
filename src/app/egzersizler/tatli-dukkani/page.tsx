import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { TatliDukkaniExerciseClient } from "./TatliDukkaniExerciseClient";

const EXERCISE_SLUG = "tatli-dukkani";

export default async function TatliDukkaniPage({
  searchParams,
}: {
  searchParams: Promise<{ educationLaunch?: string }>;
}) {
  const params = await searchParams;
  const launch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, EXERCISE_SLUG);

  return (
    <EducationProgramExerciseChrome launch={launch}>
      <TatliDukkaniExerciseClient educationProgramLaunch={launch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
