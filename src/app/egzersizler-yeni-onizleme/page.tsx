import type { Metadata } from "next";
import { Suspense } from "react";
import { ExercisesPreviewShell } from "@/components/exercises-preview/ExercisesPreviewShell";

export const metadata: Metadata = {
  title: "Egzersizler Onizleme | IDIL Hizli Okuma",
  description: "Ogrenci paneli temasiyla uyumlu yeni egzersizler gecis ekrani onizlemesi.",
};

export default function ExercisesPreviewPage() {
  return (
    <Suspense fallback={null}>
      <ExercisesPreviewShell />
    </Suspense>
  );
}
