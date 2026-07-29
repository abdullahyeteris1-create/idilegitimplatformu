"use client";
import { useMemo, useState } from "react";
import { type TachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";
import {
  buildTachistoscopeBulkPreview,
  createTachistoscopeTeacherSummary,
  filterTachistoscopeTeacherItems,
  TACHISTOSCOPE_LEVEL_LABELS,
  TACHISTOSCOPE_LEVELS,
  type TachistoscopeBulkPreview,
  type TachistoscopeDraftInput,
  type TachistoscopeTeacherItem,
  validateTachistoscopeDraft,
} from "@/lib/tachistoscope/tachistoscopeShared";
import {
  bulkCreateTachistoscopeWordsAction,
  createTachistoscopeWordAction,
  deleteTachistoscopeWordAction,
  setTachistoscopeWordActiveAction,
  updateTachistoscopeWordAction,
  type TachistoscopeActionResponse,
} from "./actions";

type DraftState = {
  id: string | null;
  level: TachistoscopeLevel;
  word: string;
  isActive: boolean;
};

type StatusMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

const EMPTY_DRAFT: DraftState = {
  id: null,
  level: 1,
  word: "",
  isActive: true,
};

const BULK_SAMPLE_TEXT = ["masa", "kedi", "öğrenci"].join("\n");

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

function formatIssues(issues?: { message: string }[]): string {
  if (!issues || issues.length === 0) {
    return "";
  }

  return issues.map((issue) => issue.message).join(" ");
}

function buildCompositeKey(item: TachistoscopeTeacherItem): string {
  return `${item.level}::${item.normalized_key}`;
}

function createDraftFromItem(item: TachistoscopeTeacherItem): DraftState {
  return {
    id: item.id,
    level: item.level,
    word: item.word,
    isActive: item.is_active,
  };
}

function applyServerResponse(
  result: TachistoscopeActionResponse,
  fallbackMessage: string,
  setItems: (items: TachistoscopeTeacherItem[]) => void,
  setStatusMessage: (value: StatusMessage | null) => void,
  setBulkResultMessage: (value: string | null) => void,
  setDraft: (value: DraftState) => void,
  setEditorMode: (value: "create" | "edit" | null) => void,
  setDeleteTarget: (value: TachistoscopeTeacherItem | null) => void,
): boolean {
  if (!result.ok) {
    setStatusMessage({
      tone: "error",
      text: `${result.message}${result.issues ? ` ${formatIssues(result.issues)}` : ""}`.trim(),
    });
    return false;
  }

  setItems(result.items);
  setStatusMessage({ tone: "success", text: result.message || fallbackMessage });
  setBulkResultMessage(
    result.bulkResult
      ? `${result.bulkResult.insertedCount} kayıt eklendi, ${result.bulkResult.skippedCount} kayıt atlandı.`
      : null,
  );
  setDraft(EMPTY_DRAFT);
  setEditorMode(null);
  setDeleteTarget(null);
  return true;
}

export function TakistoskopClient({ initialItems }: { initialItems: TachistoscopeTeacherItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | TachistoscopeLevel>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TachistoscopeTeacherItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLevel, setBulkLevel] = useState<TachistoscopeLevel>(1);
  const [bulkText, setBulkText] = useState("");
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);

  const existingKeys = useMemo(() => new Set(items.map((item) => buildCompositeKey(item))), [items]);

  const summary = useMemo(() => createTachistoscopeTeacherSummary(items), [items]);

  const filteredItems = useMemo(
    () =>
      filterTachistoscopeTeacherItems(items, {
        searchTerm,
        levelFilter,
        statusFilter,
      }),
    [items, levelFilter, searchTerm, statusFilter],
  );

  const bulkPreview = useMemo<TachistoscopeBulkPreview>(() => {
    if (!bulkText.trim()) {
      return {
        rows: [],
        validRows: [],
        duplicateRows: [],
        invalidRows: [],
      };
    }

    return buildTachistoscopeBulkPreview(bulkText, bulkLevel, existingKeys);
  }, [bulkLevel, bulkText, existingKeys]);

  function openCreateForm(): void {
    setDraft({
      ...EMPTY_DRAFT,
      level: levelFilter === "all" ? 1 : levelFilter,
      isActive: true,
    });
    setEditorMode("create");
    setStatusMessage(null);
  }

  function openEditForm(item: TachistoscopeTeacherItem): void {
    setDraft(createDraftFromItem(item));
    setEditorMode("edit");
    setStatusMessage(null);
  }

  function closeEditor(): void {
    setEditorMode(null);
    setDraft(EMPTY_DRAFT);
  }

  function closeBulkPanel(): void {
    setBulkOpen(false);
    setBulkText("");
    setBulkResultMessage(null);
    setStatusMessage(null);
  }

  async function handleSaveDraft(): Promise<void> {
    const validation = validateTachistoscopeDraft({
      level: draft.level,
      word: draft.word,
      isActive: draft.isActive,
    });
    if (!validation.ok) {
      setStatusMessage({
        tone: "error",
        text: formatIssues(validation.issues) || "Formda geçersiz alanlar var.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const payload: TachistoscopeDraftInput = {
      level: validation.value.level,
      word: validation.value.word,
      isActive: validation.value.isActive,
    };

    const result =
      editorMode === "edit" && draft.id
        ? await updateTachistoscopeWordAction({ id: draft.id, ...payload })
        : await createTachistoscopeWordAction(payload);

    const applied = applyServerResponse(
      result,
      editorMode === "edit" ? "Takistoskop kelimesi güncellendi." : "Takistoskop kelimesi eklendi.",
      setItems,
      setStatusMessage,
      setBulkResultMessage,
      setDraft,
      setEditorMode,
      setDeleteTarget,
    );
    setIsBusy(false);

    if (!applied) {
      return;
    }
  }

  async function handleToggleActive(item: TachistoscopeTeacherItem): Promise<void> {
    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const result = await setTachistoscopeWordActiveAction({
      id: item.id,
      isActive: !item.is_active,
    });

    applyServerResponse(
      result,
      item.is_active ? "Kayıt pasife alındı." : "Kayıt aktif edildi.",
      setItems,
      setStatusMessage,
      setBulkResultMessage,
      setDraft,
      setEditorMode,
      setDeleteTarget,
    );
    setIsBusy(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    setBulkResultMessage(null);

    const result = await deleteTachistoscopeWordAction({ id: deleteTarget.id });
    applyServerResponse(
      result,
      "Takistoskop kelimesi silindi.",
      setItems,
      setStatusMessage,
      setBulkResultMessage,
      setDraft,
      setEditorMode,
      setDeleteTarget,
    );
    setIsBusy(false);
  }

  async function handleBulkSave(): Promise<void> {
    if (!bulkText.trim()) {
      setStatusMessage({
        tone: "error",
        text: "Toplu aktarım için önce kelimeleri girin.",
      });
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);

    const result = await bulkCreateTachistoscopeWordsAction({
      level: bulkLevel,
      rawText: bulkText,
    });

    const applied = applyServerResponse(
      result,
      "Toplu aktarım tamamlandı.",
      setItems,
      setStatusMessage,
      setBulkResultMessage,
      setDraft,
      setEditorMode,
      setDeleteTarget,
    );
    if (applied) {
      setBulkText("");
      setBulkOpen(false);
    }
    setIsBusy(false);
  }

  const bulkStats = {
    total: bulkPreview.rows.length,
    valid: bulkPreview.validRows.length,
    duplicate: bulkPreview.duplicateRows.length,
    invalid: bulkPreview.invalidRows.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="idil-card overflow-hidden p-4 md:p-[18px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-700">Öğretmen İçerik Alanı</p>
              <h2 className="mt-0.5 text-[24px] font-semibold tracking-tight text-slate-950 md:text-[28px]">
                Takistoskop İçerikleri
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                Tek kelimelik Takistoskop havuzunu listeleyin, düzenleyin ve toplu olarak güvenli biçimde yönetin.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Toplam</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.total}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Aktif</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.active}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Pasif</p>
                <p className="mt-1 text-2xl font-semibold text-slate-700">{summary.passive}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Filtrelenen</p>
                <p className="mt-1 text-2xl font-semibold text-pink-700">{filteredItems.length}</p>
              </article>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-emerald-700">Kayıtlı</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{summary.total}</p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-sky-700">Aktif Oran</p>
              <p className="mt-1 text-2xl font-semibold text-sky-900">
                {summary.total === 0 ? "0%" : `${Math.round((summary.active / summary.total) * 100)}%`}
              </p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-amber-700">Seçili Seviye</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">
                {levelFilter === "all" ? "Tümü" : TACHISTOSCOPE_LEVEL_LABELS[levelFilter]}
              </p>
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
                placeholder="Kelime içinde ara"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Level
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value === "all" ? "all" : (Number(event.target.value) as TachistoscopeLevel))}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              >
                <option value="all">Tüm seviyeler</option>
                {TACHISTOSCOPE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {TACHISTOSCOPE_LEVEL_LABELS[level]}
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
              Yeni Kelime Ekle
            </button>
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              disabled={isBusy}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-pink-200 bg-white px-4 py-2.5 text-sm font-semibold text-pink-800 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Toplu Kelime Ekle
            </button>
          </div>
        </div>
      </section>

      {bulkOpen ? (
        <section className="idil-card p-4 md:p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700">Toplu İçe Aktarma</p>
              <h3 className="mt-0.5 text-[20px] font-semibold text-slate-950">Satır başına bir kelime</h3>
              <p className="mt-1 text-sm text-slate-600">
                Önizleme sayesinde geçerli, duplicate ve hatalı satırları ayırıp sonra tek seferde kayıt yazabilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={closeBulkPanel}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Seviye
                <select
                  value={bulkLevel}
                  onChange={(event) => setBulkLevel(Number(event.target.value) as TachistoscopeLevel)}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  {TACHISTOSCOPE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {TACHISTOSCOPE_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Toplu Veri
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  className="min-h-[220px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100 md:min-h-[280px]"
                  placeholder={BULK_SAMPLE_TEXT}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isBusy || bulkPreview.validRows.length === 0}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Aktarılıyor..." : "Kayıt Et"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkText(BULK_SAMPLE_TEXT);
                    setStatusMessage({ tone: "info", text: "Örnek veri yüklendi. Önizlemeyi kontrol edip kayıt edebilirsiniz." });
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Örnek Doldur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkText("");
                    setBulkResultMessage(null);
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Temizle
                </button>
              </div>
            </div>

            <aside className="grid gap-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Önizleme Özeti</h4>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-700">Geçerli: {bulkStats.valid}</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-amber-700">Duplicate: {bulkStats.duplicate}</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-red-700">Hatalı: {bulkStats.invalid}</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-emerald-700">Toplam: {bulkStats.total}</div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Önizleme Notu</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Aynı level içinde tekrar eden kelimeler duplicate olarak işaretlenir. Farklı level&apos;lar ayrı kabul edilir.
                </p>
              </article>
            </aside>
          </div>

          {bulkResultMessage ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {bulkResultMessage}
            </p>
          ) : null}

          {bulkPreview.rows.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-200 px-3 py-2">Satır</th>
                      <th className="border-b border-slate-200 px-3 py-2">Kelime</th>
                      <th className="border-b border-slate-200 px-3 py-2">Durum</th>
                      <th className="border-b border-slate-200 px-3 py-2">Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.rows.map((row) => (
                      <tr key={row.lineNumber} className="align-top text-slate-800">
                        <td className="border-b border-slate-100 px-3 py-2 font-medium">{row.lineNumber}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{row.word ?? row.rawText}</td>
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
                            {row.messages.map((message) => (
                              <p key={message}>{message}</p>
                            ))}
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
            <p className="text-sm font-medium text-slate-600">Filtrelere uygun Takistoskop kaydı bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-200 px-3 py-2">Level</th>
                      <th className="border-b border-slate-200 px-3 py-2">Kelime</th>
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
                          {TACHISTOSCOPE_LEVEL_LABELS[item.level]}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-950">{item.word}</td>
                        <td className="border-b border-slate-100 px-3 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              item.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {item.is_active ? "Açık" : "Pasif"}
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
                              onClick={() => handleToggleActive(item)}
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
                        {TACHISTOSCOPE_LEVEL_LABELS[item.level]}
                      </p>
                      <h4 className="mt-1 line-clamp-2 text-[18px] font-semibold text-slate-950">{item.word}</h4>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {item.is_active ? "Açık" : "Pasif"}
                    </span>
                  </div>

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
                      onClick={() => handleToggleActive(item)}
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

      {editorMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700">
                  {editorMode === "edit" ? "Kelime Düzenle" : "Yeni Kelime"}
                </p>
                <h3 className="mt-1 text-[20px] font-semibold text-slate-950">
                  {editorMode === "edit" ? "Seçili takistoskop kaydını güncelle" : "Yeni takistoskop kelimesi ekle"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Türkçe karakterler korunur, bozuk karakterler ve boş kayıtlar reddedilir.
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

            <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Level
                <select
                  value={draft.level}
                  onChange={(event) => setDraft((current) => ({ ...current, level: Number(event.target.value) as TachistoscopeLevel }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                >
                  {TACHISTOSCOPE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {TACHISTOSCOPE_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Kelime
                <input
                  value={draft.word}
                  onChange={(event) => setDraft((current) => ({ ...current, word: event.target.value }))}
                  className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  placeholder="Örn: öğrenci"
                />
              </label>
            </div>

            <div className="mt-4 flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 accent-pink-700"
              />
              Aktif
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isBusy}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-pink-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">Silme Onayı</p>
            <h3 className="mt-1 text-[20px] font-semibold text-slate-950">Bu kelimeyi silmek istiyor musunuz?</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{deleteTarget.word}</span> kaydı kalıcı olarak silinecek.
              Bu işlem geri alınamaz.
            </p>

            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>Level: {TACHISTOSCOPE_LEVEL_LABELS[deleteTarget.level]}</div>
              <div>Sıra: {deleteTarget.sort_order}</div>
              <div>Durum: {deleteTarget.is_active ? "Açık" : "Pasif"}</div>
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
                onClick={handleDelete}
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
