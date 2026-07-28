import Link from "next/link";
import { PanelCard } from "@/components/ui/PanelCard";
import type {
  TeacherDashboardAttentionStudent,
  TeacherDashboardRecentActivity,
  TeacherDashboardRecentStudent,
  TeacherDashboardSummary,
} from "@/lib/teachers/teacherDashboardTypes";

type TeacherDashboardOverviewProps = {
  summary: TeacherDashboardSummary | null;
  error: string | null;
};

const QUICK_ACTIONS = [
  {
    href: "/ogretmen/idil-panel/ogrenci-takip",
    label: "Öğrenci Takip",
    description: "XP, seviye ve aktif program görünümünü incele.",
    icon: "👥",
  },
  {
    href: "/ogretmen/idil-panel/egitim-programlari",
    label: "Eğitim Programları",
    description: "Programları ata, takip et ve detaylarını aç.",
    icon: "📘",
  },
  {
    href: "/ogretmen/ogrenciler/yeni",
    label: "Öğrenci Yönetimi",
    description: "Yeni kayıt oluştur, öğrencileri düzenle veya sil.",
    icon: "🪪",
  },
];

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRelativeLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "—";
  }

  const diffDays = Math.round((Date.now() - timestamp) / 86_400_000);
  if (diffDays <= 0) {
    return "Bugün";
  }

  if (diffDays === 1) {
    return "Dün";
  }

  return `${diffDays} gün önce`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Ö";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

function getAvatarTone(name: string): string {
  const palette = [
    "from-red-500 to-rose-400",
    "from-orange-500 to-amber-400",
    "from-emerald-500 to-teal-400",
    "from-sky-500 to-cyan-400",
    "from-violet-500 to-fuchsia-400",
    "from-slate-600 to-slate-500",
  ];

  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function DashboardAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarTone(
        name,
      )} text-sm font-black text-white shadow-sm ring-1 ring-white/60`}
    >
      {getInitials(name)}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number | null;
  description: string;
  icon: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p>
          <p className="mt-2 text-[30px] font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
            {value === null ? "Yüklenemedi" : formatNumber(value)}
          </p>
          <p className="mt-1 text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">{description}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-lg shadow-sm [data-idil-theme=dark]:bg-slate-800">
          {icon}
        </span>
      </div>
    </article>
  );
}

function ActivityCard({ activity }: { activity: TeacherDashboardRecentActivity }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex items-start gap-3">
        <DashboardAvatar name={activity.studentName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {activity.studentName}
              </h4>
              <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                {activity.title}
              </p>
            </div>
            <time className="shrink-0 text-xs font-medium text-slate-500 [data-idil-theme=dark]:text-slate-400">
              {formatDateTime(activity.occurredAt)}
            </time>
          </div>

          <p className="mt-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">{activity.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{activity.activityType === "education_program_task_completed" ? "Program görevi" : activity.activityType === "reading_comprehension_completed" ? "Anlama testi" : activity.activityType === "reading_speed_test_completed" ? "Okuma hızı" : "Çalışma"}</Badge>
            {activity.awardedXp ? <Badge tone="green">{`+${formatNumber(activity.awardedXp)} XP`}</Badge> : null}
            {activity.programName ? <Badge tone="sky">{activity.programName}</Badge> : null}
            {activity.readingSpeedWpm !== null ? <Badge tone="emerald">{`${formatNumber(activity.readingSpeedWpm)} WPM`}</Badge> : null}
            {activity.comprehensionRate !== null ? <Badge tone="amber">{`%${formatNumber(activity.comprehensionRate)}`}</Badge> : null}
          </div>

          <div className="mt-3">
            <Link
              href={activity.detailHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Öğrenci Detayı
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: string;
  tone?: "slate" | "green" | "sky" | "amber" | "emerald";
}) {
  const className = {
    slate: "border-slate-200 bg-slate-50 text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100",
    sky: "border-sky-200 bg-sky-50 text-sky-700 [data-idil-theme=dark]:border-sky-400/30 [data-idil-theme=dark]:bg-sky-400/10 [data-idil-theme=dark]:text-sky-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function RecentStudentCard({ student }: { student: TeacherDashboardRecentStudent }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex items-start gap-3">
        <DashboardAvatar name={student.studentName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {student.studentName}
              </h4>
              <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                {student.classLabel ?? "Sınıf bilgisi yok"}
              </p>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 [data-idil-theme=dark]:border-red-400/30 [data-idil-theme=dark]:bg-red-400/10 [data-idil-theme=dark]:text-red-100">
              {student.level === null ? "Seviye —" : `Seviye ${student.level}`}
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-3 py-3 [data-idil-theme=dark]:bg-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Son aktivite</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                {formatDateTime(student.lastActivityAt)}
              </p>
              <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{student.lastActivitySummary ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 [data-idil-theme=dark]:bg-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">XP</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                {student.totalXp === null ? "Yüklenemedi" : `${formatNumber(student.totalXp)} XP`}
              </p>
              <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                {student.activeProgramName ?? "Aktif program yok"}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Link
              href={student.detailHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Detayı Gör
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function AttentionCard({ student }: { student: TeacherDashboardAttentionStudent }) {
  return (
    <article className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-sm [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black text-amber-950 [data-idil-theme=dark]:text-amber-50">
            {student.studentName}
          </h4>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 [data-idil-theme=dark]:text-amber-100">
            {student.reasonLabel}
          </p>
        </div>
        <Badge tone="amber">{student.reasonCode}</Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-amber-800 [data-idil-theme=dark]:text-amber-100/90">
        {student.supportingValue}
      </p>
      <p className="mt-2 text-xs text-amber-700 [data-idil-theme=dark]:text-amber-100/80">
        Son aktivite: {getRelativeLabel(student.lastActivityAt)}
      </p>

      <div className="mt-3">
        <Link
          href={student.detailHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Öğrenci Detayı
        </Link>
      </div>
    </article>
  );
}

export function TeacherDashboardOverview({ summary, error }: TeacherDashboardOverviewProps) {
  if (error || !summary) {
    return (
      <div className="grid gap-4">
        <PanelCard title="Panel Özeti" subtitle="Gerçek veri şu anda yüklenemiyor">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm leading-6 text-amber-800 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100">
            {error ?? "Panel verileri şu anda yüklenemiyor."}
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,243,243,0.98)_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-7 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.96)_100%)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-orange-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700 shadow-sm [data-idil-theme=dark]:border-red-400/40 [data-idil-theme=dark]:bg-slate-900">
              Yönetim Merkezi
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50 md:text-4xl">
              Öğretmen paneline hoş geldiniz
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [data-idil-theme=dark]:text-slate-300 md:text-base">
              Öğrenci takip, aktif programlar, son aktiviteler ve dikkat gerektiren öğrencileri canlı verilerle izleyin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Canlı özet", "Son 7 gün", "Mobil uyumlu", "Gerçek veri"].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex min-h-[72px] items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white text-xl shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
                    {action.icon}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{action.label}</p>
                    <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{action.description}</p>
                  </div>
                </div>
                <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-red-600" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {summary.warnings.length > 0 ? (
        <PanelCard title="Veri Uyarıları" subtitle="Bazı bölümler kısmi veriyle gösteriliyor">
          <div className="grid gap-2">
            {summary.warnings.map((warning) => (
              <div
                key={`${warning.section}-${warning.message}`}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100"
              >
                {warning.message}
              </div>
            ))}
          </div>
        </PanelCard>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam Öğrenci" value={summary.stats.totalStudents} description="Kayıtlı tüm öğrenciler" icon="👤" />
        <StatCard label="Aktif Öğrenci" value={summary.stats.activeStudents} description="Güncel durumunda aktif öğrenciler" icon="🟢" />
        <StatCard label="Pasif Öğrenci" value={summary.stats.inactiveStudents} description="Durumu pasif olan öğrenciler" icon="⚪" />
        <StatCard label="Tamamlanan Öğrenci" value={summary.stats.completedStudents} description="Eğitimi tamamlanan öğrenciler" icon="🏁" />
        <StatCard label="Aktif Program" value={summary.stats.activePrograms} description="Aktif eğitim programı kayıtları" icon="📘" />
        <StatCard label="Toplam XP" value={summary.stats.totalXp} description="XP özet tablosundaki canonical toplam" icon="⭐" />
        <StatCard label="Son 7 Gün Aktif Öğrenci" value={summary.stats.activeStudentsLast7Days} description="Son 7 gündeki farklı aktif öğrenciler" icon="📈" />
        <StatCard label="Son 7 Gün Çalışma" value={summary.stats.completedActivitiesLast7Days} description="Dedupe edilmiş tamamlanan çalışma" icon="✅" />
        <StatCard label="Son 7 Gün XP" value={summary.stats.earnedXpLast7Days} description="XP eventlerinden hesaplanan kazanım" icon="🎯" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <PanelCard title="Son Aktiviteler" subtitle="En yeni çalışmalar ve giriş hareketleri">
          {summary.recentActivities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
              Henüz öğrenci aktivitesi bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-3">
              {summary.recentActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </PanelCard>

        <div className="grid gap-4">
          <PanelCard title="Son Çalışan Öğrenciler" subtitle="Son aktiviteye göre sıralı öğrenciler">
            {summary.recentStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                Henüz çalışan öğrenci bulunmuyor.
              </div>
            ) : (
              <div className="grid gap-3">
                {summary.recentStudents.map((student) => (
                  <RecentStudentCard key={student.studentId} student={student} />
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Takip Edilmesi Önerilen Öğrenciler" subtitle="Açıklanabilir kurallarla üretilen takip listesi">
            {summary.attentionStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                Şu anda özel takip gerektiren öğrenci bulunmuyor.
              </div>
            ) : (
              <div className="grid gap-3">
                {summary.attentionStudents.map((student) => (
                  <AttentionCard key={`${student.studentId}-${student.reasonCode}`} student={student} />
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </section>

      <section className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
        Oluşturulma zamanı: {formatDateTime(summary.generatedAt)}
      </section>
    </div>
  );
}
