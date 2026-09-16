"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  paragraphCategoryLabels,
  paragraphDifficultyLabels,
  paragraphGradeLabels,
  type ParagraphAnalytics,
  type ParagraphQuestionAnalytics,
  type SampleStatus,
} from "@/lib/paragraph-exercises/paragraphAnalytics";

type SortKey = "attempts-desc" | "attempts-asc" | "accuracy-desc" | "accuracy-asc" | "time-asc" | "time-desc";
type SelectValue = "all" | string;

const sampleLabels: Record<SampleStatus, string> = {
  insufficient: "Yetersiz veri",
  preliminary: "Ön veri",
  analyzable: "Analiz edilebilir",
};

const sampleClasses: Record<SampleStatus, string> = {
  insufficient: "border-slate-200 bg-slate-50 text-slate-600",
  preliminary: "border-amber-200 bg-amber-50 text-amber-800",
  analyzable: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const calibrationClasses: Record<ParagraphQuestionAnalytics["calibrationStatus"], string> = {
  easy: "border-sky-200 bg-sky-50 text-sky-800",
  hard: "border-rose-200 bg-rose-50 text-rose-800",
  aligned: "border-emerald-200 bg-emerald-50 text-emerald-800",
  insufficient: "border-slate-200 bg-slate-50 text-slate-600",
  unknown: "border-slate-200 bg-slate-50 text-slate-600",
};

const formatPercent = (value: number | null) => value === null ? "—" : `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
const formatMs = (value: number | null) => value === null ? "—" : `${(value / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn`;
const sourceLabel = (value: string) => value === "migration" ? "Migration" : value === "manual" ? "Manuel" : value === "ai" ? "AI" : value === "legacy-static" ? "Eski statik" : "Legacy";

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.13em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-75">{detail}</p>
    </article>
  );
}

function GroupTable({ title, rows }: { title: string; rows: ParagraphAnalytics["categories"] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
        <span className="text-xs text-slate-500">Gözlemler ve ortalamalar</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <tr><th className="px-2 py-2 font-bold">Grup</th><th className="px-2 py-2 font-bold">Çözüm</th><th className="px-2 py-2 font-bold">Doğru</th><th className="px-2 py-2 font-bold">Ort. süre</th><th className="px-2 py-2 font-bold">Soru</th></tr>
          </thead>
          <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-slate-100 last:border-0"><td className="px-2 py-2.5 font-semibold text-slate-800">{row.label}</td><td className="px-2 py-2.5 text-slate-600">{row.attemptCount}</td><td className="px-2 py-2.5 font-semibold text-slate-800">{formatPercent(row.accuracyRate)}</td><td className="px-2 py-2.5 text-slate-600">{formatMs(row.averageResponseTimeMs)}</td><td className="px-2 py-2.5 text-slate-600">{row.uniqueQuestionCount}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function QuestionTable({ rows, compact = false }: { rows: ParagraphQuestionAnalytics[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1060px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th className="px-3 py-3 font-bold">Soru</th><th className="px-3 py-3 font-bold">Sınıf</th><th className="px-3 py-3 font-bold">Kategori</th><th className="px-3 py-3 font-bold">Etiket</th><th className="px-3 py-3 font-bold">Çözüm</th><th className="px-3 py-3 font-bold">Doğru %</th><th className="px-3 py-3 font-bold">Ort. süre</th>{!compact && <th className="px-3 py-3 font-bold">Gerçek performans</th>}<th className="px-3 py-3 font-bold">Kalibrasyon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.questionId} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
              <td className="max-w-[310px] px-3 py-3"><p className="font-semibold text-slate-900">{row.questionPreview}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{row.questionId}</p></td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.gradeBand === "unknown" ? "—" : paragraphGradeLabels[row.gradeBand]}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.category === "unknown" ? "—" : paragraphCategoryLabels[row.category]}</td>
              <td className="whitespace-nowrap px-3 py-3"><Pill className="border-slate-200 bg-slate-50 text-slate-700">{row.storedDifficulty === "unknown" ? "—" : paragraphDifficultyLabels[row.storedDifficulty]}</Pill><p className="mt-1 text-[10px] text-slate-400">{sourceLabel(row.source)}</p></td>
              <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{row.attemptCount}</td>
              <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{formatPercent(row.accuracyRate)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatMs(row.averageResponseTimeMs)}</td>
              {!compact && <td className="whitespace-nowrap px-3 py-3"><Pill className={sampleClasses[row.sampleStatus]}>{row.empiricalPerformance === "insufficient" ? sampleLabels[row.sampleStatus] : `${row.empiricalPerformance === "easy" ? "Kolay" : row.empiricalPerformance === "medium" ? "Orta" : "Zor"} performans`}</Pill></td>}
              <td className="whitespace-nowrap px-3 py-3"><Pill className={calibrationClasses[row.calibrationStatus]}>{row.calibrationLabel}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Filtrelere uyan soru bulunamadı.</p>}
    </div>
  );
}

function RankedSection({ title, description, rows, empty }: { title: string; description: string; rows: ParagraphQuestionAnalytics[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3"><h3 className="text-base font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>
      {rows.length ? <QuestionTable rows={rows} compact /> : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{empty}</div>}
    </section>
  );
}

export function ParagraphAnalyticsClient({ initialAnalytics }: { initialAnalytics: ParagraphAnalytics }) {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<SelectValue>("all");
  const [category, setCategory] = useState<SelectValue>("all");
  const [difficulty, setDifficulty] = useState<SelectValue>("all");
  const [source, setSource] = useState<SelectValue>("all");
  const [sample, setSample] = useState<SelectValue>("all");
  const [calibration, setCalibration] = useState<SelectValue>("all");
  const [sort, setSort] = useState<SortKey>("attempts-desc");

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return initialAnalytics.questions.filter((row) => {
      if (query && !`${row.questionId} ${row.questionPreview}`.toLocaleLowerCase("tr-TR").includes(query)) return false;
      if (grade !== "all" && row.gradeBand !== grade) return false;
      if (category !== "all" && row.category !== category) return false;
      if (difficulty !== "all" && row.storedDifficulty !== difficulty) return false;
      if (source !== "all" && row.source !== source) return false;
      if (sample !== "all" && row.sampleStatus !== sample) return false;
      if (calibration !== "all" && row.calibrationStatus !== calibration) return false;
      return true;
    }).toSorted((left, right) => {
      if (sort === "attempts-asc") return left.attemptCount - right.attemptCount || left.questionId.localeCompare(right.questionId);
      if (sort === "accuracy-desc") return (right.accuracyRate ?? -1) - (left.accuracyRate ?? -1) || right.attemptCount - left.attemptCount;
      if (sort === "accuracy-asc") return (left.accuracyRate ?? 101) - (right.accuracyRate ?? 101) || right.attemptCount - left.attemptCount;
      if (sort === "time-asc") return (left.averageResponseTimeMs ?? Number.MAX_SAFE_INTEGER) - (right.averageResponseTimeMs ?? Number.MAX_SAFE_INTEGER);
      if (sort === "time-desc") return (right.averageResponseTimeMs ?? -1) - (left.averageResponseTimeMs ?? -1);
      return right.attemptCount - left.attemptCount || left.questionId.localeCompare(right.questionId);
    });
  }, [calibration, category, difficulty, grade, initialAnalytics.questions, sample, search, sort, source]);

  const v2Answered = initialAnalytics.questions.some((row) => row.questionId.startsWith("v2-") && row.attemptCount > 0);
  const analyzableQuestionCount = initialAnalytics.questions.filter((row) => row.sampleStatus === "analyzable").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/ogretmen/icerik-yonetimi/paragraf-sorulari" className="text-sm font-semibold text-red-700 hover:text-red-900">← Soru bankasına dön</Link><p className="mt-1 text-sm text-slate-500">Descriptive analytics; stored difficulty alanı değiştirilmez.</p></div>
        <Pill className="border-emerald-200 bg-emerald-50 text-emerald-800">Salt okunur analiz</Pill>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Toplam çözülen soru" value={String(initialAnalytics.kpis.totalAnswers)} detail="Geçerli answer observation" tone="border-blue-200 bg-blue-50 text-blue-950" />
        <MetricCard label="Genel doğruluk" value={formatPercent(initialAnalytics.kpis.overallAccuracyRate)} detail={`${initialAnalytics.kpis.validAnswers} geçerli cevap`} tone="border-emerald-200 bg-emerald-50 text-emerald-950" />
        <MetricCard label="Ortalama cevap süresi" value={formatMs(initialAnalytics.kpis.averageResponseTimeMs)} detail="Geçerli süre örnekleri" tone="border-violet-200 bg-violet-50 text-violet-950" />
        <MetricCard label="Analiz edilen soru" value={String(initialAnalytics.kpis.analyzedQuestionCount)} detail="En az bir cevap bulunan" tone="border-amber-200 bg-amber-50 text-amber-950" />
        <MetricCard label="Aktif öğrenci" value={String(initialAnalytics.kpis.activeStudentCount)} detail="Paragraf sonucu bulunan" tone="border-rose-200 bg-rose-50 text-rose-950" />
        <MetricCard label="Toplam oturum" value={String(initialAnalytics.kpis.sessionCount)} detail="exercise_results kaydı" tone="border-slate-200 bg-slate-50 text-slate-950" />
      </section>

      {analyzableQuestionCount === 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Henüz sınırlı öğrenci verisi bulunuyor.</strong><p className="mt-1">Soru bazlı performans değerlendirmeleri yeterli deneme sayısına ulaştığında gösterilir.</p></div>}
      {!v2Answered && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><strong>V2 soruları için henüz yeterli öğrenci verisi oluşmadı.</strong><p className="mt-1 text-sky-800">V2 soru bankası tabloda görünür; gerçek performans etiketi en az 10 cevap sonrasında hesaplanır.</p></div>}
      {(initialAnalytics.diagnostics.legacyAnswerCount > 0 || initialAnalytics.diagnostics.malformedAnswerCount > 0 || initialAnalytics.diagnostics.invalidResponseTimeCount > 0) && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Veri kalitesi notu</strong><p className="mt-1">Legacy kategori eksik cevap: {initialAnalytics.diagnostics.legacyAnswerCount} · Malformed cevap: {initialAnalytics.diagnostics.malformedAnswerCount} · Geçersiz süre: {initialAnalytics.diagnostics.invalidResponseTimeCount}. Geçersiz kayıtlar aggregate dışında tutuldu.</p></div>}

      <section className="grid gap-4 xl:grid-cols-3"><GroupTable title="Kategori analizi" rows={initialAnalytics.categories} /><GroupTable title="Sınıf analizi" rows={initialAnalytics.grades} /><GroupTable title="Etiket analizi" rows={initialAnalytics.difficulties} /></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Soru bazlı performans</h2><p className="mt-1 text-sm text-slate-500">Stored etiket ile gerçek öğrenci performansını yan yana karşılaştırın.</p></div><span className="text-xs font-semibold text-slate-500">{filteredQuestions.length} / {initialAnalytics.questions.length} soru</span></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <label className="md:col-span-2"><span className="sr-only">Soru ara</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Soru ID veya metin ara" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-red-200 focus:ring-2" /></label>
          <select aria-label="Sınıf filtresi" value={grade} onChange={(event) => setGrade(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm sınıflar</option>{Object.entries(paragraphGradeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select aria-label="Kategori filtresi" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm kategoriler</option>{Object.entries(paragraphCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select aria-label="Etiket filtresi" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm etiketler</option>{Object.entries(paragraphDifficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select aria-label="Kaynak filtresi" value={source} onChange={(event) => setSource(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm kaynaklar</option>{[...new Set(initialAnalytics.questions.map((row) => row.source))].map((value) => <option key={value} value={value}>{sourceLabel(value)}</option>)}</select>
          <select aria-label="Örneklem filtresi" value={sample} onChange={(event) => setSample(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm örneklemler</option><option value="insufficient">Yetersiz veri</option><option value="preliminary">Ön veri</option><option value="analyzable">Analiz edilebilir</option></select>
          <select aria-label="Kalibrasyon filtresi" value={calibration} onChange={(event) => setCalibration(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">Tüm kalibrasyonlar</option><option value="easy">Beklenenden kolay</option><option value="hard">Beklenenden zor</option><option value="aligned">Beklentiyle uyumlu</option><option value="insufficient">Yetersiz veri</option></select>
          <select aria-label="Sıralama" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm md:col-span-2"><option value="attempts-desc">En çok çözülen</option><option value="attempts-asc">En az çözülen</option><option value="accuracy-desc">En yüksek doğruluk</option><option value="accuracy-asc">En düşük doğruluk</option><option value="time-asc">En hızlı</option><option value="time-desc">En yavaş</option></select>
        </div>
        <div className="mt-4"><QuestionTable rows={filteredQuestions} /></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3"><RankedSection title="Öğrencilerin en çok zorlandığı sorular" description="En az 10 cevaplı sorular arasından doğruluğu en düşük ilk 10." rows={initialAnalytics.hardestQuestions} empty="Henüz analiz edilebilir örneklem yok." /><RankedSection title="Beklenenden kolay görünen HARD sorular" description="Stored HARD ve en az %80 doğruluk gösteren sorular." rows={initialAnalytics.tooEasyHardQuestions} empty="Bu koşullara uyan soru yok." /><RankedSection title="En uzun süren sorular" description="En az 10 cevap ve en az 5 geçerli süre örneği olan ilk 10." rows={initialAnalytics.slowQuestions} empty="Henüz yeterli süre örneklemi yok." /></section>
    </div>
  );
}
