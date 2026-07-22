"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { logoutCurrentStudent } from "@/lib/auth/auth";
import type { DailyAssignment, DailyAssignmentItem } from "@/lib/assignments/assignmentTypes";
import { getReadingTestsByStudent, type ReadingTestResult } from "@/lib/results/readingTestStorage";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { categories, navItems, stats, type Category, type NavItem } from "./data";
import { Icon } from "./icons";
import { ReadingTestsStatistics } from "./ReadingTestsStatistics";
import styles from "./student-panel-preview.module.css";

type DemoPanel = "menu" | "notifications" | "profile" | null;
type PreviewStudentIdentity = { name: string; classLabel: string; studentId: string | null; username: string | null; resolved: boolean };
export type AuthenticatedStudent = { id: string; name: string; username?: string; classLevel?: string | null };
type StudentPanelPreviewProps = {
  authenticatedStudent: AuthenticatedStudent;
  showReadingTestsStatistics?: boolean;
};
type PreviewResultsState = {
  status: "loading" | "ready" | "error";
  results: ExerciseResult[];
  readingTests: ReadingTestResult[];
};
type StudentResultApiItem = {
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
type ResumeTarget =
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

function calculateAverageSuccess(results: ExerciseResult[]): number | null {
  const validValues = results
    .filter((result) => result.exerciseType !== "reading-speed-test")
    .map((result) => result.successRate)
    .filter(Number.isFinite);
  if (validValues.length === 0) {
    return results.some((result) => result.exerciseType === "reading-speed-test") ? null : 0;
  }

  return clampPercentage(validValues.reduce((total, value) => total + value, 0) / validValues.length);
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

function getWeeklyResults(results: ExerciseResult[], now = new Date()): ExerciseResult[] {
  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return [];

  const todayWeekday = new Date(todayDayNumber * 86_400_000).getUTCDay();
  const mondayDayNumber = todayDayNumber - ((todayWeekday + 6) % 7);
  const nextMondayDayNumber = mondayDayNumber + 7;

  return getUniqueResults(results).filter((result) => {
    const resultDayNumber = getResultDayNumber(result);
    return resultDayNumber !== null
      && resultDayNumber >= mondayDayNumber
      && resultDayNumber < nextMondayDayNumber;
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

function NavAction({ item, active = false, onDemo, onNavigate }: { item: NavItem; active?: boolean; onDemo: (message: string) => void; onNavigate?: () => void }) {
  const content = <><Icon name={item.icon}/><span>{item.label}</span></>;
  const className = active ? styles.activeNav : undefined;

  if (item.href) {
    return <Link href={item.href} className={className} onClick={onNavigate}>{content}</Link>;
  }

  return <button type="button" className={className} onClick={() => { onDemo("Bu özellik önizleme aşamasında."); onNavigate?.(); }}>{content}</button>;
}

function Sidebar({ onDemo, streakValue, streakNote }: { onDemo: (message: string) => void; streakValue: string; streakNote: string }) {
  return <aside className={styles.sidebar}><Brand/><nav aria-label="Ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo}/>)}</nav><LevelCard compact/><div className={styles.streakCard}><span>🔥</span><div><small>Günlük Seri</small><strong>{streakValue}</strong><p>{streakNote}</p></div></div><button type="button" className={styles.support} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="help"/> Yardım &amp; Destek</button></aside>;
}

function LevelCard({ compact = false }: { compact?: boolean }) {
  return <section className={`${styles.levelCard} ${compact ? styles.levelCompact : ""}`} aria-label="Seviye sistemi hazırlanıyor"><div className={styles.levelTop}><div><strong>Seviye sistemi hazırlanıyor</strong><span>Gelişim özellikleri yakında</span></div><div className={styles.hexBadge}>★</div></div><div className={styles.xp}><b>Gelişim</b><strong>Yakında</strong></div><Progress value={0} label="Seviye sistemi hazırlanıyor"/>{!compact && <div className={styles.levelFoot}><span>Puan ve seviye özelliği</span><strong>hazırlanıyor</strong></div>}</section>;
}

function Header({ onToggleTheme, light, panel, onTogglePanel, studentName, classLabel }: { onToggleTheme: () => void; light: boolean; panel: DemoPanel; onTogglePanel: (panel: Exclude<DemoPanel, null>) => void; studentName: string; classLabel: string }) {
  return <header className={styles.header}><div><h1>Öğrenci Paneli <span>🚀</span></h1><p>Okuma yolculuğunda bugün yeni bir seviyeye çık!</p></div><div className={styles.headerActions}><button type="button" className={styles.themeButton} onClick={onToggleTheme} aria-label={`${light ? "Koyu" : "Açık"} temaya geç`}><small>Tema</small><Icon name={light ? "moon" : "sparkles"}/></button><button type="button" className={styles.iconButton} aria-label="Bildirimleri aç" aria-expanded={panel === "notifications"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("notifications")}><Icon name="bell"/><span>3</span></button><button type="button" className={styles.profile} aria-label="Profil menüsünü aç" aria-expanded={panel === "profile"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("profile")}><span>👨‍🚀</span><div><strong>{studentName}</strong><small>{classLabel}</small></div><Icon name="arrow"/></button></div></header>;
}

function SpaceScene() {
  return <div className={styles.spaceScene} aria-hidden="true"><span className={styles.planet}>◉</span><span className={styles.starOne}>✦</span><span className={styles.starTwo}>✧</span><div className={styles.rocket}><Icon name="rocket"/></div><div className={styles.rocketTrail}/></div>;
}

function Hero({ studentName, resumeTarget }: { studentName: string; resumeTarget: ResumeTarget }) {
  let resumeContent: ReactNode;
  let resumeAction: ReactNode = null;

  if (resumeTarget.status === "loading") {
    resumeContent = <p className={styles.resumeState}>Devam bilgisi yükleniyor...</p>;
  } else if (resumeTarget.status === "error") {
    resumeContent = <p className={styles.resumeState}>Devam bilgisi şu anda görüntülenemiyor.</p>;
  } else if (resumeTarget.status === "assignment") {
    resumeContent = <><small className={styles.resumeEyebrow}>Günlük görev</small><strong>{resumeTarget.item.exerciseTitle}</strong><div className={styles.resumeDetails}>{resumeTarget.details.map((detail) => <span key={detail}>{detail}</span>)}</div></>;
    resumeAction = <Link href={resumeTarget.href} data-resume-action="assignment">{resumeTarget.actionLabel} <Icon name="arrow"/></Link>;
  } else if (resumeTarget.status === "result") {
    const title = resumeTarget.result.exerciseTitle?.trim() || "Çalışma";
    const isReadingSpeedTest = resumeTarget.result.exerciseType === "reading-speed-test";
    const readingSpeedWpm = getResultDetailNumber(resumeTarget.result, "readingSpeedWpm");
    resumeContent = <><small className={styles.resumeEyebrow}>Son çalışmana dön</small><strong>{title}</strong><div className={styles.resumeDetails}><span>{formatResultDate(resumeTarget.result.date)}</span>{isReadingSpeedTest ? <><span>Okuma Hızı: {readingSpeedWpm !== null ? `${readingSpeedWpm} kelime/dk` : "-"}</span><span>Süre: {formatResultDuration(resumeTarget.result.durationSeconds)}</span></> : <><span>Başarı: %{clampPercentage(resumeTarget.result.successRate)}</span><span>Puan: {Number.isFinite(resumeTarget.result.score) ? resumeTarget.result.score : 0}</span></>}</div></>;
    resumeAction = <Link href={resumeTarget.href} data-resume-action="result">Bu Çalışmaya Yeniden Başla <Icon name="arrow"/></Link>;
  } else {
    resumeContent = <><small className={styles.resumeEyebrow}>Çalışma önerisi</small><strong>Yeni bir çalışmaya başla</strong><p className={styles.resumeDescription}>Egzersizlerden birini seçerek gelişimine devam edebilirsin.</p></>;
    resumeAction = <Link href={resumeTarget.href} data-resume-action="empty">Egzersizleri Aç <Icon name="arrow"/></Link>;
  }

  return <section className={styles.hero}><div className={styles.heroCopy}><h2>Hoş geldin, {studentName}! <span>👋</span></h2><p>Bugün odaklan, öğren, gelişimini bir üst seviyeye taşı.</p><div className={styles.tags}><span>◉ Odak</span><span>✦ Hız</span><span>♢ Anlama</span><span>⊙ Akıcılık</span></div><div className={styles.resumePanel} data-resume-state={resumeTarget.status}>{resumeContent}</div><div className={styles.heroActions}><Link href="/ogrenci">Bugünkü Görevine Başla <Icon name="arrow"/></Link>{resumeAction}</div></div><SpaceScene/></section>;
}

function StatCard({ stat, index }: { stat: typeof stats[number]; index: number }) {
  return <article className={`${styles.statCard} ${styles[stat.tone]}`} data-stat-label={stat.label} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div><Icon name={stat.icon}/>{stat.icon === "activity" && <div className={styles.sparkline}>⌁⌁⌁</div>}</article>;
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return (
    <article
      className={`${styles.categoryCard} ${styles[category.tone]}`}
      data-category={category.id}
      style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
    >
      <div className={styles.categoryHead}>
        <div>
          <Link href={category.href} className={styles.categoryTitleLink} aria-label={`${category.title} kategorisini aç`}>
            <h3>{category.title}</h3>
          </Link>
          <p>{category.count} {category.countLabel ?? "çalışma"}</p>
        </div>
        <span className={styles.categoryIcon}><Icon name={category.icon}/></span>
      </div>
      {category.description && <p className={styles.categoryDescription}>{category.description}</p>}
      {category.examples && category.examples.length > 0 && (
        <div className={styles.categoryExamples} aria-label={`${category.title} örnek egzersizleri`}>
          {category.examples.slice(0, 4).map((example) => <Link href={example.href} key={example.href}>{example.title}</Link>)}
        </div>
      )}
      <div className={styles.percent}>%{category.progress}</div>
      <Progress value={category.progress} label={`${category.title} tamamlanma oranı yüzde ${category.progress}`}/>
      <Link href={category.href}>Devam Et <Icon name="arrow"/></Link>
    </article>
  );
}

function selectDailyTaskItem(items: DailyAssignmentItem[]): DailyAssignmentItem | null {
  return items.find((item) => item.status === "started")
    ?? items.find((item) => item.status === "pending")
    ?? items.find((item) => item.status !== "completed")
    ?? null;
}

function DailyTask({ taskState }: { taskState: DailyTaskState }) {
  if (taskState.status === "loading") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="loading"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyStateMessage}>Görev yükleniyor...</p></section>;
  }

  if (taskState.status === "error") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="error"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyStateMessage}>Günlük görev şu anda görüntülenemiyor.</p></section>;
  }

  if (taskState.status === "empty") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="empty"><span className={styles.cornerSpark}>✦</span><h2>Bugün için atanmış görev yok</h2><p className={styles.dailyStateMessage}>Serbest çalışmalarından birini seçerek devam edebilirsin.</p><Link href="/egzersizler">Egzersizleri Gör <Icon name="arrow"/></Link></section>;
  }

  const { assignment } = taskState;
  const selectedItem = selectDailyTaskItem(assignment.items);
  const completedCount = assignment.items.filter((item) => item.status === "completed").length;
  const totalCount = assignment.items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!selectedItem) {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="completed"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü görevlerini tamamladın</h2><p className={styles.dailyStateMessage}>Bugünkü tüm çalışmalarını başarıyla tamamladın.</p><div className={styles.dailyProgressLabel}><span>{completedCount} / {totalCount} tamamlandı</span><strong>%{progress}</strong></div><Progress value={progress} label={`Bugünkü görevler yüzde ${progress} tamamlandı`}/><Link href="/egzersizler">Serbest Çalışmalara Git <Icon name="arrow"/></Link></section>;
  }

  const durationMinutes = typeof selectedItem.settingsJson.durationMinutes === "number"
    ? selectedItem.settingsJson.durationMinutes
    : null;
  const statusLabel = selectedItem.status === "started"
    ? "Başlandı"
    : selectedItem.status === "pending"
      ? "Bekliyor"
      : "Atlandı";
  const itemHref = `/egzersizler/${selectedItem.exerciseSlug}?assignmentItemId=${encodeURIComponent(selectedItem.id)}`;

  return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="ready"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyTaskTitle}>{selectedItem.exerciseTitle}</p><div className={styles.dailyTaskMeta}><small><b>Durum:</b> {statusLabel}</small>{durationMinutes !== null && <small><b>Süre:</b> {durationMinutes} dakika</small>}{selectedItem.assignedTextTitle && <small><b>Metin:</b> {selectedItem.assignedTextTitle}</small>}{selectedItem.teacherNote && <small><b>Öğretmen notu:</b> {selectedItem.teacherNote}</small>}</div><div className={styles.dailyProgressLabel}><span>{completedCount} / {totalCount} tamamlandı</span><strong>%{progress}</strong></div><Progress value={progress} label={`Bugünkü görevler yüzde ${progress} tamamlandı`}/><div className={styles.astronaut}>👨‍🚀</div><Link href={itemHref}>Göreve Devam Et <Icon name="arrow"/></Link></section>;
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

function ReadingTest({ test, loading }: { test?: ReadingTestResult; loading: boolean }) {
  if (loading) {
    return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><p className={styles.readingEmpty}>Sonuçlar yükleniyor...</p></section>;
  }

  if (!test) {
    return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><p className={styles.readingEmpty}>Henüz tamamlanmış okuma testi yok.</p><Link href="/egzersizler/anlama-testi" className={styles.subtleButton}>Okuma Testine Başla <Icon name="bookOpen"/></Link></section>;
  }

  const readingSpeed = Number.isFinite(test.readingSpeedWpm) ? Math.max(0, Math.round(test.readingSpeedWpm)) : 0;
  return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><div className={styles.testBody}><div className={styles.scoreRing}><strong>{readingSpeed}</strong><span>kelime/dk</span></div><div><p>Anlama <b>%{clampPercentage(test.comprehensionScore)}</b></p><small>{formatResultDate(test.date)}</small></div></div><Link href="/sonuc" className={styles.subtleButton}>Sonuçları Gör <Icon name="bookOpen"/></Link></section>;
}

function Badges({ onDemo }: { onDemo: (message: string) => void }) {
  return <section className={styles.sideCard}><div className={styles.cardTitle}><h2>Rozetlerim</h2><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}>Tümünü Gör</button></div><div className={styles.badges}><span>🚀</span><span>⭐</span><span>🪐</span><span>📖</span><span>+12</span></div></section>;
}

const mobileItems: NavItem[] = [
  { icon: "home", label: "Panel", href: "/ogrenci-paneli-onizleme" },
  { icon: "rocket", label: "Egzersizler", href: "/egzersizler" },
  { icon: "badge", label: "Rozetler" },
  { icon: "chart", label: "Sonuçlar", href: "/sonuc" },
];

function MobileNav({ onDemo, onProfile }: { onDemo: (message: string) => void; onProfile: () => void }) {
  return <nav className={styles.mobileNav} aria-label="Mobil menü">{mobileItems.map((item, index) => item.href ? <Link href={item.href} key={item.label} className={index === 0 ? styles.mobileActive : undefined} aria-label={item.label}><Icon name={item.icon}/></Link> : <button type="button" key={item.label} aria-label={item.label} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name={item.icon}/></button>)}<button type="button" aria-label="Profil" onClick={onProfile}><Icon name="user"/></button></nav>;
}

function MobileMenu({ onDemo, onClose }: { onDemo: (message: string) => void; onClose: () => void }) {
  return <nav className={styles.mobileMenuPanel} aria-label="Mobil ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo} onNavigate={onClose}/>)}</nav>;
}

function DemoPopover({ panel, onDemo, onClose, onLogout, isLoggingOut, studentName, classLabel, popoverRef }: { panel: Exclude<DemoPanel, "menu" | null>; onDemo: (message: string) => void; onClose: () => void; onLogout: () => void; isLoggingOut: boolean; studentName: string; classLabel: string; popoverRef?: RefObject<HTMLElement | null> }) {
  return (
    <section id="preview-demo-panel" ref={popoverRef} className={styles.demoPopover} role="dialog" aria-modal="true" aria-labelledby="preview-demo-panel-title">
      <div className={styles.popoverTitle}>
        <div><small>ÖNİZLEME</small><h2 id="preview-demo-panel-title">{panel === "notifications" ? "Bildirimler" : studentName}</h2></div>
        <button type="button" onClick={onClose} aria-label="Paneli kapat">×</button>
      </div>
      {panel === "notifications" ? (
        <div className={styles.notificationList}>
          <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>🚀</span><div><strong>Günlük görevin hazır</strong><small>15 dakikalık odak çalışması</small></div></button>
          <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>⭐</span><div><strong>Çalışma serin güncellendi</strong><small>Güncel serini panelden takip edebilirsin</small></div></button>
        </div>
      ) : (
        <div className={styles.profileMenu}>
          <div className={styles.profileSummary}><span>👨‍🚀</span><div><strong>{studentName}</strong><small>{classLabel} · Seviye sistemi hazırlanıyor</small></div></div>
          <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="user"/> Profili Gör</button>
          <button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="settings"/> Ayarlar</button>
          <button type="button" className={styles.profileLogout} onClick={onLogout} disabled={isLoggingOut}><Icon name="arrow"/> {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}</button>
        </div>
      )}
    </section>
  );
}

export function StudentPanelPreview({ authenticatedStudent, showReadingTestsStatistics = false }: StudentPanelPreviewProps) {
  const { theme, setTheme } = useIdilTheme();
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

  const togglePanel = (nextPanel: Exclude<DemoPanel, null>) => setPanel((current) => current === nextPanel ? null : nextPanel);
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
      const firstItem = (popoverRef.current ?? document.getElementById("preview-demo-panel"))?.querySelectorAll<HTMLElement>("button")[1];
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
  const weeklyResults = useMemo(() => getWeeklyResults(resultsState.results), [resultsState.results]);
  const weeklyAverageSuccess = useMemo(() => calculateAverageSuccess(weeklyResults), [weeklyResults]);
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
  const dashboardStats = useMemo(() => stats.map((stat) => {
    if (stat.label === "Bu Haftaki Çalışma") {
      return { ...stat, value: metricPlaceholder ?? weeklyResults.length.toLocaleString("tr-TR"), note: resultsLoading ? "Sonuçlar yükleniyor" : resultsError ? "Sonuçlar görüntülenemiyor" : stat.note };
    }
    if (stat.label === "Haftalık Başarı") {
      return { ...stat, value: metricPlaceholder ?? (weeklyAverageSuccess === null ? "—" : `%${weeklyAverageSuccess}`), note: resultsLoading ? "Sonuçlar yükleniyor" : resultsError ? "Sonuçlar görüntülenemiyor" : weeklyAverageSuccess === null ? "Puanlı çalışma bulunmuyor" : stat.note };
    }
    if (stat.label === "Günlük Seri") {
      return { ...stat, value: streakValue, note: streakNote };
    }
    return stat;
  }), [metricPlaceholder, resultsError, resultsLoading, streakNote, streakValue, weeklyAverageSuccess, weeklyResults.length]);
  const lastReadingTest = resultsState.readingTests[0];
  const resumeTarget = useMemo(() => resolveResumeTarget(dailyTaskState, resultsState), [dailyTaskState, resultsState]);

  return <main className={`${styles.preview} ${light ? styles.light : ""}`}><div className={styles.shell}><Sidebar onDemo={showToast} streakValue={streakValue} streakNote={streakNote}/><div className={styles.content}><div className={styles.mobileHeader}><Brand/><button type="button" aria-label="Menüyü aç" aria-expanded={panel === "menu"} onClick={() => togglePanel("menu")}><Icon name="menu"/></button><button type="button" aria-label="Bildirimler" aria-expanded={panel === "notifications"} onClick={() => togglePanel("notifications")}><Icon name="bell"/></button></div><Header light={light} panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onToggleTheme={() => setTheme(light ? "dark" : "light")} onTogglePanel={togglePanel}/><div className={styles.heroGrid}><Hero studentName={studentIdentity.name} resumeTarget={resumeTarget}/><LevelCard/></div><div className={styles.dashboardGrid}><div className={styles.mainColumn}><section className={styles.statsGrid} aria-label="İstatistikler">{dashboardStats.map((stat,index) => <StatCard key={stat.label} stat={stat} index={index}/>)}</section>{showReadingTestsStatistics && <ReadingTestsStatistics results={resultsState.results} status={resultsState.status}/>}<RecentResults results={recentResults} loading={resultsLoading} error={resultsError}/><section className={styles.categoriesSection}><div className={styles.sectionTitle}><div><h2>🚀 Egzersiz Kategorileri</h2><p>Göz, dikkat, okuma ve hafıza becerilerini geliştir.</p></div><Link href="/egzersizler">Tüm Egzersizler <Icon name="arrow"/></Link></div><div className={styles.categoryGrid}>{categories.map((category,index) => <CategoryCard key={category.title} category={category} index={index}/>)}</div></section></div><aside className={styles.rightColumn}><DailyTask taskState={dailyTaskState}/><ReadingTest test={lastReadingTest} loading={resultsLoading}/><Badges onDemo={showToast}/><section className={styles.motivation}><div><strong>Unutma!</strong><p>Her gün küçük adımlar,<br/>büyük gelişimler getirir.</p></div><span>🪐</span></section></aside></div></div></div><MobileNav onDemo={showToast} onProfile={() => togglePanel("profile")}/>{panel && <><button type="button" className={styles.panelBackdrop} aria-label="Açık paneli kapat" onClick={() => setPanel(null)}/>{panel === "menu" ? <MobileMenu onDemo={showToast} onClose={() => setPanel(null)}/> : <DemoPopover panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onDemo={showToast} onClose={() => setPanel(null)} onLogout={() => void handleLogout()} isLoggingOut={isLoggingOut}/>}</>}{logoutError && <div className={styles.logoutError} role="alert">{logoutError}</div>}{toast && <div className={styles.toast} role="status" aria-live="polite">{toast}</div>}</main>;
}
