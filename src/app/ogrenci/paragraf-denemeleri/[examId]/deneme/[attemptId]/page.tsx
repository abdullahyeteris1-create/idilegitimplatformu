import { requireParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";
import { StudentParagraphExamsClient } from "../../../StudentParagraphExamsClient";
type PageProps = { params: Promise<{ examId: string; attemptId: string }> };
export default async function StudentParagraphExamPlayerPage({ params }: PageProps) { await requireParagraphExerciseAccess(); const { examId, attemptId } = await params; return <StudentParagraphExamsClient mode="player" examId={examId} attemptId={attemptId} />; }