import Link from "next/link";
import type { ParagraphAnalysis, ParagraphCategoryStats, ParagraphSession } from "@/lib/paragraph-exercises/paragraphAnalysis";
import styles from "./student-paragraph-analytics.module.css";

type Props = { analysis: ParagraphAnalysis };

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : "—";
}

function formatTime(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "—";
  return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn`;
}

function percent(value: number | null): string {
  return value === null ? "—" : `%${value}`;
}

function trendCopy(analysis: ParagraphAnalysis): string {
  switch (analysis.trend.status) {
    case "improving":
      return `Son çalışmalarında %${Math.abs(analysis.trend.difference ?? 0)} puanlık bir yükseliş var. Ritmini koruyabilirsin.`;
    case "needs_attention":
      return `Son çalışmalarında %${Math.abs(analysis.trend.difference ?? 0)} puanlık bir değişim var. Kısa bir tekrar iyi gelebilir.`;
    case "stable":
      return "Son çalışmalarındaki başarın dengeli ilerliyor. Düzenli pratik bu ritmi destekler.";
    default:
      return "Gelişim eğilimini gösterebilmemiz için birkaç çalışma daha tamamlaman gerekiyor.";
  }
}

function LineChart({ sessions }: { sessions: ParagraphSession[] }) {
  const points = sessions.slice(-10);
  const coordinates = points.map((session, index) => {
    const x = points.length === 1 ? 50 : 6 + (index / (points.length - 1)) * 88;
    const y = 90 - session.accuracy * 0.8;
    return { session, x, y };
  });
  const path = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <figure className={styles.chartCard} aria-labelledby="progress-chart-title" aria-describedby="progress-chart-description">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Son {points.length} çalışma</span>
          <h2 id="progress-chart-title">Başarı Gelişimim</h2>
        </div>
        <strong>{points.length ? percent(points.at(-1)?.accuracy ?? null) : "—"}</strong>
      </div>
      <p id="progress-chart-description" className={styles.srOnly}>Grafik, en yeni on paragraf çalışmasının kronolojik başarı oranlarını gösterir.</p>
      {points.length ? (
        <>
          <svg className={styles.chart} viewBox="0 0 100 100" role="img" aria-label="Son paragraf çalışmalarının başarı oranı çizgi grafiği" preserveAspectRatio="none">
            <title>Başarı oranı gelişimi</title>
            {[10, 50, 90].map((y) => <line key={y} x1="4" x2="96" y1={y} y2={y} className={styles.gridLine} />)}
            {coordinates.length > 1 ? <polyline points={path} className={styles.chartLine} /> : null}
            {coordinates.map(({ session, x, y }) => <circle key={session.id} cx={x} cy={y} r="2.6" className={styles.chartPoint} />)}
          </svg>
          <ol className={styles.chartLabels} aria-label="Grafikteki çalışmalar">
            {coordinates.map(({ session }) => <li key={session.id}><span>{formatDate(session.date)}</span><strong>{percent(session.accuracy)}</strong></li>)}
          </ol>
        </>
      ) : <p className={styles.noData}>Henüz grafik için veri yok.</p>}
    </figure>
  );
}

function CategoryRow({ category }: { category: ParagraphCategoryStats }) {
  const accuracy = category.accuracy ?? 0;
  return (
    <li className={styles.categoryRow}>
      <div>
        <strong>{category.label}</strong>
        <span>{category.answered > 0 ? `${category.correct}/${category.answered} doğru` : "Henüz veri yok"}</span>
      </div>
      <div className={styles.categoryScore}>
        <b>{percent(category.accuracy)}</b>
        <progress max="100" value={accuracy} aria-label={`${category.label} başarı oranı`}>{accuracy}%</progress>
      </div>
    </li>
  );
}

function InsightCard({ title, category, emptyCopy }: { title: string; category: ParagraphCategoryStats | null; emptyCopy: string }) {
  return (
    <article className={styles.insightCard}>
      <span>{title}</span>
      <strong>{category?.label ?? "Henüz belirlenemedi"}</strong>
      <p>{category ? `${percent(category.accuracy)} başarı · ${category.answered} soru` : emptyCopy}</p>
    </article>
  );
}

function RecentSession({ session }: { session: ParagraphSession }) {
  return (
    <li className={styles.sessionRow}>
      <div>
        <strong>{session.categoryLabel}</strong>
        <time dateTime={session.date}>{formatDate(session.date)}</time>
      </div>
      <dl>
        <div><dt>Başarı</dt><dd>{percent(session.accuracy)}</dd></div>
        <div><dt>Doğru</dt><dd>{session.correct}/{session.answered}</dd></div>
        <div><dt>Ort. süre</dt><dd>{formatTime(session.averageResponseTimeMs)}</dd></div>
      </dl>
    </li>
  );
}

export function StudentParagraphAnalyticsView({ analysis }: Props) {
  const hasResults = analysis.overall.completedSessionCount > 0;
  const recentSessions = analysis.sessions.slice(-5).toReversed();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav aria-label="Sayfa yolu"><Link href="/ogrenci" className={styles.backLink}>← Öğrenci paneline dön</Link></nav>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Kişisel gelişim alanın</span>
            <h1>Paragraf Analizim</h1>
            <p>Çalışmalarını karşılaştır, güçlü yönlerini keşfet ve bir sonraki adımını seç.</p>
          </div>
          <Link href="/egzersizler/paragraf-calismalari" className={styles.primaryAction}>Paragraf çalışmasına başla</Link>
        </header>

        {!hasResults ? (
          <section className={styles.emptyState} aria-labelledby="empty-title">
            <span aria-hidden="true">↗</span>
            <h2 id="empty-title">İlk gelişim verini oluşturmaya hazırsın</h2>
            <p>Bir paragraf çalışmasını tamamladığında sonuçların ve gelişim grafiğin burada görünecek.</p>
            <Link href="/egzersizler/paragraf-calismalari" className={styles.primaryAction}>İlk çalışmayı başlat</Link>
          </section>
        ) : null}

        <section className={styles.kpiGrid} aria-label="Paragraf çalışma özeti">
          <article><span>Başarı Oranı</span><strong>{percent(analysis.overall.accuracy)}</strong><small>Tüm tamamlanan sorular</small></article>
          <article><span>Tamamlanan Çalışma</span><strong>{analysis.overall.completedSessionCount}</strong><small>Paragraf oturumu</small></article>
          <article><span>Çözülen Soru</span><strong>{analysis.overall.totalAnswered}</strong><small>Toplam soru</small></article>
          <article><span>Ortalama Cevap Süresi</span><strong>{formatTime(analysis.overall.averageResponseTimeMs)}</strong><small>Geçerli süre kayıtları</small></article>
        </section>

        <section className={styles.mainGrid}>
          <LineChart sessions={analysis.sessions} />
          <aside className={styles.trendCard} aria-labelledby="trend-title">
            <span className={styles.eyebrow}>Gelişim notu</span>
            <h2 id="trend-title">Bu Hafta Odaklan</h2>
            <p>{trendCopy(analysis)}</p>
          </aside>
        </section>

        <section className={styles.categoryCard} aria-labelledby="categories-title">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Beş temel beceri</span><h2 id="categories-title">Becerilerim</h2></div></div>
          <ul>{analysis.categories.map((category) => <CategoryRow key={category.category} category={category} />)}</ul>
        </section>

        <section className={styles.insightGrid} aria-label="Güçlü yön ve gelişim alanı">
          <InsightCard title="En Güçlü Alanım" category={analysis.strongestCategory} emptyCopy="Güçlü yönünü belirlemek için biraz daha veri gerekiyor." />
          <InsightCard title="Gelişim alanın" category={analysis.needsImprovementCategory} emptyCopy="Gelişim alanını belirlemek için biraz daha veri gerekiyor." />
        </section>

        <section className={styles.recentCard} aria-labelledby="recent-title">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>En yeni 5 kayıt</span><h2 id="recent-title">Son Çalışmalarım</h2></div></div>
          {recentSessions.length ? <ul>{recentSessions.map((session) => <RecentSession key={session.id} session={session} />)}</ul> : <p className={styles.noData}>Henüz tamamlanmış paragraf çalışması yok.</p>}
        </section>
      </div>
    </main>
  );
}
