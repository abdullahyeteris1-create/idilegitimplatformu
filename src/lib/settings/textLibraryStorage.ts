import { supabase } from "@/lib/supabase/client";

export const TEXT_LIBRARY_STORAGE_KEY = "idil_text_library";
export const TEXT_CATEGORY_STORAGE_KEY = "idil_text_categories";
const TEXT_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TEXT_LIBRARY_TABLE ?? "text_library";
const LEGACY_TEXT_LIBRARY_STORAGE_KEYS = [
  TEXT_LIBRARY_STORAGE_KEY,
  "textLibrary",
  "text_library",
  "readingTexts",
  "customTexts",
  "settings/textLibrary",
] as const;

export const TEXT_LIBRARY_CATEGORIES = [
  "Bilim",
  "Biyografi",
  "Coğrafya",
  "Edebiyat",
  "Genel Kültür",
  "Hikayeler",
  "Hikayeler (Uzun)",
  "İlkokul Hikayeleri",
  "Makaleler",
  "Ortaokul Hikayeleri",
  "Romanlar",
  "Spor",
  "Tarih",
  "Yaşam",
] as const;

export const DEFAULT_TEXT_CATEGORY = "Genel Kültür";

export const DEFAULT_TEXT_CATEGORIES = TEXT_LIBRARY_CATEGORIES;

export const TEXT_LIBRARY_USAGE_TYPES = [
  { id: "block-reading", label: "Blok Okuma" },
  { id: "shadowing", label: "Golgeleme" },
  { id: "focused-reading", label: "Odakli Okuma" },
  { id: "comprehension-test", label: "Anlama Testi" },
] as const;

export type TextLibraryUsageType = (typeof TEXT_LIBRARY_USAGE_TYPES)[number]["id"];

export type TextLibraryItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  characterCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  level?: string;
  targetGroup?: string;
  usageTypes?: string[];
};

export type TextLibraryItemInput = {
  id?: string;
  title: string;
  category: string;
  content: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  level?: string;
  targetGroup?: string;
  usageTypes?: string[];
};

export type TextLibraryLoadResult = {
  items: TextLibraryItem[];
  error: string | null;
};

export type TextLibraryWriteResult = {
  item: TextLibraryItem | null;
  error: string | null;
};

type TextLibraryMutationOptions = {
  syncSupabase?: boolean;
};

const TEXT_LIBRARY_WRITE_ERROR = "Metin Supabase'e kaydedilemedi. İnternet/izin ayarlarını kontrol edin.";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function createTextId(): string {
  return `text-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function uniqueCategories(categories: string[]): string[] {
  const normalized = categories.map((category) => normalizeCategoryName(category)).filter(Boolean);
  const normalizedSet = new Set(normalized);

  return TEXT_LIBRARY_CATEGORIES.filter((category) => normalizedSet.has(category));
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/[üu]/g, "u")
    .replace(/ş/g, "s")
    .replace(/[ıiİ]/g, "i")
    .replace(/[öo]/g, "o")
    .replace(/[çc]/g, "c")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function fixMojibake(value: string): string {
  return value
    .replace(/ÄŸ/g, "\u011f")
    .replace(/Äž/g, "\u011e")
    .replace(/Ã¼/g, "\u00fc")
    .replace(/Ãœ/g, "\u00dc")
    .replace(/ÅŸ/g, "\u015f")
    .replace(/Åž/g, "\u015e")
    .replace(/Ä±/g, "\u0131")
    .replace(/Ä°/g, "\u0130")
    .replace(/Ã¶/g, "\u00f6")
    .replace(/Ã–/g, "\u00d6")
    .replace(/Ã§/g, "\u00e7")
    .replace(/Ã‡/g, "\u00c7");
}

function normalizeCategoryLookup(value: string): string {
  const normalized = fixMojibake(value)
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");

  return normalized || normalizeLookup(value);
}

function normalizeDisplayCategory(category: string): string {
  const lookup = normalizeCategoryLookup(category);

  switch (lookup) {
    case "cografya":
      return "Co\u011frafya";
    case "genelkultur":
      return "Genel K\u00fclt\u00fcr";
    case "ilkokulhikayeleri":
      return "\u0130lkokul Hikayeleri";
    case "yasam":
      return "Ya\u015fam";
    default:
      return fixMojibake(category);
  }
}

const CATEGORY_LOOKUP = new Map<string, string>(
  TEXT_LIBRARY_CATEGORIES.map((category) => [normalizeCategoryLookup(category), normalizeDisplayCategory(category)]),
);

const CATEGORY_ALIASES: Record<string, string> = {
  genel: "Genel Kültür",
  genelkultur: "Genel Kültür",
  kultur: "Genel Kültür",
  hikaye: "Hikayeler",
  hikayeleruzun: "Hikayeler (Uzun)",
  ilkokul: "İlkokul Hikayeleri",
  ilkokulhikayeleri: "İlkokul Hikayeleri",
  ortaokul: "Ortaokul Hikayeleri",
  ortaokulhikayeleri: "Ortaokul Hikayeleri",
  cografya: "Coğrafya",
  yasam: "Yaşam",
};

CATEGORY_ALIASES.genel = "Genel K\u00fclt\u00fcr";
CATEGORY_ALIASES.genelkultur = "Genel K\u00fclt\u00fcr";
CATEGORY_ALIASES.kultur = "Genel K\u00fclt\u00fcr";
CATEGORY_ALIASES.ilkokul = "\u0130lkokul Hikayeleri";
CATEGORY_ALIASES.ilkokulhikayeleri = "\u0130lkokul Hikayeleri";
CATEGORY_ALIASES.cografya = "Co\u011frafya";
CATEGORY_ALIASES.yasam = "Ya\u015fam";
CATEGORY_ALIASES.uzunhikayeler = "Hikayeler (Uzun)";

function isGradeCategoryLookup(lookup: string): boolean {
  if (lookup.includes("sinif")) {
    return true;
  }

  return /^[1-8](sinif)?$/.test(lookup);
}

function createSeedItem(id: string, title: string, category: string, content: string): TextLibraryItem {
  const timestamp = "2026-07-05T00:00:00.000Z";

  return {
    id,
    title,
    category,
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getSeedTextLibraryItems(): TextLibraryItem[] {
  return [
    createSeedItem(
      "seed-ormanlarin-onemi",
      "Ormanlarin Onemi",
      "Yasam",
      "Ormanlar, canlilar icin temiz hava, serinlik ve guvenli yasam alanlari saglar. Agaclar havadaki kirli gazlari azaltir ve oksijen uretir. Bir ormanda kuslar, bocekler, memeliler ve sayisiz bitki bir arada yasar. Insanlar da ormanlardan dinlenmek, arastirma yapmak ve dogayi tanimak icin yararlanir. Ormanlari korumak, gelecekte daha saglikli bir cevrede yasamak icin en onemli sorumluluklardan biridir.",
    ),
    createSeedItem(
      "seed-kitap-okuma-aliskanligi",
      "Kitap Okuma Aliskanligi",
      "İlkokul Hikayeleri",
      "Kitap okumak kelime hazinesini gelistirir ve dusunme becerisini guclendirir. Her gun kisa bir sure kitap okuyan ogrenciler zamanla daha akici okumaya baslar. Okunan hikayeler hayal gucunu besler, yeni bilgiler ogrenmeyi kolaylastirir ve dikkati toplama becerisini artirir. Duzenli okuma aliskanligi kazanmak icin sessiz bir ortam secmek ve her gun ayni saatte okumaya calismak faydalidir.",
    ),
    createSeedItem(
      "seed-uzayin-gizemleri",
      "Uzayin Gizemleri",
      "Bilim",
      "Uzay, gezegenler, yildizlar, uydular ve galaksilerle dolu buyuk bir alandir. Bilim insanlari teleskoplar ve uzay araclari sayesinde evren hakkinda yeni bilgiler toplar. Mars, Ay ve diger gok cisimleri uzerinde yapilan arastirmalar, insanligin gelecekte uzayda nasil yasayabilecegini anlamaya yardim eder. Uzayin gizemlerini kesfetmek sabir, merak ve guclu bir bilimsel calisma gerektirir.",
    ),
    createSeedItem(
      "seed-ataturk-ve-bilim",
      "Ataturk ve Bilim",
      "Tarih",
      "Ataturk, bilimin ve aklin toplumlarin gelismesinde cok onemli oldugunu vurgulamistir. Egitim, teknoloji ve arastirma alanlarinda ilerlemenin ulkeyi guclendirecegine inanmistir. Bu nedenle okullarin cagdas bilgilerle donatilmasini, ogrencilerin soru sormasini ve dusunmesini istemistir. Bilime verilen deger, bugun de uretken ve bilincli bireyler yetistirmek icin yol gostericidir.",
    ),
    createSeedItem(
      "seed-saglikli-yasam",
      "Saglikli Yasam",
      "Yaşam",
      "Saglikli yasam icin dengeli beslenmek, duzenli hareket etmek ve yeterince uyumak gerekir. Sebze, meyve, tahil ve protein kaynaklarini dengeli tuketmek vucudun ihtiyac duydugu enerjiyi saglar. Spor yapmak kaslari guclendirir, dikkati artirir ve kendimizi daha iyi hissetmemize yardim eder. Gun icinde su icmek ve ekran karsisinda uzun sure hareketsiz kalmamak da saglikli aliskanliklar arasindadir.",
    ),
  ];
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLocaleLowerCase("tr-TR");
    if (["true", "1", "evet", "aktif", "active"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "hayir", "hayır", "pasif", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function readStringField(row: Record<string, unknown>, fieldNames: string[], fallback = ""): string {
  for (const fieldName of fieldNames) {
    const value = row[fieldName];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function normalizeUnknownItem(rawItem: unknown, index: number, storageKey: string): TextLibraryItem | null {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const row = rawItem as Record<string, unknown>;
  const content = readStringField(row, ["content", "text", "metin"]);

  if (!content.trim()) {
    return null;
  }

  const now = new Date().toISOString();

  return normalizeStoredItem({
    id: readStringField(row, ["id"], `legacy-${storageKey.replace(/[^a-z0-9]/gi, "-")}-${index}`),
    title: readStringField(row, ["title", "name", "baslik", "başlık"], "Basliksiz Metin"),
    category: readStringField(row, ["category", "kategori"], DEFAULT_TEXT_CATEGORY),
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: readBoolean(row.is_active ?? row.isActive ?? row.active, true),
    createdAt: readStringField(row, ["created_at", "createdAt"], now),
    updatedAt: readStringField(row, ["updated_at", "updatedAt"], now),
  });
}

function extractStoredItems(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const row = parsed as Record<string, unknown>;
  const candidates = [row.items, row.texts, row.textLibrary, row.data, row.value];
  const arrayCandidate = candidates.find((candidate) => Array.isArray(candidate));

  return Array.isArray(arrayCandidate) ? arrayCandidate : [];
}

function readItemsFromStorageKey(storageKey: string): TextLibraryItem[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return extractStoredItems(parsed)
      .map((item, index) => normalizeUnknownItem(item, index, storageKey))
      .filter((item): item is TextLibraryItem => item !== null);
  } catch {
    return [];
  }
}

function dedupeTextLibraryItems(items: TextLibraryItem[]): TextLibraryItem[] {
  const seenIds = new Set<string>();
  const seenContentKeys = new Set<string>();
  const deduped: TextLibraryItem[] = [];

  for (const item of items) {
    const contentKey = `${item.title.trim().toLocaleLowerCase("tr-TR")}::${item.content.trim().slice(0, 80)}`;
    if (seenIds.has(item.id) || seenContentKeys.has(contentKey)) {
      continue;
    }

    seenIds.add(item.id);
    seenContentKeys.add(contentKey);
    deduped.push(item);
  }

  return deduped;
}

function readItemsRaw(): TextLibraryItem[] {
  return dedupeTextLibraryItems(LEGACY_TEXT_LIBRARY_STORAGE_KEYS.flatMap((storageKey) => readItemsFromStorageKey(storageKey)));
}

function writeItems(items: TextLibraryItem[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(TEXT_LIBRARY_STORAGE_KEY, JSON.stringify(items));
}

function writeCategories(categories: string[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(TEXT_CATEGORY_STORAGE_KEY, JSON.stringify(uniqueCategories(categories)));
}

function ensureInitialItems(): TextLibraryItem[] {
  const existing = readItemsRaw();
  if (existing.length > 0) {
    writeItems(existing);
    return existing;
  }

  const seedItems = getSeedTextLibraryItems();
  writeItems(seedItems);
  return seedItems;
}

function normalizeStoredItem(item: TextLibraryItem): TextLibraryItem {
  const content = item.content?.trim() ?? "";

  return {
    ...item,
    title: item.title?.trim() ?? "Basliksiz Metin",
    category: normalizeCategoryName(item.category || DEFAULT_TEXT_CATEGORY),
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: item.isActive !== false,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  };
}

function normalizeTextItem(input: TextLibraryItemInput): TextLibraryItem {
  const now = new Date().toISOString();
  const content = input.content.trim();

  return {
    id: input.id ?? createTextId(),
    title: input.title.trim(),
    category: normalizeCategoryName(input.category),
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: input.isActive,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

function mapSupabaseRowToTextItem(row: Record<string, unknown>): TextLibraryItem {
  const content = typeof row.content === "string" ? row.content : "";

  return normalizeStoredItem({
    id: String(row.id ?? createTextId()),
    title: typeof row.title === "string" ? row.title : "Basliksiz Metin",
    category: typeof row.category === "string" ? row.category : DEFAULT_TEXT_CATEGORY,
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: typeof row.is_active === "boolean" ? row.is_active : typeof row.isActive === "boolean" ? row.isActive : true,
    createdAt: typeof row.created_at === "string" ? row.created_at : typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  });
}

function mapTextItemToSupabaseRow(item: TextLibraryItem): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    content: item.content,
    is_active: item.isActive,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function logTextLibrarySupabaseError(action: string, error: { message?: string; details?: string; hint?: string; code?: string }, extra?: Record<string, unknown>): void {
  console.error(`Supabase ${TEXT_LIBRARY_TABLE} ${action} failed`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    ...extra,
  });
}

async function fetchTextLibraryFromSupabase(onlyActive: boolean): Promise<TextLibraryLoadResult | null> {
  if (!supabase) {
    return null;
  }

  let query = supabase.from(TEXT_LIBRARY_TABLE).select("id,title,category,content,is_active,created_at,updated_at").order("updated_at", { ascending: false });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error || !Array.isArray(data)) {
    if (error) {
      logTextLibrarySupabaseError("select", error);
    }

    return {
      items: [],
      error: "Metinler y\u00fcklenemedi. Supabase izinlerini kontrol edin.",
    };
  }

  const items = data.map((row) => mapSupabaseRowToTextItem(row as Record<string, unknown>));
  return {
    items,
    error: null,
  };
}

async function upsertTextToSupabase(item: TextLibraryItem): Promise<TextLibraryWriteResult> {
  if (!supabase) {
    console.error("Supabase text_library upsert skipped: Supabase client is not configured.");
    return {
      item,
      error: TEXT_LIBRARY_WRITE_ERROR,
    };
  }

  const payload = mapTextItemToSupabaseRow(item);
  const { data, error } = await supabase.from(TEXT_LIBRARY_TABLE).upsert(payload, { onConflict: "id" }).select("*").single();

  if (error || !data) {
    if (error) {
      logTextLibrarySupabaseError("upsert", error, { payload });
    }

    return {
      item,
      error: TEXT_LIBRARY_WRITE_ERROR,
    };
  }

  const remoteItem = mapSupabaseRowToTextItem(data as Record<string, unknown>);
  const currentItems = readItemsRaw().filter((entry) => entry.id !== remoteItem.id);
  writeItems([remoteItem, ...currentItems]);

  return {
    item: remoteItem,
    error: null,
  };
}

async function deleteTextFromSupabase(id: string): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase text_library delete skipped: Supabase client is not configured.");
    return TEXT_LIBRARY_WRITE_ERROR;
  }

  const { error } = await supabase.from(TEXT_LIBRARY_TABLE).delete().eq("id", id);

  if (error) {
    logTextLibrarySupabaseError("delete", error, { id });
    return TEXT_LIBRARY_WRITE_ERROR;
  }

  return null;
}

export function normalizeCategoryName(categoryName: string): string {
  const trimmed = categoryName.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return DEFAULT_TEXT_CATEGORY;
  }

  const lookup = normalizeCategoryLookup(trimmed);
  if (!lookup) {
    return DEFAULT_TEXT_CATEGORY;
  }

  const directMatch = CATEGORY_LOOKUP.get(lookup);
  if (directMatch) {
    return directMatch;
  }

  const aliasMatch = CATEGORY_ALIASES[lookup];
  if (aliasMatch) {
    return aliasMatch;
  }

  if (isGradeCategoryLookup(lookup)) {
    return DEFAULT_TEXT_CATEGORY;
  }

  return DEFAULT_TEXT_CATEGORY;
}

export function countWords(text: string): number {
  return text.trim().match(/\S+/g)?.length ?? 0;
}

export function countCharacters(text: string): number {
  return text.trim().length;
}

export function getUsageTypeLabel(usageType: string): string {
  return TEXT_LIBRARY_USAGE_TYPES.find((item) => item.id === usageType)?.label ?? usageType;
}

export function getTextCategories(): string[] {
  const categories = TEXT_LIBRARY_CATEGORIES.map((category) => normalizeDisplayCategory(category));

  if (hasWindow()) {
    writeCategories(categories);
  }

  return categories;
}

export function saveTextCategory(categoryName: string): string | null {
  const nextCategory = normalizeCategoryName(categoryName);
  if (!nextCategory) {
    return null;
  }

  writeCategories([...getTextCategories(), nextCategory]);
  return nextCategory;
}

export function deleteTextCategory(categoryName: string): boolean {
  const normalizedCategory = normalizeCategoryName(categoryName);
  const hasText = getTextLibraryItems().some((item) => item.category === normalizedCategory);

  if (hasText) {
    return false;
  }

  const nextCategories = getTextCategories().filter((item) => item !== normalizedCategory);
  writeCategories(nextCategories);
  return true;
}

export function getTextLibraryItems(): TextLibraryItem[] {
  return ensureInitialItems().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getActiveTextLibraryItems(): TextLibraryItem[] {
  return readItemsRaw().filter((item) => item.isActive);
}

export async function refreshTextLibraryCache(): Promise<TextLibraryLoadResult> {
  const localItems = getTextLibraryItems();
  const remoteResult = await fetchTextLibraryFromSupabase(false);

  if (remoteResult) {
    if (!remoteResult.error && remoteResult.items.length > 0) {
      writeItems(remoteResult.items);
      return remoteResult;
    }

    if (localItems.length > 0) {
      return {
        items: localItems,
        error: null,
      };
    }

    return {
      items: [],
      error: remoteResult.error,
    };
  }

  return {
    items: localItems,
    error: null,
  };
}

export async function loadActiveTextLibraryItems(): Promise<TextLibraryLoadResult> {
  const localActiveItems = getActiveTextLibraryItems();
  const remoteResult = await fetchTextLibraryFromSupabase(true);

  if (remoteResult) {
    if (!remoteResult.error && remoteResult.items.length > 0) {
      const currentItems = readItemsRaw().filter((item) => !item.isActive);
      writeItems([...remoteResult.items, ...currentItems]);
      return remoteResult;
    }

    if (localActiveItems.length > 0) {
      return {
        items: localActiveItems,
        error: null,
      };
    }

    return {
      items: [],
      error: remoteResult.error,
    };
  }

  return {
    items: localActiveItems,
    error: null,
  };
}

export function saveTextLibraryItem(item: TextLibraryItemInput, options: TextLibraryMutationOptions = {}): TextLibraryItem {
  const shouldSyncSupabase = options.syncSupabase !== false;
  const nextItem = normalizeTextItem(item);
  saveTextCategory(nextItem.category);
  writeItems([nextItem, ...ensureInitialItems()]);
  if (shouldSyncSupabase) {
    void upsertTextToSupabase(nextItem);
  }
  return nextItem;
}

export async function saveTextLibraryItemAndSync(item: TextLibraryItemInput): Promise<TextLibraryWriteResult> {
  const nextItem = saveTextLibraryItem(item, { syncSupabase: false });
  return upsertTextToSupabase(nextItem);
}

export function updateTextLibraryItem(
  id: string,
  updates: Partial<Omit<TextLibraryItemInput, "id" | "createdAt">>,
  options: TextLibraryMutationOptions = {},
): TextLibraryItem | null {
  const shouldSyncSupabase = options.syncSupabase !== false;
  const items = ensureInitialItems();
  const itemIndex = items.findIndex((item) => item.id === id);

  if (itemIndex < 0) {
    return null;
  }

  const existingItem = items[itemIndex];
  const updatedInput: TextLibraryItemInput = {
    ...existingItem,
    ...updates,
    id: existingItem.id,
    createdAt: existingItem.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const updatedItem = normalizeTextItem(updatedInput);
  const nextItems = [...items];
  nextItems[itemIndex] = updatedItem;
  saveTextCategory(updatedItem.category);
  writeItems(nextItems);
  if (shouldSyncSupabase) {
    void upsertTextToSupabase(updatedItem);
  }

  return updatedItem;
}

export async function updateTextLibraryItemAndSync(
  id: string,
  updates: Partial<Omit<TextLibraryItemInput, "id" | "createdAt">>,
): Promise<TextLibraryWriteResult> {
  const updatedItem = updateTextLibraryItem(id, updates, { syncSupabase: false });
  if (!updatedItem) {
    return {
      item: null,
      error: "Metin bulunamadı.",
    };
  }

  return upsertTextToSupabase(updatedItem);
}

export function deleteTextLibraryItem(id: string, options: TextLibraryMutationOptions = {}): boolean {
  const shouldSyncSupabase = options.syncSupabase !== false;
  const items = ensureInitialItems();
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    return false;
  }

  writeItems(nextItems);
  if (shouldSyncSupabase) {
    void deleteTextFromSupabase(id);
  }
  return true;
}

export async function deleteTextLibraryItemAndSync(id: string): Promise<{ deleted: boolean; error: string | null }> {
  const deleted = deleteTextLibraryItem(id, { syncSupabase: false });
  if (!deleted) {
    return {
      deleted: false,
      error: "Metin bulunamadı.",
    };
  }

  return {
    deleted: true,
    error: await deleteTextFromSupabase(id),
  };
}

export function toggleTextLibraryItemActive(id: string, options: TextLibraryMutationOptions = {}): TextLibraryItem | null {
  const item = ensureInitialItems().find((entry) => entry.id === id);
  if (!item) {
    return null;
  }

  return updateTextLibraryItem(id, { isActive: !item.isActive }, options);
}

export async function toggleTextLibraryItemActiveAndSync(id: string): Promise<TextLibraryWriteResult> {
  const item = toggleTextLibraryItemActive(id, { syncSupabase: false });
  if (!item) {
    return {
      item: null,
      error: "Metin bulunamadı.",
    };
  }

  return upsertTextToSupabase(item);
}

export function getTextsByCategory(category: string): TextLibraryItem[] {
  const normalizedCategory = normalizeCategoryName(category);
  return getTextLibraryItems().filter((item) => item.category === normalizedCategory);
}

export function getActiveTextsByCategory(category: string): TextLibraryItem[] {
  const normalizedCategory = normalizeCategoryName(category);
  return getActiveTextLibraryItems().filter((item) => item.category === normalizedCategory);
}

export function getActiveTextsByUsageType(usageType: string): TextLibraryItem[] {
  void usageType;
  return getActiveTextLibraryItems();
}
