"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

type GradeBand = "4-5" | "6-7" | "8" | "high-school";
type Difficulty = "easy" | "medium" | "hard";
type Category = "main_idea" | "supporting_idea" | "inference" | "completion" | "flow";
type Warning = { code: string; message: string };
type ImportedQuestion = {
  importId: string; number: number; passageText: string; questionText: string; options: string[];
  answerLetter: string | null; correctOption: number | null; explanation: string; category: Category;
  difficulty: Difficulty; warnings: Warning[]; status: "ready" | "review" | "error";
};
type Preview = {
  fileName: string; questionCount: number; answerCount: number; readyCount: number; reviewCount: number; errorCount: number;
  questions: ImportedQuestion[]; warnings: Warning[];
};
const gradeLabels: Record<GradeBand, string> = { "4-5": "4–5. sınıf", "6-7": "6–7. sınıf", "8": "8. sınıf", "high-school": "Lise" };
const categoryLabels: Record<Category, string> = { main_idea: "Ana düşünce", supporting_idea: "Yardımcı düşünce", inference: "Çıkarım", completion: "Cümle tamamlama", flow: "Akış" };
const difficultyLabels: Record<Difficulty, string> = { easy: "Kolay", medium: "Orta", hard: "Zor" };
const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const buttonClass = "inline-flex min-h-[42px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const statusLabel = (status: ImportedQuestion["status"]) => status === "ready" ? "Hazır" : status === "review" ? "Kontrol gerekli" : "Hata";

function questionHasCriticalError(question: ImportedQuestion): boolean {
  return question.options.length < 4 || question.options.slice(0, 4).some((option) => !option.trim()) ||
    !question.passageText.trim() || !question.questionText.trim() || question.correctOption === null ||
    question.correctOption < 0 || question.correctOption >= question.options.length;
}
function statusClass(status: ImportedQuestion["status"]): string {
  return status === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "review" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800";
}
function recomputeStatus(question: ImportedQuestion): ImportedQuestion["status"] {
  return questionHasCriticalError(question) ? "error" : question.warnings.length > 0 ? "review" : "ready";
}

export function ImportExamClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gradeBand, setGradeBand] = useState<GradeBand>("8");
  const [durationMinutes, setDurationMinutes] = useState("40");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const questions = useMemo(() => preview?.questions ?? [], [preview?.questions]);
  const currentCounts = useMemo(() => ({
    ready: questions.filter((question) => recomputeStatus(question) === "ready").length,
    review: questions.filter((question) => recomputeStatus(question) === "review").length,
    error: questions.filter((question) => recomputeStatus(question) === "error").length,
  }), [questions]);
  const canCreate = Boolean(title.trim() && preview && questions.length > 0 && currentCounts.error === 0 && questions.every((question) => !questionHasCriticalError(question)));

  function updateQuestion(importId: string, patch: Partial<ImportedQuestion>): void {
    setPreview((current) => current ? { ...current, questions: current.questions.map((question) => question.importId === importId ? { ...question, ...patch, status: recomputeStatus({ ...question, ...patch }) } : question) } : current);
  }
  function removeQuestion(importId: string): void {
    setPreview((current) => current ? { ...current, questions: current.questions.filter((question) => question.importId !== importId) } : current);
  }
  async function parseFile(): Promise<void> {
    if (!file || loading) return;
    setLoading(true); setError(""); setMessage(""); setPreview(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/admin/paragraph-exams/import/parse", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "DOCX işlenemedi.");
      setPreview(data.preview as Preview);
      setMessage("Dosya işlendi. Kaydetmeden önce soru kartlarını kontrol edin.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "DOCX işlenemedi.");
    } finally { setLoading(false); }
  }
  async function createDraft(): Promise<void> {
    if (!preview || !canCreate || creating) return;
    setCreating(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/paragraph-exams/import/create", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          exam: { title: title.trim(), description: description.trim() || null, gradeBand, durationSeconds: Number(durationMinutes) * 60 },
          questions: questions.map((question) => ({
            passageText: question.passageText, questionText: question.questionText,
            options: question.options[4]?.trim() ? question.options.slice(0, 5) : question.options.slice(0, 4),
            correctOption: question.correctOption, explanation: question.explanation,
            category: question.category, difficulty: question.difficulty,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Taslak oluşturulamadı.");
      router.push("/ogretmen/icerik-yonetimi/paragraf-denemeleri/" + data.exam.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Taslak oluşturulamadı.");
    } finally { setCreating(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Link href="/ogretmen/icerik-yonetimi/paragraf-denemeleri" className="text-sm font-semibold text-red-700 hover:underline">← Deneme listesine dön</Link><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Dosyadan Deneme Yükle</h2><p className="mt-1 text-sm text-slate-600">Yalnızca DOCX. Dosya önce sunucuda okunur; siz onaylamadan veritabanına yazılmaz.</p></div>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Taslak olarak oluşturulur</span>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700"><input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(""); }} /><span>{file ? file.name : "DOCX dosyası seçin (en fazla 10 MB)"}</span></label>
        <button type="button" onClick={() => void parseFile()} disabled={!file || loading} className={buttonClass + " border-slate-900 bg-slate-900 text-white"}>{loading ? "Okunuyor…" : "Dosyayı analiz et"}</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </section>
    {preview && <><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Analiz özeti</p><p className="mt-1 text-sm text-slate-700">{preview.fileName} · {preview.questionCount} soru · {preview.answerCount} cevap</p></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">Hazır {currentCounts.ready}</span><span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">Kontrol {currentCounts.review}</span><span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-800">Hata {currentCounts.error}</span></div></div>{preview.warnings.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Belge uyarıları</p><ul className="mt-1 list-disc space-y-1 pl-5">{preview.warnings.map((warning, index) => <li key={warning.code + index}>{warning.message}</li>)}</ul></div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-base font-semibold text-slate-950">Deneme bilgileri</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700 md:col-span-2">Başlık *<input className={fieldClass + " mt-1"} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. 8. Sınıf Paragraf Denemesi 1" /></label><label className="text-sm font-semibold text-slate-700 md:col-span-2">Açıklama<textarea className={fieldClass + " mt-1 min-h-20"} value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></label><label className="text-sm font-semibold text-slate-700">Sınıf düzeyi<select className={fieldClass + " mt-1"} value={gradeBand} onChange={(event) => setGradeBand(event.target.value as GradeBand)}>{Object.entries(gradeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Süre (dakika)<input className={fieldClass + " mt-1"} type="number" min={1} max={120} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label></div></section>
      <div className="space-y-3">{questions.map((question, index) => <ImportQuestionCard key={question.importId} question={question} index={index} onUpdate={updateQuestion} onRemove={removeQuestion} />)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">{currentCounts.error > 0 ? "Kritik hataları düzeltmeden taslak oluşturulamaz." : "Sorular veritabanına yalnızca bu butonla taslak olarak yazılır."}</p><button type="button" onClick={() => void createDraft()} disabled={!canCreate || creating} className={buttonClass + " border-red-700 bg-[var(--brand)] text-white"}>{creating ? "Taslak oluşturuluyor…" : "Denemeyi Taslak Olarak Oluştur"}</button></div>
    </>}
  </div>;
}

function ImportQuestionCard({ question, index, onUpdate, onRemove }: { question: ImportedQuestion; index: number; onUpdate: (id: string, patch: Partial<ImportedQuestion>) => void; onRemove: (id: string) => void }) {
  const options = [0, 1, 2, 3, 4];
  const displayedStatus = recomputeStatus(question);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{index + 1}</span><span className={"rounded-full border px-2.5 py-1 text-xs font-semibold " + statusClass(displayedStatus)}>{statusLabel(displayedStatus)}</span>{question.number !== index + 1 && <span className="text-xs text-slate-500">Kaynak numarası: {question.number}</span>}</div><p className="mt-2 text-xs text-slate-500">Paragraf ve soru kökü düzenlenebilir. Kaynaktan gelen soru bankasına eklenmez.</p></div><button type="button" onClick={() => onRemove(question.importId)} className={buttonClass + " border-red-200 bg-white text-red-700"}>Listeden çıkar</button></div>
    {question.warnings.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ul className="list-disc space-y-1 pl-5">{question.warnings.map((warning, warningIndex) => <li key={warning.code + warningIndex}>{warning.message}</li>)}</ul></div>}
    <div className="mt-3 grid gap-3"><label className="text-sm font-semibold text-slate-700">Paragraf<textarea className={fieldClass + " mt-1 min-h-32"} value={question.passageText} onChange={(event) => onUpdate(question.importId, { passageText: event.target.value })} /></label><label className="text-sm font-semibold text-slate-700">Soru metni<textarea className={fieldClass + " mt-1 min-h-20"} value={question.questionText} onChange={(event) => onUpdate(question.importId, { questionText: event.target.value })} /></label><div className="grid gap-2 md:grid-cols-2">{options.map((optionIndex) => <label key={optionIndex} className="text-sm font-semibold text-slate-700">Seçenek {String.fromCharCode(65 + optionIndex)}{optionIndex === 4 ? " (isteğe bağlı)" : ""}<input className={fieldClass + " mt-1"} value={question.options[optionIndex] ?? ""} onChange={(event) => { const next = [...question.options]; next[optionIndex] = event.target.value; const patch: Partial<ImportedQuestion> = { options: next }; if (optionIndex === 4 && !event.target.value.trim() && question.correctOption === 4) patch.correctOption = null; onUpdate(question.importId, patch); }} /></label>)}</div><div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Doğru cevap<select className={fieldClass + " mt-1"} value={question.correctOption ?? ""} onChange={(event) => onUpdate(question.importId, { correctOption: event.target.value === "" ? null : Number(event.target.value) })}><option value="">Seçin</option>{[0, 1, 2, 3].concat(question.options[4]?.trim() ? [4] : []).map((value) => <option key={value} value={value}>{String.fromCharCode(65 + value)}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Kategori<select className={fieldClass + " mt-1"} value={question.category} onChange={(event) => onUpdate(question.importId, { category: event.target.value as Category })}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Zorluk<select className={fieldClass + " mt-1"} value={question.difficulty} onChange={(event) => onUpdate(question.importId, { difficulty: event.target.value as Difficulty })}>{Object.entries(difficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="text-sm font-semibold text-slate-700">Açıklama<textarea className={fieldClass + " mt-1 min-h-20"} value={question.explanation} onChange={(event) => onUpdate(question.importId, { explanation: event.target.value })} /></label></div>
  </article>;
}
