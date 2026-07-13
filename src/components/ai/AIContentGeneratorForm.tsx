"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  CONTENT_LENGTHS,
  CONTENT_TYPES,
  DIFFICULTIES,
  GRADE_LEVELS,
  type ContentGeneratorRequest,
  type GeneratedContent,
} from "@/lib/ai/contentGeneratorTypes";
import styles from "./AIContentGeneratorForm.module.css";

const LENGTH_LABELS = { short: "Kısa (150-250 kelime)", medium: "Orta (300-450 kelime)", long: "Uzun (500-700 kelime)" } as const;
const DIFFICULTY_LABELS = { easy: "Kolay", medium: "Orta", hard: "Zor" } as const;
const TYPE_LABELS = {
  informative: "Bilgilendirici",
  story: "Hikâye",
  "general-culture": "Genel kültür",
  scientific: "Bilimsel",
  "daily-life": "Günlük yaşam",
} as const;

const initialForm: ContentGeneratorRequest = {
  gradeLevel: "4. sınıf",
  topic: "",
  length: "medium",
  difficulty: "medium",
  questionCount: 5,
  contentType: "informative",
};

const inputClassName = `${styles.fieldControl} mt-1.5 min-h-[44px] w-full rounded-xl border px-3 py-2.5 text-sm transition`;
const textareaClassName = `${inputClassName} min-h-[110px] resize-y`;
const selectClassName = `${inputClassName} ${styles.selectControl}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readError(value: unknown): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : "İçerik hazırlanırken bir sorun oluştu.";
}

function isValidDraft(draft: GeneratedContent | null): draft is GeneratedContent {
  if (!draft || !draft.title.trim() || !draft.content.trim() || !draft.summary.trim()) return false;
  if (draft.targetWords.length < 1 || draft.targetWords.length > 8) return false;
  const normalizedContent = draft.content.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/\s+/gu, " ");
  if (!draft.targetWords.every((target) => {
    const word = target.word.normalize("NFKC").toLocaleLowerCase("tr-TR").trim();
    return Boolean(word && target.meaning.trim() && normalizedContent.includes(word));
  })) return false;
  if (draft.questions.length < 1 || draft.questions.length > 10) return false;
  return draft.questions.every((question) =>
    question.question.trim().length > 0 &&
    question.options.length === 4 &&
    question.options.every((option) => option.trim().length > 0) &&
    Number.isInteger(question.correctOptionIndex) &&
    question.correctOptionIndex >= 0 &&
    question.correctOptionIndex <= 3 &&
    question.explanation.trim().length > 0,
  );
}

export function AIContentGeneratorForm() {
  const [form, setForm] = useState<ContentGeneratorRequest>(initialForm);
  const [draft, setDraft] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (loading) return;
    const topic = form.topic.trim();
    if (topic.length < 3 || topic.length > 150 || form.questionCount < 3 || form.questionCount > 10) {
      setError("İçerik bilgilerini kontrol edin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/content-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, topic }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(body) || body.ok !== true || !isRecord(body.content)) {
        setError(readError(body));
        return;
      }
      setDraft(body.content as GeneratedContent);
      setSavedDraftId(null);
      setSaveStatus(null);
    } catch {
      setError("İçerik hazırlanırken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = <K extends keyof GeneratedContent>(key: K, value: GeneratedContent[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setSaveStatus(null);
  };

  const saveDraft = async () => {
    if (isSaving || !isValidDraft(draft)) {
      setSaveStatus({ tone: "error", message: "Taslak bilgilerini kontrol edin." });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch("/api/admin/content-drafts", {
        method: savedDraftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(savedDraftId ? { draftId: savedDraftId } : {}),
          ...draft,
          gradeLevel: form.gradeLevel,
          difficulty: form.difficulty,
          contentType: form.contentType,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(body) || body.ok !== true || typeof body.draftId !== "string") {
        setSaveStatus({ tone: "error", message: isRecord(body) && typeof body.error === "string" ? body.error : "Taslak kaydedilemedi. Lütfen yeniden deneyin." });
        return;
      }

      setSavedDraftId(body.draftId);
      setSaveStatus({
        tone: "success",
        message: savedDraftId ? "Taslak başarıyla güncellendi." : "Taslak başarıyla kaydedildi.",
      });
    } catch {
      setSaveStatus({ tone: "error", message: "Taslak kaydedilemedi. Lütfen yeniden deneyin." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] xl:items-start">
      <form onSubmit={generate} className="min-w-0 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-4 shadow-sm md:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Yeni taslak</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--idil-text)]">İçerik bilgileri</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--idil-muted)]">Seviyeyi ve konuyu belirleyin; taslak yayımlanmadan önce düzenlenebilir.</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">
            Sınıf / yaş düzeyi
            <select className={selectClassName} value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value as ContentGeneratorRequest["gradeLevel"] })}>
              {GRADE_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)] sm:col-span-2 xl:col-span-1 2xl:col-span-2">
            Konu
            <input
              className={inputClassName}
              value={form.topic}
              minLength={3}
              maxLength={150}
              required
              placeholder="Örn. Uzay ve gezegenler"
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
            />
            <span className="mt-1 block text-right text-xs font-normal text-[var(--idil-muted)]">{form.topic.length}/150</span>
          </label>

          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">
            Metin uzunluğu
            <select className={selectClassName} value={form.length} onChange={(event) => setForm({ ...form, length: event.target.value as ContentGeneratorRequest["length"] })}>
              {CONTENT_LENGTHS.map((item) => <option key={item} value={item}>{LENGTH_LABELS[item]}</option>)}
            </select>
          </label>

          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">
            Zorluk
            <select className={selectClassName} value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as ContentGeneratorRequest["difficulty"] })}>
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABELS[item]}</option>)}
            </select>
          </label>

          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">
            Soru sayısı
            <input className={inputClassName} type="number" min={3} max={10} step={1} value={form.questionCount} onChange={(event) => setForm({ ...form, questionCount: Number(event.target.value) })} />
          </label>

          <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">
            İçerik türü
            <select className={selectClassName} value={form.contentType} onChange={(event) => setForm({ ...form, contentType: event.target.value as ContentGeneratorRequest["contentType"] })}>
              {CONTENT_TYPES.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}
            </select>
          </label>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{error}</p> : null}

        <button type="submit" disabled={loading} className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {loading ? "İçerik hazırlanıyor..." : "İçerik Oluştur"}
        </button>
      </form>

      <section className="min-w-0 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Öğretmen önizlemesi</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--idil-text)]">Düzenlenebilir taslak</h2>
          </div>
          {draft ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Yayımlanmadı</span> : null}
        </div>

        {!draft ? (
          <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[var(--idil-border)] bg-[var(--idil-surface)] p-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-sm font-black text-red-700">AI</span>
              <p className="mt-3 font-semibold text-[var(--idil-text)]">Taslak henüz oluşturulmadı</p>
              <p className="mt-1 text-sm leading-5 text-[var(--idil-muted)]">Formu doldurduğunuzda metin, hedef kelimeler ve sorular burada görünecek.</p>
              <button type="button" disabled className="mt-4 min-h-[44px] cursor-not-allowed rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface-soft)] px-4 py-2 text-sm font-bold text-[var(--idil-muted)] opacity-60">Taslak Olarak Kaydet</button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid min-w-0 gap-5">
            <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">Başlık
              <input className={inputClassName} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">Metin
              <textarea className={`${textareaClassName} min-h-[300px]`} value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-[var(--idil-text)]">Kısa özet
              <textarea className={textareaClassName} value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} />
            </label>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[var(--idil-text)]">Hedef kelimeler</h3>
                <span className="text-xs text-[var(--idil-muted)]">{draft.targetWords.length}/8</span>
              </div>
              <div className="mt-2 grid gap-2">
                {draft.targetWords.map((target, index) => (
                  <div key={index} className="grid min-w-0 gap-2 rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] p-3 sm:grid-cols-[0.7fr_1.3fr_auto]">
                    <input aria-label={`${index + 1}. hedef kelime`} className={`${inputClassName} mt-0`} value={target.word} onChange={(event) => updateDraft("targetWords", draft.targetWords.map((item, itemIndex) => itemIndex === index ? { ...item, word: event.target.value } : item))} />
                    <input aria-label={`${index + 1}. hedef kelime anlamı`} className={`${inputClassName} mt-0`} value={target.meaning} onChange={(event) => updateDraft("targetWords", draft.targetWords.map((item, itemIndex) => itemIndex === index ? { ...item, meaning: event.target.value } : item))} />
                    <button type="button" aria-label="Hedef kelimeyi kaldır" className="min-h-[42px] rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => updateDraft("targetWords", draft.targetWords.filter((_, itemIndex) => itemIndex !== index))}>Sil</button>
                  </div>
                ))}
              </div>
              <button type="button" disabled={draft.targetWords.length >= 8} className="mt-2 rounded-lg border border-[var(--idil-border)] px-3 py-2 text-sm font-semibold text-[var(--idil-text)] disabled:opacity-50" onClick={() => updateDraft("targetWords", [...draft.targetWords, { word: "", meaning: "" }])}>+ Kelime ekle</button>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--idil-text)]">Sorular</h3>
              <div className="mt-2 grid gap-4">
                {draft.questions.map((question, questionIndex) => (
                  <article key={questionIndex} className="min-w-0 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-surface)] p-3 sm:p-4">
                    <label className="text-sm font-semibold text-[var(--idil-text)]">{questionIndex + 1}. soru
                      <textarea className={textareaClassName} value={question.question} onChange={(event) => updateDraft("questions", draft.questions.map((item, index) => index === questionIndex ? { ...item, question: event.target.value } : item))} />
                    </label>
                    <div className="mt-3 grid gap-2">
                      {question.options.map((option, optionIndex) => (
                        <label key={optionIndex} className={`grid min-w-0 grid-cols-[auto_1fr] items-center gap-2 rounded-xl border p-2 ${question.correctOptionIndex === optionIndex ? "border-green-400 bg-green-500/10" : "border-[var(--idil-border)]"}`}>
                          <input type="radio" name={`correct-${questionIndex}`} checked={question.correctOptionIndex === optionIndex} onChange={() => updateDraft("questions", draft.questions.map((item, index) => index === questionIndex ? { ...item, correctOptionIndex: optionIndex } : item))} />
                          <input aria-label={`${questionIndex + 1}. soru ${optionIndex + 1}. seçenek`} className={`${styles.fieldControl} ${styles.answerOption} min-w-0 border-0 bg-transparent px-1 py-1.5 text-sm outline-none`} value={option} onChange={(event) => {
                            const options = [...question.options] as [string, string, string, string];
                            options[optionIndex] = event.target.value;
                            updateDraft("questions", draft.questions.map((item, index) => index === questionIndex ? { ...item, options } : item));
                          }} />
                        </label>
                      ))}
                    </div>
                    <label className="mt-3 block text-sm font-semibold text-[var(--idil-text)]">Cevap açıklaması
                      <textarea className={textareaClassName} value={question.explanation} onChange={(event) => updateDraft("questions", draft.questions.map((item, index) => index === questionIndex ? { ...item, explanation: event.target.value } : item))} />
                    </label>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={loading} onClick={() => void generate()} className="min-h-[44px] rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Yeniden Oluştur</button>
              <button type="button" disabled={isSaving} onClick={() => { setDraft(null); setError(null); setSavedDraftId(null); setSaveStatus(null); }} className="min-h-[44px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-60">Taslağı Temizle</button>
              <button
                type="button"
                disabled={!isValidDraft(draft) || isSaving || loading}
                onClick={() => void saveDraft()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-green-700/20 bg-green-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                {isSaving ? "Taslak kaydediliyor..." : savedDraftId ? "Taslağı Güncelle" : "Taslak Olarak Kaydet"}
              </button>
            </div>
            {saveStatus ? (
              <div className={`rounded-xl border px-3 py-3 text-sm ${saveStatus.tone === "success" ? "border-green-300 bg-green-500/10 text-[var(--idil-text)]" : "border-red-300 bg-red-500/10 text-[var(--idil-text)]"}`} role="status">
                <p className="font-semibold">{saveStatus.message}</p>
                {saveStatus.tone === "success" ? (
                  <>
                    <p className="mt-1">Bu içerik taslak olarak kaydedildi. Öğrencilere açılmamıştır.</p>
                    <Link href="/ogretmen/icerik-yonetimi/metin-kutuphanesi" className="mt-2 inline-flex font-bold text-[var(--idil-accent)] underline underline-offset-2">İçerik Yönetimine Git</Link>
                  </>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs leading-5 text-[var(--idil-muted)]">Metin ve sorular mevcut kütüphanelere pasif taslak olarak kaydedilir. İçerik otomatik yayımlanmaz.</p>
          </div>
        )}
      </section>
    </div>
  );
}
