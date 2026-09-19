import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ExamEditorClient } from "../ParagraphExamsClient";
type Props = { params: Promise<{ examId: string }> };
export default async function Page({ params }: Props) { await requireTeacherSession(); const { examId } = await params; return <AppShell title="Paragraf Denemesi" subtitle="Taslak içeriğini düzenleyin veya yayınlanan denemeyi inceleyin." navItems={TEACHER_NAV_ITEMS} wide><ExamEditorClient examId={examId} /></AppShell>; }
