"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import {
  createReadingTestStatistics,
  type NormalizedReadingTestResult,
} from "@/lib/results/readingTestStatistics";
import type { ExerciseResult } from "@/lib/results/types";
import styles from "./reading-tests-statistics.module.css";

type ReadingTestsStatisticsProps = {
  results: ExerciseResult[];
  status: "loading" | "ready" | "error";
  hideHeader?: boolean;
};

type ChartMetric = "wpm" | "success";

/** Liste ve iki grafiğin ortak kapsamı; tek state olarak tutulur. */
export type ReadingTestRange = 10 | 20 | "all";

const RANGE_OPTIONS: { value: ReadingTestRange; label: string }[] = [
  { value: 10, label: "Son 10 test" },
  { value: 20, label: "Son 20 test" },
  { value: "all", label: "Tüm testler" },
];

function rangeToLimit(range: ReadingTestRange): number {
  return range === "all" ? Number.POSITIVE_INFINITY : range;
}

/**
 * Grafik sabit 760px viewBox kullanıyor; nokta sayısı arttıkça değer etiketleri
 * üst üste biner. Bu eşiğin üstünde etiketler gizlenir, ölçümler okunur kalır.
 */
const VALUE_LABEL_LIMIT = 24;

/**
 * Y ekseni otomatik ölçeklenmez. Tek bir hatalı/aşırı ölçüm (ör. 76.400 WPM)
 * ekseni şişirip normal sonuçları dibe yapıştırdığı için her metriğin tavanı
 * sabittir; tavanı aşan değerler YALNIZCA çizimde kırpılır, gerçek değer
 * etikette ve tooltip'te olduğu gibi gösterilmeye devam eder.
 */
const METRIC_AXIS_MAXIMUM: Record<ChartMetric, number> = {
  wpm: 1000,
  success: 100,
};

const TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  weekday: "long",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
});

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("tr-TR");
}

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (!minutes) return `${remainingSeconds} sn`;
  return remainingSeconds ? `${minutes} dk ${remainingSeconds} sn` : `${minutes} dk`;
}

function capitalizeTurkish(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1) : value;
}

function formatRecordDate(record: NormalizedReadingTestResult) {
  if (!record.completedAt) {
    return { weekday: "Tarih bilgisi yok", date: "", time: "", short: "—" };
  }

  const date = new Date(record.completedAt);
  return {
    weekday: capitalizeTurkish(WEEKDAY_FORMATTER.format(date)),
    date: DATE_FORMATTER.format(date),
    time: TIME_FORMATTER.format(date),
    short: SHORT_DATE_FORMATTER.format(date),
  };
}

function getTestLabel(record: NormalizedReadingTestResult): string {
  return record.type === "reading-speed-test" ? "Okuma Hızı Testi" : "Anlama Testi";
}

function getPrimaryMetric(record: NormalizedReadingTestResult): string {
  if (record.type === "reading-speed-test") {
    return record.readingSpeedWpm === null
      ? "Hız bilgisi yok"
      : `${formatNumber(record.readingSpeedWpm)} kelime/dk`;
  }
  return record.successRate === null ? "Başarı bilgisi yok" : `%${formatNumber(record.successRate)} anlama`;
}

function SummaryCard({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: string }) {
  return (
    <article className={`${styles.summaryCard} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </article>
  );
}

function PerformanceChart({
  title,
  description,
  points,
  metric,
  selectedResultId,
  onSelect,
}: {
  title: string;
  description: string;
  points: NormalizedReadingTestResult[];
  metric: ChartMetric;
  selectedResultId: string | null;
  onSelect: (id: string) => void;
}) {
  const width = 760;
  const height = 300;
  const left = 62;
  const right = 20;
  const top = 30;
  const bottom = 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = METRIC_AXIS_MAXIMUM[metric];
  const metricLabel = metric === "wpm" ? "kelime/dk" : "%";
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(id);
  };

  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={styles.axisUnit}>{metricLabel}</span>
      </div>

      {points.length ? (
        <div className={styles.chartViewport}>
          <svg
            className={styles.chart}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-labelledby={`${metric}-chart-title ${metric}-chart-desc`}
          >
            <title id={`${metric}-chart-title`}>{title}</title>
            <desc id={`${metric}-chart-desc`}>{description}. Her işaret tek bir gerçek test ölçümüdür.</desc>

            {gridLines.map((ratio) => {
              const y = top + chartHeight - ratio * chartHeight;
              return (
                <g key={ratio} className={styles.gridLine}>
                  <line x1={left} x2={width - right} y1={y} y2={y} />
                  <text x={left - 12} y={y + 4} textAnchor="end">
                    {formatNumber(maximum * ratio)}
                  </text>
                </g>
              );
            })}

            {points.map((point, index) => {
              // Gerçek ölçüm etiket ve tooltip'te; çizim yüksekliği sabit eksene kırpılır.
              const realValue = metric === "wpm" ? point.readingSpeedWpm ?? 0 : point.successRate ?? 0;
              const displayValue = Math.min(Math.max(realValue, 0), maximum);
              const clamped = realValue > maximum;
              const x = points.length === 1
                ? left + chartWidth / 2
                : left + (index / (points.length - 1)) * chartWidth;
              const y = top + chartHeight - (displayValue / maximum) * chartHeight;
              const selected = point.id === selectedResultId;
              const date = formatRecordDate(point);
              const markerTone = point.type === "reading-speed-test" ? styles.speedMarker : styles.comprehensionMarker;
              const ariaLabel = `${getTestLabel(point)}, ${date.date || "tarih bilgisi yok"}, ${formatNumber(realValue)} ${metricLabel}${clamped ? ` (grafik ölçeği ${formatNumber(maximum)} ile sınırlı)` : ""}`;

              return (
                <g
                  key={point.id}
                  className={`${styles.marker} ${markerTone} ${selected ? styles.selectedMarker : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaLabel}
                  aria-pressed={selected}
                  onClick={() => onSelect(point.id)}
                  onKeyDown={(event) => handleKeyDown(event, point.id)}
                >
                  <title>{ariaLabel}</title>
                  <rect className={styles.hitArea} x={x - 24} y={top} width={48} height={chartHeight + 40} />
                  <line className={styles.markerStem} x1={x} x2={x} y1={top + chartHeight} y2={y} />
                  <line className={styles.markerBody} x1={x} x2={x} y1={Math.max(top, y - 8)} y2={Math.min(top + chartHeight, y + 8)} />
                  {selected && <circle className={styles.markerRing} cx={x} cy={y} r={13} />}
                  <circle className={styles.markerDot} cx={x} cy={y} r={6} />
                  {(points.length <= VALUE_LABEL_LIMIT || selected) && (
                    <text className={styles.pointValue} x={x} y={Math.max(18, y - 18)} textAnchor="middle">
                      {formatNumber(realValue)}
                    </text>
                  )}
                  {(points.length <= VALUE_LABEL_LIMIT || selected) && (
                    <text className={styles.pointLabel} x={x} y={height - 20} textAnchor="middle">
                      {points.length > 6 ? index + 1 : date.short}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className={styles.chartEmpty}>Bu grafik için henüz geçerli ölçüm bulunmuyor.</div>
      )}

      <div className={styles.legend} aria-label="Grafik göstergeleri">
        {metric === "wpm" && <span><i className={styles.speedLegend} />Okuma Hızı Testi</span>}
        {metric === "wpm" && points.some((point) => point.type === "reading-comprehension") && (
          <span><i className={styles.comprehensionLegend} />Anlama Testindeki gerçek WPM</span>
        )}
        {metric === "success" && <span><i className={styles.comprehensionLegend} />Anlama başarısı</span>}
      </div>
      <p className={styles.chartNote}>Her işaret tek bir test ölçümünü gösterir; finansal aralık verisi değildir.</p>
    </article>
  );
}

function RecordList({
  records,
  rangeDescription,
  selectedResultId,
  onSelect,
}: {
  records: NormalizedReadingTestResult[];
  rangeDescription: string;
  selectedResultId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <article className={styles.recordPanel}>
      <div className={styles.panelHeading}>
        <div><h3>Test Geçmişi</h3><p>{rangeDescription}</p></div>
        <span>{records.length}</span>
      </div>
      <div className={styles.recordList}>
        {records.map((record) => {
          const date = formatRecordDate(record);
          const selected = record.id === selectedResultId;
          return (
            <button
              type="button"
              key={record.id}
              className={`${styles.recordButton} ${selected ? styles.selectedRecord : ""}`}
              aria-pressed={selected}
              onClick={() => onSelect(record.id)}
            >
              <span className={styles.recordDate}>
                <strong>{date.weekday}</strong>
                {date.date && <small>{date.date} · {date.time}</small>}
              </span>
              <span className={styles.recordIdentity}>
                <strong>{getTestLabel(record)}</strong>
                <small>{record.title || "Metin bilgisi yok"}</small>
                {record.type === "reading-comprehension" && record.readingSpeedWpm !== null && (
                  <em>{formatNumber(record.readingSpeedWpm)} kelime/dk</em>
                )}
              </span>
              <span className={styles.recordMetric}>{getPrimaryMetric(record)}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div className={styles.detailItem}><dt>{label}</dt><dd>{value}</dd></div>;
}

function SelectedRecordDetails({ record }: { record: NormalizedReadingTestResult }) {
  const date = formatRecordDate(record);
  const fullDate = record.completedAt ? `${date.date}, ${date.time}` : "Tarih bilgisi yok";
  const speedDetails = record.type === "reading-speed-test";

  return (
    <article className={styles.detailPanel} aria-live="polite">
      <div className={styles.detailTopline}>
        <span>{getTestLabel(record)}</span>
        <small>Seçili kayıt</small>
      </div>
      <h3>{record.title || "Metin bilgisi yok"}</h3>
      <p className={styles.detailDate}>{fullDate}</p>
      <dl className={styles.detailGrid}>
        {speedDetails ? (
          <>
            <DetailItem label="Okuma hızı" value={record.readingSpeedWpm === null ? "Bilgi yok" : `${formatNumber(record.readingSpeedWpm)} kelime/dk`} />
            <DetailItem label="Süre" value={record.durationSeconds === null ? "Bilgi yok" : formatDuration(record.durationSeconds)} />
            <DetailItem label="Kelime sayısı" value={record.wordCount === null ? null : formatNumber(record.wordCount)} />
            <DetailItem label="Kategori" value={record.category} />
            <DetailItem label="Okuma seviyesi" value={record.readingLevel} />
            <DetailItem label="Duraklatma" value={record.pausedCount === null ? null : `${formatNumber(record.pausedCount)} kez`} />
            <DetailItem label="Duraklatma süresi" value={record.totalPausedSeconds === null ? null : formatDuration(record.totalPausedSeconds)} />
          </>
        ) : (
          <>
            <DetailItem label="Anlama başarısı" value={record.successRate === null ? "Bilgi yok" : `%${formatNumber(record.successRate)}`} />
            <DetailItem label="Doğru" value={record.correctCount === null ? "Bilgi yok" : formatNumber(record.correctCount)} />
            <DetailItem label="Yanlış" value={record.wrongCount === null ? "Bilgi yok" : formatNumber(record.wrongCount)} />
            <DetailItem label="Boş" value={record.emptyCount === null ? null : formatNumber(record.emptyCount)} />
            <DetailItem label="Soru sayısı" value={record.questionCount === null ? null : formatNumber(record.questionCount)} />
            <DetailItem label="Okuma süresi" value={record.durationSeconds === null ? "Bilgi yok" : formatDuration(record.durationSeconds)} />
            <DetailItem label="Okuma hızı" value={record.readingSpeedWpm === null ? null : `${formatNumber(record.readingSpeedWpm)} kelime/dk`} />
            <DetailItem label="Kelime sayısı" value={record.wordCount === null ? null : formatNumber(record.wordCount)} />
            <DetailItem label="Kategori" value={record.category} />
          </>
        )}
      </dl>
    </article>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState} role="status" aria-label="Okuma testi istatistikleri yükleniyor">
      <span /><span /><span /><span />
    </div>
  );
}

export function ReadingTestsStatistics({ results, status, hideHeader = false }: ReadingTestsStatisticsProps) {
  const { theme } = useIdilTheme();
  // Tek ortak kapsam state'i: liste ve iki grafik aynı diziden türediği için
  // bu değer üçünü birden kontrol eder.
  const [range, setRange] = useState<ReadingTestRange>(10);
  const statistics = useMemo(
    () => createReadingTestStatistics(results, rangeToLimit(range)),
    [results, range],
  );
  const shownCount = statistics.recordsNewestFirst.length;
  const rangeDescription = range === "all"
    ? `Tüm okuma testleri (${shownCount})`
    : `Son ${shownCount} okuma testi`;
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const selectedRecord = statistics.recordsNewestFirst.find((record) => record.id === selectedResultId)
    ?? statistics.recordsNewestFirst[0]
    ?? null;
  const effectiveSelectedId = selectedRecord?.id ?? null;
  const themeClass = theme === "light" ? styles.lightTheme : styles.darkTheme;

  return (
    <section
      className={`${styles.root} ${themeClass}`}
      aria-labelledby={hideHeader ? undefined : "reading-tests-statistics-title"}
      aria-label={hideHeader ? "Okuma testleri istatistikleri" : undefined}
    >
      {!hideHeader && (
        <header className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>KİŞİSEL GELİŞİM</span>
            <h2 id="reading-tests-statistics-title">Okuma Testleri İstatistikleri</h2>
            <p>Okuma hızınızı ve anlama testlerindeki gelişiminizi tarih sırasına göre takip edin.</p>
          </div>
          {status === "ready" && statistics.summary.totalTests > 0 && (
            <span className={styles.resultCount}>{statistics.summary.totalTests} kayıt</span>
          )}
        </header>
      )}

      {status === "loading" && <LoadingState />}

      {status === "error" && (
        <div className={styles.messageState} role="alert">
          <strong>İstatistikler şu anda yüklenemiyor.</strong>
          <p>Panelin diğer bölümlerini kullanmaya devam edebilirsiniz.</p>
        </div>
      )}

      {status === "ready" && statistics.summary.totalTests === 0 && (
        <div className={styles.emptyState}>
          <span aria-hidden="true">📖</span>
          <h3>Henüz okuma testi sonucunuz bulunmuyor.</h3>
          <p>İlk ölçümünüzü tamamladıktan sonra gelişiminiz burada görünecek.</p>
          <div>
            <Link href="/egzersizler/okuma-hizi-testi">Okuma Hızı Testine Başla</Link>
            <Link href="/egzersizler/anlama-testi">Anlama Testine Başla</Link>
          </div>
        </div>
      )}

      {status === "ready" && statistics.summary.totalTests > 0 && (
        <>
          <div className={styles.summaryGrid}>
            <SummaryCard
              label="Son Okuma Hızı"
              value={statistics.summary.latestSpeedWpm === null ? "Henüz ölçülmedi" : formatNumber(statistics.summary.latestSpeedWpm)}
              unit={statistics.summary.latestSpeedWpm === null ? undefined : "kelime/dk"}
              tone="purpleTone"
            />
            <SummaryCard
              label="En Yüksek Okuma Hızı"
              value={statistics.summary.highestSpeedWpm === null ? "Henüz ölçülmedi" : formatNumber(statistics.summary.highestSpeedWpm)}
              unit={statistics.summary.highestSpeedWpm === null ? undefined : "kelime/dk"}
              tone="blueTone"
            />
            <SummaryCard
              label="Son Anlama Başarısı"
              value={statistics.summary.latestComprehensionRate === null ? "Test bulunamadı" : `%${formatNumber(statistics.summary.latestComprehensionRate)}`}
              tone="greenTone"
            />
            <SummaryCard
              label="Toplam Okuma Testi"
              value={formatNumber(statistics.summary.totalTests)}
              unit="tamamlanan test"
              tone="orangeTone"
            />
          </div>

          <div className={styles.rangeFilter}>
            <span id="reading-test-range-label">Gösterilen aralık</span>
            <div className={styles.rangeOptions} role="radiogroup" aria-labelledby="reading-test-range-label">
              {RANGE_OPTIONS.map((option) => {
                const active = option.value === range;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={styles.rangeOption}
                    data-active={active ? "true" : undefined}
                    onClick={() => setRange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <small aria-live="polite">
              {statistics.summary.totalTests} testin {shownCount} tanesi gösteriliyor
            </small>
          </div>

          <div className={styles.chartsGrid}>
            <PerformanceChart
              title="Okuma Hızı Gelişimi"
              description="Gerçek WPM ölçümleriniz"
              points={statistics.speedPoints}
              metric="wpm"
              selectedResultId={effectiveSelectedId}
              onSelect={setSelectedResultId}
            />
            <PerformanceChart
              title="Anlama Başarısı Gelişimi"
              description="Anlama testlerindeki başarı oranınız"
              points={statistics.comprehensionPoints}
              metric="success"
              selectedResultId={effectiveSelectedId}
              onSelect={setSelectedResultId}
            />
          </div>

          <div className={styles.historyGrid}>
            <RecordList
              records={statistics.recordsNewestFirst}
              rangeDescription={rangeDescription}
              selectedResultId={effectiveSelectedId}
              onSelect={setSelectedResultId}
            />
            {selectedRecord && <SelectedRecordDetails record={selectedRecord} />}
          </div>
        </>
      )}
    </section>
  );
}
