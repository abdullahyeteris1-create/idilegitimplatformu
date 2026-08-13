"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { logoutCurrentStudent } from "@/lib/auth/auth";
import type { DailyAssignment, DailyAssignmentItem } from "@/lib/assignments/assignmentTypes";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import { createReadingTestStatistics } from "@/lib/results/readingTestStatistics";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { categories, navItems, type Category, type NavItem } from "./data";
import { Icon, type IconName } from "./icons";
import styles from "./student-panel-preview.module.css";
import { StudentRecommendationsCard } from "./StudentRecommendationsCard";
import { HeroBanner, type HeroProgressSummary } from "./hero/HeroBanner";
import { HeroThemeProvider } from "./hero/HeroThemeEngine";
import { createDefaultStudentXpSnapshot, type StudentXpSnapshot } from "@/lib/xp/xpLevels";
import { useXpRewardNotifications } from "@/components/xp-notifications/xpRewardNotifications";
import { StudentAccountMenu } from "./StudentAccountMenu";
import { getStudentPanelRecommendation, type StudentPanelRecommendation } from "@/lib/recommendations/studentPanelRecommendation";
import { getStudentXpBadges } from "@/lib/xp/xpBadges";

type DemoPanel = "menu" | "notifications" | "profile" | null;
type PreviewStudentIdentity = { name: string; classLabel: string; studentId: string | null; username: string | null; resolved: boolean };
export type AuthenticatedStudent = { id: string; name: string; username?: string; classLevel?: string | null };
type StudentPanelPreviewProps = {
  authenticatedStudent: AuthenticatedStudent;
  showReadingTestsCard?: boolean;
  showStatisticsCard?: boolean;
  xpSnapshot?: StudentXpSnapshot;
};
type PreviewResultsState = {
  status: "loading" | "ready" | "error";
  results: ExerciseResult[];
  readingTests: ReadingTestResult[];
};
export type StudentResultApiItem = {
  id: string;
  studentId: string;
  exerciseType: ExerciseType;
  exerciseTitle: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  durationSeconds: number;
  date: string;
  details?: Record<string, unknown>;
};
type DailyTaskState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; assignment: DailyAssignment };
export type ResumeTarget =
  | { status: "loading" }
  | { status: "error" }
  | { status: "assignment"; item: DailyAssignmentItem; href: string; actionLabel: string; details: string[] }
  | { status: "result"; result: ExerciseResult; href: string }
  | { status: "empty"; href: string };

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
const ISTANBUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const EXERCISE_ROUTE_BY_TYPE: Record<ExerciseType, string> = {
  "square-vision": "/egzersizler/kare-gorme-alani",
  tachistoscope: "/egzersizler/takistoskop",
  "similar-words": "/egzersizler/benzer-kelimeler",
  "block-reading": "/egzersizler/blok-okuma",
  "shadow-reading": "/egzersizler/golgeleme",
  "focused-reading": "/egzersizler/odakli-okuma",
  "two-side-focus": "/egzersizler/cift-tarafli-odak",
  "word-race": "/egzersizler/kelime-yarisi",
  "attention-maze": "/egzersizler/dikkat-labirenti",
  "memory-game": "/egzersizler/hafiza-gelistirme",
  "word-finding": "/egzersizler/kelime-bulma",
  "eye-muscle": "/egzersizler/goz-kaslari",
  "reading-comprehension": "/egzersizler/anlama-testi",
  "letter-number-counting-focus": "/egzersizler/harf-rakam-sayma",
  "card-matching": "/egzersizler/kart-eslestirme",
  "visual-puzzle": "/egzersizler/gorsel-puzzle",
  "eye-brain": "/egzersizler/goz-beyin",
  "word-guess": "/egzersizler/kelime-tahmin",
  "catch-same": "/egzersizler/ayni-olani-yakala",
  hangman: "/egzersizler/adam-asmaca",
  "grouping-reading": "/egzersizler/gruplama-calismasi",
  "eye-columns": "/egzersizler/goz-egzersizleri-kolonlar",
  "color-match": "/egzersizler/renk-uyumu",
  "reading-speed-test": "/egzersizler/okuma-hizi-testi",
  "thirteen-point-emoji-tracking": "/egzersizler/13-nokta-emoji-takip",
  "growing-shapes-hexagon": "/egzersizler/buyuyen-sekiller-altigen",
  "kayip-nesne": "/egzersizler/kayip-nesne",
  "saray-dedektifi": "/egzersizler/saray-dedektifi",
};

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortNewestFirst<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date));
}

function clampPercentage(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

function getResultDetailNumber(result: ExerciseResult, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = result.details?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function getResultDetailString(result: ExerciseResult, key: string): string | null {
  const value = result.details?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatXpProgress(snapshot: StudentXpSnapshot): string {
  return `${snapshot.xpWithinLevel} / ${snapshot.xpRequiredForLevel} XP`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("tr-TR");
}

function formatResultDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getIstanbulDateKey(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;

  const parts = ISTANBUL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function dateKeyToDayNumber(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const dayNumber = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
  return Number.isFinite(dayNumber) ? dayNumber : null;
}

function getResultDayNumber(result: ExerciseResult): number | null {
  const dateKey = getIstanbulDateKey(new Date(result.date));
  return dateKey ? dateKeyToDayNumber(dateKey) : null;
}

function getUniqueResults(results: ExerciseResult[]): ExerciseResult[] {
  const seenIds = new Set<string>();

  return results.filter((result) => {
    if (seenIds.has(result.id)) return false;
    seenIds.add(result.id);
    return true;
  });
}

function calculateDailyStreak(results: ExerciseResult[], now = new Date()): number {
  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return 0;

  const activeDays = new Set(
    getUniqueResults(results)
      .map(getResultDayNumber)
      .filter((dayNumber): dayNumber is number => dayNumber !== null && dayNumber <= todayDayNumber),
  );
  const startDayNumber = activeDays.has(todayDayNumber)
    ? todayDayNumber
    : activeDays.has(todayDayNumber - 1)
      ? todayDayNumber - 1
      : null;

  if (startDayNumber === null) return 0;

  let streak = 0;
  for (let dayNumber = startDayNumber; activeDays.has(dayNumber); dayNumber -= 1) {
    streak += 1;
  }

  return streak;
}

function formatResultDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilgisi yok";

  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveResumeTarget(taskState: DailyTaskState, resultsState: PreviewResultsState): ResumeTarget {
  if (taskState.status === "loading") return { status: "loading" };
  if (taskState.status === "error") return { status: "error" };

  if (taskState.status === "ready") {
    const item = selectDailyTaskItem(taskState.assignment.items);
    if (item) {
      const durationMinutes = typeof item.settingsJson.durationMinutes === "number" ? item.settingsJson.durationMinutes : null;
      const statusLabel = item.status === "started" ? "Başlandı" : item.status === "pending" ? "Bekliyor" : "Tamamlanmadı";
      const details = [
        `Durum: ${statusLabel}`,
        ...(durationMinutes !== null ? [`Süre: ${durationMinutes} dakika`] : []),
        ...(item.assignedTextTitle ? [`Metin: ${item.assignedTextTitle}`] : []),
        ...(item.teacherNote ? [`Öğretmen notu: ${item.teacherNote}`] : []),
      ];

      return {
        status: "assignment",
        item,
        href: `/egzersizler/${item.exerciseSlug}?assignmentItemId=${encodeURIComponent(item.id)}`,
        actionLabel: item.status === "started" ? "Devam Et" : "Başla",
        details,
      };
    }
  }

  if (resultsState.status === "loading") return { status: "loading" };
  if (resultsState.status === "error") return { status: "error" };
  const latestResult = resultsState.results[0];
  if (latestResult) {
    return { status: "result", result: latestResult, href: EXERCISE_ROUTE_BY_TYPE[latestResult.exerciseType] ?? "/egzersizler" };
  }

  return { status: "empty", href: "/egzersizler" };
}

function Progress({ value, label }: { value: number; label: string }) {
  return <div className={styles.progress} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ "--progress": `${value}%` } as React.CSSProperties} /></div>;
}

function Brand() {
  return <div className={styles.brand}><span className={styles.brandMark}><Icon name="rocket" /></span><span><strong>İDİL</strong><small>HIZLI OKUMA</small></span></div>;
}

function NavAction({ item, active = false, onDemo, onNavigate, onAccountMenu, accountMenuOpen = false }: { item: NavItem; active?: boolean; onDemo: (message: string) => void; onNavigate?: () => void; onAccountMenu?: () => void; accountMenuOpen?: boolean }) {
  const pathname = usePathname();

  const content = <><Icon name={item.icon}/><span>{item.label}</span></>;
  const className = item.href === pathname || (active && !pathname) ? styles.activeNav : undefined;

  if (item.icon === "settings" && onAccountMenu) {
    return <button type="button" className={className} aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={onAccountMenu}>{content}</button>;
  }

  if (item.href) {
    return <Link href={item.href} className={className} onClick={onNavigate}>{content}</Link>;
  }

  return <button type="button" className={className} onClick={() => { onDemo("Bu özellik önizleme aşamasında."); onNavigate?.(); }}>{content}</button>;
}

function Sidebar({
  onDemo,
  onAccountMenu,
  accountMenuOpen,
  streakValue,
  streakNote,
  xpSnapshot,
}: {
  onDemo: (message: string) => void;
  onAccountMenu: () => void;
  accountMenuOpen: boolean;
  streakValue: string;
  streakNote: string;
  xpSnapshot: StudentXpSnapshot;
}) {
  return <aside className={styles.sidebar}><Brand/><nav aria-label="Ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo} onAccountMenu={onAccountMenu} accountMenuOpen={accountMenuOpen}/>)}</nav><LevelCard compact xpSnapshot={xpSnapshot}/><Badges xpSnapshot={xpSnapshot}/><div className={styles.streakCard}><span>🔥</span><div><small>Günlük Seri</small><strong>{streakValue}</strong><p>{streakNote}</p></div></div><button type="button" className={styles.support} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="help"/> Yardım &amp; Destek</button></aside>;
}

function Badges({ xpSnapshot }: { xpSnapshot: StudentXpSnapshot }) {
  const earnedCount = getStudentXpBadges(xpSnapshot).filter((badge) => badge.isEarned).length;
  return <Link href="/ogrenci/rozetlerim" className={styles.badgesLink}>Rozetlerim <span>{earnedCount}</span></Link>;
}

function LevelCard({
  compact = false,
  xpSnapshot,
  lastReward,
}: {
  compact?: boolean;
  xpSnapshot: StudentXpSnapshot;
  lastReward?: ReturnType<typeof useXpRewardNotifications>["lastReward"];
}) {
  const progressText = formatXpProgress(xpSnapshot);
  const rewardStrip = lastReward ? (
    <div className={styles.rewardStrip}>
      <span>Son kazan?m</span>
      <strong>+{lastReward.awardedXp} XP</strong>
      <p>
        {lastReward.sourceLabel} ? Toplam {lastReward.currentTotalXp.toLocaleString("tr-TR")} XP
      </p>
    </div>
  ) : null;

  return (
    <section
      className={`${styles.levelCard} ${compact ? styles.levelCompact : ""}`}
      aria-label={`Seviye ${xpSnapshot.level} ${xpSnapshot.title}`}
    >
      <div className={styles.levelTop}>
        <div>
          <strong>Seviye {xpSnapshot.level}</strong>
          <span>{xpSnapshot.title}</span>
        </div>
        <div className={styles.hexBadge}>?</div>
      </div>

      <div className={styles.xp}>
        <b>{progressText}</b>
        <strong>{xpSnapshot.totalXp.toLocaleString("tr-TR")} XP</strong>
      </div>

      <Progress value={xpSnapshot.progressPercent} label={`Seviye ${xpSnapshot.level} ilerlemesi`} />

      {!compact ? (
        <>
          <div className={styles.levelFoot}>
            <span>Sonraki: {xpSnapshot.nextLevelTitle}</span>
            <strong>Sonraki seviyeye {xpSnapshot.remainingXp.toLocaleString("tr-TR")} XP</strong>
          </div>
          {rewardStrip}
        </>
      ) : (
        <div className={styles.levelFoot}>
          <span>{xpSnapshot.nextLevelTitle}</span>
          <strong>%{xpSnapshot.progressPercent}</strong>
        </div>
      )}
    </section>
  );
}

function Header({
  onToggleTheme,
  light,
  panel,
  onTogglePanel,
  studentName,
  classLabel,
}: {
  onToggleTheme: () => void;
  light: boolean;
  panel: DemoPanel;
  onTogglePanel: (panel: Exclude<DemoPanel, null>) => void;
  studentName: string;
  classLabel: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <h1>
          Öğrenci Paneli <span aria-hidden="true">👋</span>
        </h1>
        <p>Okuma yolculuğunda bugün yeni bir seviyeye çık!</p>
      </div>
      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.themeButton}
          onClick={onToggleTheme}
          aria-label={`${light ? "Koyu" : "Açık"} temaya geç`}
        >
          <small>Tema</small>
          <Icon name={light ? "moon" : "sparkles"} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Bildirimleri aç"
          aria-expanded={panel === "notifications"}
          aria-controls="preview-demo-panel"
          onClick={() => onTogglePanel("notifications")}
        >
          <Icon name="bell" />
          <span>3</span>
        </button>
        <button
          type="button"
          className={styles.profile}
          aria-label="Profil menüsünü aç"
          aria-expanded={panel === "profile"}
          aria-haspopup="menu"
          aria-controls="preview-demo-panel"
          onClick={() => onTogglePanel("profile")}
          title={studentName}
        >
          <span className={styles.profileAvatar} aria-hidden="true">
            👤
          </span>
          <div className={styles.profileText}>
            <strong title={studentName}>{studentName}</strong>
            <small>{classLabel}</small>
          </div>
          <Icon name="arrow" />
        </button>
      </div>
    </header>
  );
}

function Hero({ studentName, resumeTarget, progressSummary }: { studentName: string; resumeTarget: ResumeTarget; progressSummary: HeroProgressSummary }) {
  let resumeContent: ReactNode;
  let resumeAction: ReactNode = null;

  if (resumeTarget.status === "loading") {
    resumeContent = <p className={styles.resumeState}>Devam bilgisi yükleniyor...</p>;
  } else if (resumeTarget.status === "error") {
    resumeContent = <p className={styles.resumeState}>Devam bilgisi şu anda görüntülenemiyor.</p>;
  } else if (resumeTarget.status === "assignment") {
    resumeContent = <><small className={styles.resumeEyebrow}>Günlük görev</small><strong>{resumeTarget.item.exerciseTitle}</strong><div className={styles.resumeDetails}>{resumeTarget.details.map((detail) => <span key={detail}>{detail}</span>)}</div></>;
    resumeAction = <Link href="/ogrenci/egitim-programim?resume=1" data-resume-action="assignment">Kaldığın Yerden Devam Et <Icon name="arrow"/></Link>;
  } else if (resumeTarget.status === "result") {
    const title = resumeTarget.result.exerciseTitle?.trim() || "Çalışma";
    const isReadingSpeedTest = resumeTarget.result.exerciseType === "reading-speed-test";
    const readingSpeedWpm = getResultDetailNumber(resumeTarget.result, "readingSpeedWpm");
    resumeContent = <><small className={styles.resumeEyebrow}>Son çalışmana dön</small><strong>{title}</strong><div className={styles.resumeDetails}><span>{formatResultDate(resumeTarget.result.date)}</span>{isReadingSpeedTest ? <><span>Okuma Hızı: {readingSpeedWpm !== null ? `${readingSpeedWpm} kelime/dk` : "-"}</span><span>Süre: {formatResultDuration(resumeTarget.result.durationSeconds)}</span></> : <><span>Başarı: %{clampPercentage(resumeTarget.result.successRate)}</span><span>Puan: {Number.isFinite(resumeTarget.result.score) ? resumeTarget.result.score : 0}</span></>}</div></>;
    resumeAction = <Link href="/ogrenci/egitim-programim?resume=1" data-resume-action="result">Kaldığın Yerden Devam Et <Icon name="arrow"/></Link>;
  } else {
    resumeContent = <><small className={styles.resumeEyebrow}>Çalışma önerisi</small><strong>Yeni bir çalışmaya başla</strong><p className={styles.resumeDescription}>Egzersizlerden birini seçerek gelişimine devam edebilirsin.</p></>;
    resumeAction = <Link href={resumeTarget.href} data-resume-action="empty">Egzersizleri Aç <Icon name="arrow"/></Link>;
  }

  return <HeroBanner studentName={studentName} resumeTarget={resumeTarget} resumeContent={resumeContent} resumeAction={resumeAction} progressSummary={progressSummary} />;
}

type DashboardStat = {
  label: string;
  value: string;
  note: string;
  icon: IconName;
  tone: string;
  /** 0-100 arası doluluk; kartın altındaki ince ölçer bunu gösterir. */
  progress: number;
  /** Ölçerin yanında görünen kısa rozet metni. */
  badge: string;
};

function StatCard({ stat, index }: { stat: DashboardStat; index: number }) {
  const progress = clampPercentage(stat.progress);

  return (
    <article
      className={`${styles.statCard} ${styles[stat.tone]}`}
      data-stat-label={stat.label}
      style={{ "--delay": `${index * 70}ms`, "--stat-progress": `${progress}%` } as React.CSSProperties}
    >
      <div className={styles.statCardHead}>
        <span className={styles.statCardIcon} aria-hidden="true"><Icon name={stat.icon}/></span>
        <span className={styles.statCardBadge}>{stat.badge}</span>
      </div>
      <div className={styles.statCardBody}>
        <span>{stat.label}</span>
        <strong>{stat.value}</strong>
        <small>{stat.note}</small>
      </div>
      <div className={styles.statCardMeter} role="presentation"><span/></div>
    </article>
  );
}

// Kategoriler egzersizler sayfasında yaşamaya devam eder; ana panelde tekrar
// gösterilmez. Bu uyumluluk bileşeni eski önizleme işaretlemeleri için boştur.
function CategoryCard(_props: { category: Category; index: number }) {
  void _props;
  return null;
}

function selectDailyTaskItem(items: DailyAssignmentItem[]): DailyAssignmentItem | null {
  return items.find((item) => item.status === "started")
    ?? items.find((item) => item.status === "pending")
    ?? items.find((item) => item.status !== "completed")
    ?? null;
}

function RecentResults({ results, loading, error }: { results: ExerciseResult[]; loading: boolean; error: boolean }) {
  return (
    <section className={styles.recentSection} aria-labelledby="recent-results-title">
      <div className={styles.recentSectionTitle}>
        <div><h2 id="recent-results-title">Son Çalışmalarım</h2><p>En yeni tamamlanan çalışmaların.</p></div>
        <Link href="/sonuc">Tüm Sonuçlar <Icon name="arrow"/></Link>
      </div>
      {loading ? (
        <p className={styles.resultState}>Sonuçlar yükleniyor...</p>
      ) : error ? (
        <p className={styles.resultState}>Sonuçlar şu anda yüklenemiyor.</p>
      ) : results.length === 0 ? (
        <p className={styles.resultState}>Henüz tamamlanmış çalışma yok</p>
      ) : (
        <div className={styles.recentResultsGrid}>
          {results.map((result) => {
            const title = result.exerciseTitle?.trim() || "Çalışma";
            const successRate = clampPercentage(result.successRate);
            const exerciseHref = EXERCISE_ROUTE_BY_TYPE[result.exerciseType] ?? "/egzersizler";
            const isReadingSpeedTest = result.exerciseType === "reading-speed-test";
            const readingSpeedWpm = getResultDetailNumber(result, "readingSpeedWpm");
            const wordCount = getResultDetailNumber(result, "wordCount", "totalWords");
            const textTitle = getResultDetailString(result, "textTitle");

            return (
              <article className={styles.recentResultCard} key={result.id}>
                <div><h3>{title}</h3><time dateTime={result.date}>{formatResultDate(result.date)}</time></div>
                {isReadingSpeedTest ? (
                  <div className={styles.resultMetrics}><span>Okuma Hızı <b>{readingSpeedWpm !== null ? `${readingSpeedWpm} kelime/dk` : "-"}</b></span><span>Süre <b>{formatResultDuration(result.durationSeconds)}</b></span><span>Kelime <b>{wordCount ?? "-"}</b></span><span>Metin <b>{textTitle ?? "-"}</b></span></div>
                ) : (
                  <div className={styles.resultMetrics}><span>Başarı <b>%{successRate}</b></span><span>Puan <b>{Number.isFinite(result.score) ? result.score : 0}</b></span></div>
                )}
                <Link href={exerciseHref}>Tekrar Aç <Icon name="arrow"/></Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReadingTestsCard({ results, status }: { results: ExerciseResult[]; status: "loading" | "ready" | "error" }) {
  const summary = useMemo(() => createReadingTestStatistics(results, 10).summary, [results]);
  const loading = status === "loading";
  const error = status === "error";
  const placeholder = loading || error ? "—" : null;
  const speedValue = placeholder ?? (summary.latestSpeedWpm === null ? "—" : `${formatNumber(summary.latestSpeedWpm)} kelime/dk`);
  const comprehensionValue = placeholder ?? (summary.latestComprehensionRate === null ? "—" : `%${formatNumber(summary.latestComprehensionRate)}`);
  const totalValue = placeholder ?? formatNumber(summary.totalTests);

  return (
    <section className={styles.readingCard} aria-labelledby="reading-tests-card-title">
      <span className={styles.cornerSpark}>✦</span>
      <div className={styles.readingCardHead}>
        <h2 id="reading-tests-card-title">Okuma Testlerim</h2>
        <p>Okuma hızı ve anlama testi gelişiminizi inceleyin.</p>
      </div>
      <div className={styles.readingCardStats}>
        <div><span>Son Okuma Hızı</span><strong>{speedValue}</strong></div>
        <div><span>Son Anlama Başarısı</span><strong>{comprehensionValue}</strong></div>
        <div><span>Toplam Okuma Testi</span><strong>{totalValue}</strong></div>
      </div>
      <Link href="/ogrenci/okuma-testlerim" className={styles.readingCardAction}>İstatistikleri Gör <Icon name="arrow"/></Link>
    </section>
  );
}

function ReadingTest({ test, loading }: { test?: ReadingTestResult; loading: boolean }) {
  if (loading) {
    return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><p className={styles.readingEmpty}>Sonuçlar yükleniyor...</p></section>;
  }

  if (!test) {
    return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><p className={styles.readingEmpty}>Henüz tamamlanmış okuma testi yok.</p><Link href="/egzersizler/anlama-testi" className={styles.subtleButton}>Okuma Testine Başla <Icon name="bookOpen"/></Link></section>;
  }

  const readingSpeed = Number.isFinite(test.readingSpeedWpm) ? Math.max(0, Math.round(test.readingSpeedWpm)) : 0;
  return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><div className={styles.testBody}><div className={styles.scoreRing}><strong>{readingSpeed}</strong><span>kelime/dk</span></div><div><p>Anlama <b>%{clampPercentage(test.comprehensionScore)}</b></p><small>{formatResultDate(test.date)}</small></div></div><Link href="/ogrenci/okuma-testlerim" className={styles.subtleButton}>Sonuçları Gör <Icon name="bookOpen"/></Link></section>;
}

function StatisticsCard() {
  return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>İstatistikler</h2><p className={styles.readingEmpty}>Çalışma geçmişinizi ve gelişiminizi inceleyin.</p><Link href="/sonuc" className={styles.subtleButton}>İstatistikleri Gör <Icon name="chart"/></Link></section>;
}

function GameRoomJoinCard() {
  return <section className={styles.sideCard} data-game-room-card><span className={styles.cornerSpark}>✦</span><h2>Oyun Odasına Katıl</h2><p className={styles.readingEmpty}>Öğretmeninin paylaştığı 6 haneli kodla canlı oyun lobisine gir.</p><Link href="/ogrenci/oyun-odalari" className={styles.subtleButton}>Oda Kodunu Gir <Icon name="puzzle"/></Link></section>;
}

const mobileItems: NavItem[] = [
  { icon: "home", label: "Panel", href: "/ogrenci-paneli-onizleme" },
  { icon: "rocket", label: "Egzersizler", href: "/egzersizler" },
  { icon: "badge", label: "Rozetler", href: "/ogrenci/rozetlerim" },
  { icon: "chart", label: "Sonuçlar", href: "/sonuc" },
];

function MobileNav({ onDemo, onProfile, profileOpen }: { onDemo: (message: string) => void; onProfile: () => void; profileOpen: boolean }) {
  return <nav className={styles.mobileNav} aria-label="Mobil menü">{mobileItems.map((item, index) => item.href ? <Link href={item.href} key={item.label} className={index === 0 ? styles.mobileActive : undefined} aria-label={item.label}><Icon name={item.icon}/></Link> : <button type="button" key={item.label} aria-label={item.label} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name={item.icon}/></button>)}<button type="button" aria-label="Profil menüsünü aç" aria-haspopup="menu" aria-expanded={profileOpen} onClick={onProfile}><Icon name="user"/></button></nav>;
}

function MobileMenu({ onDemo, onClose, onAccountMenu, accountMenuOpen }: { onDemo: (message: string) => void; onClose: () => void; onAccountMenu: () => void; accountMenuOpen: boolean }) {
  return <nav className={styles.mobileMenuPanel} aria-label="Mobil ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo} onNavigate={onClose} onAccountMenu={() => { onClose(); onAccountMenu(); }} accountMenuOpen={accountMenuOpen}/>)}</nav>;
}

function DemoPopover({ panel, onDemo, onClose, onLogout, isLoggingOut, studentName, classLabel, popoverRef }: { panel: Exclude<DemoPanel, "menu" | null>; onDemo: (message: string) => void; onClose: () => void; onLogout: () => void; isLoggingOut: boolean; studentName: string; classLabel: string; popoverRef?: RefObject<HTMLElement | null> }) {
  void onLogout;
  void isLoggingOut;
  void classLabel;
  if (panel === "profile") {
    return <AccountMenuPopover studentName={studentName} classLabel={classLabel} onClose={onClose} onLogout={onLogout} isLoggingOut={isLoggingOut} popoverRef={popoverRef} />;
  }

  return (
    <section id="preview-demo-panel" ref={popoverRef} className={styles.demoPopover} role="dialog" aria-modal="true" aria-labelledby="preview-demo-panel-title">
      <div className={styles.popoverTitle}>
        <div><small>ÖNİZLEME</small><h2 id="preview-demo-panel-title">{panel === "notifications" ? "Bildirimler" : studentName}</h2></div>
        <button type="button" onClick={onClose} aria-label="Paneli kapat">×</button>
      </div>
      <div className={styles.notificationList}>
        <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>🚀</span><div><strong>Günlük görevin hazır</strong><small>15 dakikalık odak çalışması</small></div></button>
        <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>⭐</span><div><strong>Çalışma serin güncellendi</strong><small>Güncel serini panelden takip edebilirsin</small></div></button>
      </div>
    </section>
  );
}

function AccountMenuPopover({ studentName, classLabel, onClose, onLogout, isLoggingOut, popoverRef }: { studentName: string; classLabel: string; onClose: () => void; onLogout: () => void; isLoggingOut: boolean; popoverRef?: RefObject<HTMLElement | null> }) {
  return <StudentAccountMenu studentName={studentName} classLabel={classLabel} onClose={onClose} onLogout={onLogout} isLoggingOut={isLoggingOut} popoverRef={popoverRef}/>;
}

export function StudentPanelPreview({ authenticatedStudent, showReadingTestsCard = false, showStatisticsCard = false, xpSnapshot }: StudentPanelPreviewProps) {
  const { theme, setTheme } = useIdilTheme();
  const { lastReward } = useXpRewardNotifications();
  const light = theme === "light";
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<DemoPanel>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [resultsState, setResultsState] = useState<PreviewResultsState>({ status: "loading", results: [], readingTests: [] });
  const [dailyTaskState, setDailyTaskState] = useState<DailyTaskState>({ status: "loading" });
  const toastTimer = useRef<number | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const studentIdentity = useMemo<PreviewStudentIdentity>(() => ({
    name: authenticatedStudent.name,
    classLabel: authenticatedStudent.classLevel?.trim() || "Sınıf bilgisi yok",
    studentId: authenticatedStudent.id,
    username: authenticatedStudent.username?.trim() || null,
    resolved: true,
  }), [authenticatedStudent.classLevel, authenticatedStudent.id, authenticatedStudent.name, authenticatedStudent.username]);
  const safeXpSnapshot = xpSnapshot ?? createDefaultStudentXpSnapshot();

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const closePanel = useCallback(() => {
    const shouldRestoreFocus = panel === "notifications";
    const trigger = shouldRestoreFocus
      ? document.querySelector<HTMLButtonElement>('button[aria-label^="Bildirim"]')
      : null;
    setPanel(null);
    if (shouldRestoreFocus && trigger) window.requestAnimationFrame(() => trigger.focus());
  }, [panel]);

  const togglePanel = useCallback((nextPanel: Exclude<DemoPanel, null>) => setPanel((current) => current === nextPanel ? null : nextPanel), []);
  const openAccountMenu = useCallback(() => setPanel("profile"), []);
  const pathname = usePathname();
  useEffect(() => {
    const closePanelOnRestore = () => setPanel(null);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") closePanelOnRestore();
    };

    window.addEventListener("pageshow", closePanelOnRestore);
    window.addEventListener("focus", closePanelOnRestore);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const closeOnRouteChange = window.setTimeout(closePanelOnRestore, 0);

    return () => {
      window.clearTimeout(closeOnRouteChange);
      window.removeEventListener("pageshow", closePanelOnRestore);
      window.removeEventListener("focus", closePanelOnRestore);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setLogoutError("");
    setIsLoggingOut(true);
    try {
      await logoutCurrentStudent();
      window.location.replace("/giris");
    } catch {
      setLogoutError("Çıkış şu anda tamamlanamadı. Lütfen tekrar dene.");
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!studentIdentity.resolved) return;

    let cancelled = false;
    const controller = new AbortController();
    const loadDailyTask = async () => {
      if (!studentIdentity.studentId) {
        setDailyTaskState({ status: "empty" });
        return;
      }

      setDailyTaskState({ status: "loading" });
      try {
        const response = await fetch("/api/student/daily-assignment?readOnly=true", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as { ok?: boolean; assignment?: DailyAssignment | null };

        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setDailyTaskState({ status: "error" });
          return;
        }

        setDailyTaskState(data.assignment ? { status: "ready", assignment: data.assignment } : { status: "empty" });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setDailyTaskState({ status: "error" });
        }
      }
    };

    void loadDailyTask();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [studentIdentity.resolved, studentIdentity.studentId]);

  useEffect(() => {
    if (!studentIdentity.resolved) return;

    let cancelled = false;
    const loadResults = async () => {
      if (!studentIdentity.studentId) {
        setResultsState({ status: "ready", results: [], readingTests: [] });
        return;
      }

      setResultsState({ status: "loading", results: [], readingTests: [] });
      try {
        const response = await fetch("/api/student/results", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = (await response.json()) as { results?: StudentResultApiItem[] };
        if (!response.ok || !Array.isArray(payload.results)) {
          throw new Error("Student results request failed");
        }

        const results = payload.results.map((result): ExerciseResult => {
          if (result.studentId !== studentIdentity.studentId) {
            throw new Error("Student result identity mismatch");
          }

          return {
            ...result,
            studentName: studentIdentity.name,
            username: studentIdentity.username ?? undefined,
          };
        });
        if (cancelled) return;
        const readingTests = getReadingTestsByStudent(
          studentIdentity.studentId,
          studentIdentity.name,
          studentIdentity.username ?? undefined,
        );
        setResultsState({
          status: "ready",
          results: sortNewestFirst(results),
          readingTests: sortNewestFirst(readingTests),
        });
      } catch {
        if (cancelled) return;
        setResultsState({
          status: "error",
          results: [],
          readingTests: [],
        });
      }
    };

    void loadResults();
    return () => { cancelled = true; };
  }, [studentIdentity.name, studentIdentity.resolved, studentIdentity.studentId, studentIdentity.username]);

  useEffect(() => {
    if (!panel) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closePanel(); };
    window.addEventListener("keydown", closeOnEscape);
    const focusFrame = window.requestAnimationFrame(() => {
      const panelRoot = popoverRef.current ?? document.getElementById("preview-demo-panel");
      const firstItem = panelRoot?.querySelector<HTMLElement>('[role="menuitem"]') ?? panelRoot?.querySelectorAll<HTMLElement>("button")[1];
      firstItem?.focus();
    });
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.cancelAnimationFrame(focusFrame);
    };
  }, [closePanel, panel]);

  const previousPanelRef = useRef<DemoPanel>(null);
  useEffect(() => {
    if (previousPanelRef.current === "notifications" && panel === null) {
      document.querySelector<HTMLButtonElement>('button[aria-label^="Bildirim"]')?.focus();
    }
    previousPanelRef.current = panel;
  }, [panel]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const resultsLoading = resultsState.status === "loading";
  const resultsError = resultsState.status === "error";
  const recentResults = useMemo(() => resultsState.results.slice(0, 3), [resultsState.results]);
  const todayResults = useMemo(() => {
    const today = getIstanbulDateKey(new Date());
    return resultsState.results.filter((result) => getIstanbulDateKey(new Date(result.date)) === today);
  }, [resultsState.results]);
  const dailyStreak = useMemo(() => calculateDailyStreak(resultsState.results), [resultsState.results]);
  const metricPlaceholder = resultsLoading || resultsError ? "—" : null;
  const streakValue = metricPlaceholder ?? `${dailyStreak} gün`;
  const streakNote = resultsLoading
    ? "Sonuçlar yükleniyor"
    : resultsError
      ? "Sonuçlar görüntülenemiyor"
      : dailyStreak > 0
        ? "Mevcut sonuçlarına göre"
        : "Henüz aktif seri yok";
  const lastReadingTest = resultsState.readingTests[0];
  const dashboardStats = useMemo<DashboardStat[]>(() => [
    {
      label: "Bugünkü Program",
      value: dailyTaskState.status === "ready" ? `${dailyTaskState.assignment.items.filter((item) => item.status === "completed").length} / ${dailyTaskState.assignment.items.length}` : metricPlaceholder ?? "—",
      note: dailyTaskState.status === "ready" ? `${Math.max(0, dailyTaskState.assignment.items.length - dailyTaskState.assignment.items.filter((item) => item.status === "completed").length)} görev kaldı` : "Program bilgisi bekleniyor",
      icon: "bookOpen",
      tone: "blue",
      progress: dailyTaskState.status === "ready" && dailyTaskState.assignment.items.length > 0 ? (dailyTaskState.assignment.items.filter((item) => item.status === "completed").length / dailyTaskState.assignment.items.length) * 100 : 0,
      badge: dailyTaskState.status === "ready" && dailyTaskState.assignment.items.length > 0 && dailyTaskState.assignment.items.every((item) => item.status === "completed") ? "Tamamlandı" : "Bugün",
    },
    {
      label: "Çalışma Süresi",
      value: resultsLoading ? "—" : `${Math.floor(todayResults.reduce((sum, result) => sum + Math.max(0, result.durationSeconds), 0) / 60)} dk`,
      note: "Bugün",
      icon: "clock",
      tone: "cyan",
      progress: Math.min(100, todayResults.reduce((sum, result) => sum + Math.max(0, result.durationSeconds), 0) / 60 / 30 * 100),
      badge: "Gerçek süre",
    },
    {
      label: "Kazanılan XP",
      value: resultsLoading ? "—" : "—",
      note: "Bugün için ayrı XP verisi yok",
      icon: "sparkles",
      tone: "purple",
      progress: 0,
      badge: "Veri yok",
    },
    {
      label: "Seri",
      value: metricPlaceholder ?? `🔥 ${dailyStreak} gün`,
      note: dailyStreak > 0 ? "Mevcut çalışma serin" : "Henüz aktif seri yok",
      icon: "flame",
      tone: "orange",
      progress: metricPlaceholder ? 0 : (dailyStreak / 7) * 100,
      badge: dailyStreak >= 7 ? "Hafta tamam" : "Hedef 7 gün",
    },
  ], [dailyStreak, dailyTaskState, metricPlaceholder, resultsLoading, todayResults]);
  const visibleDashboardStats = useMemo<DashboardStat[]>(() => {
    const stats = dashboardStats.slice(0, 2);
    if (lastReadingTest) {
      stats.push({
        label: "Son Okuma Hızı",
        value: Number.isFinite(lastReadingTest.readingSpeedWpm) ? `${Math.max(0, Math.round(lastReadingTest.readingSpeedWpm))} dk/kelime` : "—",
        note: "Son tamamlanan test",
        icon: "rocket",
        tone: "pink",
        progress: 0,
        badge: "Gerçek veri",
      });
      stats.push({
        label: "Anlama Başarısı",
        value: `%${clampPercentage(lastReadingTest.comprehensionScore)}`,
        note: "Son okuma testi",
        icon: "checkbox",
        tone: "green",
        progress: clampPercentage(lastReadingTest.comprehensionScore),
        badge: "Gerçek veri",
      });
    }
    return stats;
  }, [dashboardStats, lastReadingTest]);
  const panelRecommendation = useMemo<StudentPanelRecommendation>(() => getStudentPanelRecommendation(resultsState.results), [resultsState.results]);
  const resumeTarget = useMemo(() => resolveResumeTarget(dailyTaskState, resultsState), [dailyTaskState, resultsState]);
  const heroProgressSummary = useMemo<HeroProgressSummary>(() => {
    const xp = {
      xpWithinLevel: safeXpSnapshot.xpWithinLevel,
      xpRequiredForLevel: safeXpSnapshot.xpRequiredForLevel,
      totalXp: safeXpSnapshot.totalXp,
    };
    if (dailyTaskState.status !== "ready") {
      return { ...xp, status: dailyTaskState.status, taskLabel: "Günlük görev", completedCount: 0, totalCount: 0, progress: 0 };
    }
    const completedCount = dailyTaskState.assignment.items.filter((item) => item.status === "completed").length;
    const totalCount = dailyTaskState.assignment.items.length;
    const selectedItem = selectDailyTaskItem(dailyTaskState.assignment.items);
    return { ...xp, status: "ready", taskLabel: selectedItem?.exerciseTitle ?? "Günün görevleri tamamlandı", completedCount, totalCount, progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0 };
  }, [dailyTaskState, safeXpSnapshot]);

  return <HeroThemeProvider><main className={`${styles.preview} ${light ? styles.light : ""}`}><div className={styles.shell}><Sidebar onDemo={showToast} onAccountMenu={openAccountMenu} accountMenuOpen={panel === "profile"} streakValue={streakValue} streakNote={streakNote} xpSnapshot={safeXpSnapshot}/><div className={styles.content}><div className={styles.mobileHeader}><Brand/><button type="button" aria-label="Menüyü aç" aria-expanded={panel === "menu"} onClick={() => togglePanel("menu")}><Icon name="menu"/></button><button type="button" aria-label="Bildirimler" aria-expanded={panel === "notifications"} onClick={() => togglePanel("notifications")}><Icon name="bell"/></button></div><Header light={light} panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onToggleTheme={() => setTheme(light ? "dark" : "light")} onTogglePanel={togglePanel}/><div className={styles.heroGrid}><Hero studentName={studentIdentity.name} resumeTarget={resumeTarget} progressSummary={heroProgressSummary}/><LevelCard xpSnapshot={safeXpSnapshot} lastReward={lastReward}/></div><div className={styles.dashboardGrid}><div className={styles.mainColumn}><section className={styles.panelRecommendation} aria-labelledby="panel-recommendation-title"><div><span className={styles.smartEyebrow}>BUGÜN SANA ÖNERİYORUM</span><h2 id="panel-recommendation-title">✨ {panelRecommendation.title}</h2><p>{panelRecommendation.description}</p><small>{panelRecommendation.category}</small></div><Link href={panelRecommendation.href} className={styles.panelRecommendationAction}>Oyna <Icon name="arrow"/></Link></section><section className={styles.statsGrid} aria-label="İstatistikler">{visibleDashboardStats.map((stat,index) => <StatCard key={stat.label} stat={stat} index={index}/>)}</section><StudentRecommendationsCard/>{showReadingTestsCard && <ReadingTestsCard results={resultsState.results} status={resultsState.status}/>}<RecentResults results={recentResults} loading={resultsLoading} error={resultsError}/><section className={styles.categoriesSection}><div className={styles.sectionTitle}><div><h2>🚀 Egzersiz Kategorileri</h2><p>Göz, dikkat, okuma ve hafıza becerilerini geliştir.</p></div><Link href="/egzersizler">Tüm Egzersizler <Icon name="arrow"/></Link></div><div className={styles.categoryGrid}>{categories.map((category,index) => <CategoryCard key={category.title} category={category} index={index}/>)}</div></section></div><aside className={styles.rightColumn}><GameRoomJoinCard/><ReadingTest test={lastReadingTest} loading={resultsLoading}/>{showStatisticsCard && <StatisticsCard/>}<section className={styles.motivation}><div><strong>Unutma!</strong><p>Her gün küçük adımlar,<br/>büyük gelişimler getir.</p></div><span>🪐</span></section></aside></div></div></div><MobileNav onDemo={showToast} onProfile={openAccountMenu} profileOpen={panel === "profile"}/>{panel && <><button type="button" className={styles.panelBackdrop} aria-label="Açık paneli kapat" onClick={() => setPanel(null)}/>{panel === "menu" ? <MobileMenu onDemo={showToast} onClose={() => setPanel(null)} onAccountMenu={openAccountMenu} accountMenuOpen={false}/> : <DemoPopover panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onDemo={showToast} onClose={() => setPanel(null)} onLogout={() => void handleLogout()} isLoggingOut={isLoggingOut}/>}</>}{logoutError && <div className={styles.logoutError} role="alert">{logoutError}</div>}{toast && <div className={styles.toast} role="status" aria-live="polite">{toast}</div>}</main></HeroThemeProvider>;
}
