"use client";

import { useMemo, useState } from "react";
import type { Difficulty } from "@/lib/data/wordPools";
import {
  buildSimilarWordPoolBulkPreview,
  SIMILAR_WORD_POOL_DIFFICULTIES,
  SIMILAR_WORD_POOL_DIFFICULTY_LABELS,
  type SimilarWordPoolBulkPreview,
  type SimilarWordPoolBulkPreviewRow,
} from "@/lib/similar-word-pools/similarWordPoolsShared";
import type { SimilarWordPoolTeacherItem } from "@/lib/similar-word-pools/similarWordPoolsRepository";
import {
  bulkCreateSimilarWordPoolsAction,
  createSimilarWordPoolAction,
  deleteSimilarWordPoolAction,
  setSimilarWordPoolActiveAction,
  updateSimilarWordPoolAction,
  type SimilarWordPoolActionResponse,
} from "./actions";

type DraftState = {
  id: string | null;
  difficulty: Difficulty;
  baseWord: string;
  variantsText: string;
  isActive: boolean;
  sortOrder: number;
};

type StatusMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

type BulkPreviewViewRow = SimilarWordPoolBulkPreviewRow & {
  existsInDatabase: boolean;
};

const EMPTY_DRAFT: DraftState = {
  id: null,
  difficulty: "easy",
  baseWord: "",
  variantsText: "",
  isActive: true,
  sortOrder: 0,
};

const BULK_SAMPLE_TEXT = [
  "easy | masa | nasa, masa",
  "medium | panel | panel, panel",
  "hard | tekrarlama | tekrarIama, tekrarlama",
].join("\n");

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function joinVariants(variants: string[]): string {
  return variants.join(", ");
}

function buildCompositeKey(item: SimilarWordPoolTeacherItem): string {
  return `${item.difficulty}::${item.normalized_key}`;
}

function createDraftFromItem(item: SimilarWordPoolTeacherItem): DraftState {
  return {
    id: item.id,
    difficulty: item.difficulty,
    baseWord: item.base_word,
    variantsText: joinVariants(item.variants),
    isActive: item.is_active,
    sortOrder: item.sort_order,
  };
}

function formatIssues(issues?: { message: string }[]): string {
  if (!issues || issues.length === 0) {
    return "";
  }

  return issues.map((issue) => issue.message).join(" ");
}

function createPreviewView(preview: SimilarWordPoolBulkPreview, existingKeys: Set<string>): BulkPreviewViewRow[] {
  return preview.rows.map((row) => {
    if (!row.normalizedKey || !row.difficulty || row.status !== "valid") {
      return {
        ...row,
        existsInDatabase: false,
      };
    }

    const existsInDatabase = existingKeys.has(`${row.difficulty}::${row.normalizedKey}`);
    return {
      ...row,
      existsInDatabase,
      status: existsInDatabase ? "duplicate" : row.status,
      messages: existsInDatabase
        ? [...row.messages, "Bu kayıt mevcut veritabanında zaten var."]
        : row.messages,
    };
  });
}

export function SimilarWordPoolsClient({ initialItems }: { initialItems: SimilarWordPoolTeacherItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | Difficulty>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreviewSource, setBulkPreviewSource] = useState("");
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SimilarWordPoolTeacherItem | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const existingKeys = useMemo(() => new Set(items.map((item) => buildCompositeKey(item))), [items]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    const passive = items.length - active;

    return {
      total: items.length,
      active,
      passive,
      easy: items.filter((item) => item.difficulty === "easy").length,
      medium: items.filter((item) => item.difficulty === "medium").length,
      hard: items.filter((item) => item.difficulty === "hard").length,
      filtered: items.filter((item) => {
        const search = normalizeSearch(searchTerm);
        const difficultyOk = difficultyFilter === "all" || item.difficulty === difficultyFilter;
        const statusOk =
          statusFilter === "all" ||
          (statusFilter === "active" && item.is_active) ||
          (statusFilter === "passive" && !item.is_active);
        const searchOk =
          !search ||
          normalizeSearch(item.base_word).includes(search) ||
          normalizeSearch(item.normalized_key).includes(search) ||
          normalizeSearch(item.variants.join(" ")).includes(search);

        return difficultyOk && statusOk && searchOk;
      }).length,
    };
  }, [difficultyFilter, items, searchTerm, statusFilter]);

  const filteredItems = useMemo(() => {
    const search = normalizeSearch(searchTerm);
    return items.filter((item) => {
      const difficultyOk = difficultyFilter === "all" || item.difficulty === difficultyFilter;
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "passive" && !item.is_active);
      const searchOk =
        !search ||
        normalizeSearch(item.base_word).includes(search) ||
        normalizeSearch(item.normalized_key).includes(search) ||
        normalizeSearch(item.variants.join(" ")).includes(search);

      return difficultyOk && statusOk && searchOk;
    });
  }, [difficultyFilter, items, searchTerm, statusFilter]);

  const bulkPreview = useMemo(() => {
    if (!bulkPreviewSource.trim()) {
      return null;
    }

    const preview = buildSimilarWordPoolBulkPreview(bulkPreviewSource);
    const rows = createPreviewView(preview, existingKeys);

    return {
      rows,
      validRows: rows.filter((row) => row.status === "valid"),
      duplicateRows: rows.filter((row) => row.status === "duplicate"),
      invalidRows: rows.filter((row) => row.status === "invalid"),
    };
  }, [bulkPreviewSource, existingKeys]);

  async function applyAction(result: SimilarWordPoolActionResponse, successMessageFallback: string): Promise<void> {
    if (!result.ok) {
      setStatusMessage({
        tone: "error",
        text: `${result.message}${result.issues ? ` ${formatIssues(result.issues)}` : ""}`.trim(),
      });
      return;
    }

    setItems(result.items);
    setStatusMessage({ tone: "success", text: result.message || successMessageFallback });
    if (result.bulkResult) {
      setBulkResultMessage(
        `${result.bulkResult.insertedCount} kayıt eklendi, ${result.bulkResult.skippedCount} kayıt atlandı.`,
      );
    }
    setEditorMode(null);
    setDraft(EMPTY_DRAFT);
    setDeleteTarget(null);
    setIsBusy(false);
  }

  function openCreateForm(): void {
    setDraft({
      ...EMPTY_DRAFT,
      sortOrder: items.length,
    });
    setEditorMode("create");
    setStatusMessage(null);
  }

  function openEditForm(item: SimilarWordPoolTeacherItem): void {
    setDraft(createDraftFromItem(item));
    setEditorMode("edit");
    setStatusMessage(null);
  }

  function closeEditor(): void {
    setEditorMode(null);
    setDraft(EMPTY_DRAFT);
  }

  async function saveDraft(): Promise<void> {
    if (!draft.baseWord.trim() || !draft.variantsText.trim()) {
      setStatusMessage({
        tone: "error",
        text: "Temel kelime ve varyantlar boş bırakılamaz.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const payload = {
      difficulty: draft.difficulty,
      baseWord: draft.baseWord,
      variantsText: draft.variantsText,
      isActive: draft.isActive,
      sortOrder: draft.sortOrder,
    };

    const result =
      editorMode === "edit" && draft.id
        ? await updateSimilarWordPoolAction({ id: draft.id, ...payload })
        : await createSimilarWordPoolAction(payload);

    await applyAction(result, editorMode === "edit" ? "İçerik güncellendi." : "İçerik eklendi.");
    setIsBusy(false);
  }

  async function toggleActive(item: SimilarWordPoolTeacherItem): Promise<void> {
    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const result = await setSimilarWordPoolActiveAction({
      id: item.id,
      isActive: !item.is_active,
    });

    await applyAction(result, item.is_active ? "İçerik pasife alındı." : "İçerik aktif edildi.");
    setIsBusy(false);
  }

  async function deleteItem(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const result = await deleteSimilarWordPoolAction({ id: deleteTarget.id });
    await applyAction(result, "İçerik silindi.");
    setIsBusy(false);
  }

  function handlePreviewBulk(): void {
    setBulkPreviewSource(bulkText);
    setBulkResultMessage(null);
    setStatusMessage({
      tone: "info",
      text: "Önizleme güncellendi. Kayıt için önce geçerli satırları kontrol edin.",
    });
  }

  async function handleBulkSave(): Promise<void> {
    if (!bulkPreviewSource.trim()) {
      setStatusMessage({
        tone: "error",
        text: "Önizleme oluşturmadan toplu kayıt yapılamaz.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);

    const result = await bulkCreateSimilarWordPoolsAction(bulkPreviewSource);
    await applyAction(result, "Toplu aktarım tamamlandı.");
    setBulkPreviewSource("");
    setIsBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="idil-card overflow-hidden p-4 md:p-[18px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-700">Öğretmen İçerik Alanı</p>
              <h2 className="mt-0.5 text-[24px] font-semibold tracking-tight text-slate-950 md:text-[28px]">
                Benzer Kelimeler İçerikleri
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                Aynı ve farklı kelime çiftlerini listeleyin, düzenleyin ve toplu olarak güvenli biçimde yönetin.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Toplam</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.total}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Aktif</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.active}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Pasif</p>
                <p className="mt-1 text-2xl font-semibold text-slate-700">{stats.passive}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Filtrelenen</p>
                <p className="mt-1 text-2xl font-semibold text-pink-700">{stats.filtered}</p>
              </article>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-emerald-700">Kolay</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{stats.easy}</p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-sky-700">Orta</p>
              <p className="mt-1 text-2xl font-semibold text-sky-900">{stats.medium}</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-amber-700">Zor</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{stats.hard}</p>
            </article>
          </div>

          {statusMessage ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                statusMessage.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : statusMessage.tone === "info"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {statusMessage.text}
            </div>
          ) : null}
        </div>
      </section>

      <section className="idil-card p-4 md:p-[18px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 md:grid-cols-3 lg:flex-1">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Arama
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                placeholder="Kelime, varyant veya anahtar ara"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Seviye
              <select
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value as "all" | Difficulty)}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              >
                <option value="all">Tüm seviyeler</option>
                {SIMILAR_WORD_POOL_DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {SIMILAR_WORD_POOL_DIFFICULTY_LABELS[difficulty]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Durum
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "passive")}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              >
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              disabled={isBusy}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-gradient-to-r from-pink-700 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Yeni İçerik Ekle
            </button>
            <button
              type="button"
              onClick={() => setBulkText((current) => current || BULK_SAMPLE_TEXT)}
              disabled={isBusy}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-pink-200 bg-white px-4 py-2.5 text-sm font-semibold text-pink-800 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Toplu İçerik Ekle
            </button>
          </div>
        </div>
      </section>

      {editorMode ? (
        <section className="idil-card p-4 md:p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700">
                {editorMode === "edit" ? "İçerik Düzenle" : "Yeni İçerik"}
              </p>
              <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">
                {editorMode === "edit" ? "Seçili kaydı güncelle" : "Yeni kelime çiftini ekle"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Varyantları virgülle ayırabilirsiniz. Satır başına bir çift girerken aynı formatı koruyun.
              </p>
            </div>

            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Vazgeç
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.25fr]">
            <div className="grid content-start gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Seviye
                <select
                  value={draft.difficulty}
                  onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  {SIMILAR_WORD_POOL_DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {SIMILAR_WORD_POOL_DIFFICULTY_LABELS[difficulty]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Temel Kelime
                <input
                  value={draft.baseWord}
                  onChange={(event) => setDraft((current) => ({ ...current, baseWord: event.target.value }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  placeholder="Örnek: masa"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Varyantlar
                <textarea
                  value={draft.variantsText}
                  onChange={(event) => setDraft((current) => ({ ...current, variantsText: event.target.value }))}
                  className="min-h-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  placeholder="nasa, masa"
                />
              </label>

              <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-pink-700"
                />
                İçerik aktif olsun
              </label>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Sıralama No
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sortOrder: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0,
                    }))
                  }
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-bold text-slate-900">Doğrulama Notu</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Türkçe karakterler korunur, mojibake işaretleri reddedilir ve aynı zorluk + normalized key
                  kombinasyonu duplicate sayılır.
                </p>
              </div>

              <button
                type="button"
                onClick={saveDraft}
                disabled={isBusy}
                className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-gradient-to-r from-pink-700 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {bulkText.trim().length > 0 || bulkPreviewSource.trim().length > 0 ? (
        <section className="idil-card p-4 md:p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700">Toplu İçerik Ekle</p>
              <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">Satır satır hızlı aktarım</h3>
              <p className="mt-1 text-sm text-slate-600">
                Format: <span className="font-semibold">difficulty | base_word | varyant1, varyant2</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setBulkText("");
                setBulkPreviewSource("");
                setBulkResultMessage(null);
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Temizle
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Toplu Veri
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  className="min-h-[220px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100 md:min-h-[280px]"
                  placeholder={BULK_SAMPLE_TEXT}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreviewBulk}
                  disabled={isBusy || !bulkText.trim()}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Önizle
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isBusy || !bulkPreviewSource.trim()}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Aktarılıyor..." : "Kayıt Et"}
                </button>
              </div>
            </div>

            <aside className="grid gap-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Örnek Format</h4>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700">
                  easy | masa | nasa, masa
                  <br />
                  medium | panel | panel, panel
                  <br />
                  hard | tekrarlama | tekrarIama, tekrarlama
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Önizleme Özeti</h4>
                {bulkPreview ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Geçerli: {bulkPreview.validRows.length}
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-amber-700">
                      Duplicate: {bulkPreview.duplicateRows.length}
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-red-700">
                      Hatalı: {bulkPreview.invalidRows.length}
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-emerald-700">
                      Toplam: {bulkPreview.rows.length}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Önizleme henüz oluşturulmadı.</p>
                )}
              </article>
            </aside>
          </div>

          {bulkResultMessage ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {bulkResultMessage}
            </p>
          ) : null}

          {bulkPreview ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-200 px-3 py-2">Satır</th>
                      <th className="border-b border-slate-200 px-3 py-2">Seviye</th>
                      <th className="border-b border-slate-200 px-3 py-2">Temel Kelime</th>
                      <th className="border-b border-slate-200 px-3 py-2">Varyantlar</th>
                      <th className="border-b border-slate-200 px-3 py-2">Durum</th>
                      <th className="border-b border-slate-200 px-3 py-2">Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.rows.map((row) => (
                      <tr key={row.lineNumber} className="align-top text-slate-800">
                        <td className="border-b border-slate-100 px-3 py-2 font-medium">{row.lineNumber}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          {row.difficulty ? SIMILAR_WORD_POOL_DIFFICULTY_LABELS[row.difficulty] : row.difficultyText}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">{row.baseWord || row.baseWordText}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <span className="line-clamp-2 break-words">{joinVariants(row.variants)}</span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              row.status === "valid"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.status === "duplicate"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {row.status === "valid" ? "Hazır" : row.status === "duplicate" ? "Duplicate" : "Hatalı"}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-slate-600">
                          <div className="line-clamp-2 space-y-1">
                            {row.messages.length > 0 ? row.messages.map((message) => <p key={message}>{message}</p>) : <p>—</p>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="idil-card p-4 md:p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700">Kayıt Listesi</p>
            <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">Canlı içerik havuzu</h3>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {filteredItems.length} kayıt gösteriliyor • {items.length} kayıt toplam
          </p>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-medium text-slate-600">Filtrelere uygun Benzer Kelimeler içeriği bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-200 px-3 py-2">Seviye</th>
                      <th className="border-b border-slate-200 px-3 py-2">Temel Kelime</th>
                      <th className="border-b border-slate-200 px-3 py-2">Varyantlar</th>
                      <th className="border-b border-slate-200 px-3 py-2">Durum</th>
                      <th className="border-b border-slate-200 px-3 py-2">Sıra</th>
                      <th className="border-b border-slate-200 px-3 py-2">Tarih</th>
                      <th className="border-b border-slate-200 px-3 py-2">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="align-top text-slate-800">
                        <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-700">
                          {SIMILAR_WORD_POOL_DIFFICULTY_LABELS[item.difficulty]}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-950">{item.base_word}</td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <span className="line-clamp-2 break-words text-slate-600">{joinVariants(item.variants)}</span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              item.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {item.is_active ? "Açık" : "Kilitli"}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-600">{item.sort_order}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-500">
                          <div className="grid gap-1">
                            <span>Oluşturma: {formatDate(item.created_at)}</span>
                            <span>Güncelleme: {formatDate(item.updated_at)}</span>
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              disabled={isBusy}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-800 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(item)}
                              disabled={isBusy}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {item.is_active ? "Pasife Al" : "Aktif Et"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              disabled={isBusy}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">
                        {SIMILAR_WORD_POOL_DIFFICULTY_LABELS[item.difficulty]}
                      </p>
                      <h4 className="mt-1 line-clamp-2 text-[18px] font-semibold text-slate-950">{item.base_word}</h4>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {item.is_active ? "Açık" : "Kilitli"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{joinVariants(item.variants)}</p>

                  <div className="mt-3 grid gap-2 text-xs font-medium text-slate-600 sm:grid-cols-2">
                    <span className="rounded-xl bg-slate-50 px-3 py-2">Sıra: {item.sort_order}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">Güncelleme: {formatDate(item.updated_at)}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={isBusy}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-800 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      disabled={isBusy}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {item.is_active ? "Pasife Al" : "Aktif Et"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      disabled={isBusy}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">Silme Onayı</p>
            <h3 className="mt-1 text-[20px] font-semibold text-slate-950">Bu içeriği silmek istiyor musunuz?</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{deleteTarget.base_word}</span> kaydı kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
            </p>

            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>Seviye: {SIMILAR_WORD_POOL_DIFFICULTY_LABELS[deleteTarget.difficulty]}</div>
              <div>Varyant sayısı: {deleteTarget.variants.length}</div>
              <div>Sıra: {deleteTarget.sort_order}</div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={deleteItem}
                disabled={isBusy}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
