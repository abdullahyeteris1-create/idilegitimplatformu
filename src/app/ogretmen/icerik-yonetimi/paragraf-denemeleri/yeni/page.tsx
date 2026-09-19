import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ExamEditorClient } from "../ParagraphExamsClient";
export default async function Page() { await requireTeacherSession(); return <AppShell title="Yeni Paragraf Denemesi" subtitle="Önce taslak oluşturun, ardından pasaj ve soruları ekleyin." navItems={TEACHER_NAV_ITEMS} wide><ExamEditorClient createMode /></AppShell>; }
