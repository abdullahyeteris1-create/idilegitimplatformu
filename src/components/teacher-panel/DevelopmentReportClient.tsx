"use client";

import { useMemo, useState } from "react";
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

function Chart({ title, lessons, field, suffix }: { title: string; lessons: DevelopmentReportLesson[]; field: "wordsPerMinute" | "comprehensionScore" | "focusScore"; suffix: string }) {
  const points = lessons
    .map((lesson, index) => ({ lesson, index, value: lesson[field] === null ? null : field === "focusScore" ? lesson[field] / 10 : lesson[field] }))
    .filter((item): item is { lesson: DevelopmentReportLesson; index: number; value: number } => item.value !== null && Number.isFinite(item.value));
  const width = 720;
  const height = 190;
  const padX = 34;
  const padY = 24;
  const max = Math.max(...points.map((point) => point.value), field === "comprehensionScore" || field === "focusScore" ? 100 : 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const x = (index: number) => points.length <= 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
  const y = (value: number) => height - padY - ((value - min) / Math.max(1, max - min)) * (height - padY * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`).join(" ");

  return (
    <section className={styles.chartCard}>
      <h3>{title}</h3>
      {points.length < 2 ? <p className={styles.muted}>Grafik için yeterli geçerli veri yok.</p> : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#cbd5e1" />
          <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
          {points.map((point, index) => <g key={point.lesson.id}>
            <circle cx={x(index)} cy={y(point.value)} r="4" fill="#0f766e" />
            <text x={x(index)} y={height - 7} textAnchor="middle">D{point.lesson.lessonNo}</text>
            <title>{`Ders ${point.lesson.lessonNo}: ${point.value}${suffix}`}</title>
          </g>)}
        </svg>
      )}
    </section>
  );
}

function MetricCard({ title, metric, suffix = "%", scale = 1 }: { title: string; metric: DevelopmentMetric; suffix?: string; scale?: number }) {
  return <article className={styles.metricCard}>
    <p>{title}</p>
    <strong>{signed(metric.percent)}</strong>
    <span>{metric.first === null || metric.last === null ? "Yeterli veri yok" : `${(metric.first * scale).toFixed(scale === 1 ? 0 : 1)}${suffix} → ${(metric.last * scale).toFixed(scale === 1 ? 0 : 1)}${suffix}`}</span>
  </article>;
}

export default function DevelopmentReportClient({ report }: { report: DevelopmentReport }) {
  const [comment, setComment] = useState("");
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [customRecommendation, setCustomRecommendation] = useState("");
  const toggleRecommendation = (value: string) => setSelectedRecommendations((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length >= 5 ? current : [...current, value]);
  const addCustomRecommendation = () => {
    const value = customRecommendation.trim();
    if (value && selectedRecommendations.length < 5) setSelectedRecommendations((current) => [...current, value]);
    setCustomRecommendation("");
  };
  const lessonNotes = useMemo(() => report.lessons.filter((lesson) => lesson.teacherNote.trim()).slice(-3).reverse(), [report.lessons]);

  return <main className={styles.page}>
    <div className={styles.toolbar}>
      <a href="/ogretmen/idil-panel/ders-kayitlari">← Ders Kayıtları</a>
      <button type="button" onClick={() => window.print()}>Yazdır / PDF Olarak Kaydet</button>
    </div>
    <article className={styles.report}>
      <header className={styles.brand}><div className={styles.logo}>İDİL</div><div><p>HIZLI OKUMA</p><h1>Gelişim Raporu</h1></div><time>{date(report.reportDate)}</time></header>
      <section className={styles.studentBox}><h2>Öğrenci Bilgileri</h2><div><span><b>Ad Soyad</b>{report.student.name}</span><span><b>Öğrenci ID</b>{report.student.id}</span><span><b>Başlangıç Tarihi</b>{date(report.student.educationStartDate)}</span><span><b>Bitiş Tarihi</b>{date(report.student.accessEndDate)}</span><span><b>Rapor Tarihi</b>{date(report.reportDate)}</span></div></section>
      <section className={styles.metricGrid}>
        <MetricCard title="Okuma Hızı Artışı" metric={report.metrics.speed} suffix=" kelime/dk" />
        <MetricCard title="Okuduğunu Anlama Artışı" metric={report.metrics.comprehension} />
        <MetricCard title="Odaklanma Artışı" metric={report.metrics.focus} suffix="/10" scale={0.1} />
      </section>
      <section className={styles.section}><h2>Gelişim Grafikleri</h2><div className={styles.chartGrid}><Chart title="Okuma Hızı — kelime/dakika" lessons={report.lessons} field="wordsPerMinute" suffix=" kelime/dk" /><Chart title="Anlama — %" lessons={report.lessons} field="comprehensionScore" suffix="%" /><Chart title="Odaklanma — /10" lessons={report.lessons} field="focusScore" suffix="/10" /></div></section>
      <section className={styles.section}><h2>Ders İlerlemesi</h2><div className={styles.tableWrap}><table><thead><tr><th>Ders</th><th>Tarih</th><th>Okuma Hızı</th><th>Anlama Oranı</th><th>Odaklanma</th></tr></thead><tbody>{report.lessons.map((lesson) => <tr key={lesson.id}><td>{lesson.lessonNo}</td><td>{date(lesson.lessonDate)}</td><td>{lesson.wordsPerMinute === null ? "—" : `${lesson.wordsPerMinute} kelime/dk`}</td><td>{lesson.comprehensionScore === null ? "—" : `%${lesson.comprehensionScore}`}</td><td>{lesson.focusScore === null ? "—" : `${(lesson.focusScore / 10).toFixed(1)}/10`}</td></tr>)}</tbody></table></div></section>
      <section className={styles.section}><h2>Yetenek Profili</h2><div className={styles.bars}><ProfileBar label="Okuma Hızı Gelişimi" value={report.metrics.speed.percent} /><ProfileBar label="Anlama Gelişimi" value={report.metrics.comprehension.percent} /><ProfileBar label="Odaklanma Gelişimi" value={report.metrics.focus.percent} /></div></section>
      <section className={styles.section}><h2>Genel Gelişim Özeti</h2><div className={styles.summaryGrid}><span>Okuma Hızı <b>{signed(report.metrics.speed.percent)}</b></span><span>Anlama <b>{signed(report.metrics.comprehension.percent)} / {signed(report.metrics.comprehension.delta, " puan")}</b></span><span>Odaklanma <b>{signed(report.metrics.focus.percent)}</b></span></div></section>
      {lessonNotes.length > 0 ? <section className={styles.noteHint}><b>Son Ders Notları</b>{lessonNotes.map((lesson) => <p key={lesson.id}>Ders {lesson.lessonNo}: {lesson.teacherNote}</p>)}</section> : null}
      <section className={`${styles.editorSection} ${styles.noPrint}`}><h2>Rapor İçeriği</h2><label>Öğretmen Yorumu<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="Rapor için öğretmen yorumunu yazın..." /></label><fieldset><legend>Öneriler (en fazla 5)</legend>{RECOMMENDATIONS.map((recommendation) => <label key={recommendation} className={styles.check}><input type="checkbox" checked={selectedRecommendations.includes(recommendation)} onChange={() => toggleRecommendation(recommendation)} />{recommendation}</label>)}<div className={styles.custom}><input value={customRecommendation} onChange={(event) => setCustomRecommendation(event.target.value)} placeholder="Manuel öneri ekle" /><button type="button" onClick={addCustomRecommendation}>Ekle</button></div></fieldset></section>
      {(comment.trim() || selectedRecommendations.length > 0) ? <section className={styles.printOnly}><h2>Öğretmen Yorumu ve Öneriler</h2>{comment.trim() ? <p className={styles.comment}>{comment}</p> : null}{selectedRecommendations.length > 0 ? <ul>{selectedRecommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul> : null}</section> : null}
    </article>
  </main>;
}

function ProfileBar({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return <div className={styles.profileBar}><div><span>{label}</span><b>{signed(value)}</b></div><div className={styles.track}><i style={{ width: `${width}%` }} /></div></div>;
}
