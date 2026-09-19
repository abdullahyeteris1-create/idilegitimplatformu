import { requireParagraphExerciseAccess } from "@/lib/paragraph-exercises/paragraphAccess";
import { StudentParagraphExamsClient } from "./StudentParagraphExamsClient";
export default async function StudentParagraphExamListPage() { await requireParagraphExerciseAccess(); return <StudentParagraphExamsClient mode="list" />; }