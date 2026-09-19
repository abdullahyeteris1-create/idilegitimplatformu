import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ExamPreviewClient } from "../../ParagraphExamsClient";
type Props = { params: Promise<{ examId: string }> };
export default async function Page({ params }: Props) { await requireTeacherSession(); const { examId } = await params; return <AppShell title="Deneme Önizlemesi" subtitle="Bu ekran yalnızca öğretmen önizlemesidir; deneme başlatmaz ve sonuç üretmez." navItems={TEACHER_NAV_ITEMS} wide><ExamPreviewClient examId={examId} /></AppShell>; }
