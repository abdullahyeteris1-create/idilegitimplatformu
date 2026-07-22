"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { Icon } from "@/components/student-panel-preview/icons";
import type { AuthenticatedStudent, StudentResultApiItem } from "@/components/student-panel-preview/StudentPanelPreview";
import type { ExerciseResult } from "@/lib/results/types";
import {
  calculateActiveDayCount,
  calculateActivityHeatmap,
  calculateCategoryDistribution,
  calculateMonthlyProgress,
  calculateRecentDayMarkers,
  calculateStudyStreak,
  calculateTotalDurationSeconds,
  calculateTotalTestCount,
  filterNormalizedByPeriod,
  formatDurationLabel,
  normalizeGeneralResults,
  selectRecentTests,
  type HeatmapCell,
  type StatisticsPeriod,
} from "@/lib/results/generalStatistics";
import styles from "./istatistikler.module.css";

type ResultsState = {
  status: "loading" | "ready" | "error";
  results: ExerciseResult[];
};

type StatisticsPageClientProps = {
  authenticatedStudent: AuthenticatedStudent;
};

const PERIOD_OPTIONS: { id: StatisticsPeriod; label: string }[] = [
  { id: "7d", label: "Son 7 Gün" },
  { id: "30d", label: "Son 30 Gün" },
  { id: "90d", label: "Son 90 Gün" },
  { id: "all", label: "Tümü" },
];

const DISTRIBUTION_COLORS = ["#a78bfa", "#60a5fa", "#4ade80", "#fb923c", "#f472b6", "#22d3ee", "#facc15", "#f87171", "#94a3b8"];

const TURKISH_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TURKISH_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function formatDayKeyLong(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return `${day} ${TURKISH_MONTHS[month - 1]} ${year}`;
}

function formatDayKeyShort(dayKey: string): string {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${day} ${TURKISH_MONTHS_SHORT[month - 1]}`;
}

function heatmapLevelClass(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return styles.heatmapLevel1;
  if (count === 2) return styles.heatmapLevel2;
  if (count === 3) return styles.heatmapLevel3;
  return styles.heatmapLevel4;
}

function SummaryIcon({ name }: { name: "chart" | "clock" | "activity" | "flame" }) {
  return <Icon name={name} />;
}

export function StatisticsPageClient({ authenticatedStudent }: StatisticsPageClientProps) {
  const { theme } = useIdilTheme();
  const [resultsState, setResultsState] = useState<ResultsState>({ status: "loading", results: [] });
  const [period, setPeriod] = useState<StatisticsPeriod>("30d");
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{ dayKey: string; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadResults = async () => {
      setResultsState({ status: "loading", results: [] });
      try {
        const response = await fetch("/api/student/results", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: StudentResultApiItem[] };
        if (!response.ok || !Array.isArray(payload.results)) {
          throw new Error("Student results request failed");
        }

        const results = payload.results.map((result): ExerciseResult => {
          if (result.studentId !== authenticatedStudent.id) {
            throw new Error("Student result identity mismatch");
          }

          return {
            ...result,
            studentName: authenticatedStudent.name,
            username: authenticatedStudent.username ?? undefined,
          };
        });
        if (cancelled) return;
        setResultsState({ status: "ready", results });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setResultsState({ status: "error", results: [] });
        }
      }
    };

    void loadResults();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authenticatedStudent.id, authenticatedStudent.name, authenticatedStudent.username]);

  const normalizedAllTime = useMemo(() => normalizeGeneralResults(resultsState.results), [resultsState.results]);
  const normalizedPeriod = useMemo(() => filterNormalizedByPeriod(normalizedAllTime, period), [normalizedAllTime, period]);

  const totalTests = useMemo(() => calculateTotalTestCount(normalizedPeriod), [normalizedPeriod]);
  const totalDurationSeconds = useMemo(() => calculateTotalDurationSeconds(normalizedPeriod), [normalizedPeriod]);
  const activeDayCount = useMemo(() => calculateActiveDayCount(normalizedPeriod), [normalizedPeriod]);
  const studyStreak = useMemo(() => calculateStudyStreak(resultsState.results), [resultsState.results]);
  const streakMarkers = useMemo(() => calculateRecentDayMarkers(resultsState.results, 7), [resultsState.results]);
  const distribution = useMemo(() => calculateCategoryDistribution(normalizedPeriod), [normalizedPeriod]);
  const heatmapCells = useMemo(() => calculateActivityHeatmap(normalizedAllTime, 12), [normalizedAllTime]);
  const monthlyProgress = useMemo(() => calculateMonthlyProgress(normalizedPeriod, 6), [normalizedPeriod]);
  const recentTests = useMemo(() => selectRecentTests(normalizedPeriod, 10), [normalizedPeriod]);

  const heatmapWeeks = useMemo(() => {
    const weeks: HeatmapCell[][] = [];
    for (let i = 0; i < heatmapCells.length; i += 7) {
      weeks.push(heatmapCells.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapCells]);

  const isLoading = resultsState.status === "loading";
  const isError = resultsState.status === "error";
  const placeholder = isLoading || isError ? "—" : null;

  const maxMonthlyCount = Math.max(1, ...monthlyProgress.map((entry) => entry.count));
  const donutCircumference = 2 * Math.PI * 52;
  const donutSegments = useMemo(
    () =>
      distribution.map((entry, index) => {
        const segmentLength = (entry.percentage / 100) * donutCircumference;
        const offset = distribution
          .slice(0, index)
          .reduce((total, previous) => total + (previous.percentage / 100) * donutCircumference, 0);
        return { entry, index, segmentLength, offset };
      }),
    [distribution, donutCircumference],
  );

  return (
    <div className={`${styles.page} ${theme === "light" ? styles.light : ""}`}>
      <main className={styles.shell}>
        <Link href="/ogrenci" className={styles.backLink}>
          <Icon name="arrow" /> Öğrenci Paneline Dön
        </Link>

        <div className={styles.topBar}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon} aria-hidden="true">
              <Icon name="chart" />
            </span>
            <div className={styles.headerText}>
              <h1>İstatistikler</h1>
              <p>Çalışma geçmişinizi ve gelişiminizi inceleyin.</p>
            </div>
          </div>

          <div className={styles.periodGroup} role="group" aria-label="Dönem filtresi">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.periodButton} ${period === option.id ? styles.periodButtonActive : ""}`}
                aria-pressed={period === option.id}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isError && (
          <div className={styles.errorState} role="alert">
            <strong>İstatistikler şu anda yüklenemiyor.</strong>
            <p>Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingState} role="status" aria-label="İstatistikler yükleniyor">
            <div className={styles.summaryGrid}>
              <div className={styles.loadingRow} />
              <div className={styles.loadingRow} />
              <div className={styles.loadingRow} />
              <div className={styles.loadingRow} />
            </div>
          </div>
        ) : (
          <>
            <section className={styles.summaryGrid} aria-label="Genel özet">
              <article className={styles.summaryCard}>
                <div className={styles.summaryCardHead}>
                  <span>Toplam Test</span>
                  <SummaryIcon name="chart" />
                </div>
                <strong className={styles.summaryValue}>{placeholder ?? totalTests.toLocaleString("tr-TR")}</strong>
                <small className={styles.summaryNote}>Seçili dönemde tamamlanan çalışmalar</small>
              </article>

              <article className={styles.summaryCard}>
                <div className={styles.summaryCardHead}>
                  <span>Toplam Çalışma Süresi</span>
                  <SummaryIcon name="clock" />
                </div>
                <strong className={styles.summaryValue}>{placeholder ?? formatDurationLabel(totalDurationSeconds)}</strong>
                <small className={styles.summaryNote}>Geçerli, ölçülmüş sürelerin toplamı</small>
              </article>

              <article className={styles.summaryCard}>
                <div className={styles.summaryCardHead}>
                  <span>Aktif Gün Sayısı</span>
                  <SummaryIcon name="activity" />
                </div>
                <strong className={styles.summaryValue}>{placeholder ?? activeDayCount.toLocaleString("tr-TR")}</strong>
                <small className={styles.summaryNote}>Seçili dönemde en az bir çalışma yapılan gün</small>
              </article>

              <article className={styles.summaryCard}>
                <div className={styles.summaryCardHead}>
                  <span>Çalışma Serisi</span>
                  <SummaryIcon name="flame" />
                </div>
                <strong className={styles.summaryValue}>{placeholder ?? `${studyStreak} gün`}</strong>
                <small className={styles.summaryNote}>Gün üst üste</small>
                {!placeholder && streakMarkers.length > 0 && (
                  <div className={styles.streakMarkers} aria-hidden="true">
                    {streakMarkers.map((active, index) => (
                      <span key={index} className={active ? styles.streakMarkerActive : undefined} />
                    ))}
                  </div>
                )}
              </article>
            </section>

            <div className={styles.widgetsGrid}>
              <section className={styles.card} aria-labelledby="distribution-title">
                <div className={styles.cardHead}>
                  <div>
                    <h2 id="distribution-title">Egzersiz Dağılımı</h2>
                    <p>Kategoriye göre tamamlanan çalışma sayısı</p>
                  </div>
                  {totalTests > 0 && <span className={styles.cardBadge}>{totalTests} kayıt</span>}
                </div>

                {distribution.length === 0 ? (
                  <div className={styles.emptyState}>Seçili dönemde henüz çalışma bulunmuyor.</div>
                ) : (
                  <div className={styles.distributionBody}>
                    <svg
                      className={styles.distributionChart}
                      viewBox="0 0 120 120"
                      role="img"
                      aria-labelledby="distribution-chart-title distribution-chart-desc"
                    >
                      <title id="distribution-chart-title">Egzersiz dağılımı grafiği</title>
                      <desc id="distribution-chart-desc">
                        {distribution.map((entry) => `${entry.title}: yüzde ${entry.percentage}`).join(", ")}
                      </desc>
                      <g transform="rotate(-90 60 60)">
                        <circle className={styles.donutTrack} cx="60" cy="60" r="52" />
                        {donutSegments.map(({ entry, index, segmentLength, offset }) => (
                          <circle
                            key={entry.categoryId}
                            className={styles.donutSegment}
                            cx="60"
                            cy="60"
                            r="52"
                            stroke={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]}
                            strokeDasharray={`${segmentLength} ${donutCircumference - segmentLength}`}
                            strokeDashoffset={-offset}
                          />
                        ))}
                      </g>
                      <text className={styles.donutCenterValue} x="60" y="56" textAnchor="middle">
                        {totalTests}
                      </text>
                      <text className={styles.donutCenterLabel} x="60" y="72" textAnchor="middle">
                        çalışma
                      </text>
                    </svg>

                    <ul className={styles.distributionLegend}>
                      {distribution.map((entry, index) => (
                        <li key={entry.categoryId} className={styles.distributionRow}>
                          <span
                            className={styles.distributionSwatch}
                            style={{ background: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length] }}
                            aria-hidden="true"
                          />
                          <span className={styles.distributionLabel}>{entry.title}</span>
                          <span className={styles.distributionValue}>
                            {entry.count} · %{entry.percentage}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className={styles.card} aria-labelledby="monthly-title">
                <div className={styles.cardHead}>
                  <div>
                    <h2 id="monthly-title">Aylık Çalışma Gelişimi</h2>
                    <p>Aylara göre tamamladığınız çalışma sayısı</p>
                  </div>
                </div>

                {monthlyProgress.every((entry) => entry.count === 0) ? (
                  <div className={styles.emptyState}>Seçili dönemde aylık veri bulunmuyor.</div>
                ) : (
                  <svg
                    className={styles.monthlyChart}
                    viewBox="0 0 480 220"
                    role="img"
                    aria-labelledby="monthly-chart-title monthly-chart-desc"
                  >
                    <title id="monthly-chart-title">Aylık çalışma gelişimi grafiği</title>
                    <desc id="monthly-chart-desc">
                      {monthlyProgress.map((entry) => `${entry.label}: ${entry.count} çalışma`).join(", ")}
                    </desc>
                    {monthlyProgress.map((entry, index) => {
                      const columnWidth = 480 / monthlyProgress.length;
                      const barWidth = Math.min(46, columnWidth * 0.5);
                      const x = columnWidth * index + columnWidth / 2 - barWidth / 2;
                      const chartTop = 22;
                      const chartBottom = 176;
                      const chartHeight = chartBottom - chartTop;
                      const barHeight = entry.count > 0 ? Math.max(6, (entry.count / maxMonthlyCount) * chartHeight) : 2;
                      const y = chartBottom - barHeight;

                      return (
                        <g key={entry.monthKey}>
                          <rect
                            className={styles.monthlyBar}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="6"
                            opacity={entry.count > 0 ? 1 : 0.25}
                          />
                          <text className={styles.monthlyBarLabel} x={x + barWidth / 2} y={Math.max(14, y - 8)} textAnchor="middle">
                            {entry.count}
                          </text>
                          <text className={styles.monthlyAxisLabel} x={x + barWidth / 2} y={chartBottom + 18} textAnchor="middle">
                            {entry.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </section>
            </div>

            <section className={`${styles.card} ${styles.heatmapSection}`} aria-labelledby="heatmap-title">
              <div className={styles.cardHead}>
                <div>
                  <h2 id="heatmap-title">Günlük Çalışma Isı Haritası</h2>
                  <p>Son 12 hafta — dönem filtresinden bağımsız olarak her zaman gösterilir</p>
                </div>
              </div>

              {heatmapWeeks.length === 0 ? (
                <div className={styles.emptyState}>Henüz çalışma verisi bulunmuyor.</div>
              ) : (
                <>
                  <div className={styles.heatmapScroll}>
                    <div className={styles.heatmapOuter}>
                      <div className={styles.heatmapWeekdayCol} aria-hidden="true">
                        {WEEKDAY_LABELS.map((label) => (
                          <span key={label} className={styles.heatmapWeekdayLabel}>
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className={styles.heatmapWeeksRow}>
                        {heatmapWeeks.map((week, weekIndex) => {
                          const firstCell = week[0];
                          const previousWeek = heatmapWeeks[weekIndex - 1];
                          const monthChanged = !previousWeek || previousWeek[0].dayKey.slice(0, 7) !== firstCell.dayKey.slice(0, 7);
                          const monthLabel = monthChanged ? TURKISH_MONTHS_SHORT[Number(firstCell.dayKey.slice(5, 7)) - 1] : "";

                          return (
                            <div key={firstCell.dayKey} className={styles.heatmapWeekCol}>
                              <span className={styles.heatmapMonthLabel}>{monthLabel}</span>
                              {week.map((cell) => (
                                <button
                                  key={cell.dayKey}
                                  type="button"
                                  className={`${styles.heatmapCell} ${cell.isFuture ? "" : heatmapLevelClass(cell.count)}`}
                                  aria-label={`${formatDayKeyLong(cell.dayKey)}: ${cell.count} çalışma`}
                                  aria-pressed={selectedHeatmapDay?.dayKey === cell.dayKey}
                                  title={`${formatDayKeyShort(cell.dayKey)}: ${cell.count} çalışma`}
                                  disabled={cell.isFuture}
                                  onClick={() => setSelectedHeatmapDay({ dayKey: cell.dayKey, count: cell.count })}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.heatmapFooter}>
                    <div className={styles.heatmapLegend} aria-hidden="true">
                      <span>Az</span>
                      <span className={styles.heatmapLevel1} />
                      <span className={styles.heatmapLevel2} />
                      <span className={styles.heatmapLevel3} />
                      <span className={styles.heatmapLevel4} />
                      <span>Çok</span>
                    </div>
                    <div className={styles.heatmapDetail} aria-live="polite">
                      {selectedHeatmapDay
                        ? `${formatDayKeyLong(selectedHeatmapDay.dayKey)}: ${selectedHeatmapDay.count} çalışma`
                        : "Detay için bir güne tıklayın"}
                    </div>
                  </div>
                </>
              )}
            </section>

            <div className={styles.bottomGrid}>
              <section className={styles.card} aria-labelledby="recent-tests-title">
                <div className={styles.cardHead}>
                  <div>
                    <h2 id="recent-tests-title">Son 10 Test</h2>
                    <p>Seçili dönemdeki en yeni çalışmalarınız</p>
                  </div>
                </div>

                {recentTests.length === 0 ? (
                  <div className={styles.emptyState}>Seçili dönemde henüz tamamlanmış çalışma yok.</div>
                ) : (
                  <div className={styles.recentList}>
                    {recentTests.map((entry) => {
                      const content = (
                        <>
                          <div className={styles.recentInfo}>
                            <span className={styles.recentTitle}>{entry.title}</span>
                            <div className={styles.recentMeta}>
                              <span>{formatDayKeyShort(entry.dayKey)}</span>
                              <span>·</span>
                              <span>{entry.categoryTitle}</span>
                            </div>
                          </div>
                          <div className={styles.recentMetric}>
                            <span>{entry.metric.label}</span>
                            <strong>{entry.metric.value}</strong>
                          </div>
                        </>
                      );

                      return entry.href ? (
                        <Link key={entry.id} href={entry.href} className={styles.recentRow}>
                          {content}
                        </Link>
                      ) : (
                        <div key={entry.id} className={`${styles.recentRow} ${styles.recentRowStatic}`}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={styles.card} aria-labelledby="reading-link-title">
                <div className={styles.readingCard}>
                  <h2 id="reading-link-title">Okuma Testlerim</h2>
                  <p>Okuma hızı ve anlama testlerinizin ayrıntılı grafiklerini inceleyin.</p>
                  <Link href="/ogrenci/okuma-testlerim" className={styles.readingCardAction}>
                    Grafikleri Gör <Icon name="arrow" />
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
