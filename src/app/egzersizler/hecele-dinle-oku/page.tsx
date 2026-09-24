import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { HeceleDinleOkuClient } from "./HeceleDinleOkuClient";

const EXERCISE_SLUG = "hecele-dinle-oku";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type PageProps = {
  searchParams: Promise<{ [LAUNCH_QUERY_PARAM]?: string }>;
};

export default async function HeceleDinleOkuPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}>
      <HeceleDinleOkuClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
