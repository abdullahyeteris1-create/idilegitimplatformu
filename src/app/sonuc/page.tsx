import { AppShell } from "@/components/layout/AppShell";
import { ResultSummaryClient } from "@/components/results/ResultSummaryClient";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";
import type { ExerciseType } from "@/lib/results/types";

type ResultPageProps = {
  searchParams: Promise<{
    correct?: string;
    wrong?: string;
    percent?: string;
    successRate?: string;
    score?: string;
    exerciseType?: string;
  }>;
};

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseExerciseType(value: string | undefined): ExerciseType | undefined {
  if (
    value === "tachistoscope" ||
    value === "similar-words" ||
    value === "block-reading" ||
    value === "shadow-reading" ||
    value === "focused-reading" ||
    value === "two-side-focus" ||
    value === "attention-maze" ||
    value === "memory-game" ||
    value === "word-finding" ||
    value === "eye-muscle" ||
    value === "reading-comprehension" ||
    value === "letter-number-counting-focus" ||
    value === "card-matching" ||
    value === "visual-puzzle" ||
    value === "eye-brain" ||
    value === "word-guess" ||
    value === "catch-same" ||
    value === "hangman"
  ) {
    return value;
  }

  return undefined;
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const correct = parseOptionalNumber(params.correct);
  const wrong = parseOptionalNumber(params.wrong);
  const successRate = parseOptionalNumber(params.successRate ?? params.percent);
  const score = parseOptionalNumber(params.score);
  const exerciseType = parseExerciseType(params.exerciseType);

  return (
    <AppShell
      title="Sonuçlarım"
      subtitle="Tüm çalışma sonuçlarını görüntüle ve filtrele."
      navItems={APP_NAV_ITEMS}
      headerVariant="student-vibrant"
    >
      <ResultSummaryClient
        correct={correct}
        wrong={wrong}
        successRate={successRate}
        score={score}
        exerciseType={exerciseType}
      />
    </AppShell>
  );
}

