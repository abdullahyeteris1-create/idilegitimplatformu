import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { AnlikGoruntuExerciseClient } from "./AnlikGoruntuExerciseClient";

const EXERCISE_SLUG = "anlik-goruntu";

export default async function AnlikGoruntuPage({ searchParams }: { searchParams: Promise<{ educationLaunch?: string }> }) {
  const params = await searchParams;
  const launch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, EXERCISE_SLUG);
  return (
    <EducationProgramExerciseChrome launch={launch}>
      <AnlikGoruntuExerciseClient educationProgramLaunch={launch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
