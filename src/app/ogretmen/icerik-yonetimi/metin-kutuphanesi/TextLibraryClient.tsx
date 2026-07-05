"use client";

import { useEffect, useMemo, useState } from "react";
import {
  countCharacters,
  countWords,
  deleteTextLibraryItem,
  getTextCategories,
  getTextLibraryItems,
  saveTextCategory,
  saveTextLibraryItem,
  toggleTextLibraryItemActive,
  updateTextLibraryItem,
  type TextLibraryItem,
} from "@/lib/settings/textLibraryStorage";

type TextFormState = {
  title: string;
  category: string;
  content: string;
  isActive: boolean;
};

const DEFAULT_CATEGORY = "Genel Kultur";

const EMPTY_FORM: TextFormState = {
  title: "",
  category: DEFAULT_CATEGORY,
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
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<TextFormState>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setItems(getTextLibraryItems());
      setCategories(getTextCategories());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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

  function refreshData(): void {
    setItems(getTextLibraryItems());
    setCategories(getTextCategories());
  }

  function resetForm(): void {
    setForm({ ...EMPTY_FORM, category: categories[0] ?? DEFAULT_CATEGORY });
    setEditingItemId(null);
    setIsFormOpen(false);
  }

  function openCreateForm(): void {
    setForm({ ...EMPTY_FORM, category: categories[0] ?? DEFAULT_CATEGORY });
    setEditingItemId(null);
    setIsFormOpen(true);
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

  function saveCategory(): void {
    const savedCategory = saveTextCategory(newCategoryName);
    if (!savedCategory) {
      return;
    }

    setNewCategoryName("");
    setIsCategoryFormOpen(false);
    refreshData();
    setForm((current) => ({ ...current, category: savedCategory }));
  }

  function saveForm(): void {
    if (!form.title.trim() || !form.content.trim()) {
      return;
    }

    if (editingItemId) {
      updateTextLibraryItem(editingItemId, {
        title: form.title,
        category: form.category,
        content: form.content,
        isActive: form.isActive,
      });
    } else {
      saveTextLibraryItem({
        title: form.title,
        category: form.category,
        content: form.content,
        isActive: form.isActive,
      });
    }

    refreshData();
    resetForm();
  }

  function handleDelete(item: TextLibraryItem): void {
    const isConfirmed = window.confirm("Bu metni silmek istediginize emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    deleteTextLibraryItem(item.id);
    refreshData();
  }

  function handleToggleActive(item: TextLibraryItem): void {
    toggleTextLibraryItemActive(item.id);
    refreshData();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="idil-card overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Ortak Metin Sistemi</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Metin Kutuphanesi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tum okuma calismalari ve anlama testlerinde kullanilacak metinleri buradan yonetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
            >
              Yeni Metin Ekle
            </button>
            <button
              type="button"
              onClick={() => setIsCategoryFormOpen((current) => !current)}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-800 transition hover:bg-red-100 active:scale-[0.98]"
            >
              Yeni Kategori Ekle
            </button>
          </div>
        </div>

        {isCategoryFormOpen ? (
          <div className="mt-5 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Yeni Kategori Adi
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                placeholder="Orn: Masallar"
              />
            </label>
            <button
              type="button"
              onClick={saveCategory}
              disabled={!newCategoryName.trim()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCategoryFormOpen(false);
                setNewCategoryName("");
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Vazgec
            </button>
          </div>
        ) : null}

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
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Kategori</p>
            <p className="mt-2 text-3xl font-black text-indigo-700">{stats.categories}</p>
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

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.35fr]">
            <div className="grid content-start gap-3">
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Kategori
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Metin Basligi
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="min-h-[44px] rounded-xl border border-red-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  placeholder="Metin basligi"
                />
              </label>

              <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
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
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Metin Icerigi
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[300px] rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
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
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
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
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
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
                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.category}</p>
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
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
