import type { Metadata } from "next";
import { ParagraphExercisesClient } from "./ParagraphExercisesClient";

export const metadata: Metadata = { title: "Paragraf Çalışmaları | İDİL Eğitim", description: "Paragraf becerilerini geliştiren 10 soruluk çalışmalar." };

export default function ParagraphExercisesPage() {
  return <ParagraphExercisesClient />;
}
