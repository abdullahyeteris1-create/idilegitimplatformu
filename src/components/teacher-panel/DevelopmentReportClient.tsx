"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import html2pdf from "html2pdf.js";
import type { DevelopmentReport, DevelopmentReportDailyAverage, DevelopmentReportLesson, DevelopmentMetric } from "@/lib/reports/developmentReportTypes";
import { calculateDailyDevelopmentAverages } from "@/lib/reports/developmentReportCalculations";
import styles from "./development-report.module.css";

const RECOMMENDATIONS = [
  "Düzenli kısa okuma tekrarları yapın.",
  "Okuma hızını artırırken anlama oranını korumaya odaklanın.",
  "Ders öncesi kısa odaklanma egzersizleri uygulayın.",
  "Her ders sonunda metinle ilgili kısa bir özet çıkarın.",
  "Haftalık gelişimi aynı saatlerde ölçerek karşılaştırın.",
  "Zor metinlerde hız yerine doğru anlamayı önceliklendirin.",
  "Ders aralarında yeterli dinlenme süresi bırakın.",
  "Öğretmen geri bildirimlerini bir sonraki derste hedefe dönüştürün.",
];

function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function signed(value: number | null, suffix = "%", decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${decimals ? value.toFixed(decimals) : Math.round(value)}${suffix}`;
}

function valueOrDash(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const maximumFractionDigits = decimals === 1 ? 2 : decimals;
  const minimumFractionDigits = decimals === 1 ? (Number.isInteger(value) ? 1 : 0) : decimals;
  return value.toLocaleString("tr-TR", { minimumFractionDigits, maximumFractionDigits });
}

function formatMetricValue(value: number | null, field: ChartField): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (field === "focusScore") {
    const normalized = value / 10;
    return normalized % 1 === 0 ? normalized.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : normalized.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  }
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function formatShortDate(dateKey: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(new Date(`${dateKey}T12:00:00`));
}

function fileSafeName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "ogrenci";
}

function reportNumber(report: DevelopmentReport): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(report.reportDate)).replace(/-/g, "");
  return `GR-${day}-${String(report.lessons.length).padStart(3, "0")}`;
}

type ChartField = "wordsPerMinute" | "comprehensionScore" | "focusScore";
type ChartTone = "blue" | "green" | "purple";

const CHART_COLORS: Record<ChartTone, { line: string; fill: string }> = {
  blue: { line: "#2563eb", fill: "rgba(37,99,235,0.12)" },
  green: { line: "#059669", fill: "rgba(5,150,105,0.12)" },
  purple: { line: "#7c3aed", fill: "rgba(124,58,237,0.12)" },
};

function getLabelIndexes(length: number): Set<number> {
  if (length <= 6) return new Set(Array.from({ length }, (_, index) => index));
  const indexes = new Set<number>([0, length - 1]);
  const step = length <= 10 ? 2 : Math.ceil((length - 1) / 4);
  for (let index = step; index < length - 1; index += step) indexes.add(index);
  return indexes;
}

function getSpeedScale(days: DevelopmentReportDailyAverage[]): number {
  const values = days.map((day) => day.wordsPerMinute).filter((value): value is number => value !== null && Number.isFinite(value));
  const highest = Math.max(...values, 0);
  return Math.max(100, Math.ceil((highest * 1.15) / 25) * 25);
}

function metricDisplay(metric: DevelopmentMetric, field: ChartField): { first: string; last: string; delta: string; percent: string } {
  const decimals = field === "focusScore" ? 1 : 0;
  const scale = field === "focusScore" ? 0.1 : 1;
  const suffix = field === "wordsPerMinute" ? " kelime/dk" : field === "focusScore" ? " puan" : " puan";
  return {
    first: metric.first === null ? "—" : `${formatMetricValue(metric.first, field)}${field === "focusScore" ? "/10" : field === "wordsPerMinute" ? "" : "%"}`,
    last: metric.last === null ? "—" : `${formatMetricValue(metric.last, field)}${field === "focusScore" ? "/10" : field === "wordsPerMinute" ? "" : "%"}`,
    delta: signed(metric.delta === null ? null : metric.delta * scale, suffix, decimals),
    percent: signed(metric.percent),
  };
}

function profileMetricValue(value: number | null, field: ChartField): string {
  if (value === null) return "—";
  const formatted = formatMetricValue(value, field);
  if (field === "wordsPerMinute") return `${formatted} kelime/dk`;
  if (field === "comprehensionScore") return `%${formatted}`;
  return `${formatted}/10`;
}

function Chart({ title, lessons, field, suffix, tone, speedScale }: { title: string; lessons: DevelopmentReportLesson[]; field: ChartField; suffix: string; tone: ChartTone; speedScale: number }) {
  const days = calculateDailyDevelopmentAverages(lessons);
  const points = days
    .map((day, index) => ({ day, index, value: day[field] === null ? null : field === "focusScore" ? day[field] / 10 : day[field] }))
    .filter((item): item is { day: DevelopmentReportDailyAverage; index: number; value: number } => item.value !== null && Number.isFinite(item.value));
  const width = 720;
  const height = 245;
  const padX = 34;
  const padY = 30;
  const max = field === "comprehensionScore" ? 100 : field === "focusScore" ? 10 : speedScale;
  const x = (index: number) => points.length <= 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
  const y = (value: number) => height - padY - (value / Math.max(1, max)) * (height - padY * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`).join(" ");
  const baseline = height - padY;
  const areaPath = points.length > 1 ? `${path} L ${x(points.length - 1)} ${baseline} L ${x(0)} ${baseline} Z` : "";
  const labelIndexes = getLabelIndexes(points.length);
  const colors = CHART_COLORS[tone];
  const ticks = field === "comprehensionScore" ? [0, 25, 50, 75, 100] : field === "focusScore" ? [0, 2.5, 5, 7.5, 10] : [0, Math.round(speedScale / 4), Math.round(speedScale / 2), Math.round((speedScale * 3) / 4), speedScale];

  const first = points[0]?.value ?? null;
  const last = points.at(-1)?.value ?? null;
  return <section className={styles.chartCard} aria-label={`${title} gelişim grafiği`}>
    <div className={styles.chartHeading}><div><h3>{title}</h3><small>{field === "wordsPerMinute" ? "kelime/dk" : field === "comprehensionScore" ? "%" : "/10"}</small></div><div className={styles.chartCurrent}><strong>{formatMetricValue(last === null ? null : field === "focusScore" ? last * 10 : last, field)}</strong><span className={`${styles.toneDot} ${styles[`tone${tone}`]}`} /></div></div>
    <div className={styles.chartSummary}>{formatMetricValue(first === null ? null : field === "focusScore" ? first * 10 : first, field)} <span>→</span> {formatMetricValue(last === null ? null : field === "focusScore" ? last * 10 : last, field)}</div>
    {points.length < 2 ? <p className={styles.muted}>Grafik için yeterli geçerli veri yok.</p> : <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className={styles.chartSvg}>
      {ticks.map((tick) => <g key={tick}><line x1={padX} y1={y(tick)} x2={width - padX} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />{field !== "wordsPerMinute" ? <text className={styles.axisLabel} x={width - padX + 5} y={y(tick) + 4}>{field === "focusScore" ? tick : `${tick}%`}</text> : null}</g>)}
      <path d={areaPath} fill={colors.fill} stroke="none" /><path d={path} fill="none" stroke={colors.line} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => <g key={point.day.dateKey}><circle cx={x(index)} cy={y(point.value)} r={index === 0 || index === points.length - 1 ? "7" : "3"} fill={index === 0 || index === points.length - 1 ? "white" : colors.line} stroke={colors.line} strokeWidth="2" />{labelIndexes.has(index) && (index === 0 || index === points.length - 1) ? <text className={styles.dataLabel} x={x(index)} y={Math.max(15, y(point.value) - 11)} textAnchor="middle">{formatMetricValue(field === "focusScore" ? point.value * 10 : point.value, field)}</text> : null}{labelIndexes.has(index) ? <text x={x(index)} y={height - 8} textAnchor="middle">{formatShortDate(point.day.dateKey)}</text> : null}<title>{`${point.day.dateKey}: ${formatMetricValue(field === "focusScore" ? point.value * 10 : point.value, field)}${suffix} · ${point.day.lessonCount} ölçüm`}</title></g>)}
    </svg>}
  </section>;
}

function MiniSparkline({ days, field, tone }: { days: DevelopmentReportDailyAverage[]; field: ChartField; tone: ChartTone }) {
  const values = days.map((day) => day[field] === null ? null : field === "focusScore" ? day[field] / 10 : day[field]).filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length < 2) return null;
  const max = field === "comprehensionScore" ? 100 : field === "focusScore" ? 10 : Math.max(...values, 1);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${(index / (values.length - 1)) * 92 + 4},${27 - (value / max) * 21}`).join(" ");
  return <svg className={`${styles.sparkline} ${styles[`tone${tone}`]}`} viewBox="0 0 100 32" aria-hidden="true"><path d={path} /></svg>;
}

function MetricCard({ title, metric, days, field, tone }: { title: string; metric: DevelopmentMetric; days: DevelopmentReportDailyAverage[]; field: ChartField; tone: ChartTone }) {
  const display = metricDisplay(metric, field);
  return <article aria-label={`${title} KPI`} className={`${styles.metricCard} ${styles[`metric${tone}`]}`}><div className={styles.metricIcon} aria-hidden="true">{tone === "blue" ? "↗" : tone === "green" ? "◎" : "✦"}</div><div className={styles.metricMain}><p>{title}</p><div className={styles.metricValues}><strong>{display.first}</strong><span aria-hidden="true">→</span><strong>{display.last}</strong></div><small>İlk gün ort.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Son gün ort.</small><div className={styles.metricDelta}>{display.delta}</div><em>{display.percent} gelişim</em></div><MiniSparkline days={days} field={field} tone={tone} /></article>;
}

function ProfileBar({ label, metric, field, max, tone }: { label: string; metric: DevelopmentMetric; field: ChartField; max: number; tone: ChartTone }) {
  const value = field === "focusScore" && metric.last !== null ? metric.last / 10 : metric.last;
  const first = field === "focusScore" && metric.first !== null ? metric.first / 10 : metric.first;
  const display = metricDisplay(metric, field);
  const current = value === null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const marker = first === null ? null : Math.min(100, Math.max(0, (first / max) * 100));
  return <div className={styles.profileRow} role="group" aria-label={`${label} performans karşılaştırması`}><div className={styles.profileLabel}><span className={`${styles.profileIcon} ${styles[`tone${tone}`]}`} aria-hidden="true">{tone === "blue" ? "◌" : tone === "green" ? "◎" : "✦"}</span><strong>{label}</strong><small>{metric.last === null ? "Son ölçüm yok" : `Son ölçüm: ${profileMetricValue(metric.last, field)}`}</small></div><div className={styles.profileScale}><div className={styles.track}><i className={styles[`track${tone}`]} style={{ width: `${current}%` }} />{marker !== null ? <b style={{ left: `${marker}%` }} aria-label={`Başlangıç: ${profileMetricValue(metric.first, field)}`} /> : null}</div><div className={styles.scaleLabels}><span>0</span><span>{valueOrDash(max / 4, field === "focusScore" ? 1 : field === "wordsPerMinute" ? 1 : 0)}</span><span>{valueOrDash(max / 2, field === "focusScore" ? 1 : field === "wordsPerMinute" ? 1 : 0)}</span><span>{valueOrDash((max * 3) / 4, field === "focusScore" ? 1 : field === "wordsPerMinute" ? 1 : 0)}</span><span>{valueOrDash(max, field === "focusScore" ? 1 : field === "wordsPerMinute" ? 1 : 0)}</span></div></div><div className={styles.profileChange}>{display.delta}<small>{display.first === "—" ? "" : `Başlangıç: ${profileMetricValue(metric.first, field)}`}</small><em>{display.percent} gelişim</em></div></div>;
}

export default function DevelopmentReportClient({ report }: { report: DevelopmentReport }) {
  const reportRef = useRef<HTMLElement>(null);
  const [comment, setComment] = useState("");
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [customRecommendation, setCustomRecommendation] = useState("");
  const [isPdfPreparing, setIsPdfPreparing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const speedScale = useMemo(() => getSpeedScale(report.dailyAverages), [report.dailyAverages]);
  const latestTeacherNote = [...report.lessons].reverse().find((lesson) => lesson.teacherNote.trim())?.teacherNote.trim() ?? "";
  const summary = `Günlük ortalama okuma hızı ${report.metrics.speed.percent === null ? "takip edilmiş" : `${signed(report.metrics.speed.percent)} artarken`}, anlama ortalaması ${formatMetricValue(report.metrics.comprehension.first, "comprehensionScore")}% seviyesinden ${formatMetricValue(report.metrics.comprehension.last, "comprehensionScore")}% seviyesine, odaklanma ortalaması ise ${formatMetricValue(report.metrics.focus.first, "focusScore")}/10'dan ${formatMetricValue(report.metrics.focus.last, "focusScore")}/10 seviyesine yükselmiştir.`;
  const toggleRecommendation = (value: string) => setSelectedRecommendations((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length >= 5 ? current : [...current, value]);
  const addCustomRecommendation = () => { const value = customRecommendation.trim(); if (value && selectedRecommendations.length < 5) setSelectedRecommendations((current) => [...current, value]); setCustomRecommendation(""); };

  const downloadPdf = async () => {
    if (!reportRef.current || isPdfPreparing) return;
    setIsPdfPreparing(true); setPdfError("");
    const clone = reportRef.current.cloneNode(true) as HTMLElement;
    const printControls = clone.querySelectorAll<HTMLElement>(".noPrint");
    printControls.forEach((element) => element.remove());
    clone.querySelectorAll<HTMLElement>(".printOnly").forEach((element) => { element.style.display = "block"; });
    clone.classList.add(styles.pdfMode); clone.style.width = "794px"; clone.style.maxWidth = "794px"; clone.style.minWidth = "0"; clone.style.boxSizing = "border-box"; clone.style.margin = "0"; clone.style.boxShadow = "none"; clone.style.background = "white"; clone.style.padding = "0";
    const host = document.createElement("div"); host.setAttribute("aria-hidden", "true"); host.style.position = "fixed"; host.style.left = "-100000px"; host.style.top = "0"; host.style.width = "794px"; host.style.maxWidth = "794px"; host.style.overflow = "hidden"; host.style.background = "white"; host.appendChild(clone); document.body.appendChild(host);
    try { await html2pdf().set({ margin: [8, 8, 8, 8], filename: `${fileSafeName(report.student.name)}-gelisim-raporu.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(clone).save(); } catch { setPdfError("PDF hazırlanırken bir hata oluştu. Lütfen tekrar deneyin."); } finally { host.remove(); setIsPdfPreparing(false); }
  };

  return <main className={styles.page}><div className={`${styles.toolbar} noPrint`}><a href="/ogretmen/idil-panel/ders-kayitlari">← Ders Kayıtları</a><div className={styles.toolbarActions}><button type="button" onClick={() => window.print()}>Yazdır / PDF Olarak Kaydet</button><button type="button" onClick={downloadPdf} disabled={isPdfPreparing}>{isPdfPreparing ? "PDF hazırlanıyor" : "↓ PDF İndir"}</button></div></div>{pdfError ? <p role="alert" className={`${styles.pdfError} noPrint`}>{pdfError}</p> : null}
    <article ref={reportRef} className={styles.report}><div className={styles.reportPageOne}>
      <header className={styles.brand}><div className={styles.logoMark}><Image src="/logo-idil.png" alt="İdil Hızlı Okuma" width={104} height={57} priority unoptimized /></div><div className={styles.brandTitle}><p>HIZLI OKUMA</p><h1>GELİŞİM RAPORU</h1><span>Daha hızlı oku, daha fazlasını anla!</span></div><div className={styles.reportDate}><span>RAPOR TARİHİ</span><strong>{date(report.reportDate)}</strong></div></header>
      <section className={styles.studentBox}><div><span><b>ÖĞRENCİ</b><strong>{report.student.name}</strong></span><span><b>EĞİTİM BAŞLANGIÇ</b><strong>{date(report.student.educationStartDate)}</strong></span><span><b>EĞİTİM BİTİŞ</b><strong>{date(report.student.accessEndDate)}</strong></span><span><b>TOPLAM DERS</b><strong>{report.lessons.length}</strong></span><span><b>PROGRAM</b><strong>Hızlı Okuma</strong></span></div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>GENEL SONUÇ</h2></div><div className={styles.metricGrid}><MetricCard title="OKUMA HIZI" metric={report.metrics.speed} days={report.dailyAverages} field="wordsPerMinute" tone="blue" /><MetricCard title="ANLAMA ORANI" metric={report.metrics.comprehension} days={report.dailyAverages} field="comprehensionScore" tone="green" /><MetricCard title="ODAKLANMA" metric={report.metrics.focus} days={report.dailyAverages} field="focusScore" tone="purple" /></div></section>
      <section className={styles.successBanner}><span aria-hidden="true">✦</span><div><strong>Güçlü bir ilerleme kaydedildi.</strong><p>Gerçek ders verilerine göre gelişim alanların burada özetleniyor.</p></div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>PERFORMANS PROFİLİ</h2><small>Mevcut performans ve gelişim</small></div><div className={styles.profileCard}><ProfileBar label="Okuma Hızı" metric={report.metrics.speed} field="wordsPerMinute" max={speedScale} tone="blue" /><ProfileBar label="Okuduğunu Anlama" metric={report.metrics.comprehension} field="comprehensionScore" max={100} tone="green" /><ProfileBar label="Odaklanma" metric={report.metrics.focus} field="focusScore" max={10} tone="purple" /></div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>GELİŞİM EĞRİLERİ</h2><div className={styles.legend}><span className={styles.legendBlue}>● Okuma Hızı</span><span className={styles.legendGreen}>● Anlama</span><span className={styles.legendPurple}>● Odaklanma</span></div></div><div className={styles.chartGrid}><Chart title="Okuma Hızı" lessons={report.lessons} field="wordsPerMinute" suffix=" kelime/dk" tone="blue" speedScale={speedScale} /><Chart title="Anlama Oranı" lessons={report.lessons} field="comprehensionScore" suffix="%" tone="green" speedScale={speedScale} /><Chart title="Odaklanma" lessons={report.lessons} field="focusScore" suffix="/10" tone="purple" speedScale={speedScale} /></div></section>
      <section className={styles.assessmentCard}><div className={styles.assessmentIcon}>★</div><div><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>GENEL DEĞERLENDİRME</h2><span className={styles.srOnly}>Genel Gelişim Özeti</span></div><p>{summary}</p></div></section>
      <footer className={styles.footer}><strong>İDİL EĞİTİM</strong><span>Daha hızlı oku, daha fazlasını anla!</span><span>Rapor No: {reportNumber(report)}</span><span>Sayfa 1 / 2</span></footer>
      </div><div className={styles.reportPageTwo}>
      <section className={`${styles.section} ${styles.lessonSection}`}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>DERS DETAYLARI</h2><small>{report.lessons.length} kayıt</small></div><div className={styles.tableWrap}><table><thead><tr><th>Ders</th><th>Tarih</th><th>Okuma Hızı<br />(kelime/dk)</th><th>Anlama Oranı<br />(%)</th><th>Odaklanma<br />(/10)</th></tr></thead><tbody>{report.lessons.map((lesson, index) => <tr key={lesson.id} className={index === report.lessons.length - 1 ? styles.latestRow : undefined}><td><b className={styles.lessonNumber}>{lesson.lessonNo}</b></td><td>{date(lesson.lessonDate)}</td><td>{lesson.wordsPerMinute === null ? "—" : lesson.wordsPerMinute}</td><td>{lesson.comprehensionScore === null ? "—" : `%${lesson.comprehensionScore}`}</td><td>{lesson.focusScore === null ? "—" : `${(lesson.focusScore / 10).toFixed(1)}`}</td></tr>)}</tbody></table></div></section>
      <div className={styles.detailGrid}><section className={styles.detailCard}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>ÖĞRETMEN DEĞERLENDİRMESİ</h2></div><p className={styles.comment}>{comment.trim() || latestTeacherNote || "Bu rapor için henüz öğretmen değerlendirmesi eklenmedi."}</p></section><section className={styles.detailCard}><div className={styles.sectionHeading}><span className={styles.sectionMark} /><h2>EĞİTİM SONRASI ÖNERİLER</h2></div>{selectedRecommendations.length > 0 ? <ul className={styles.recommendationList}>{selectedRecommendations.map((recommendation) => <li key={recommendation}><span aria-hidden="true">✓</span>{recommendation}</li>)}</ul> : <p className={styles.muted}>Seçilen öneriler PDF’de burada listelenir.</p>}</section></div>
      <section className={`${styles.editorSection} noPrint`}><h2>Rapor İçeriği</h2><label>Öğretmen Yorumu<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="Rapor için öğretmen yorumunu yazın..." /></label><fieldset><legend>Öneriler (en fazla 5)</legend>{RECOMMENDATIONS.map((recommendation) => <label key={recommendation} className={styles.check}><input type="checkbox" checked={selectedRecommendations.includes(recommendation)} onChange={() => toggleRecommendation(recommendation)} />{recommendation}</label>)}<div className={styles.custom}><input value={customRecommendation} onChange={(event) => setCustomRecommendation(event.target.value)} placeholder="Manuel öneri ekle" /><button type="button" onClick={addCustomRecommendation}>Ekle</button></div></fieldset></section>
      <footer className={styles.footer}><strong>İDİL EĞİTİM</strong><span>Daha hızlı oku, daha fazlasını anla!</span><span>Rapor No: {reportNumber(report)}</span><span>Sayfa 2 / 2</span></footer>
      </div></article></main>;
}
