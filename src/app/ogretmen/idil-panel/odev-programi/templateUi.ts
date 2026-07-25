import type { ProgramTemplateSlot } from "@/lib/assignments/types";

/**
 * Sablon kutuphanesi ve editor ekranlarinin paylastigi, React'siz yardimcilar
 * ve Tailwind sinif sabitleri. (Eski AssignmentProgramSettingsClient icindeki
 * ayni sinif dizeleriyle gorsel olarak tutarli kalmasi icin birebir ayni
 * degerler kullanildi.)
 */

export const CARD_SURFACE_CLASS =
  "rounded-2xl border border-[var(--idil-border,#e2e8f0)] bg-[var(--idil-surface,#ffffff)] p-4 text-[var(--idil-text,#0f172a)] shadow-sm transition";

export const INPUT_CLASS =
  "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100 [data-idil-theme=dark]:disabled:bg-slate-800";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:bg-slate-300";

export const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-slate-100";

export const MUTED_TEXT_CLASS = "text-xs text-[var(--idil-muted,#64748b)]";

/** Bir slotun grid icindeki konum anahtari. */
export function slotKey(dayNumber: number, taskOrder: number): string {
  return `${dayNumber}:${taskOrder}`;
}

/** Slot listesini konum anahtarina gore haritalar (grid render'i icin). */
export function indexSlots(slots: readonly ProgramTemplateSlot[]): Map<string, ProgramTemplateSlot> {
  const map = new Map<string, ProgramTemplateSlot>();
  for (const slot of slots) {
    map.set(slotKey(slot.dayNumber, slot.taskOrder), slot);
  }
  return map;
}

/** Bir gunde halihazirda kullanilan egzersiz slug'lari (belirtilen sira haric). */
export function usedSlugsForDay(
  slots: readonly ProgramTemplateSlot[],
  dayNumber: number,
  exceptTaskOrder?: number,
): Set<string> {
  const used = new Set<string>();
  for (const slot of slots) {
    if (slot.dayNumber !== dayNumber) continue;
    if (exceptTaskOrder !== undefined && slot.taskOrder === exceptTaskOrder) continue;
    used.add(slot.exerciseSlug);
  }
  return used;
}

export function dayNumbers(programDays: number): number[] {
  return Array.from({ length: programDays }, (_, index) => index + 1);
}

export const TASK_ORDERS = [1, 2, 3, 4, 5] as const;

/** Bilinen settings anahtarlari icin Turkce, birimli etiketler. Uydurma anahtar EKLENMEZ. */
const SETTINGS_FIELD_LABELS: Record<string, string> = {
  gridSize: "Kare Boyutu",
  soundEnabled: "Ses",
  mode: "Mod",
  speed: "Hız (ms)",
  boxCount: "Kutu Sayısı",
  targetDifferentCount: "Farklı Hedef Sayısı",
  targetWordsPerText: "Metin Başına Hedef Kelime",
  jumpSpeed: "Atlama Hızı (ms)",
  columnCount: "Kolon Sayısı",
  flowDirection: "Akış Yönü",
  speedMs: "Gösterim Hızı (ms)",
  workMode: "Çalışma Modu",
  contentType: "İçerik Türü",
  difficulty: "Zorluk",
  speedSeconds: "Tur Süresi (sn)",
  gridLayout: "Izgara Düzeni",
  displayMs: "Gösterim Süresi (ms)",
  fontSize: "Yazı Boyutu (px)",
  previewDurationMs: "Önizleme Süresi (ms)",
  flipBackDelayMs: "Kapanma Süresi (ms)",
  blockSize: "Blok Boyutu",
  speedMode: "Hız Modu",
  intervalMs: "Aralık (ms)",
  wordsPerMinute: "Dakikadaki Kelime (WPM)",
  groupSize: "Grup Boyutu",
  displayMode: "Gösterim Modu",
  scrollMode: "Kaydırma Modu",
  customMilliseconds: "Özel Süre (ms)",
  customWordsPerMinute: "Özel WPM",
};

/** Bilinen bir settings anahtari icin insan-okunur etiket; bilinmeyenler camelCase'den humanize edilir. */
export function getSettingFieldLabel(key: string): string {
  const known = SETTINGS_FIELD_LABELS[key];
  if (known) {
    return known;
  }
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.length > 0 ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}

/** 300 -> "5 dakika", 330 -> "5 dk 30 sn". Yalniz gosterim icindir - API'ye hep saniye gider. */
export function formatDurationLabel(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "-";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (seconds === 0) {
    return `${minutes} dakika`;
  }
  return `${minutes} dk ${seconds} sn`;
}
