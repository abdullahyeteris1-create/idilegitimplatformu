"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { countCharacters, countWords, getTextLibraryItems, type TextLibraryItem } from "@/lib/settings/textLibraryStorage";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  updateQuestion,
  type ComprehensionQuestion,
  refreshQuestionLibraryCache,
} from "@/lib/settings/questionLibraryStorage";

type QuestionFormState = {
  question: string;
  options: string[];
  correctAnswerIndex: number | null;
  explanation: string;
  isActive: boolean;
};

const DEFAULT_OPTION_COUNT = 4;
const MIN_OPTION_COUNT = 2;
const MAX_OPTION_COUNT = 6;

function createEmptyForm(): QuestionFormState {
  return {
    question: "",
    options: Array.from({ length: DEFAULT_OPTION_COUNT }, () => ""),
    correctAnswerIndex: null,
    explanation: "",
    isActive: true,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

export function AnlamaTestiOlusturClient() {
  const [texts, setTexts] = useState<TextLibraryItem[]>([]);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTextId, setSelectedTextId] = useState("");
  const [form, setForm] = useState<QuestionFormState>(createEmptyForm());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        await refreshQuestionLibraryCache();
        const nextTexts = getTextLibraryItems();
        const nextQuestions = getQuestions();

        setTexts(nextTexts);
        setQuestions(nextQuestions);
        setSelectedTextId((current) => current || nextTexts[0]?.id || "");
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const categories = useMemo(() => Array.from(new Set(texts.map((item) => item.category))).sort((left, right) => left.localeCompare(right, "tr")), [texts]);

  const filteredTexts = useMemo(() => {
    return texts.filter((item) => categoryFilter === "all" || item.category === categoryFilter);
  }, [categoryFilter, texts]);

  const selectedText = useMemo(() => {
    return texts.find((item) => item.id === selectedTextId) ?? filteredTexts[0] ?? null;
  }, [filteredTexts, selectedTextId, texts]);

  const selectedTextQuestions = useMemo(() => {
    if (!selectedText) {
      return [];
    }

    return questions
      .filter((question) => question.textId === selectedText.id)
      .sort((left, right) => (left.questionOrder ?? 0) - (right.questionOrder ?? 0) || left.createdAt.localeCompare(right.createdAt));
  }, [questions, selectedText]);

  useEffect(() => {
    if (!selectedText && filteredTexts.length > 0) {
      const timeoutId = window.setTimeout(() => {
        setSelectedTextId(filteredTexts[0].id);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [filteredTexts, selectedText]);

  useEffect(() => {
    if (!selectedText) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setForm(createEmptyForm());
      setEditingQuestionId(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedText, selectedTextId]);

  const activeTextsCount = useMemo(() => texts.filter((item) => item.isActive).length, [texts]);

  const selectedTextStats = selectedText
    ? {
        wordCount: countWords(selectedText.content),
        characterCount: countCharacters(selectedText.content),
        isActive: selectedText.isActive,
      }
    : null;

  const canSave = Boolean(
    selectedText &&
      form.question.trim() &&
      normalizeOptions(form.options).length >= MIN_OPTION_COUNT &&
      normalizeOptions(form.options).length <= MAX_OPTION_COUNT &&
      form.options.every((option) => option.trim()) &&
      form.correctAnswerIndex !== null &&
      form.correctAnswerIndex >= 0 &&
      form.correctAnswerIndex < form.options.length &&
      form.options[form.correctAnswerIndex]?.trim(),
  );

  function openCreateForm(): void {
    setEditingQuestionId(null);
    setForm(createEmptyForm());
  }

  function openEditForm(question: ComprehensionQuestion): void {
    setEditingQuestionId(question.id);
    setForm({
      question: question.question,
      options: question.options.length >= MIN_OPTION_COUNT ? [...question.options] : [...question.options, ""],
      correctAnswerIndex: Math.max(0, question.options.findIndex((option) => option === question.correctAnswer)),
      explanation: question.explanation ?? "",
      isActive: question.isActive,
    });
  }

  function updateFormOption(index: number, value: string): void {
    setForm((current) => {
      const nextOptions = [...current.options];
      nextOptions[index] = value;
      return { ...current, options: nextOptions };
    });
  }

  function addOption(): void {
    setForm((current) => {
      if (current.options.length >= MAX_OPTION_COUNT) {
        return current;
      }

      return { ...current, options: [...current.options, ""] };
    });
  }

  function removeOption(index: number): void {
    setForm((current) => {
      if (current.options.length <= MIN_OPTION_COUNT) {
        return current;
      }

      const nextOptions = current.options.filter((_, optionIndex) => optionIndex !== index);
      let nextCorrectIndex = current.correctAnswerIndex;

      if (nextCorrectIndex === index) {
        nextCorrectIndex = null;
      } else if (nextCorrectIndex !== null && nextCorrectIndex > index) {
        nextCorrectIndex -= 1;
      }

      return { ...current, options: nextOptions, correctAnswerIndex: nextCorrectIndex };
    });
  }

  function resetForm(): void {
    setForm(createEmptyForm());
    setEditingQuestionId(null);
  }

  function refreshQuestions(): void {
    setQuestions(getQuestions());
  }

  function saveQuestion(): void {
    if (!selectedText || !canSave || form.correctAnswerIndex === null) {
      return;
    }

    const normalizedOptions = normalizeOptions(form.options);
    const correctAnswer = normalizedOptions[form.correctAnswerIndex];

    if (!correctAnswer) {
      return;
    }

    if (editingQuestionId) {
      updateQuestion(editingQuestionId, {
        textId: selectedText.id,
        question: form.question.trim(),
        options: normalizedOptions,
        correctAnswer,
        explanation: form.explanation.trim() || undefined,
        isActive: form.isActive,
      });
    } else {
      createQuestion({
        textId: selectedText.id,
        question: form.question.trim(),
        options: normalizedOptions,
        correctAnswer,
        explanation: form.explanation.trim() || undefined,
        isActive: form.isActive,
      });
    }

    refreshQuestions();
    resetForm();
  }

  function handleDeleteQuestion(question: ComprehensionQuestion): void {
    const isConfirmed = window.confirm("Bu soruyu silmek istediğinizden emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    deleteQuestion(question.id);
    refreshQuestions();

    if (editingQuestionId === question.id) {
      resetForm();
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Okuma ve Anlama Testleri</p>
            <h2 className="mt-0.5 text-[24px] font-semibold tracking-tight text-slate-950 md:text-[28px]">Anlama Testi Oluştur</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Metin seçin, bu metne sorular ve cevap seçenekleri ekleyin.</p>
          </div>
          <Link
            href="/ogretmen/icerik-yonetimi"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Geri Dön
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Metin</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{texts.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Aktif Metin</p>
            <p className="mt-1 text-lg font-semibold text-green-700">{activeTextsCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Soru</p>
            <p className="mt-1 text-lg font-semibold text-indigo-700">{questions.length}</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Kategori Filtresi
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Metin Seç
            <select
              value={selectedTextId}
              onChange={(event) => setSelectedTextId(event.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              {filteredTexts.length === 0 ? <option value="">Metin bulunamadı</option> : null}
              {filteredTexts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedText && selectedTextStats ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <article>
              <p className="text-xs text-slate-500">Metin Başlığı</p>
              <p className="mt-1 font-semibold text-slate-950">{selectedText.title}</p>
            </article>
            <article>
              <p className="text-xs text-slate-500">Kategori</p>
              <p className="mt-1 font-semibold text-slate-950">{selectedText.category}</p>
            </article>
            <article>
              <p className="text-xs text-slate-500">Kelime Sayısı</p>
              <p className="mt-1 font-semibold text-slate-950">{selectedTextStats.wordCount}</p>
            </article>
            <article>
              <p className="text-xs text-slate-500">Karakter Sayısı</p>
              <p className="mt-1 font-semibold text-slate-950">{selectedTextStats.characterCount}</p>
            </article>
            <article className="sm:col-span-2">
              <p className="text-xs text-slate-500">Durum</p>
              <p className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${selectedTextStats.isActive ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {selectedTextStats.isActive ? "Aktif" : "Pasif"}
              </p>
            </article>
          </div>
        ) : null}

        {selectedText && !selectedText.isActive ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Bu metin pasif durumda. Öğrenci test ekranında görünmez.
          </div>
        ) : null}

        {!selectedText ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Metin Kütüphanesi&apos;nde seçilecek içerik bulunmuyor.</div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Seçilen Metnin Soruları</p>
            <h3 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950">Soru Yönetimi</h3>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Yeni Soru Ekle
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Soru Formu</p>
              <p className="mt-1 text-sm text-slate-600">Soru metnini yazın, ardından 2-6 şık belirleyin.</p>
            </div>
            {editingQuestionId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Formu Sıfırla
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Soru Metni
              <textarea
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                className="min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                placeholder="Soruyu buraya yazın..."
              />
            </label>

            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">Şıklar</p>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={form.options.length >= MAX_OPTION_COUNT}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Şık Ekle
                </button>
              </div>

              <div className="grid gap-3">
                {form.options.map((option, index) => {
                  const isCorrect = form.correctAnswerIndex === index;

                  return (
                    <div key={`${index}-${option}`} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Şık {index + 1}
                        <input
                          value={option}
                          onChange={(event) => updateFormOption(index, event.target.value)}
                          className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                          placeholder={`Şık ${index + 1}`}
                        />
                      </label>

                      <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={isCorrect}
                          onChange={() => setForm((current) => ({ ...current, correctAnswerIndex: index }))}
                          className="h-4 w-4 accent-red-700"
                        />
                        Doğru Cevap
                      </label>

                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={form.options.length <= MIN_OPTION_COUNT}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Şık Sil
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Açıklama
              <textarea
                value={form.explanation}
                onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
                className="min-h-[96px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                placeholder="İsteğe bağlı çözüm notu..."
              />
            </label>

            <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 accent-red-700"
              />
              Aktif
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveQuestion}
                disabled={!canSave}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingQuestionId ? "Güncelle" : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {selectedTextQuestions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Bu metin için henüz soru eklenmemiş.</div>
          ) : (
            selectedTextQuestions.map((question, index) => (
              <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Soru {index + 1}</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-950">{question.question}</h4>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${question.isActive ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {question.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="text-sm text-slate-600">Şık Sayısı: <span className="font-semibold text-slate-950">{question.options.length}</span></p>
                  <p className="text-sm text-slate-600">Doğru Cevap: <span className="font-semibold text-slate-950">{question.correctAnswer}</span></p>
                </div>

                {question.explanation ? <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{question.explanation}</p> : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(question)}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(question)}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {question.options.map((option) => (
                    <div key={option} className={`rounded-xl border px-3 py-2 text-sm ${option === question.correctAnswer ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      {option}
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-slate-500">Oluşturulma: {formatDate(question.createdAt)} · Güncelleme: {formatDate(question.updatedAt)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
