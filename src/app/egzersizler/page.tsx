import type { Metadata } from "next";
import { Suspense } from "react";
import { ExercisesCenterShell } from "@/components/exercises-preview/ExercisesCenterShell";
import { getParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";

export const metadata: Metadata = {
  title: "Egzersizler | İDİL Hızlı Okuma",
  description: "Dikkat, okuma, hafıza ve anlama becerilerini geliştiren çalışmalar.",
};

export default async function ExercisesPage() {
  const paragraphAccess = await getParagraphExerciseAccess();
  return (
    <Suspense fallback={null}>
      <ExercisesCenterShell paragraphExercisesEnabled={paragraphAccess.authenticated && paragraphAccess.enabled} />
    </Suspense>
  );
}
