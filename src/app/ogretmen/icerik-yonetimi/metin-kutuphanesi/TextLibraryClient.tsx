"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TEXT_LIBRARY_CATEGORIES,
  TEXT_LIBRARY_LEVELS,
  TEXT_LIBRARY_TARGET_GROUPS,
  TEXT_LIBRARY_USAGE_TYPES,
  countCharacters,
  countWords,
  deleteTextLibraryItem,
  getTextLibraryItems,
  getUsageTypeLabel,
  saveTextLibraryItem,
  toggleTextLibraryItemActive,
  updateTextLibraryItem,
  type TextLibraryItem,
} from "@/lib/settings/textLibraryStorage";

type TextFormState = {
  title: string;
  category: string;
  level: string;
  targetGroup: string;
  usageTypes: string[];
  content: string;
  isActive: boolean;
};

const EMPTY_FORM: TextFormState = {
  title: "",
  category: "Genel Kultur",
  level: "Orta",
  targetGroup: "Ortaokul",
  usageTypes: ["block-reading"],
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

export function TextLibraryClient() {
  const [items, setItems] = useState<TextLibraryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<TextFormState>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setItems(getTextLibraryItems());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const stats = useMemo(() => {
    const activeCount = items.filter((item) => item.isActive).length;

    return {
      total: items.length,
      active: activeCount,
      passive: items.length - activeCount,
      comprehension: items.filter((item) => item.usageTypes.includes("comprehension-test")).length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
        item.content.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesUsage = usageFilter === "all" || item.usageTypes.includes(usageFilter);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "passive" && !item.isActive);

      return matchesSearch && matchesCategory && matchesUsage && matchesStatus;
    });
  }, [categoryFilter, items, searchTerm, statusFilter, usageFilter]);

  const formWordCount = countWords(form.content);
  const formCharacterCount = countCharacters(form.content);

  function refreshItems(): void {
    setItems(getTextLibraryItems());
  }

  function resetForm(): void {
    setForm(EMPTY_FORM);
    setEditingItemId(null);
    setIsFormOpen(false);
  }

  function openCreateForm(): void {
    setForm(EMPTY_FORM);
    setEditingItemId(null);
    setIsFormOpen(true);
  }

  function openEditForm(item: TextLibraryItem): void {
    setForm({
      title: item.title,
      category: item.category,
      level: item.level ?? "Orta",
      targetGroup: item.targetGroup ?? "Ortaokul",
      usageTypes: item.usageTypes,
      content: item.content,
      isActive: item.isActive,
    });
    setEditingItemId(item.id);
    setIsFormOpen(true);
  }

  function toggleUsageType(usageType: string): void {
    setForm((current) => {
      const hasUsage = current.usageTypes.includes(usageType);
      const nextUsageTypes = hasUsage
        ? current.usageTypes.filter((item) => item !== usageType)
        : [...current.usageTypes, usageType];

      return {
        ...current,
        usageTypes: nextUsageTypes.length > 0 ? nextUsageTypes : current.usageTypes,
      };
    });
  }

  function saveForm(): void {
    if (!form.title.trim() || !form.content.trim()) {
      return;
    }

    if (editingItemId) {
      updateTextLibraryItem(editingItemId, {
        title: form.title,
        category: form.category,
        level: form.level,
        targetGroup: form.targetGroup,
        content: form.content,
        isActive: form.isActive,
        usageTypes: form.usageTypes,
      });
    } else {
      saveTextLibraryItem({
        title: form.title,
        category: form.category,
        level: form.level,
        targetGroup: form.targetGroup,
        content: form.content,
        isActive: form.isActive,
        usageTypes: form.usageTypes,
      });
    }

    refreshItems();
    resetForm();
  }

  function handleDelete(item: TextLibraryItem): void {
    const isConfirmed = window.confirm("Bu metni silmek istediginize emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    deleteTextLibraryItem(item.id);
    refreshItems();
  }

  function handleToggleActive(item: TextLibraryItem): void {
    toggleTextLibraryItemActive(item.id);
    refreshItems();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="idil-card overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Aktif Modul</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Metin Kutuphanesi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Metin calismalarinda ve anlama testlerinde kullanilacak okuma metinlerini buradan ekleyip duzenleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
          >
            Yeni Metin Ekle
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Toplam Metin</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{stats.total}</p>
          </article>
          <article className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Aktif Metin</p>
            <p className="mt-2 text-3xl font-black text-green-700">{stats.active}</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Pasif Metin</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{stats.passive}</p>
          </article>
          <article className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Anlama Testi</p>
            <p className="mt-2 text-3xl font-black text-indigo-700">{stats.comprehension}</p>
          </article>
        </div>
      </section>

      {isFormOpen ? (
        <section className="idil-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                {editingItemId ? "Metni Duzenle" : "Yeni Kayit"}
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                {editingItemId ? "Secili metni guncelle" : "Yeni metin ekle"}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Vazgec
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Baslik
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  placeholder="Metin basligi"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Kategori
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  >
                    {TEXT_LIBRARY_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Seviye
                  <select
                    value={form.level}
                    onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
                    className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  >
                    {TEXT_LIBRARY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Hedef Grup
                  <select
                    value={form.targetGroup}
                    onChange={(event) => setForm((current) => ({ ...current, targetGroup: event.target.value }))}
                    className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  >
                    {TEXT_LIBRARY_TARGET_GROUPS.map((targetGroup) => (
                      <option key={targetGroup} value={targetGroup}>
                        {targetGroup}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700">Kullanim Alanlari</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {TEXT_LIBRARY_USAGE_TYPES.map((usageType) => (
                    <label
                      key={usageType.id}
                      className="flex min-h-[42px] items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
                    >
                      <input
                        type="checkbox"
                        checked={form.usageTypes.includes(usageType.id)}
                        onChange={() => toggleUsageType(usageType.id)}
                        className="h-4 w-4 accent-red-700"
                      />
                      {usageType.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-red-700"
                />
                Aktif olarak kullanilabilir
              </label>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Metin Icerigi
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[260px] rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
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
                disabled={!form.title.trim() || !form.content.trim()}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="idil-card p-5 md:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-1">
            Arama
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              placeholder="Baslik veya icerik ara"
            />
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Kategori
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tum kategoriler</option>
              {TEXT_LIBRARY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Kullanim Alani
            <select
              value={usageFilter}
              onChange={(event) => setUsageFilter(event.target.value)}
              className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tumu</option>
              {TEXT_LIBRARY_USAGE_TYPES.map((usageType) => (
                <option key={usageType.id} value={usageType.id}>
                  {usageType.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Durum
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Tumu</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-800">Filtrelere uygun metin bulunamadi.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-red-100 bg-white p-4 shadow-[0_10px_24px_rgba(127,29,29,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(127,29,29,0.11)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.isActive ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {item.category} - {item.level ?? "Seviye yok"} - {item.targetGroup ?? "Hedef grup yok"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-800 transition hover:bg-red-100"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      {item.isActive ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.content}</p>

                <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <span className="rounded-xl bg-slate-50 px-3 py-2">{item.wordCount} kelime</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">{item.characterCount} karakter</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">Olusturma: {formatDate(item.createdAt)}</span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">Guncelleme: {formatDate(item.updatedAt)}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.usageTypes.map((usageType) => (
                    <span key={usageType} className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                      {getUsageTypeLabel(usageType)}
                    </span>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
