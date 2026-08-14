import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/student-panel-preview/icons";
import type {
  TeacherDashboardAttentionStudent,
  TeacherDashboardImprovingStudent,
  TeacherDashboardRecentActivity,
  TeacherDashboardRecentStudent,
  TeacherDashboardStats,
  TeacherDashboardSummary,
} from "@/lib/teachers/teacherDashboardTypes";

type TeacherDashboardOverviewProps = { summary: TeacherDashboardSummary | null; error: string | null };

const QUICK_ACTIONS: Array<{ href: string; label: string; description: string; icon: IconName; primary?: boolean }> = [
  { href: "/ogretmen/idil-panel/ogrenci-takip", label: "Öğrenci Takibi", description: "Aktivite, seviye ve program durumunu incele.", icon: "user", primary: true },
  { href: "/ogretmen/idil-panel/egitim-programlari", label: "Eğitim Programları", description: "Programları ata ve ilerlemeyi izle.", icon: "book" },
  { href: "/ogretmen/ogrenciler/yeni", label: "Yeni Öğrenci", description: "Yeni kayıt oluştur.", icon: "checkbox" },
];

function formatNumber(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toLocaleString("tr-TR");
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getRelativeLabel(value: string | null): string {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const diffDays = Math.round((Date.now() - timestamp) / 86_400_000);
  if (diffDays <= 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  return `${diffDays} gün önce`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ö";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

function getAvatarTone(name: string): string {
  const palette = ["bg-red-700", "bg-orange-700", "bg-emerald-700", "bg-sky-700", "bg-violet-700", "bg-slate-700"];
  return palette[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length]!;
}

function DashboardAvatar({ name }: { name: string }) {
  return <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getAvatarTone(name)} text-xs font-bold text-white`}>{getInitials(name)}</span>;
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "sky" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100",
    sky: "border-sky-200 bg-sky-50 text-sky-700 [data-idil-theme=dark]:border-sky-400/30 [data-idil-theme=dark]:bg-sky-400/10 [data-idil-theme=dark]:text-sky-100",
    amber: "border-amber-200 bg-amber-50 text-amber-800 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${tones}`}>{children}</span>;
}

function MetricCard({ label, value, context, icon, tone = "slate" }: { label: string; value: number | null; context: string; icon: IconName; tone?: "slate" | "green" | "amber" | "blue" }) {
  const tones = {
    slate: "border-slate-200 [data-idil-theme=dark]:border-slate-700",
    green: "border-emerald-200 [data-idil-theme=dark]:border-emerald-400/30",
    amber: "border-amber-200 [data-idil-theme=dark]:border-amber-400/30",
    blue: "border-sky-200 [data-idil-theme=dark]:border-sky-400/30",
  }[tone];
  const iconTones = { slate: "text-slate-500", green: "text-emerald-700", amber: "text-amber-700", blue: "text-sky-700" }[tone];
  return <article className={`rounded-xl border bg-white p-4 shadow-sm [data-idil-theme=dark]:bg-slate-900 ${tones}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p><p className="mt-2 text-[28px] font-bold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{value === null ? "—" : formatNumber(value)}</p><p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{context}</p></div><Icon name={icon} className={`h-5 w-5 ${iconTones}`} /></div></article>;
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-bold tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-400">{subtitle}</p> : null}</div>{action}</div>;
}

function EmptyState({ children }: { children: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">{children}</div>;
}

function QuickActions() {
  return <div className="grid gap-2 sm:grid-cols-3">{QUICK_ACTIONS.map((action) => <Link key={action.href} href={action.href} className={`group flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${action.primary ? "border-red-200 bg-red-50 text-red-900 hover:bg-red-100 [data-idil-theme=dark]:border-red-400/30 [data-idil-theme=dark]:bg-red-400/10 [data-idil-theme=dark]:text-red-100" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100"}`}><Icon name={action.icon} className="h-5 w-5 shrink-0" /><span className="min-w-0"><span className="block text-sm font-bold">{action.label}</span><span className="mt-0.5 block truncate text-xs opacity-70">{action.description}</span></span><Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" /></Link>)}</div>;
}

function ActivityRow({ activity }: { activity: TeacherDashboardRecentActivity }) {
  const type = activity.activityType === "education_program_task_completed" ? "Program görevi" : activity.activityType === "reading_comprehension_completed" ? "Anlama testi" : activity.activityType === "reading_speed_test_completed" ? "Okuma hızı" : "Çalışma";
  return <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 [data-idil-theme=dark]:border-slate-800"><DashboardAvatar name={activity.studentName} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="truncate text-sm font-bold text-slate-900 [data-idil-theme=dark]:text-slate-100">{activity.studentName}</p><time className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{formatDateTime(activity.occurredAt)}</time></div><p className="mt-0.5 truncate text-sm text-slate-600 [data-idil-theme=dark]:text-slate-400">{activity.title}</p><div className="mt-2 flex flex-wrap gap-1.5"><Badge>{type}</Badge>{activity.awardedXp ? <Badge tone="green">+{formatNumber(activity.awardedXp)} XP</Badge> : null}{activity.readingSpeedWpm !== null ? <Badge tone="sky">{formatNumber(activity.readingSpeedWpm)} WPM</Badge> : null}{activity.comprehensionRate !== null ? <Badge tone="amber">%{formatNumber(activity.comprehensionRate)}</Badge> : null}</div></div><Link href={activity.detailHref} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-bold text-red-800 underline underline-offset-2 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:text-red-200">Detay</Link></div>;
}

function StudentRow({ student }: { student: TeacherDashboardRecentStudent }) {
  return <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 [data-idil-theme=dark]:border-slate-800"><DashboardAvatar name={student.studentName} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 [data-idil-theme=dark]:text-slate-100">{student.studentName}</p><p className="mt-0.5 truncate text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{student.lastActivitySummary || student.classLabel || "Son aktivite yok"}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-300">{student.level === null ? "Seviye —" : `Seviye ${student.level}`}</p><p className="mt-0.5 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{getRelativeLabel(student.lastActivityAt)}</p></div><Link href={student.detailHref} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-red-800 underline underline-offset-2 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:text-red-200">Detay</Link></div>;
}

function AttentionRow({ student }: { student: TeacherDashboardAttentionStudent }) {
  return <div className="flex items-start gap-3 border-b border-amber-100 py-3 last:border-0 [data-idil-theme=dark]:border-amber-400/20"><Icon name="target" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-amber-950 [data-idil-theme=dark]:text-amber-50">{student.studentName}</p><p className="mt-0.5 text-xs font-semibold text-amber-800 [data-idil-theme=dark]:text-amber-100">{student.reasonLabel}</p><p className="mt-1 text-xs text-amber-800/80 [data-idil-theme=dark]:text-amber-100/80">{student.supportingValue} · {getRelativeLabel(student.lastActivityAt)}</p></div><Link href={student.detailHref} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-amber-900 underline underline-offset-2 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [data-idil-theme=dark]:text-amber-100">İncele</Link></div>;
}

function ImprovingRow({ student }: { student: TeacherDashboardImprovingStudent }) {
  return <div className="flex items-center gap-3 border-b border-emerald-100 py-3 last:border-0 [data-idil-theme=dark]:border-emerald-400/20"><Icon name="chart" className="h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-emerald-950 [data-idil-theme=dark]:text-emerald-50">{student.studentName}</p><p className="truncate text-xs text-emerald-800 [data-idil-theme=dark]:text-emerald-100">{student.reasonLabel} · {student.supportingValue}</p></div><Link href={student.detailHref} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-emerald-900 underline underline-offset-2 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 [data-idil-theme=dark]:text-emerald-100">Detay</Link></div>;
}

function CompactMetric({ label, value, tone = "slate" }: { label: string; value: number | null; tone?: "slate" | "amber" | "green" | "sky" }) {
  const tones = { slate: "border-slate-200", amber: "border-amber-200", green: "border-emerald-200", sky: "border-sky-200" }[tone];
  return <div className={`rounded-lg border bg-slate-50 px-3 py-2.5 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 ${tones}`}><p className="text-xs font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-slate-900 [data-idil-theme=dark]:text-slate-100">{value === null ? "—" : formatNumber(value)}</p></div>;
}

function SecondaryMetrics({ stats }: { stats: TeacherDashboardStats }) {
  return <details className="rounded-xl border border-slate-200 bg-white [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [data-idil-theme=dark]:text-slate-100">Diğer göstergeler <span className="ml-1 text-xs font-normal text-slate-500">(detayları aç)</span></summary><div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 [data-idil-theme=dark]:border-slate-800"><CompactMetric label="Toplam öğrenci" value={stats.totalStudents} /><CompactMetric label="Aktif öğrenci" value={stats.activeStudents} tone="green" /><CompactMetric label="Pasif öğrenci" value={stats.inactiveStudents} tone="amber" /><CompactMetric label="Tamamlanan öğrenci" value={stats.completedStudents} tone="green" /><CompactMetric label="Toplam XP" value={stats.totalXp} /><CompactMetric label="Son 7 gün aktif öğrenci" value={stats.activeStudentsLast7Days} tone="sky" /><CompactMetric label="Son 7 Gün XP" value={stats.earnedXpLast7Days} tone="sky" /><CompactMetric label="Bugün çalışmayan" value={stats.todayInactiveStudents} tone="amber" /><CompactMetric label="3 gündür çalışmayan" value={stats.inactiveStudentsLast3Days} tone="amber" /><CompactMetric label="Bugün tamamlanan görev" value={stats.todayCompletedTasks} tone="sky" /><CompactMetric label="Son 7 gün çalışma" value={stats.completedActivitiesLast7Days} tone="green" /></div></details>;
}

function TeacherDashboardOverviewContent({ summary }: { summary: TeacherDashboardSummary }) {
  const { stats } = summary;
  return <div className="grid gap-5">
    <section className="border-b border-slate-200 pb-5 [data-idil-theme=dark]:border-slate-700"><SectionHeading title="Öğretmen paneline hoş geldiniz" subtitle="Canlı özet · Gerçek veri · Öğretmenin ilk bakışta karar verebilmesi için önceliklendirilmiş görünüm." /><QuickActions /></section>

    {summary.warnings.length > 0 ? <section role="alert" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100"><p className="font-bold">Veri Uyarıları</p><ul className="mt-1 list-disc pl-5">{summary.warnings.map((warning) => <li key={`${warning.section}-${warning.message}`}>{warning.message}</li>)}</ul></section> : null}

    <section aria-labelledby="priority-metrics"><SectionHeading title="Bugünkü Öğrenci Durumu" subtitle="Bugün ve son 7 günden öğretmenin kararını en çok etkileyen metrikler." /><div id="priority-metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Bugün çalışan öğrenci" value={stats.todayActiveStudents} context="Bugünkü aktivite" icon="activity" tone="green" /><MetricCard label="Takip gerektiren" value={summary.attentionStudents.length} context="Açıklanabilir takip listesi" icon="target" tone="amber" /><MetricCard label="Aktif program" value={stats.activePrograms} context="Mevcut program kayıtları" icon="book" tone="blue" /><MetricCard label="Son 7 gün çalışma" value={stats.completedActivitiesLast7Days} context="Tamamlanan aktiviteler" icon="chart" tone="slate" /></div></section>
    <SecondaryMetrics stats={stats} />

    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" aria-label="Öncelikli öğrenci ve aktivite bilgileri"><div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10"><SectionHeading title="Takip Edilmesi Önerilen Öğrenciler" subtitle="Takip gerektiren öğrenciler ve açıklanabilir nedenleri." />{summary.attentionStudents.length === 0 ? <EmptyState>Şu anda özel takip gerektiren öğrenci bulunmuyor.</EmptyState> : <div>{summary.attentionStudents.map((student) => <AttentionRow key={`${student.studentId}-${student.reasonCode}`} student={student} />)}</div>}</div><div className="rounded-xl border border-slate-200 bg-white p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"><SectionHeading title="Son aktiviteler" subtitle="En yeni çalışmalar ve giriş hareketleri." />{summary.recentActivities.length === 0 ? <EmptyState>Henüz öğrenci aktivitesi bulunmuyor.</EmptyState> : <div>{summary.recentActivities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}</div>}</div></section>

    <section className="grid gap-5 xl:grid-cols-2" aria-label="Öğrenci görünümü"><div className="rounded-xl border border-slate-200 bg-white p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"><SectionHeading title="Son çalışan öğrenciler" subtitle="Son aktiviteye göre sıralanır." action={<Link href="/ogretmen/idil-panel/ogrenci-takip" className="text-xs font-bold text-red-800 underline [data-idil-theme=dark]:text-red-200">Tüm öğrenciler</Link>} />{summary.recentStudents.length === 0 ? <EmptyState>Henüz çalışan öğrenci bulunmuyor.</EmptyState> : <div>{summary.recentStudents.map((student) => <StudentRow key={student.studentId} student={student} />)}</div>}</div><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10"><SectionHeading title="Son 7 Günde Gelişenler" subtitle="Gerçek sonuç değişimlerinden türetilen liste." />{summary.improvingStudents.length === 0 ? <EmptyState>Yeterli pozitif değişim verisi bulunmuyor.</EmptyState> : <div>{summary.improvingStudents.map((student) => <ImprovingRow key={student.studentId} student={student} />)}</div>}</div></section>

    <section className="grid gap-5 xl:grid-cols-2" aria-label="Program ve analiz"><div className="rounded-xl border border-slate-200 bg-white p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"><SectionHeading title="Program Takibi" subtitle="Öğrenci bazında mevcut program durumu." /><div className="grid gap-2 sm:grid-cols-3"><CompactMetric label="Aktif programlı" value={stats.activeProgramStudents} tone="sky" /><CompactMetric label="Tamamlayan" value={stats.completedProgramStudents} tone="green" /><CompactMetric label="Geride kalan" value={stats.behindProgramStudents} tone="amber" /></div><Link href="/ogretmen/idil-panel/egitim-programlari" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-red-800 underline [data-idil-theme=dark]:text-red-200">Program takibini aç</Link></div><div className="rounded-xl border border-slate-200 bg-white p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"><SectionHeading title="Son 7 Gün Okuma Özeti" subtitle="Yalnızca mevcut okuma testi sonuçlarından." /><div className="grid gap-2 sm:grid-cols-3"><CompactMetric label="Ort. okuma hızı" value={stats.averageReadingSpeedLast7Days} tone="sky" /><CompactMetric label="Ort. anlama" value={stats.averageComprehensionLast7Days} tone="green" /><CompactMetric label="Test sayısı" value={stats.readingTestsLast7Days} /></div></div></section>

    <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">Son güncelleme: {formatDateTime(summary.generatedAt)}</p>
  </div>;
}

export function TeacherDashboardOverview({ summary, error }: TeacherDashboardOverviewProps) {
  if (error || !summary) return <section role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900 [data-idil-theme=dark]:border-rose-400/30 [data-idil-theme=dark]:bg-rose-400/10 [data-idil-theme=dark]:text-rose-100"><h2 className="text-lg font-bold">Panel özeti yüklenemedi</h2><p className="mt-1">{error ?? "Panel verileri şu anda yüklenemiyor."}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-rose-300 bg-white px-3 text-sm font-bold text-rose-900 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Sayfayı yenile</button></section>;
  return <TeacherDashboardOverviewContent summary={summary} />;
}
