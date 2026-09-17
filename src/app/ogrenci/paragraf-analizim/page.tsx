import type { Metadata } from "next";
import { requireParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";
import { loadParagraphStudentAnalyticsForVerifiedStudent } from "@/lib/paragraph-exercises/paragraphStudentAnalyticsRepository";
import { StudentParagraphAnalyticsView } from "./StudentParagraphAnalyticsView";

export const metadata: Metadata = {
  title: "Paragraf Analizim | İDİL Hızlı Okuma",
  description: "Paragraf çalışmalarındaki gelişimini incele.",
};

export const dynamic = "force-dynamic";

export default async function StudentParagraphAnalyticsPage() {
  const access = await requireParagraphExerciseAccess();
  const analysis = await loadParagraphStudentAnalyticsForVerifiedStudent(access.studentId);

  return <StudentParagraphAnalyticsView analysis={analysis} />;
}
