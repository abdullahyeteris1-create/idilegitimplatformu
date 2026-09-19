import { requireParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";
import { StudentParagraphExamsClient } from "../StudentParagraphExamsClient";
type PageProps = { params: Promise<{ examId: string }> };
export default async function StudentParagraphExamStartPage({ params }: PageProps) { await requireParagraphExerciseAccess(); const { examId } = await params; return <StudentParagraphExamsClient mode="start" examId={examId} />; }