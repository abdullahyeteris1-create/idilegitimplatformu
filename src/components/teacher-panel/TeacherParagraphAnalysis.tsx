import { PanelCard } from "@/components/ui/PanelCard";
import { buildParagraphAnalysis, type ParagraphAnalysisResult, type ParagraphAnalysis } from "@/lib/paragraph-exercises/paragraphAnalysis";

function formatSeconds(milliseconds: number | null): string {
  return milliseconds === null || !Number.isFinite(milliseconds)
    ? "-"
    : `${Math.max(1, Math.round(milliseconds / 1000))} sn`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Tarih yok"
    : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function TeacherParagraphAnalysis({ results, paragraphAnalysis }: { results?: ParagraphAnalysisResult[]; paragraphAnalysis?: ParagraphAnalysis | null }) {
  const analysis = paragraphAnalysis ?? buildParagraphAnalysis(results ?? []);
  const recentSessions = [...analysis.sessions].reverse().slice(0, 5);

  return (
    <section aria-label="Paragraf Analizi">
      <PanelCard title="Paragraf Analizi" subtitle="Paragraf Çalışmaları sonuçlarından otomatik oluşturulan read-only değerlendirme">
        {analysis.overall.completedSessions === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800 [data-idil-theme=dark]:text-slate-300">
            <h2 className="font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Henüz paragraf çalışması bulunmuyor.</h2>
            <p className="mt-1">Öğrenci Paragraf Çalışmaları bölümünden çalışmalarını tamamladıkça analizler burada görüntülenecek.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Çözülen Soru", analysis.overall.answeredQuestions],
                ["Doğru", analysis.overall.correct],
                ["Başarı Oranı", analysis.overall.accuracy === null ? "-" : `%${analysis.overall.accuracy}`],
                ["Ort. Çözüm Süresi", formatSeconds(analysis.overall.averageResponseTimeMs)],
                ["Tamamlanan Çalışma", analysis.overall.completedSessions],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [data-idil-theme=dark]:text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-slate-50">{value}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {analysis.categories.map((category) => (
                <article key={category.category} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">{category.label}</h3>
                    <span className="shrink-0 text-sm font-black text-[var(--brand)]">{category.answeredQuestions ? `%${category.accuracy}` : "-"}</span>
                  </div>
                  {category.answeredQuestions ? (
                    <>
                      <p className="mt-3 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">{category.correct} / {category.answeredQuestions} doğru · {category.wrong} yanlış</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 [data-idil-theme=dark]:bg-slate-700">
                        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${category.accuracy}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 [data-idil-theme=dark]:text-slate-400">Ort. süre: {formatSeconds(category.averageResponseTimeMs)}</p>
                    </>
                  ) : <p className="mt-3 text-sm text-slate-500 [data-idil-theme=dark]:text-slate-400">Henüz veri yok.</p>}
                </article>
              ))}
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 [data-idil-theme=dark]:border-emerald-900 [data-idil-theme=dark]:bg-emerald-950/30">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 [data-idil-theme=dark]:text-emerald-300">Güçlü Alan</p>
                <p className="mt-2 text-lg font-black text-emerald-950 [data-idil-theme=dark]:text-emerald-100">
                  {analysis.strongestCategory
                    ? `${analysis.strongestCategory.label} · %${analysis.strongestCategory.accuracy}`
                    : "Daha sağlıklı analiz için bu kategoride biraz daha soru çözülmeli."}
                </p>
                <p className="mt-1 text-xs text-emerald-800 [data-idil-theme=dark]:text-emerald-200">En az 5 cevap bulunan kategoriler karşılaştırılır.</p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 [data-idil-theme=dark]:border-amber-900 [data-idil-theme=dark]:bg-amber-950/30">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700 [data-idil-theme=dark]:text-amber-300">Geliştirilmesi Gereken Alan</p>
                <p className="mt-2 text-lg font-black text-amber-950 [data-idil-theme=dark]:text-amber-100">
                  {analysis.needsImprovementCategory
                    ? `${analysis.needsImprovementCategory.label} · %${analysis.needsImprovementCategory.accuracy}`
                    : "Daha sağlıklı analiz için bu kategoride biraz daha soru çözülmeli."}
                </p>
                <p className="mt-1 text-xs text-amber-800 [data-idil-theme=dark]:text-amber-200">Sonuçlar hız yerine doğrulukla değerlendirilir.</p>
              </article>
            </div>
            <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Gelişim Trendi</h3>
                  <span className="text-xs font-semibold text-slate-500 [data-idil-theme=dark]:text-slate-300">
                    {analysis.trend.status === "insufficient"
                      ? "Yeterli veri yok"
                      : analysis.trend.status === "improving"
                        ? "Yükseliyor"
                        : analysis.trend.status === "needs_attention"
                          ? "İzlenmeli"
                          : "Sabit"}
                  </span>
                </div>
                {analysis.trend.status === "insufficient" ? (
                  <p className="mt-3 text-sm text-slate-600 [data-idil-theme=dark]:text-slate-300">Henüz gelişim trendi için yeterli çalışma yok.</p>
                ) : (
                  <div className="mt-4 flex items-end gap-2" aria-label="Son altı çalışma başarı trendi">
                    {analysis.sessions.slice(-6).map((session) => (
                      <div key={session.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-t-lg bg-[var(--brand)]" style={{ height: `${Math.max(10, session.accuracy)}px` }} title={`%${session.accuracy}`} />
                        <span className="text-[10px] text-slate-500">%{session.accuracy}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                <h3 className="font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Öğretmen Yorumu</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 [data-idil-theme=dark]:text-slate-300">{analysis.comment}</p>
              </article>
            </div>
            <div>
              <h3 className="font-bold text-slate-950 [data-idil-theme=dark]:text-slate-50">Son Çalışmalar</h3>
              <div className="mt-3 grid gap-2">
                {recentSessions.map((session) => (
                  <div key={session.id} className="grid gap-1 rounded-xl border border-slate-200 bg-white p-3 text-sm sm:grid-cols-[1.3fr_1fr_auto_auto] sm:items-center [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900">
                    <span className="font-semibold text-slate-950 [data-idil-theme=dark]:text-slate-100">{formatDate(session.date)}</span>
                    <span className="text-slate-600 [data-idil-theme=dark]:text-slate-300">{session.categoryLabel}</span>
                    <span className="font-semibold text-slate-700 [data-idil-theme=dark]:text-slate-200">{session.correct} / {session.answeredQuestions} · %{session.accuracy}</span>
                    <span className="text-slate-500 [data-idil-theme=dark]:text-slate-400">{formatSeconds(session.averageResponseTimeMs)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PanelCard>
    </section>
  );
}
