import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { ExamListClient } from "./ParagraphExamsClient";
export default async function Page() { await requireTeacherSession(); return <AppShell title="Paragraf Denemeleri" subtitle="Öğretmenler için deneme seti yönetimi." navItems={TEACHER_NAV_ITEMS} wide><ExamListClient /></AppShell>; }
