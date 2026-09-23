import { EducationProgramExerciseChrome } from "@/components/education-programs/EducationProgramExerciseChrome";
import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { ListenThenReadClient } from "./ListenThenReadClient";

const EXERCISE_SLUG = "dinle-sen-oku";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type PageProps = {
  searchParams: Promise<{ [LAUNCH_QUERY_PARAM]?: string }>;
};

export default async function ListenThenReadPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params[LAUNCH_QUERY_PARAM],
    EXERCISE_SLUG,
  );

  return (
    <EducationProgramExerciseChrome launch={educationProgramLaunch} showCountdown={false}>
      <ListenThenReadClient educationProgramLaunch={educationProgramLaunch ?? undefined} />
    </EducationProgramExerciseChrome>
  );
}
