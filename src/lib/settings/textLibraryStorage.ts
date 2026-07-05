export const TEXT_LIBRARY_STORAGE_KEY = "idil_text_library";

export const TEXT_LIBRARY_CATEGORIES = [
  "Ilkokul",
  "Ortaokul",
  "Genel Kultur",
  "Bilim",
  "Hikaye",
  "Tarih",
  "Yasam",
  "Spor",
  "Biyografi",
  "Cografya",
  "Makale",
] as const;

export const TEXT_LIBRARY_LEVELS = ["Kolay", "Orta", "Zor"] as const;

export const TEXT_LIBRARY_TARGET_GROUPS = [
  "2. Sinif",
  "3. Sinif",
  "4. Sinif",
  "Ortaokul",
  "Yetiskin",
] as const;

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
  level?: string;
  targetGroup?: string;
  content: string;
  wordCount: number;
  characterCount: number;
  isActive: boolean;
  usageTypes: string[];
  createdAt: string;
  updatedAt: string;
};

export type TextLibraryItemInput = Omit<
  TextLibraryItem,
  "id" | "wordCount" | "characterCount" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function createTextId(): string {
  return `text-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createSeedItem(
  id: string,
  title: string,
  category: string,
  level: string,
  targetGroup: string,
  usageTypes: TextLibraryUsageType[],
  content: string,
): TextLibraryItem {
  const timestamp = "2026-07-05T00:00:00.000Z";

  return {
    id,
    title,
    category,
    level,
    targetGroup,
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: true,
    usageTypes,
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
      "Orta",
      "4. Sinif",
      ["block-reading", "shadowing", "comprehension-test"],
      "Ormanlar, canlilar icin temiz hava, serinlik ve guvenli yasam alanlari saglar. Agaclar havadaki kirli gazlari azaltir ve oksijen uretir. Bir ormanda kuslar, bocekler, memeliler ve sayisiz bitki bir arada yasar. Insanlar da ormanlardan dinlenmek, arastirma yapmak ve dogayi tanimak icin yararlanir. Ormanlari korumak, gelecekte daha saglikli bir cevrede yasamak icin en onemli sorumluluklardan biridir.",
    ),
    createSeedItem(
      "seed-kitap-okuma-aliskanligi",
      "Kitap Okuma Aliskanligi",
      "Ilkokul",
      "Kolay",
      "3. Sinif",
      ["focused-reading", "comprehension-test"],
      "Kitap okumak kelime hazinesini gelistirir ve dusunme becerisini guclendirir. Her gun kisa bir sure kitap okuyan ogrenciler zamanla daha akici okumaya baslar. Okunan hikayeler hayal gucunu besler, yeni bilgiler ogrenmeyi kolaylastirir ve dikkati toplama becerisini artirir. Duzenli okuma aliskanligi kazanmak icin sessiz bir ortam secmek ve her gun ayni saatte okumaya calismak faydalidir.",
    ),
    createSeedItem(
      "seed-uzayin-gizemleri",
      "Uzayin Gizemleri",
      "Bilim",
      "Orta",
      "Ortaokul",
      ["block-reading", "focused-reading", "comprehension-test"],
      "Uzay, gezegenler, yildizlar, uydular ve galaksilerle dolu buyuk bir alandir. Bilim insanlari teleskoplar ve uzay araclari sayesinde evren hakkinda yeni bilgiler toplar. Mars, Ay ve diger gok cisimleri uzerinde yapilan arastirmalar, insanligin gelecekte uzayda nasil yasayabilecegini anlamaya yardim eder. Uzayin gizemlerini kesfetmek sabir, merak ve guclu bir bilimsel calisma gerektirir.",
    ),
    createSeedItem(
      "seed-ataturk-ve-bilim",
      "Ataturk ve Bilim",
      "Tarih",
      "Orta",
      "4. Sinif",
      ["shadowing", "comprehension-test"],
      "Ataturk, bilimin ve aklin toplumlarin gelismesinde cok onemli oldugunu vurgulamistir. Egitim, teknoloji ve arastirma alanlarinda ilerlemenin ulkeyi guclendirecegine inanmistir. Bu nedenle okullarin cagdas bilgilerle donatilmasini, ogrencilerin soru sormasini ve dusunmesini istemistir. Bilime verilen deger, bugun de uretken ve bilincli bireyler yetistirmek icin yol gostericidir.",
    ),
    createSeedItem(
      "seed-saglikli-yasam",
      "Saglikli Yasam",
      "Yasam",
      "Kolay",
      "Ortaokul",
      ["block-reading", "focused-reading"],
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
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
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

function ensureInitialItems(): TextLibraryItem[] {
  const existing = readItemsRaw();
  if (existing.length > 0) {
    return existing;
  }

  const seedItems = getSeedTextLibraryItems();
  writeItems(seedItems);
  return seedItems;
}

function normalizeTextItem(input: TextLibraryItemInput): TextLibraryItem {
  const now = new Date().toISOString();
  const content = input.content.trim();

  return {
    id: input.id ?? createTextId(),
    title: input.title.trim(),
    category: input.category.trim(),
    level: input.level?.trim() || undefined,
    targetGroup: input.targetGroup?.trim() || undefined,
    content,
    wordCount: countWords(content),
    characterCount: countCharacters(content),
    isActive: input.isActive,
    usageTypes: input.usageTypes,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
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

export function getTextLibraryItems(): TextLibraryItem[] {
  return ensureInitialItems().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveTextLibraryItem(item: TextLibraryItemInput): TextLibraryItem {
  const nextItem = normalizeTextItem(item);
  writeItems([nextItem, ...ensureInitialItems()]);
  return nextItem;
}

export function updateTextLibraryItem(
  id: string,
  updates: Partial<Omit<TextLibraryItem, "id" | "createdAt">>,
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

export function getActiveTextsByUsageType(usageType: string): TextLibraryItem[] {
  return getTextLibraryItems().filter((item) => item.isActive && item.usageTypes.includes(usageType));
}

export function getTextsByCategory(category: string): TextLibraryItem[] {
  return getTextLibraryItems().filter((item) => item.category === category);
}
