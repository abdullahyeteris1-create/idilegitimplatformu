import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getDevelopmentReport } from "@/lib/reports/developmentReport";
import DevelopmentReportClient from "@/components/teacher-panel/DevelopmentReportClient";

export const dynamic = "force-dynamic";

export default async function DevelopmentReportPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  await requireTeacherSession();
  const { studentId = "" } = await searchParams;
  const report = await getDevelopmentReport(studentId);

  if (!report) {
    return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold text-slate-950">Gelişim Raporu</h1><p className="mt-2 text-slate-600">Geçerli bir öğrenci seçilmedi veya öğrenci bulunamadı.</p><a className="mt-5 inline-flex rounded-xl bg-red-600 px-4 py-2 font-semibold text-white" href="/ogretmen/idil-panel/ders-kayitlari">Ders Kayıtlarına Dön</a></main>;
  }

  return <DevelopmentReportClient report={report} />;
}
