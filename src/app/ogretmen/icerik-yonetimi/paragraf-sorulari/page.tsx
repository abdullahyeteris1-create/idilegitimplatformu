import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import ParagraphQuestionsAdminClient from "./ParagraphQuestionsAdminClient";
import ParagraphQuestionAIGenerator from "./ParagraphQuestionAIGenerator";
export default async function Page() { await requireTeacherSession(); return <AppShell title="Paragraf Soruları" subtitle="Soru havuzunu yönetin." navItems={TEACHER_NAV_ITEMS} wide><Link href="/ogretmen/icerik-yonetimi" className="mb-4 inline-flex rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-bold text-red-800">İçerik Yönetimine Dön</Link><div className="space-y-4"><ParagraphQuestionAIGenerator /><ParagraphQuestionsAdminClient /></div></AppShell>; }
