import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { ReadingComprehensionTestClient } from "./ReadingComprehensionTestClient";

const EXERCISE_SLUG = "anlama-testi";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type ReadingComprehensionTestPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function ReadingComprehensionTestPage({ searchParams }: ReadingComprehensionTestPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <ReadingComprehensionTestClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
  );
}
