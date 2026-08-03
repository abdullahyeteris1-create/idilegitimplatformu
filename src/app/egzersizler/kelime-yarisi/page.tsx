import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import { WordRaceGame } from "@/components/exercises/word-race/WordRaceGame";
import { WORD_RACE_EXERCISE_SLUG } from "@/components/exercises/word-race/wordRaceConfig";

export const dynamic = "force-dynamic";

type WordRacePageProps = {
  searchParams: Promise<{ educationLaunch?: string }>;
};

export default async function WordRacePage({ searchParams }: WordRacePageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(
    params.educationLaunch,
    WORD_RACE_EXERCISE_SLUG,
  );

  return <WordRaceGame educationProgramLaunch={educationProgramLaunch ?? undefined} />;
}
