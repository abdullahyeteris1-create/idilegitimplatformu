import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { KayipNesneExerciseClient } from "./KayipNesneExerciseClient";

const EXERCISE_SLUG = "kayip-nesne";

export default async function KayipNesnePage({ searchParams }: { searchParams: Promise<{ educationLaunch?: string }> }) {
  const params = await searchParams;
  const launch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, EXERCISE_SLUG);
  return <EducationProgramExerciseChrome launch={launch}><KayipNesneExerciseClient educationProgramLaunch={launch ?? undefined} /></EducationProgramExerciseChrome>;
}
