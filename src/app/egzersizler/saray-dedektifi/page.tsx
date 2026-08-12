import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { SarayDedektifiExerciseClient } from "./SarayDedektifiExerciseClient";

const EXERCISE_SLUG = "saray-dedektifi";

export default async function SarayDedektifiPage({ searchParams }: { searchParams: Promise<{ educationLaunch?: string }> }) {
  const params = await searchParams;
  const launch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, EXERCISE_SLUG);
  return (
    <EducationProgramExerciseChrome launch={launch}>
      <SarayDedektifiExerciseClient educationProgramLaunch={launch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
