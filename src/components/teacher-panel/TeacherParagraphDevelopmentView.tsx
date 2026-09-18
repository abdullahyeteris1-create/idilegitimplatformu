import type { ParagraphAnalysis } from "@/lib/paragraph-exercises/paragraphAnalysis";

type Props = {
  analysis: ParagraphAnalysis;
  paragraphExercisesEnabled?: boolean | null;
};

const trendCopy = {
  improving: "Son çalışmalarda başarı oranı yükseliyor.",
  stable: "Başarı oranı son çalışmalarda dengeli ilerliyor.",
  needs_attention: "Son çalışmalarda başarı oranında düşüş gözleniyor; gelişim alanları incelenebilir.",
  insufficient: "Trend değerlendirmesi için henüz yeterli çalışma bulunmuyor.",
} as const;

function formatSeconds(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `${Math.round(value / 100) / 10} sn`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Tarih yok"
    : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(parsed);
}

export function TeacherParagraphDevelopmentView({ analysis, paragraphExercisesEnabled }: Props) {
  const sessions = analysis.sessions.slice(-10);
  const recentSessions = sessions.slice().reverse().slice(0, 5);
  const hasHistory = analysis.overall.completedSessions > 0;
  const summary = !hasHistory
    ? "Öğrencinin henüz tamamlanmış paragraf çalışması bulunmuyor."
    : !analysis.strongestCategory
        || !analysis.needsImprovementCategory
        || analysis.trend.status === "insufficient"
      ? "Öğrenci paragraf çalışmalarına başlamış durumda. Daha fazla çalışma tamamlandıkça beceri alanları ve gelişim eğilimi daha anlamlı şekilde değerlendirilebilir."
      : `Başarı oranı %${analysis.overall.accuracy ?? "—"}; güçlü alan ${analysis.strongestCategory.label}, gelişim alanı ${analysis.needsImprovementCategory.label}.`;

  return (
    <section className="grid gap-6" aria-label="Paragraf Gelişim Analizi">
      <header>
        <h2 className="text-xl font-black">Paragraf Gelişim Analizi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Öğrencinin paragraf çalışmalarındaki başarı, hız ve beceri gelişimini takip edin.
        </p>
      </header>

      {paragraphExercisesEnabled === false ? (
        <p className="rounded-xl border p-3 text-sm">Paragraf çalışmaları şu anda kapalı.</p>
      ) : null}

      {!hasHistory ? (
        <p className="rounded-2xl border border-dashed p-6 text-sm">{summary}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Çözülen Soru", analysis.overall.totalAnswered],
              ["Doğru", analysis.overall.correct],
              ["Başarı Oranı", analysis.overall.accuracy === null ? "—" : `%${analysis.overall.accuracy}`],
              ["Ortalama Cevap Süresi", formatSeconds(analysis.overall.averageResponseTimeMs)],
              ["Tamamlanan Çalışma", analysis.overall.completedSessions],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </article>
            ))}
          </div>

          <article className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="font-bold">Başarı Gelişimi</h3>
            {sessions.length === 0 ? (
              <p className="mt-3 text-sm">Grafik için henüz yeterli çalışma verisi bulunmuyor.</p>
            ) : (
              <svg
                className="mt-4 h-56 w-full"
                viewBox="0 0 640 220"
                role="img"
                aria-label="Başarı gelişimi grafiği"
                preserveAspectRatio="none"
              >
                <title>Başarı gelişimi</title>
                {sessions.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    points={sessions.map((session, index) => (
                      `${32 + index * (588 / (sessions.length - 1))},${190 - session.accuracy * 1.6}`
                    )).join(" ")}
                  />
                ) : null}
                {sessions.map((session, index) => (
                  <circle
                    key={session.id}
                    cx={32 + index * (588 / Math.max(1, sessions.length - 1))}
                    cy={190 - session.accuracy * 1.6}
                    r="5"
                  >
                    <title>{`${formatDate(session.date)} · ${session.correct}/${session.answered} · %${session.accuracy}`}</title>
                  </circle>
                ))}
              </svg>
            )}
          </article>

          <p className="rounded-xl bg-slate-50 p-4 text-sm">{trendCopy[analysis.trend.status]}</p>

          <section>
            <h3 className="mb-3 font-bold">Beceri Alanları</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {analysis.categories.map((category) => (
                <article key={category.category} className="rounded-2xl border bg-white p-4">
                  <h4 className="font-bold">{category.label}</h4>
                  {category.answered === 0 ? (
                    <p className="mt-2 text-sm">Henüz veri yok</p>
                  ) : (
                    <p className="mt-2 text-sm">
                      {category.correct} doğru · {category.incorrect} yanlış · %{category.accuracy} · {formatSeconds(category.averageResponseTimeMs)} ({category.validResponseTimeCount} geçerli süre)
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["En Güçlü Alan", analysis.strongestCategory],
              ["Gelişim Alanı", analysis.needsImprovementCategory],
            ].map(([label, category]) => (
              <article key={String(label)} className="rounded-2xl border bg-white p-4">
                <h3 className="font-bold">{String(label)}</h3>
                <p className="mt-2">
                  {category
                    ? `${(category as ParagraphAnalysis["categories"][number]).label} · %${(category as ParagraphAnalysis["categories"][number]).accuracy}`
                    : "Henüz yeterli veri yok."}
                </p>
              </article>
            ))}
          </div>

          <section>
            <h3 className="mb-3 font-bold">Son 5 çalışma</h3>
            <div className="grid gap-2">
              {recentSessions.map((session) => (
                <article key={session.id} className="grid gap-1 rounded-xl border bg-white p-3 text-sm sm:grid-cols-5">
                  <span>{formatDate(session.date)}</span>
                  <span>{session.answered} soru</span>
                  <span>{session.correct} doğru</span>
                  <span>{session.incorrect} yanlış · %{session.accuracy}</span>
                  <span>{formatSeconds(session.averageResponseTimeMs)}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <h3 className="font-bold">Öğretmen İçin Kısa Değerlendirme</h3>
            <p className="mt-2 text-sm">{summary}</p>
          </section>
        </>
      )}
    </section>
  );
}
