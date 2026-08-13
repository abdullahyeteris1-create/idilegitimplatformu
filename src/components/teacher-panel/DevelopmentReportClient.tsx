"use client";

import { useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import type { DevelopmentReport, DevelopmentReportLesson, DevelopmentMetric } from "@/lib/reports/developmentReportTypes";
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

function signed(value: number | null, suffix = "%"): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${Math.round(value)}${suffix}`;
}

function fileSafeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "ogrenci";
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

function Chart({ title, lessons, field, suffix, tone }: { title: string; lessons: DevelopmentReportLesson[]; field: ChartField; suffix: string; tone: ChartTone }) {
  const points = lessons
    .map((lesson, index) => ({ lesson, index, value: lesson[field] === null ? null : field === "focusScore" ? lesson[field] / 10 : lesson[field] }))
    .filter((item): item is { lesson: DevelopmentReportLesson; index: number; value: number } => item.value !== null && Number.isFinite(item.value));
  const width = 720;
  const height = 190;
  const padX = 34;
  const padY = 24;
  const max = field === "comprehensionScore" ? 100 : field === "focusScore" ? 10 : Math.max(...points.map((point) => point.value), 1);
  const min = 0;
  const x = (index: number) => points.length <= 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
  const y = (value: number) => height - padY - ((value - min) / Math.max(1, max - min)) * (height - padY * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`).join(" ");
  const baseline = height - padY;
  const areaPath = points.length > 1 ? `${path} L ${x(points.length - 1)} ${baseline} L ${x(0)} ${baseline} Z` : "";
  const labelIndexes = getLabelIndexes(points.length);
  const colors = CHART_COLORS[tone];
  const ticks = field === "comprehensionScore" ? [0, 25, 50, 75, 100] : field === "focusScore" ? [0, 2.5, 5, 7.5, 10] : [0, 25, 50, 75, 100];

  return (
    <section className={styles.chartCard}>
      <h3>{title}</h3>
      {points.length < 2 ? <p className={styles.muted}>Grafik için yeterli geçerli veri yok.</p> : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className={styles.chartSvg}>
          {ticks.map((tick) => <g key={tick}><line x1={padX} y1={y(tick)} x2={width - padX} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />{field !== "wordsPerMinute" ? <text className={styles.axisLabel} x={width - padX + 5} y={y(tick) + 4}>{field === "focusScore" ? tick : `${tick}%`}</text> : null}</g>)}
          <path d={areaPath} fill={colors.fill} stroke="none" />
          <path d={path} fill="none" stroke={colors.line} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => <g key={point.lesson.id}>
            <circle cx={x(index)} cy={y(point.value)} r="6" fill="white" stroke={colors.line} strokeWidth="2" />
            <circle cx={x(index)} cy={y(point.value)} r="3" fill={colors.line} />
            {labelIndexes.has(index) ? <text className={styles.dataLabel} x={x(index)} y={Math.max(13, y(point.value) - 10)} textAnchor="middle">{field === "focusScore" ? point.value.toFixed(1) : `${point.value}${field === "comprehensionScore" ? "%" : ""}`}</text> : null}
            {labelIndexes.has(index) ? <text x={x(index)} y={height - 7} textAnchor="middle">D{point.lesson.lessonNo}</text> : null}
            <title>{`Ders ${point.lesson.lessonNo}: ${point.value}${suffix}`}</title>
          </g>)}
        </svg>
      )}
    </section>
  );
}

function MiniSparkline({ lessons, field, tone }: { lessons: DevelopmentReportLesson[]; field: ChartField; tone: ChartTone }) {
  const values = lessons.map((lesson) => lesson[field] === null ? null : field === "focusScore" ? lesson[field] / 10 : lesson[field]).filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length < 2) return null;
  const max = field === "comprehensionScore" ? 100 : field === "focusScore" ? 10 : Math.max(...values, 1);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${(index / (values.length - 1)) * 92 + 4},${27 - (value / max) * 21}`).join(" ");
  return <svg className={`${styles.sparkline} ${styles[`tone${tone}`]}`} viewBox="0 0 100 32" aria-hidden="true"><path d={path} /></svg>;
}

function MetricCard({ title, metric, lessons, field, tone, suffix = "%", scale = 1 }: { title: string; metric: DevelopmentMetric; lessons: DevelopmentReportLesson[]; field: ChartField; tone: ChartTone; suffix?: string; scale?: number }) {
  return <article className={styles.metricCard}>
    <div className={styles.metricMain}><p>{title}</p><strong>{signed(metric.percent)}</strong><span>{metric.first === null || metric.last === null ? "Yeterli veri yok" : `${(metric.first * scale).toFixed(scale === 1 ? 0 : 1)}${suffix} → ${(metric.last * scale).toFixed(scale === 1 ? 0 : 1)}${suffix}`}</span></div>
    <MiniSparkline lessons={lessons} field={field} tone={tone} />
  </article>;
}

export default function DevelopmentReportClient({ report }: { report: DevelopmentReport }) {
  const reportRef = useRef<HTMLElement>(null);
  const [comment, setComment] = useState("");
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [customRecommendation, setCustomRecommendation] = useState("");
  const [isPdfPreparing, setIsPdfPreparing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const toggleRecommendation = (value: string) => setSelectedRecommendations((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length >= 5 ? current : [...current, value]);
  const addCustomRecommendation = () => {
    const value = customRecommendation.trim();
    if (value && selectedRecommendations.length < 5) setSelectedRecommendations((current) => [...current, value]);
    setCustomRecommendation("");
  };

  const downloadPdf = async () => {
    if (!reportRef.current || isPdfPreparing) return;
    setIsPdfPreparing(true);
    setPdfError("");
    const clone = reportRef.current.cloneNode(true) as HTMLElement;
    const printControls = clone.querySelectorAll<HTMLElement>(".noPrint");
    printControls.forEach((element) => element.remove());
    clone.querySelectorAll<HTMLElement>(".printOnly").forEach((element) => { element.style.display = "block"; });
    clone.style.width = "794px";
    clone.style.maxWidth = "none";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.background = "white";
    clone.style.padding = "34px";
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.position = "fixed";
    host.style.left = "-100000px";
    host.style.top = "0";
    host.style.width = "862px";
    host.style.background = "white";
    host.appendChild(clone);
    document.body.appendChild(host);
    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${fileSafeName(report.student.name)}-gelisim-raporu.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(clone).save();
    } catch {
      setPdfError("PDF hazırlanırken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      host.remove();
      setIsPdfPreparing(false);
    }
  };

  return <main className={styles.page}>
    <div className={styles.toolbar}>
      <a href="/ogretmen/idil-panel/ders-kayitlari">← Ders Kayıtları</a>
      <div className={styles.toolbarActions}><button type="button" onClick={() => window.print()}>Yazdır / PDF Olarak Kaydet</button><button type="button" onClick={downloadPdf} disabled={isPdfPreparing}>{isPdfPreparing ? "PDF hazırlanıyor..." : "⬇ PDF İndir"}</button></div>
    </div>
    {pdfError ? <p role="alert" className={styles.pdfError}>{pdfError}</p> : null}
    <article ref={reportRef} className={styles.report}>
      <header className={styles.brand}><div className={styles.logo}>İDİL</div><div><p>HIZLI OKUMA</p><h1>Gelişim Raporu</h1></div><time>{date(report.reportDate)}</time></header>
      <section className={styles.studentBox}><h2>Öğrenci Bilgileri</h2><div><span><b>Ad Soyad</b>{report.student.name}</span><span><b>Öğrenci ID</b>{report.student.id}</span><span><b>Başlangıç Tarihi</b>{date(report.student.educationStartDate)}</span><span><b>Bitiş Tarihi</b>{date(report.student.accessEndDate)}</span><span><b>Rapor Tarihi</b>{date(report.reportDate)}</span></div></section>
      <section className={styles.metricGrid}>
        <MetricCard title="Okuma Hızı Artışı" metric={report.metrics.speed} lessons={report.lessons} field="wordsPerMinute" tone="blue" suffix=" kelime/dk" />
        <MetricCard title="Okuduğunu Anlama Artışı" metric={report.metrics.comprehension} lessons={report.lessons} field="comprehensionScore" tone="green" />
        <MetricCard title="Odaklanma Artışı" metric={report.metrics.focus} lessons={report.lessons} field="focusScore" tone="purple" suffix="/10" scale={0.1} />
      </section>
      <section className={styles.section}><h2>Gelişim Grafikleri</h2><div className={styles.chartGrid}><Chart title="Okuma Hızı — kelime/dakika" lessons={report.lessons} field="wordsPerMinute" suffix=" kelime/dk" tone="blue" /><Chart title="Anlama — %" lessons={report.lessons} field="comprehensionScore" suffix="%" tone="green" /><Chart title="Odaklanma — /10" lessons={report.lessons} field="focusScore" suffix="/10" tone="purple" /></div></section>
      <section className={styles.section}><h2>Ders İlerlemesi</h2><div className={styles.tableWrap}><table><thead><tr><th>Ders</th><th>Tarih</th><th>Okuma Hızı</th><th>Anlama Oranı</th><th>Odaklanma</th></tr></thead><tbody>{report.lessons.map((lesson) => <tr key={lesson.id}><td>{lesson.lessonNo}</td><td>{date(lesson.lessonDate)}</td><td>{lesson.wordsPerMinute === null ? "—" : `${lesson.wordsPerMinute} kelime/dk`}</td><td>{lesson.comprehensionScore === null ? "—" : `%${lesson.comprehensionScore}`}</td><td>{lesson.focusScore === null ? "—" : `${(lesson.focusScore / 10).toFixed(1)}/10`}</td></tr>)}</tbody></table></div></section>
      <section className={styles.section}><h2>Yetenek Profili</h2><div className={styles.bars}><ProfileBar label="Okuma Hızı Gelişimi" value={report.metrics.speed.percent} /><ProfileBar label="Anlama Gelişimi" value={report.metrics.comprehension.percent} /><ProfileBar label="Odaklanma Gelişimi" value={report.metrics.focus.percent} /></div></section>
      <section className={styles.section}><h2>Genel Gelişim Özeti</h2><div className={styles.summaryGrid}><span>Okuma Hızı <b>{signed(report.metrics.speed.percent)}</b></span><span>Anlama <b>{signed(report.metrics.comprehension.percent)} / {signed(report.metrics.comprehension.delta, " puan")}</b></span><span>Odaklanma <b>{signed(report.metrics.focus.percent)}</b></span></div></section>
      <section className={`${styles.editorSection} ${styles.noPrint}`}><h2>Rapor İçeriği</h2><label>Öğretmen Yorumu<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="Rapor için öğretmen yorumunu yazın..." /></label><fieldset><legend>Öneriler (en fazla 5)</legend>{RECOMMENDATIONS.map((recommendation) => <label key={recommendation} className={styles.check}><input type="checkbox" checked={selectedRecommendations.includes(recommendation)} onChange={() => toggleRecommendation(recommendation)} />{recommendation}</label>)}<div className={styles.custom}><input value={customRecommendation} onChange={(event) => setCustomRecommendation(event.target.value)} placeholder="Manuel öneri ekle" /><button type="button" onClick={addCustomRecommendation}>Ekle</button></div></fieldset></section>
      {(comment.trim() || selectedRecommendations.length > 0) ? <section className={styles.printOnly}><h2>Öğretmen Yorumu ve Öneriler</h2>{comment.trim() ? <p className={styles.comment}>{comment}</p> : null}{selectedRecommendations.length > 0 ? <ul>{selectedRecommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul> : null}</section> : null}
    </article>
  </main>;
}

function ProfileBar({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return <div className={styles.profileBar}><div><span>{label}</span><b>{signed(value)}</b></div><div className={styles.track}><i style={{ width: `${width}%` }} /></div></div>;
}
