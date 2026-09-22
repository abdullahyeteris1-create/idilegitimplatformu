"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { QuestionBankImportPreview, QuestionBankImportQuestion } from "@/lib/paragraph-exercises/paragraphQuestionBankImporter";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const buttonClass = "inline-flex min-h-[42px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const categoryLabels = { main_idea: "Ana düşünce", supporting_idea: "Yardımcı düşünce", inference: "Çıkarım", completion: "Paragraf tamamlama", flow: "Anlam akışı" } as const;
const difficultyLabels = { easy: "Kolay", medium: "Orta", hard: "Zor" } as const;
const gradeLabels = { "4-5": "4-5. sınıf", "6-7": "6-7. sınıf", "8": "8. sınıf", "high-school": "Lise" } as const;
const statusLabels = { ready: "Hazır", review: "Kontrol", error: "Hata", duplicate: "Mevcut" } as const;
const answerErrorCodes = new Set(["missing_answer", "invalid_answer", "answer_option_missing"]);

function hasCriticalError(question: QuestionBankImportQuestion): boolean {
  const options = question.options ?? [];
  const answerProblem = question.warnings.some((warning) => answerErrorCodes.has(warning.code)) && (
    question.correctOption === null || question.correctOption < 0 || question.correctOption >= options.length
  );
  return !question.questionText.trim() || options.length < 4 || options.slice(0, 4).some((option) => !option.trim()) ||
    (options[4] !== undefined && options[4].trim() === "" && options.length > 4) ||
    (question.passageText.trim().length > 0 && question.passageText.trim().length < 10) ||
    question.correctOption === null || question.correctOption < 0 || question.correctOption >= options.filter((option, index) => index < 4 || option.trim()).length || answerProblem;
}

function displayedStatus(question: QuestionBankImportQuestion): QuestionBankImportQuestion["status"] {
  if (hasCriticalError(question)) return "error";
  if (question.status === "duplicate") return "duplicate";
  return question.warnings.length > 0 ? "review" : "ready";
}

function statusClass(status: QuestionBankImportQuestion["status"]): string {
  return status === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "review" ? "border-amber-200 bg-amber-50 text-amber-800" : status === "duplicate" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-red-200 bg-red-50 text-red-800";
}

function withDefaultSelection(preview: QuestionBankImportPreview): Set<string> {
  return new Set(preview.questions.filter((question) => {
    const status = displayedStatus(question);
    return status !== "error" && status !== "duplicate";
  }).map((question) => question.importId));
}

export default function QuestionBankImportClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuestionBankImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const counts = useMemo(() => {
    const questions = preview?.questions ?? [];
    const selectedQuestions = questions.filter((question) => selected.has(question.importId));
    return {
      total: questions.length,
      ready: questions.filter((question) => displayedStatus(question) === "ready").length,
      review: questions.filter((question) => displayedStatus(question) === "review").length,
      error: questions.filter((question) => displayedStatus(question) === "error").length,
      duplicate: questions.filter((question) => displayedStatus(question) === "duplicate").length,
      selected: selectedQuestions.length,
      selectedErrors: selectedQuestions.filter((question) => displayedStatus(question) === "error").length,
      selectedDuplicates: selectedQuestions.filter((question) => displayedStatus(question) === "duplicate").length,
    };
  }, [preview, selected]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setSelected(new Set());
    setError("");
    setMessage("");
  }

  function updateQuestion(importId: string, patch: Partial<QuestionBankImportQuestion>): void {
    setPreview((current) => {
      if (!current) return current;
      const target = current.questions.find((question) => question.importId === importId);
      const sharedGroupId = target?.sharedGroupId;
      const questions = current.questions.map((question) => {
        if (patch.passageText !== undefined && sharedGroupId && question.sharedGroupId === sharedGroupId) return { ...question, passageText: patch.passageText };
        return question.importId === importId ? { ...question, ...patch } : question;
      });
      const sharedGroups = patch.passageText !== undefined && sharedGroupId
        ? current.sharedGroups.map((group) => group.id === sharedGroupId ? { ...group, passageText: patch.passageText ?? group.passageText } : group)
        : current.sharedGroups;
      return { ...current, questions, sharedGroups };
    });
  }

  function updateSharedGroup(groupId: string, passageText: string): void {
    setPreview((current) => current ? {
      ...current,
      sharedGroups: current.sharedGroups.map((group) => group.id === groupId ? { ...group, passageText } : group),
      questions: current.questions.map((question) => question.sharedGroupId === groupId ? { ...question, passageText } : question),
    } : current);
  }

  function toggleQuestion(importId: string, checked: boolean): void {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(importId); else next.delete(importId);
      return next;
    });
  }

  async function parseFile(): Promise<void> {
    if (!file || loading) return;
    setLoading(true); setError(""); setMessage(""); setPreview(null); setSelected(new Set());
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/admin/paragraph-questions/import/parse", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "DOCX işlenemedi.");
      const nextPreview = data.preview as QuestionBankImportPreview;
      setPreview(nextPreview); setSelected(withDefaultSelection(nextPreview));
      setMessage("Dosya işlendi. Kaydetmeden önce soru kartlarını kontrol edin.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "DOCX işlenemedi.");
    } finally { setLoading(false); }
  }

  async function importSelected(): Promise<void> {
    if (!preview || counts.selected === 0 || counts.selectedErrors > 0 || counts.selectedDuplicates > 0 || creating) return;
    setCreating(true); setError(""); setMessage("");
    try {
      const questions = preview.questions.filter((question) => selected.has(question.importId)).map((question) => ({
        passage: question.passageText,
        question: question.questionText,
        options: question.options[4]?.trim() ? question.options.slice(0, 5) : question.options.slice(0, 4),
        correctIndex: question.correctOption,
        explanation: question.explanation,
        category: question.category,
        difficulty: question.difficulty,
        gradeBand: question.gradeBand,
      }));
      const response = await fetch("/api/admin/paragraph-questions/import/create", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ questions }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Sorular eklenemedi.");
      setMessage(`${data.count ?? counts.selected} soru başarıyla soru bankasına eklendi.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sorular eklenemedi.");
    } finally { setCreating(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-semibold tracking-tight text-slate-950">Dosyadan Soru Ekle</h2><p className="mt-1 text-sm text-slate-600">Yalnızca DOCX. Sorular sunucuda okunur; siz seçmeden soru bankasına yazılmaz.</p></div>
      <Link href="/ogretmen/icerik-yonetimi/paragraf-sorulari" className="inline-flex min-h-[42px] items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700">Soru bankasına git</Link>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><label className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700"><input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={chooseFile} /><span>{file ? file.name : "DOCX dosyası seçin (en fazla 10 MB)"}</span></label><button type="button" onClick={() => void parseFile()} disabled={!file || loading} className={buttonClass + " border-slate-900 bg-slate-900 text-white"}>{loading ? "Okunuyor…" : "Dosyayı analiz et"}</button></div>{error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}</section>
    {preview && <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Analiz özeti</p><p className="mt-1 text-sm text-slate-700">{preview.fileName} · Toplam: {counts.total} · Cevap: {preview.answerCount}</p></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">Hazır: {counts.ready}</span><span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">Kontrol: {counts.review}</span><span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-800">Hata: {counts.error}</span><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-800">Mevcut: {counts.duplicate}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">Seçili: {counts.selected}</span></div></div>{preview.sharedGroups.length > 0 && <div className="mt-4 space-y-3">{preview.sharedGroups.map((group) => <article key={group.id} className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-blue-800">ORTAK İÇERİK</p><p className="mt-1 text-sm font-semibold text-blue-950">Sorular {group.questionNumbers.join(", ")} · {group.questionNumbers.length} soru</p><textarea className={fieldClass + " mt-3 min-h-28"} value={group.passageText} onChange={(event) => updateSharedGroup(group.id, event.target.value)} aria-label={`Ortak içerik soruları ${group.questionNumbers.join(", ")}`} /></article>)}</div>}{preview.warnings.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Belge uyarıları</p><ul className="mt-1 list-disc space-y-1 pl-5">{preview.warnings.map((warning, index) => <li key={warning.code + index}>{warning.message}</li>)}</ul></div>}</section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2"><button type="button" className={buttonClass + " border-slate-200 bg-white text-slate-700"} onClick={() => setSelected(new Set(preview.questions.filter((question) => displayedStatus(question) !== "error" && displayedStatus(question) !== "duplicate").map((question) => question.importId)))}>Tümünü seç</button><button type="button" className={buttonClass + " border-slate-200 bg-white text-slate-700"} onClick={() => setSelected(new Set())}>Seçimi temizle</button></div><div className="flex items-center gap-3"><p className="text-sm text-slate-600">{counts.selected} soru soru bankasına eklenecek.</p><button type="button" onClick={() => void importSelected()} disabled={counts.selected === 0 || counts.selectedErrors > 0 || counts.selectedDuplicates > 0 || creating} className={buttonClass + " border-red-700 bg-[var(--brand)] text-white"}>{creating ? "Ekleniyor…" : "Seçili Soruları Soru Bankasına Ekle"}</button></div></div>
      <div className="space-y-3">{preview.questions.map((question, index) => <QuestionCard key={question.importId} question={question} index={index} selected={selected.has(question.importId)} onSelect={toggleQuestion} onUpdate={updateQuestion} />)}</div>
    </>}
  </div>;
}

function QuestionCard({ question, index, selected, onSelect, onUpdate }: { question: QuestionBankImportQuestion; index: number; selected: boolean; onSelect: (id: string, checked: boolean) => void; onUpdate: (id: string, patch: Partial<QuestionBankImportQuestion>) => void }) {
  const status = displayedStatus(question);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300" checked={selected} onChange={(event) => onSelect(question.importId, event.target.checked)} /><span><span className="flex flex-wrap items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{index + 1}</span><span className={"rounded-full border px-2.5 py-1 text-xs font-semibold " + statusClass(status)}>{statusLabels[status]}</span>{question.number !== index + 1 && <span className="text-xs text-slate-500">Kaynak numarası: {question.number}</span>}</span><span className="mt-2 block text-xs text-slate-500">Doğru Cevap: {question.correctOption === null ? "—" : String.fromCharCode(65 + question.correctOption)}{question.duplicateId ? ` · Mevcut kayıt: ${question.duplicateId}` : ""}</span></span></label></div>{question.warnings.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ul className="list-disc space-y-1 pl-5">{question.warnings.map((warning, warningIndex) => <li key={warning.code + warningIndex}>{warning.message}</li>)}</ul></div>}<div className="mt-3 grid gap-3"><label className="text-sm font-semibold text-slate-700">Paragraf / içerik<textarea className={fieldClass + " mt-1 min-h-28"} value={question.passageText} onChange={(event) => onUpdate(question.importId, { passageText: event.target.value })} /></label><label className="text-sm font-semibold text-slate-700">Soru metni<textarea className={fieldClass + " mt-1 min-h-20"} value={question.questionText} onChange={(event) => onUpdate(question.importId, { questionText: event.target.value })} /></label><div className="grid gap-2 md:grid-cols-2">{[0, 1, 2, 3, 4].map((optionIndex) => <label key={optionIndex} className="text-sm font-semibold text-slate-700">Seçenek {String.fromCharCode(65 + optionIndex)}{optionIndex === 4 ? " (isteğe bağlı)" : ""}<input className={fieldClass + " mt-1"} value={question.options[optionIndex] ?? ""} onChange={(event) => { const options = [...question.options]; options[optionIndex] = event.target.value; const patch: Partial<QuestionBankImportQuestion> = { options }; if (!event.target.value.trim() && question.correctOption === optionIndex) patch.correctOption = null; onUpdate(question.importId, patch); }} /></label>)}</div><div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Doğru cevap<select className={fieldClass + " mt-1"} value={question.correctOption ?? ""} onChange={(event) => onUpdate(question.importId, { correctOption: event.target.value === "" ? null : Number(event.target.value) })}><option value="">Seçin</option>{[0, 1, 2, 3].concat(question.options[4]?.trim() ? [4] : []).map((value) => <option key={value} value={value}>{String.fromCharCode(65 + value)}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Kategori<select className={fieldClass + " mt-1"} value={question.category} onChange={(event) => onUpdate(question.importId, { category: event.target.value as QuestionBankImportQuestion["category"] })}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Zorluk<select className={fieldClass + " mt-1"} value={question.difficulty} onChange={(event) => onUpdate(question.importId, { difficulty: event.target.value as QuestionBankImportQuestion["difficulty"] })}>{Object.entries(difficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="text-sm font-semibold text-slate-700">Sınıf düzeyi<select className={fieldClass + " mt-1"} value={question.gradeBand} onChange={(event) => onUpdate(question.importId, { gradeBand: event.target.value as QuestionBankImportQuestion["gradeBand"] })}>{Object.entries(gradeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Açıklama<textarea className={fieldClass + " mt-1 min-h-20"} value={question.explanation} onChange={(event) => onUpdate(question.importId, { explanation: event.target.value })} /></label></div></article>;
}
