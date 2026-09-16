import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import ParagraphQuestionsAdminClient from "./ParagraphQuestionsAdminClient";
import ParagraphQuestionAIGenerator from "./ParagraphQuestionAIGeneratorHardened";
export default async function Page() { await requireTeacherSession(); return <AppShell title="Paragraf Soruları" subtitle="Soru havuzunu yönetin." navItems={TEACHER_NAV_ITEMS} wide><div className="mb-4 flex flex-wrap gap-2"><Link href="/ogretmen/icerik-yonetimi" className="inline-flex rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-bold text-red-800">İçerik Yönetimine Dön</Link><Link href="/ogretmen/icerik-yonetimi/paragraf-sorulari/analiz" className="inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-bold text-amber-800">Performans Analizi →</Link></div><div className="space-y-4"><ParagraphQuestionAIGenerator /><ParagraphQuestionsAdminClient /></div></AppShell>; }
