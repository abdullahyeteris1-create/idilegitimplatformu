import { TeacherParagraphDevelopmentView } from "@/components/teacher-panel/TeacherParagraphDevelopmentView";
import { buildParagraphAnalysis, type ParagraphAnalysisResult, type ParagraphAnalysis } from "@/lib/paragraph-exercises/paragraphAnalysis";

export function TeacherParagraphAnalysis({ results, paragraphAnalysis }: { results?: ParagraphAnalysisResult[]; paragraphAnalysis?: ParagraphAnalysis | null }) {
  const analysis = paragraphAnalysis ?? buildParagraphAnalysis(results ?? []);
  return <TeacherParagraphDevelopmentView analysis={analysis} />;
}
