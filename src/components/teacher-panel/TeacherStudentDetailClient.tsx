"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PanelCard } from "@/components/ui/PanelCard";
import { EDUCATION_LEVEL_LABELS } from "@/lib/assignments/educationLevels";
import { downloadResultsXlsx } from "@/lib/results/resultExport";
import { createReadingTestStatistics } from "@/lib/results/readingTestStatistics";
import type {
  TeacherStudentActivity,
  TeacherStudentDetail,
  TeacherStudentPerformanceMetricSummary,
  TeacherStudentProgramDayProgress,
  TeacherStudentProgramProgress,
  TeacherStudentProgramTaskProgress,
} from "@/lib/teachers/studentTrackingTypes";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Henüz veri yok";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Henüz veri yok";
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

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
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

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${getAvatarTone(
        name,
      )} text-base font-black text-white shadow-lg ring-4 ring-white/60 [data-idil-theme=dark]:ring-slate-950`}
    >
      {getInitials(name)}
    </span>
  );
}

function ProgressBar({
  value,
  label,
  trackClassName = "bg-white/20",
  fillClassName = "bg-white",
  className = "",
}: {
  value: number;
  label?: string;
  trackClassName?: string;
  fillClassName?: string;
  className?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      aria-label={label ?? "İlerleme"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className={`h-3 w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
      role="progressbar"
    >
      <div className={`h-full rounded-full transition-all ${fillClassName}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">{subtitle}</p> : null}
    </article>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
      {text}
    </div>
  );
}

function getActivityMeta(activityType: TeacherStudentActivity["activityType"]): {
  label: string;
  icon: string;
  tone: string;
} {
  switch (activityType) {
    case "education_program_task_completed":
      return { label: "Program görevi", icon: "📘", tone: "from-sky-500 to-cyan-400" };
    case "login_first_of_day":
      return { label: "Giriş", icon: "🔐", tone: "from-slate-500 to-slate-400" };
    case "reading_comprehension_completed":
      return { label: "Anlama testi", icon: "🧠", tone: "from-violet-500 to-fuchsia-400" };
    case "reading_speed_test_completed":
      return { label: "Okuma testi", icon: "📖", tone: "from-emerald-500 to-teal-400" };
    default:
      return { label: "Egzersiz", icon: "⚡", tone: "from-red-500 to-rose-400" };
  }
}

function ActivityIcon({ activityType }: { activityType: TeacherStudentActivity["activityType"] }) {
  const meta = getActivityMeta(activityType);
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.tone} text-base font-black text-white shadow-sm`}
    >
      {meta.icon}
    </span>
  );
}

function ActivityChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-[28px] items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-300">
      {children}
    </span>
  );
}

function ActivityCard({ activity, compact = false }: { activity: TeacherStudentActivity; compact?: boolean }) {
  const meta = getActivityMeta(activity.activityType);
  const hasReadingMeta = activity.readingSpeedWpm !== null || activity.comprehensionRate !== null;

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 ${
        compact ? "min-h-[132px]" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <ActivityIcon activityType={activity.activityType} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{activity.title}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 [data-idil-theme=dark]:text-slate-400">
                {activity.description}
              </p>
            </div>
            <time className="shrink-0 text-xs font-medium text-slate-500 [data-idil-theme=dark]:text-slate-400">
              {formatDateTime(activity.occurredAt)}
            </time>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ActivityChip>{meta.label}</ActivityChip>
            {activity.awardedXp && activity.awardedXp > 0 ? <ActivityChip>+{activity.awardedXp} XP</ActivityChip> : null}
            {activity.programTaskName ? <ActivityChip>{activity.programTaskName}</ActivityChip> : null}
            {activity.programName ? <ActivityChip>{activity.programName}</ActivityChip> : null}
            {activity.readingSpeedWpm !== null ? <ActivityChip>{activity.readingSpeedWpm} WPM</ActivityChip> : null}
            {activity.comprehensionRate !== null ? <ActivityChip>%{activity.comprehensionRate}</ActivityChip> : null}
            {!hasReadingMeta && activity.activityType === "login_first_of_day" ? <ActivityChip>Son giriş</ActivityChip> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function getProgramStatusBadge(status: TeacherStudentProgramProgress["status"]): string {
  switch (status) {
    case "completed":
      return "Tamamlandı";
    case "cancelled":
      return "İptal Edildi";
    default:
      return "Aktif";
  }
}

function getDayStatusBadge(status: TeacherStudentProgramDayProgress["status"]): string {
  switch (status) {
    case "completed":
      return "Tamamlandı";
    case "in_progress":
      return "Devam Ediyor";
    case "available":
      return "Hazır";
    default:
      return "Kilitli";
  }
}

function getTaskStatusBadge(status: TeacherStudentProgramTaskProgress["status"]): string {
  switch (status) {
    case "completed":
      return "Tamamlandı";
    case "in_progress":
      return "Devam Ediyor";
    case "available":
      return "Hazır";
    default:
      return "Kilitli";
  }
}

function getTaskTypeLabel(taskType: string): string {
  switch (taskType) {
    case "reading-speed-test":
      return "Okuma Hızı Testi";
    case "reading-comprehension":
      return "Anlama Testi";
    case "square-vision":
      return "Kare Görme Alanı";
    case "catch-same":
      return "Aynı Olanı Yakala";
    case "shadow-reading":
      return "Gölge Okuma";
    case "tachistoscope":
      return "Takistoskop";
    case "similar-words":
      return "Benzer Kelimeler";
    case "word-finding":
      return "Kelime Bulma";
    case "eye-columns":
      return "Göz Egzersizleri Kolonlar";
    default:
      return taskType;
  }
}

function ProgramBadge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "red" | "green" | "amber" | "sky" }) {
  const toneClassName = {
    slate: "border-slate-200 bg-slate-50 text-slate-700 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-200",
    red: "border-red-200 bg-red-50 text-red-700 [data-idil-theme=dark]:border-red-400/30 [data-idil-theme=dark]:bg-red-400/10 [data-idil-theme=dark]:text-red-100",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100",
    sky: "border-sky-200 bg-sky-50 text-sky-700 [data-idil-theme=dark]:border-sky-400/30 [data-idil-theme=dark]:bg-sky-400/10 [data-idil-theme=dark]:text-sky-100",
  }[tone];

  return (
    <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClassName}`}>
      {children}
    </span>
  );
}

function ProgramTaskCard({ task }: { task: TeacherStudentProgramTaskProgress }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
            Görev {task.orderNumber}
          </p>
          <h4 className="mt-1 truncate text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{task.exerciseTitle}</h4>
        </div>
        <ProgramBadge tone={task.status === "completed" ? "green" : task.status === "in_progress" ? "sky" : "slate"}>
          {getTaskStatusBadge(task.status)}
        </ProgramBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActivityChip>{getTaskTypeLabel(task.taskType)}</ActivityChip>
        {task.awardedXp && task.awardedXp > 0 ? <ActivityChip>+{task.awardedXp} XP</ActivityChip> : null}
        {task.resultSummary ? <ActivityChip>{task.resultSummary}</ActivityChip> : null}
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300 sm:grid-cols-2">
        <p>Sıra: <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">Gün {task.dayNumber} / {task.orderNumber}</span></p>
        <p>Başlama: <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">{formatDateTime(task.startedAt)}</span></p>
        <p>Tamamlanma: <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">{formatDateTime(task.completedAt)}</span></p>
        <p>Egzersiz: <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">{task.exerciseSlug}</span></p>
      </div>
    </article>
  );
}

function ProgramDayCard({ day }: { day: TeacherStudentProgramDayProgress }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
            Gün {day.dayNumber}
          </p>
          <h4 className="mt-1 text-base font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">
            {day.title ?? "Başlıksız gün"}
          </h4>
          {day.description ? <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">{day.description}</p> : null}
        </div>
        <ProgramBadge tone={day.status === "completed" ? "green" : day.status === "in_progress" ? "sky" : day.status === "available" ? "amber" : "slate"}>
          {getDayStatusBadge(day.status)}
        </ProgramBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
            <span>Gün ilerlemesi</span>
            <span>%{day.progressPercent}</span>
          </div>
          <ProgressBar
            value={day.progressPercent}
            label={`Gün ${day.dayNumber} ilerlemesi`}
            trackClassName="bg-slate-200 [data-idil-theme=dark]:bg-slate-700"
            fillClassName="bg-[var(--brand)]"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
          {day.completedTasks}/{day.totalTasks} görev
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {day.tasks.length === 0 ? (
          <EmptyCard text="Bu gün için görev bulunmuyor." />
        ) : (
          day.tasks.map((task) => <ProgramTaskCard key={task.taskId} task={task} />)
        )}
      </div>
    </article>
  );
}

type PerformanceSectionMetric = "reading" | "comprehension";

function getPerformanceMetricLabel(metric: PerformanceSectionMetric): string {
  return metric === "reading" ? "Okuma Hızı" : "Anlama";
}

function getPerformanceMetricUnit(metric: PerformanceSectionMetric): string {
  return metric === "reading" ? "kelime/dk" : "%";
}

function formatPerformanceMetricValue(metric: PerformanceSectionMetric, value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Henüz veri yok";
  }

  return metric === "reading" ? `${Math.round(value)} kelime/dk` : `%${Math.round(value)}`;
}

function formatPerformanceDelta(metric: PerformanceSectionMetric, summary: TeacherStudentPerformanceMetricSummary): string {
  if (summary.trendDirection === "unavailable" || summary.latestValue === null || summary.previousValue === null) {
    return "Karşılaştırma için en az iki sonuç gerekir.";
  }

  const delta = summary.changeValue ?? 0;
  const roundedDelta = Math.round(Math.abs(delta));
  const unit = getPerformanceMetricUnit(metric);

  if (summary.trendDirection === "stable") {
    return metric === "reading"
      ? "Önceki sonuca göre aynı hız"
      : "Önceki sonuca göre aynı anlama puanı";
  }

  return metric === "reading"
    ? `Önceki sonuca göre ${roundedDelta} ${unit} ${delta > 0 ? "artış" : "düşüş"}`
    : `Önceki sonuca göre ${roundedDelta} puan ${delta > 0 ? "artış" : "düşüş"}`;
}

function formatPerformanceTrendLabel(summary: TeacherStudentPerformanceMetricSummary): string {
  switch (summary.trendDirection) {
    case "up":
      return "Yükseliyor";
    case "down":
      return "Düşüyor";
    case "stable":
      return "Sabit";
    default:
      return "Karşılaştırma yok";
  }
}

function getSparklineHeight(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 24;
  }

  const range = max - min;
  if (range <= 0) {
    return 72;
  }

  const normalized = (value - min) / range;
  return Math.max(24, Math.min(100, Math.round(28 + normalized * 72)));
}

function PerformanceBars({
  metric,
  summary,
}: {
  metric: PerformanceSectionMetric;
  summary: TeacherStudentPerformanceMetricSummary;
}) {
  const recent = [...summary.recentResults].reverse();
  const values = recent.map((item) => item.value).filter((value): value is number => Number.isFinite(value));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 100;

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
        Trend verisi henüz yok.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end gap-2" aria-label={`${getPerformanceMetricLabel(metric)} son 5 sonuç trendi`}>
        {recent.map((item, index) => {
          const height = getSparklineHeight(item.value, min, max);
          const dateLabel = item.occurredAt ? formatDateTime(item.occurredAt) : "Tarih bilgisi yok";
          return (
            <div key={item.id} className="flex min-h-[112px] flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-[42px] rounded-t-2xl bg-gradient-to-t ${
                    metric === "reading" ? "from-emerald-600 to-emerald-400" : "from-sky-600 to-cyan-400"
                  }`}
                  style={{ height: `${height}%`, minHeight: "28px" }}
                  aria-hidden="true"
                />
              </div>
              <div className="w-full text-center text-[10px] font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-400">
                <div>{Math.round(item.value)}</div>
                <div className="truncate">{index + 1}. {dateLabel}</div>
              </div>
            </div>
          );
        })}
      </div>

      <ol className="grid gap-2">
        {summary.recentResults.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-300"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                  {item.sourceLabel || `${getPerformanceMetricLabel(metric)} sonucu`}
                </p>
                <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">
                  {item.occurredAt ? formatDateTime(item.occurredAt) : "Tarih bilgisi yok"}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                {formatPerformanceMetricValue(metric, item.value)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {item.programTaskName ? <ActivityChip>{item.programTaskName}</ActivityChip> : null}
              {item.programName ? <ActivityChip>{item.programName}</ActivityChip> : null}
              {item.awardedXp && item.awardedXp > 0 ? <ActivityChip>+{item.awardedXp} XP</ActivityChip> : null}
              {item.durationSeconds !== null ? <ActivityChip>{item.durationSeconds} sn</ActivityChip> : null}
            </div>

            {metric === "comprehension" ? (
              <div className="mt-2 grid gap-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400 sm:grid-cols-3">
                <span>Doğru: {item.correctCount === null ? "Henüz veri yok" : item.correctCount}</span>
                <span>Yanlış: {item.wrongCount === null ? "Henüz veri yok" : item.wrongCount}</span>
                <span>Net: {item.netCount === null ? "Henüz veri yok" : item.netCount}</span>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PerformanceMetricCard({
  metric,
  summary,
}: {
  metric: PerformanceSectionMetric;
  summary: TeacherStudentPerformanceMetricSummary;
}) {
  const label = getPerformanceMetricLabel(metric);

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">
            {label}
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
            {summary.totalResultCount === 0 ? `Henüz ${label.toLowerCase()} sonucu yok` : formatPerformanceMetricValue(metric, summary.latestValue)}
          </h4>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
          summary.trendDirection === "up"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 [data-idil-theme=dark]:border-emerald-400/30 [data-idil-theme=dark]:bg-emerald-400/10 [data-idil-theme=dark]:text-emerald-100"
            : summary.trendDirection === "down"
              ? "border-rose-200 bg-rose-50 text-rose-700 [data-idil-theme=dark]:border-rose-400/30 [data-idil-theme=dark]:bg-rose-400/10 [data-idil-theme=dark]:text-rose-100"
              : "border-slate-200 bg-slate-50 text-slate-700 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-200"
        }`}>
          {formatPerformanceTrendLabel(summary)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
        {formatPerformanceDelta(metric, summary)}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Kayıt</p>
          <p className="mt-1 text-lg font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{summary.totalResultCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Son değer</p>
          <p className="mt-1 text-lg font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{formatPerformanceMetricValue(metric, summary.latestValue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">En yüksek</p>
          <p className="mt-1 text-lg font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{formatPerformanceMetricValue(metric, summary.highestValue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Ortalama</p>
          <p className="mt-1 text-lg font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{formatPerformanceMetricValue(metric, summary.averageValue)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Trend</p>
        <div className="mt-3">
          <PerformanceBars metric={metric} summary={summary} />
        </div>
      </div>
    </article>
  );
}

export function TeacherStudentDetailClient({ detail }: { detail: TeacherStudentDetail }) {
  const router = useRouter();
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  const sortedResults = useMemo(() => {
    return [...detail.results].sort((left, right) => right.date.localeCompare(left.date));
  }, [detail.results]);

  const readingStats = useMemo(() => createReadingTestStatistics(sortedResults), [sortedResults]);

  const handleDeleteStudent = async () => {
    if (isDeletingStudent) {
      return;
    }

    setDeleteErrorMessage("");
    setIsDeletingStudent(true);

    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(detail.profile.studentId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("delete-failed");
      }

      router.push("/ogretmen/idil-panel/ogrenci-takip");
    } catch {
      setDeleteErrorMessage("Öğrenci silinemedi. Lütfen yeniden deneyin.");
    } finally {
      setIsDeletingStudent(false);
      setIsDeleteModalOpen(false);
    }
  };

  const parentLabel = detail.profile.parentName ?? "Henüz veri yok";
  const parentPhoneLabel = detail.profile.parentPhone ?? "Henüz veri yok";
  const educationLevelLabel =
    detail.profile.educationLevel && detail.profile.educationLevel in EDUCATION_LEVEL_LABELS
      ? EDUCATION_LEVEL_LABELS[detail.profile.educationLevel as keyof typeof EDUCATION_LEVEL_LABELS]
      : "Henüz veri yok";
  const educationStatusLabel = detail.profile.educationStatus ?? "Henüz veri yok";
  const activeProgramName = detail.programSummary.activeProgramName ?? "Program yok";
  const totalProgramDays = detail.programSummary.totalDays ?? 0;
  const completedProgramDays = detail.programSummary.completedDays ?? 0;
  const programProgress = detail.programSummary.progressPercent ?? 0;
  const programProgressDetail = detail.programProgress;
  const programProgressError = detail.programProgressError;
  const performanceHistoryError = detail.performanceHistoryError;
  const performanceHistory = detail.performanceHistory;

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(127,29,29,0.98)_0%,rgba(220,38,38,0.96)_44%,rgba(249,115,22,0.9)_100%)] p-5 text-white shadow-[0_20px_60px_rgba(185,28,28,0.2)] md:p-6 [data-idil-theme=dark]:border-slate-700">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-orange-200/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link
              href="/ogretmen/idil-panel/ogrenci-takip"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              ← Geri dön
            </Link>

            <div className="mt-4 flex items-start gap-4">
              <Avatar name={detail.profile.fullName} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-100">Öğrenci Detayı</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">
                  {detail.profile.fullName}
                </h1>
                <p className="mt-1 text-sm text-red-50/90">Kullanıcı adı: {detail.profile.username}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                    {detail.profile.classLabel ?? "Sınıf yok"}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                    {detail.profile.accountStatus === "active" ? "Aktif hesap" : "Pasif hesap"}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                    Seviye {detail.gamificationSummary.level} · {detail.gamificationSummary.levelTitle}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[370px] xl:grid-cols-1">
            <article className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Toplam XP</p>
                  <p className="mt-1 text-4xl font-black leading-none">{detail.gamificationSummary.totalXp}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Rozet</p>
                  <p className="mt-1 text-2xl font-black leading-none">{detail.gamificationSummary.badgeCount}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Sonraki seviyeye ilerleme</span>
                  <span>%{detail.gamificationSummary.progressPercent}</span>
                </div>
                <ProgressBar value={detail.gamificationSummary.progressPercent} />
                <p className="mt-2 text-xs text-red-50/90">
                  {detail.gamificationSummary.remainingXp} XP sonra {detail.gamificationSummary.snapshot.nextLevelTitle}
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Hızlı Özet</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-red-100">Program</p>
                  <p className="mt-1 font-semibold">{activeProgramName}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-red-100">Gün</p>
                  <p className="mt-1 font-semibold">
                    {completedProgramDays}/{totalProgramDays}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-red-100">Son giriş</p>
                  <p className="mt-1 font-semibold">{formatDateTime(detail.profile.lastLoginAt)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-red-100">Erişim</p>
                  <p className="mt-1 font-semibold">{formatDateTime(detail.profile.accessEndsAt)}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <PanelCard title="Profil ve Program" subtitle="Temel bilgiler ve aktif program özeti">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Sınıf", detail.profile.classLabel ?? "Henüz veri yok"],
              ["Veli", parentLabel],
              ["Veli Telefonu", parentPhoneLabel],
              ["Eğitim Düzeyi", educationLevelLabel],
              ["Eğitim Durumu", educationStatusLabel],
              ["Kayıt Tarihi", formatDateTime(detail.profile.createdAt)],
              ["Son Giriş", formatDateTime(detail.profile.lastLoginAt)],
              ["Erişim Bitiş", formatDateTime(detail.profile.accessEndsAt)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-100">{value}</p>
              </div>
            ))}
          </div>

          {detail.profile.notes ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 [data-idil-theme=dark]:border-amber-400/30 [data-idil-theme=dark]:bg-amber-400/10 [data-idil-theme=dark]:text-amber-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 [data-idil-theme=dark]:text-amber-200">Notlar</p>
              <p className="mt-1">{detail.profile.notes}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Aktif Program</p>
              <p className="mt-2 text-lg font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{activeProgramName}</p>
              <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                Tamamlanan {completedProgramDays} / {totalProgramDays} görev
              </p>
              <div className="mt-3">
                <ProgressBar value={programProgress} />
              </div>
            </article>

            <article className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Program Bilgisi</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                Atama: {formatDateTime(detail.programSummary.assignedAt)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                Başlama: {formatDateTime(detail.programSummary.startedAt)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                Son görev: {formatDateTime(detail.programSummary.lastCompletedTaskAt)}
              </p>
            </article>
          </div>
        </PanelCard>

        <PanelCard title="Hızlı İşlemler" subtitle="Bu öğrenciye ait yönetim işlemleri">
          <div className="grid gap-2">
            <Link
              href={`/ogretmen/ogrenciler/${detail.profile.studentId}/duzenle`}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Öğrenciyi Düzenle
            </Link>
            <button
              type="button"
              onClick={() => downloadResultsXlsx(sortedResults, `${slugify(detail.profile.fullName)}-sonuclari.xlsx`)}
              className="min-h-[46px] rounded-xl border border-red-900/20 bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Sonuçları Excel İndir
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeletingStudent}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {isDeletingStudent ? "Siliniyor..." : "Öğrenciyi Sil"}
            </button>
          </div>

          {deleteErrorMessage ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">
              {deleteErrorMessage}
            </p>
          ) : null}
        </PanelCard>
      </section>

      <section>
        <PanelCard title="Program İlerlemesi" subtitle="Günler, görevler ve son tamamlanan adımlar">
          {programProgressError ? (
            <EmptyCard text={programProgressError} />
          ) : programProgressDetail ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Program</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
                      {programProgressDetail.visibleName}
                    </p>
                    <ProgramBadge
                      tone={programProgressDetail.status === "completed" ? "green" : programProgressDetail.status === "cancelled" ? "amber" : "sky"}
                    >
                      {getProgramStatusBadge(programProgressDetail.status)}
                    </ProgramBadge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    Atama: {formatDateTime(programProgressDetail.assignedAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    Başlama: {formatDateTime(programProgressDetail.startedAt)}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Genel İlerleme</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
                    %{programProgressDetail.overallProgressPercent}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    {programProgressDetail.completedDays}/{programProgressDetail.totalDays} gün tamamlandı
                  </p>
                  <div className="mt-3">
                    <ProgressBar
                      value={programProgressDetail.overallProgressPercent}
                      label="Genel program ilerlemesi"
                      trackClassName="bg-slate-200 [data-idil-theme=dark]:bg-slate-700"
                      fillClassName="bg-[var(--brand)]"
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Görev İlerlemesi</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 [data-idil-theme=dark]:text-slate-50">
                    %{programProgressDetail.taskProgressPercent}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    {programProgressDetail.completedTasks}/{programProgressDetail.totalTasks} görev tamamlandı
                  </p>
                  <div className="mt-3">
                    <ProgressBar
                      value={programProgressDetail.taskProgressPercent}
                      label="Görev ilerlemesi"
                      trackClassName="bg-slate-200 [data-idil-theme=dark]:bg-slate-700"
                      fillClassName="bg-emerald-500"
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Yön Bulma</p>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">
                    <p>
                      Son tamamlanan:{" "}
                      <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                        {programProgressDetail.lastCompletedTask ? programProgressDetail.lastCompletedTask.exerciseTitle : "Henüz yok"}
                      </span>
                    </p>
                    <p>
                      Sonraki görev:{" "}
                      <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                        {programProgressDetail.nextPendingTask ? programProgressDetail.nextPendingTask.exerciseTitle : "Hepsi tamamlandı"}
                      </span>
                    </p>
                    <p>
                      Son görev zamanı:{" "}
                      <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                        {formatDateTime(programProgressDetail.lastCompletedTask?.completedAt ?? null)}
                      </span>
                    </p>
                    <p>
                      Gün sayısı:{" "}
                      <span className="font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                        {programProgressDetail.currentDayNumber}/{programProgressDetail.totalDays}
                      </span>
                    </p>
                  </div>
                </article>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 md:hidden">
                  {programProgressDetail.days.map((day) => (
                    <ProgramDayCard key={day.dayId} day={day} />
                  ))}
                </div>

                <div className="hidden md:block">
                  <div className="space-y-4 border-l border-slate-200 pl-5 [data-idil-theme=dark]:border-slate-700">
                    {programProgressDetail.days.map((day) => (
                      <div key={day.dayId} className="relative">
                        <span className="absolute -left-[30px] top-6 h-4 w-4 rounded-full border-4 border-white bg-[var(--brand)] shadow-sm [data-idil-theme=dark]:border-slate-950" />
                        <ProgramDayCard day={day} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyCard text="Aktif program bulunmuyor." />
          )}
        </PanelCard>
      </section>

      <section>
        <PanelCard title="Okuma ve Anlama Performansı" subtitle="Gerçek okuma hızı ve anlama sonuçlarının geçmişi">
          {performanceHistoryError ? (
            <EmptyCard text={performanceHistoryError} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <PerformanceMetricCard metric="reading" summary={performanceHistory.reading} />
              <PerformanceMetricCard metric="comprehension" summary={performanceHistory.comprehension} />
            </div>
          )}
        </PanelCard>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Toplam Çalışma" value={detail.performanceSummary.totalExercises} />
        <MetricCard title="Ortalama Başarı" value={detail.performanceSummary.averageComprehensionRate === null ? "Henüz veri yok" : `%${detail.performanceSummary.averageComprehensionRate}`} />
        <MetricCard title="Son Çalışma" value={formatDateTime(detail.performanceSummary.lastStudyAt)} />
        <MetricCard title="Rozet Sayısı" value={detail.gamificationSummary.badgeCount} subtitle="Kazanılan rozet sayısı" />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <PanelCard title="Performans Özeti" subtitle="Okuma hızları ve anlama puanları">
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Son okuma hızı</p>
              <p className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {detail.performanceSummary.latestReadingSpeedWpm === null ? "Henüz veri yok" : `${detail.performanceSummary.latestReadingSpeedWpm} kelime/dk`}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">En yüksek okuma hızı</p>
              <p className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {detail.performanceSummary.highestReadingSpeedWpm === null ? "Henüz veri yok" : `${detail.performanceSummary.highestReadingSpeedWpm} kelime/dk`}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Son anlama puanı</p>
              <p className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {detail.performanceSummary.latestComprehensionRate === null ? "Henüz veri yok" : `%${detail.performanceSummary.latestComprehensionRate}`}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 [data-idil-theme=dark]:text-slate-400">Ortalama anlama</p>
              <p className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">
                {detail.performanceSummary.averageComprehensionRate === null ? "Henüz veri yok" : `%${detail.performanceSummary.averageComprehensionRate}`}
              </p>
            </article>
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1.05fr]">
        <PanelCard title="Son Aktiviteler" subtitle="En yeni çalışmalar ve giriş hareketleri">
          {detail.activityFeedError ? (
            <EmptyCard text={detail.activityFeedError} />
          ) : detail.activityFeed.length === 0 ? (
            <EmptyCard text="Henüz çalışma bulunmuyor." />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {detail.activityFeed.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} compact />
                ))}
              </div>

              <div className="hidden md:block">
                <div className="space-y-3 border-l border-slate-200 pl-4 [data-idil-theme=dark]:border-slate-700">
                  {detail.activityFeed.map((activity) => (
                    <div key={activity.id} className="relative">
                      <span className="absolute -left-[25px] top-5 h-4 w-4 rounded-full border-4 border-white bg-[var(--brand)] shadow-sm [data-idil-theme=dark]:border-slate-950" />
                      <ActivityCard activity={activity} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </PanelCard>

        <PanelCard title="Okuma Testleri" subtitle="Okuma hızı ve anlama testleri geçmişi">
          {readingStats.recordsNewestFirst.length === 0 ? (
            <EmptyCard text="Bu öğrencinin henüz okuma testi sonucu yok." />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {readingStats.recordsNewestFirst.map((test) => (
                  <article key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">
                          {test.type === "reading-speed-test" ? "Okuma Hızı Testi" : "Anlama Testi"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{test.title}</p>
                      </div>
                      <p className="text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{formatDateTime(test.completedAt)}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                      <p>Hız: <span className="text-slate-900 [data-idil-theme=dark]:text-slate-100">{test.readingSpeedWpm ?? "Henüz veri yok"}</span></p>
                      <p>Başarı: <span className="text-[var(--brand)]">{test.successRate === null ? "Henüz veri yok" : `%${test.successRate}`}</span></p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:block [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-400">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Tarih</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Tür</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Metin</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Hız</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Anlama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readingStats.recordsNewestFirst.map((test) => (
                      <tr key={test.id} className="border-b border-slate-100 last:border-0 [data-idil-theme=dark]:border-slate-800">
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">{formatDateTime(test.completedAt)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 [data-idil-theme=dark]:text-slate-100">
                          {test.type === "reading-speed-test" ? "Okuma Hızı Testi" : "Anlama Testi"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">{test.title}</td>
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">
                          {test.readingSpeedWpm === null ? "Henüz veri yok" : `${test.readingSpeedWpm} kelime/dk`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--brand)]">
                          {test.successRate === null ? "Henüz veri yok" : `%${test.successRate}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelCard>
      </section>

      <section>
        <PanelCard title="Sonuç Geçmişi" subtitle="Son kayıtlar en yeni tarihten eskiye sıralanır">
          {sortedResults.length === 0 ? (
            <EmptyCard text="Bu öğrenci henüz egzersiz tamamlamadı." />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {sortedResults.map((result) => (
                  <article key={result.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{result.exerciseTitle}</p>
                        <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{formatDateTime(result.date)}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
                        {result.exerciseType}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                      <p>Doğru/Yanlış: <span className="text-slate-900 [data-idil-theme=dark]:text-slate-100">{result.correctCount}/{result.wrongCount}</span></p>
                      <p>Puan: <span className="text-[var(--brand)]">{result.score}</span></p>
                      <p>Başarı: <span className="text-slate-900 [data-idil-theme=dark]:text-slate-100">%{result.successRate}</span></p>
                      <p>Süre: <span className="text-slate-900 [data-idil-theme=dark]:text-slate-100">{result.durationSeconds} sn</span></p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:block [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-400">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Tarih</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Egzersiz</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Doğru / Yanlış</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Puan</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Başarı</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-semibold [data-idil-theme=dark]:border-slate-700">Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result) => (
                      <tr key={result.id} className="border-b border-slate-100 last:border-0 [data-idil-theme=dark]:border-slate-800">
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">{formatDateTime(result.date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-100">{result.exerciseTitle}</p>
                          <p className="mt-1 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">{result.exerciseType}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">
                          {result.correctCount}/{result.wrongCount}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--brand)]">{result.score}</td>
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">%{result.successRate}</td>
                        <td className="px-4 py-3 text-slate-700 [data-idil-theme=dark]:text-slate-300">{result.durationSeconds} sn</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelCard>
      </section>

      {isDeleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Öğrenci silme onayı"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Öğrenciyi silmek istediğinize emin misiniz?</h3>
            <p className="mt-2 text-sm text-slate-700 [data-idil-theme=dark]:text-slate-300">
              Bu işlem geri alınamaz. Öğrenciye ait ders kayıtları ve egzersiz sonuçları da silinebilir.
            </p>
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-100">
              {detail.profile.fullName}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingStudent) {
                    setIsDeleteModalOpen(false);
                  }
                }}
                disabled={isDeletingStudent}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-200"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteStudent()}
                disabled={isDeletingStudent}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingStudent ? "Siliniyor..." : "Öğrenciyi Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
