import { MentalArithmeticGameClient } from "../MentalArithmeticGameClient";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";

export default async function Page({ searchParams }: { searchParams: Promise<{ educationLaunch?: string }> }) {
  const params = await searchParams;
  const launch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, "zincir-islem");
  return <EducationProgramExerciseChrome launch={launch}><MentalArithmeticGameClient kind="chain" educationProgramLaunch={launch ?? undefined} /></EducationProgramExerciseChrome>;
}
