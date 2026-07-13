"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TEXT_CATEGORY,
  TEXT_LIBRARY_CATEGORIES,
  countCharacters,
  countWords,
  deleteTextLibraryItemAndSync,
  getTextCategories,
  getTextLibraryItems,
  normalizeCategoryName,
  refreshTextLibraryCache,
  saveTextLibraryItemAndSync,
  toggleTextLibraryItemActiveAndSync,
  updateTextLibraryItemAndSync,
  type TextLibraryItem,
} from "@/lib/settings/textLibraryStorage";
import {
  activateQuestionSetIfAllInactiveAndSync,
  setQuestionsActiveByTextIdAndSync,
} from "@/lib/settings/questionLibraryStorage";

type TextFormState = {
  title: string;
  category: string;
  content: string;
  isActive: boolean;
};

type BulkPreviewItem = {
  order: number;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  preview: string;
  warnings: string[];
  canImport: boolean;
  imported: boolean;
};

const EMPTY_FORM: TextFormState = {
  title: "",
  category: DEFAULT_TEXT_CATEGORY,
  content: "",
  isActive: true,
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getShortPreview(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 120)}...`;
}

function splitBulkBlocks(raw: string): string[] {
  return raw
    .split(/\r?\n\s*---\s*\r?\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function normalizeTitleLookup(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function parseBlockToPreviewItem(block: string, order: number, existingTitleSet: Set<string>): BulkPreviewItem {
  const lines = block.split(/\r?\n/);
  const titleRegex = /^\s*ba(?:ş|s)l(?:ı|i|İ|I)k\s*:\s*(.*)$/i;
  const categoryRegex = /^\s*kategor(?:i|ı|İ|I)\s*:\s*(.*)$/i;
  const contentRegex = /^\s*met(?:i|ı|İ|I)n\s*:\s*(.*)$/i;

  let rawTitle = "";
  let rawCategory = "";
  let contentLines: string[] = [];
  let hasContentMarker = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const titleMatch = line.match(titleRegex);
    const categoryMatch = line.match(categoryRegex);
    const contentMatch = line.match(contentRegex);

    if (titleMatch && !rawTitle) {
      rawTitle = titleMatch[1]?.trim() ?? "";
      continue;
    }

    if (categoryMatch && !rawCategory) {
      rawCategory = categoryMatch[1]?.trim() ?? "";
      continue;
    }

    if (contentMatch) {
      hasContentMarker = true;
      const firstContentLine = contentMatch[1]?.trim() ?? "";
      if (firstContentLine) {
        contentLines.push(firstContentLine);
      }
      contentLines = [...contentLines, ...lines.slice(i + 1)];
      break;
    }
  }

  if (!hasContentMarker) {
    contentLines = lines.filter((line) => !titleRegex.test(line) && !categoryRegex.test(line));
  }

  const title = rawTitle || `Metin ${order}`;
  const category = normalizeCategoryName(rawCategory || DEFAULT_TEXT_CATEGORY);
  const content = contentLines.join("\n").trim();
  const wordCount = countWords(content);
  const warnings: string[] = [];
  const normalizedTitle = normalizeTitleLookup(title);

  if (!content) {
    warnings.push("Bos icerik");
  }

  if (content.length > 0 && content.length < 100) {
    warnings.push("100 karakterden kisa");
  }

  if (existingTitleSet.has(normalizedTitle)) {
    warnings.push("Ayni baslik var");
  }

  const canImport = content.length > 0 && !warnings.includes("Ayni baslik var");

  return {
    order,
    title,
    category,
    content,
    wordCount,
    preview: content.slice(0, 120),
    warnings,
    canImport,
    imported: false,
  };
}

function getBulkStatusLabel(item: BulkPreviewItem): string {
  if (item.imported) {
    return "Aktarildi";
  }

  if (item.warnings.includes("Bos icerik")) {
    return "Bos icerik";
  }

  if (item.warnings.includes("Ayni baslik var")) {
    return "Ayni baslik var";
  }

  if (item.warnings.includes("100 karakterden kisa")) {
    return "Kisa metin";
  }

  return "Hazir";
}

const BULK_SAMPLE_TEXT =
  "BASLIK: Balinalar\n" +
  "KATEGORI: Genel Kultur\n" +
  "METIN:\n" +
  "Balinalar denizlerde yasayan buyuk canlilardir...\n" +
  "---\n\n" +
  "BASLIK: Gulumsemek\n" +
  "KATEGORI: Hikayeler\n" +
  "METIN:\n" +
  "Gulumsemek insan iliskilerinde onemlidir...\n" +
  "---";

export function TextLibraryClient() {
  const [items, setItems] = useState<TextLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<TextFormState>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkPreviewItems, setBulkPreviewItems] = useState<BulkPreviewItem[]>([]);
  const [bulkResultMessage, setBulkResultMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bulkTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const stats = useMemo(() => {
    const activeCount = items.filter((item) => item.isActive).length;
    const categoryCount = new Set(items.map((item) => item.category)).size;

    return {
      total: items.length,
      active: activeCount,
      passive: items.length - activeCount,
      categories: Math.max(categoryCount, categories.length),
    };
  }, [categories.length, items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
        item.content.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "passive" && !item.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, items, searchTerm, statusFilter]);

  const formWordCount = countWords(form.content);
  const formCharacterCount = countCharacters(form.content);
  const bulkSummary = useMemo(() => {
    const total = bulkPreviewItems.length;
    const importable = bulkPreviewItems.filter((item) => item.canImport).length;
    const warningCount = bulkPreviewItems.filter((item) => item.warnings.length > 0).length;
    const duplicateCount = bulkPreviewItems.filter((item) => item.warnings.includes("Ayni baslik var")).length;
    const totalWords = bulkPreviewItems.reduce((sum, item) => sum + item.wordCount, 0);
    const skippedCount = total - importable;

    return { total, importable, warningCount, duplicateCount, totalWords, skippedCount };
  }, [bulkPreviewItems]);

  useEffect(() => {
    if (!isBulkImportOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      bulkTextareaRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(timeoutId);
  }, [isBulkImportOpen]);

  async function loadData(): Promise<void> {
    const result = await refreshTextLibraryCache();
    setItems(result.items.length > 0 ? result.items : getTextLibraryItems());
    setCategories(getTextCategories());
    if (result.error) {
      setStatusMessage({ tone: "error", text: result.error });
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function resetForm(): void {
    setForm({ ...EMPTY_FORM, category: DEFAULT_TEXT_CATEGORY });
    setEditingItemId(null);
    setIsFormOpen(false);
  }

  function openCreateForm(): void {
    setForm({ ...EMPTY_FORM, category: DEFAULT_TEXT_CATEGORY });
    setEditingItemId(null);
    setIsFormOpen(true);
  }

  function openBulkImportModal(): void {
    setBulkResultMessage("");
    setBulkPreviewItems([]);
    setIsBulkImportOpen(true);
  }

  function closeBulkImportModal(): void {
    setIsBulkImportOpen(false);
    setBulkInput("");
    setBulkPreviewItems([]);
    setBulkResultMessage("");
  }

  function openEditForm(item: TextLibraryItem): void {
    setForm({
      title: item.title,
      category: item.category,
      content: item.content,
      isActive: item.isActive,
    });
    setEditingItemId(item.id);
    setIsFormOpen(true);
  }

  async function saveForm(): Promise<void> {
    if (!form.title.trim() || !form.content.trim()) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    if (editingItemId) {
      const result = await updateTextLibraryItemAndSync(editingItemId, {
        title: form.title,
        category: form.category,
        content: form.content,
        isActive: form.isActive,
      });
      if (result.error) {
        setStatusMessage({ tone: "error", text: result.error });
      } else {
        setStatusMessage({ tone: "success", text: "Metin Supabase'e kaydedildi." });
      }
    } else {
      const result = await saveTextLibraryItemAndSync({
        title: form.title,
        category: form.category,
        content: form.content,
        isActive: form.isActive,
      });
      if (result.error) {
        setStatusMessage({ tone: "error", text: result.error });
      } else {
        setStatusMessage({ tone: "success", text: "Metin Supabase'e kaydedildi." });
      }
    }

    await loadData();
    resetForm();
    setIsSaving(false);
  }

  async function handleDelete(item: TextLibraryItem): Promise<void> {
    const isConfirmed = window.confirm("Bu metni silmek istediginize emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    const result = await deleteTextLibraryItemAndSync(item.id);
    if (result.error) {
      setStatusMessage({ tone: "error", text: result.error });
    } else {
      setStatusMessage({ tone: "success", text: "Metin Supabase'den silindi." });
    }
    await loadData();
    setIsSaving(false);
  }

  async function handleToggleActive(item: TextLibraryItem): Promise<void> {
    setIsSaving(true);
    setStatusMessage(null);
    let activatedQuestionSet = false;

    try {
      if (!item.isActive) {
        const questionResult = await activateQuestionSetIfAllInactiveAndSync(item.id);
        if (questionResult.error) {
          setStatusMessage({ tone: "error", text: questionResult.error });
          return;
        }
        activatedQuestionSet = questionResult.activated;
      }

      const result = await toggleTextLibraryItemActiveAndSync(item.id);
      if (result.error) {
        if (activatedQuestionSet) {
          await setQuestionsActiveByTextIdAndSync(item.id, false);
        }
        setStatusMessage({ tone: "error", text: result.error });
      } else {
        setStatusMessage({
          tone: "success",
          text: activatedQuestionSet
            ? "Metin ve bağlı sorular öğrencilere açıldı."
            : "Metin durumu Supabase'e kaydedildi.",
        });
      }
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  function handleBulkPreview(): void {
    const blocks = splitBulkBlocks(bulkInput);
    const existingTitleSet = new Set(items.map((item) => normalizeTitleLookup(item.title)));

    const previewItems = blocks.map((block, index) => {
      const parsed = parseBlockToPreviewItem(block, index + 1, existingTitleSet);

      if (parsed.canImport) {
        existingTitleSet.add(normalizeTitleLookup(parsed.title));
      }

      return parsed;
    });

    setBulkPreviewItems(previewItems);
    setBulkResultMessage("");
  }

  async function handleBulkImport(): Promise<void> {
    const importableItems = bulkPreviewItems.filter((item) => item.canImport);
    let failedCount = 0;

    setIsSaving(true);
    setStatusMessage(null);

    for (const item of importableItems) {
      const result = await saveTextLibraryItemAndSync({
        title: item.title,
        category: item.category,
        content: item.content,
        isActive: true,
      });

      if (result.error) {
        failedCount += 1;
      }
    }

    const skippedCount = bulkPreviewItems.length - importableItems.length;
    setBulkResultMessage(`${importableItems.length - failedCount} metin Supabase'e aktarildi. ${failedCount} metin Supabase'e kaydedilemedi. ${skippedCount} metin atlandi.`);
    if (failedCount > 0) {
      setStatusMessage({ tone: "error", text: "Metin Supabase'e kaydedilemedi. Öğrenci tarafında görünmeyebilir. İnternet/izin ayarlarını kontrol edin." });
    } else {
      setStatusMessage({ tone: "success", text: "Metinler Supabase'e kaydedildi." });
    }
    setBulkPreviewItems((current) =>
      current.map((item) =>
        item.canImport
          ? {
              ...item,
              canImport: false,
              imported: true,
            }
          : item,
      ),
    );
    await loadData();
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="idil-card overflow-hidden p-4 md:p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Ortak Metin Sistemi</p>
            <h2 className="mt-0.5 text-[24px] font-semibold tracking-tight text-slate-950 md:text-[28px]">Metin Kutuphanesi</h2>
            <p className="mt-0.5 max-w-3xl text-sm leading-5 text-slate-600">
              Okuma calismalarinda kullanilan metinleri yonetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              disabled={isSaving}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
            >
              Metin Ekle
            </button>
            <button
              type="button"
              onClick={openBulkImportModal}
              disabled={isSaving}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-50 active:scale-[0.98]"
            >
              Toplu Metin Aktar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Toplam Metin</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.total}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Aktif Metin</p>
            <p className="mt-1 text-2xl font-semibold text-green-700">{stats.active}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Pasif Metin</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.passive}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Kategori</p>
            <p className="mt-1 text-2xl font-semibold text-indigo-700">{stats.categories}</p>
          </article>
        </div>

        {statusMessage ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              statusMessage.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {statusMessage.text}
          </div>
        ) : null}
      </section>

      {isFormOpen ? (
        <section className="idil-card p-4 md:p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">
                {editingItemId ? "Metni Duzenle" : "Yeni Kayit"}
              </p>
              <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">
                {editingItemId ? "Secili metni guncelle" : "Yeni metin ekle"}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Vazgec
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.35fr]">
            <div className="grid content-start gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Kategori
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Metin Basligi
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  placeholder="Metin basligi"
                />
              </label>

              <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-red-700"
                />
                Aktif olarak okuma calismalarinda gorunsun
              </label>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Metin Icerigi
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  placeholder="Okuma metnini buraya yazin..."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                  {formWordCount} kelime
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                  {formCharacterCount} karakter
                </span>
              </div>

              <button
                type="button"
                onClick={saveForm}
                disabled={isSaving || !form.title.trim() || !form.content.trim()}
                className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isBulkImportOpen ? (
        <section className="idil-card p-4 md:p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">Toplu Metin Aktar</p>
              <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">Coklu metinleri tek seferde ekle</h3>
              <p className="mt-1 text-sm text-slate-600">Eski platformdan kopyaladigin metinleri asagidaki alana yapistir.</p>
            </div>
            <button
              type="button"
              onClick={closeBulkImportModal}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Vazgec
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Yapistirma Alani
                <textarea
                  ref={bulkTextareaRef}
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  className="min-h-[300px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 md:min-h-[420px] xl:min-h-[480px] resize-y"
                  placeholder={BULK_SAMPLE_TEXT}
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBulkPreview}
                  disabled={!bulkInput.trim()}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Onizle
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isSaving || bulkSummary.importable === 0}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Aktariliyor..." : "Kutuphaneye Aktar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkInput("");
                    setBulkPreviewItems([]);
                    setBulkResultMessage("");
                    bulkTextareaRef.current?.focus();
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Temizle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkInput(BULK_SAMPLE_TEXT);
                    setBulkPreviewItems([]);
                    setBulkResultMessage("");
                    bulkTextareaRef.current?.focus();
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  Ornek Formati Doldur
                </button>
              </div>
            </div>

            <aside className="grid gap-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Nasil Kullanilir?</h4>
                <ol className="mt-2 grid gap-1 text-sm text-slate-600">
                  <li>1. Her metni ayri blok olarak yapistir.</li>
                  <li>2. Bloklari --- ile ayir.</li>
                  <li>3. BASLIK ve KATEGORI satirlarini ekleyebilirsin.</li>
                  <li>4. Kategori yazilmazsa Genel Kultur atanir.</li>
                  <li>5. Onizle ile kontrol edip sonra aktar.</li>
                </ol>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700">
                  BASLIK: Metin Basligi
                  <br />
                  KATEGORI: Genel Kultur
                  <br />
                  METIN:
                  <br />
                  Metin icerigi buraya gelecek.
                  <br />
                  ---
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Gecerli Kategoriler</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEXT_LIBRARY_CATEGORIES.map((category) => (
                    <span key={category} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {category}
                    </span>
                  ))}
                </div>
              </article>
            </aside>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Bulunan Metin</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{bulkSummary.total}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Eklenebilir</p>
                <p className="mt-1 text-2xl font-semibold text-green-700">{bulkSummary.importable}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Uyarili</p>
                <p className="mt-1 text-2xl font-semibold text-amber-700">{bulkSummary.warningCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Ayni Baslik</p>
                <p className="mt-1 text-2xl font-semibold text-orange-700">{bulkSummary.duplicateCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Toplam Kelime</p>
                <p className="mt-1 text-2xl font-semibold text-indigo-700">{bulkSummary.totalWords}</p>
              </article>
            </div>

            {bulkResultMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {bulkResultMessage}
              </p>
            ) : null}

            {bulkPreviewItems.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-200 px-3 py-2">Sira</th>
                      <th className="border-b border-slate-200 px-3 py-2">Baslik</th>
                      <th className="border-b border-slate-200 px-3 py-2">Kategori</th>
                      <th className="border-b border-slate-200 px-3 py-2">Kelime</th>
                      <th className="border-b border-slate-200 px-3 py-2">Durum</th>
                      <th className="border-b border-slate-200 px-3 py-2">Onizleme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreviewItems.map((item) => (
                      <tr key={`${item.order}-${item.title}`} className="font-medium text-slate-800">
                        <td className="border-b border-slate-100 px-3 py-2">{item.order}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{item.title}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{item.category}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{item.wordCount}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              item.imported
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : item.warnings.length > 0
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {getBulkStatusLabel(item)}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{item.preview}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="idil-card p-4 md:p-[18px]">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Arama
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              placeholder="Baslik veya icerik ara"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Kategori
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tum kategoriler</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Durum
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tumu</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-600">Filtrelere uygun metin bulunamadi.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-2 break-words text-[18px] font-semibold text-slate-950">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          item.isActive ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500">{item.category}</p>
                    <p className="mt-2 max-w-full overflow-hidden text-ellipsis break-words text-sm text-slate-600">
                      {getShortPreview(item.content)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={isSaving}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-50"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={isSaving}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {item.isActive ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={isSaving}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-[11px] font-medium text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <span className="rounded-xl bg-slate-50 px-3 py-2">{item.wordCount} kelime</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">{item.characterCount} karakter</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">Olusturma: {formatDate(item.createdAt)}</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">Guncelleme: {formatDate(item.updatedAt)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
