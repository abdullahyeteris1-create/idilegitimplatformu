export const TEXT_LIBRARY_STORAGE_KEY = "idil_text_library";
export const TEXT_CATEGORY_STORAGE_KEY = "idil_text_categories";

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

const CATEGORY_LOOKUP = new Map<string, string>(
  TEXT_LIBRARY_CATEGORIES.map((category) => [normalizeLookup(category), category]),
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

function readItemsRaw(): TextLibraryItem[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(TEXT_LIBRARY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TextLibraryItem[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string").map(normalizeStoredItem)
      : [];
  } catch {
    return [];
  }
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

export function normalizeCategoryName(categoryName: string): string {
  const trimmed = categoryName.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return DEFAULT_TEXT_CATEGORY;
  }

  const lookup = normalizeLookup(trimmed);
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
  const categories = [...TEXT_LIBRARY_CATEGORIES];

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

export function saveTextLibraryItem(item: TextLibraryItemInput): TextLibraryItem {
  const nextItem = normalizeTextItem(item);
  saveTextCategory(nextItem.category);
  writeItems([nextItem, ...ensureInitialItems()]);
  return nextItem;
}

export function updateTextLibraryItem(
  id: string,
  updates: Partial<Omit<TextLibraryItemInput, "id" | "createdAt">>,
): TextLibraryItem | null {
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

  return updatedItem;
}

export function deleteTextLibraryItem(id: string): boolean {
  const items = ensureInitialItems();
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    return false;
  }

  writeItems(nextItems);
  return true;
}

export function toggleTextLibraryItemActive(id: string): TextLibraryItem | null {
  const item = ensureInitialItems().find((entry) => entry.id === id);
  if (!item) {
    return null;
  }

  return updateTextLibraryItem(id, { isActive: !item.isActive });
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
