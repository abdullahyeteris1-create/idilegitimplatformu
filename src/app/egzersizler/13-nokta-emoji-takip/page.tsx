import { resolveEducationProgramExerciseLaunch } from "@/lib/education-programs/exerciseLaunchValidation";
import ThirteenPointEmojiTrackingClient from "./ThirteenPointEmojiTrackingClient";

const EXERCISE_SLUG = "13-nokta-emoji-takip";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ educationLaunch?: string }>;
};

export default async function ThirteenPointEmojiTrackingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const educationProgramLaunch = await resolveEducationProgramExerciseLaunch(params.educationLaunch, EXERCISE_SLUG);

  return <ThirteenPointEmojiTrackingClient educationProgramLaunch={educationProgramLaunch ?? undefined} />;
}
