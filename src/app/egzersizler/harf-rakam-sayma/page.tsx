import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { LetterNumberCountingFocusClient } from "./LetterNumberCountingFocusClient";

const EXERCISE_SLUG = "harf-rakam-sayma";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type LetterNumberCountingFocusPageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

export default async function LetterNumberCountingFocusPage({
  searchParams,
}: LetterNumberCountingFocusPageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}><LetterNumberCountingFocusClient educationProgramLaunch={educationProgramLaunch ?? undefined} /></EducationProgramExerciseChrome>
  );
}
