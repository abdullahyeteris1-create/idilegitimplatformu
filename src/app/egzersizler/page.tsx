import type { Metadata } from "next";
import { Suspense } from "react";
import { ExercisesCenterShell } from "@/components/exercises-preview/ExercisesCenterShell";

export const metadata: Metadata = {
  title: "Egzersizler | İDİL Hızlı Okuma",
  description: "Dikkat, okuma, hafıza ve anlama becerilerini geliştiren çalışmalar.",
};

export default function ExercisesPage() {
  return (
    <Suspense fallback={null}>
      <ExercisesCenterShell />
    </Suspense>
  );
}
