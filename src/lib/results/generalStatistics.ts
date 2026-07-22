import { categories as panelCategories } from "@/components/student-panel-preview/data";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
const ISTANBUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  month: "short",
  year: "numeric",
});

const MS_PER_DAY = 86_400_000;

/**
 * Aynı gün/seri hesaplama mantığı StudentPanelPreview.tsx'teki calculateDailyStreak ile
 * bire bir eşleşecek şekilde (Europe/Istanbul gün sınırı, aynı formül) burada bağımsız
 * bir saf eşdeğer olarak tutulur — StudentPanelPreview.tsx bu turda değiştirilmiyor.
 */
function getIstanbulDateKey(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;

  const parts = ISTANBUL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function dateKeyToDayNumber(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const dayNumber = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / MS_PER_DAY;
  return Number.isFinite(dayNumber) ? dayNumber : null;
}

function getResultDayNumber(result: ExerciseResult): number | null {
  const dateKey = getIstanbulDateKey(new Date(result.date));
  return dateKey ? dateKeyToDayNumber(dateKey) : null;
}

function getUniqueResults(results: ExerciseResult[]): ExerciseResult[] {
  const seenIds = new Set<string>();

  return results.filter((result) => {
    if (!result.id || seenIds.has(result.id)) return false;
    seenIds.add(result.id);
    return true;
  });
}

/** StudentPanelPreview.tsx'teki calculateDailyStreak ile davranışı birebir aynı saf fonksiyon. */
export function calculateStudyStreak(results: ExerciseResult[], now = new Date()): number {
  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return 0;

  const activeDays = new Set(
    getUniqueResults(results)
      .map(getResultDayNumber)
      .filter((dayNumber): dayNumber is number => dayNumber !== null && dayNumber <= todayDayNumber),
  );
  const startDayNumber = activeDays.has(todayDayNumber)
    ? todayDayNumber
    : activeDays.has(todayDayNumber - 1)
      ? todayDayNumber - 1
      : null;

  if (startDayNumber === null) return 0;

  let streak = 0;
  for (let dayNumber = startDayNumber; activeDays.has(dayNumber); dayNumber -= 1) {
    streak += 1;
  }

  return streak;
}

/** Son 7 gün için gün gün "o gün en az bir çalışma var mı" işaretleri (streak kartının altındaki mini gösterge için). */
export function calculateRecentDayMarkers(results: ExerciseResult[], days = 7, now = new Date()): boolean[] {
  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return [];

  const activeDays = new Set(
    getUniqueResults(results)
      .map(getResultDayNumber)
      .filter((dayNumber): dayNumber is number => dayNumber !== null),
  );

  const markers: boolean[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    markers.push(activeDays.has(todayDayNumber - i));
  }
  return markers;
}

export type StatisticsPeriod = "7d" | "30d" | "90d" | "all";

export type NormalizedGeneralResult = {
  result: ExerciseResult;
  dayKey: string;
  dayNumber: number;
  monthKey: string;
  timestamp: number;
};

function getIstanbulMonthKey(date: Date): string | null {
  const parts = ISTANBUL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

/**
 * Geçerli, benzersiz (id'ye göre dedupe edilmiş) ve tarihi ayrıştırılabilen sonuçları
 * normalize eder. Diğer bütün agregasyon fonksiyonları bu çıktıyı kullanır.
 */
export function normalizeGeneralResults(results: ExerciseResult[]): NormalizedGeneralResult[] {
  return getUniqueResults(results).flatMap((result): NormalizedGeneralResult[] => {
    if (!result.exerciseType) return [];

    const date = new Date(result.date);
    const timestamp = date.getTime();
    if (!Number.isFinite(timestamp)) return [];

    const dayKey = getIstanbulDateKey(date);
    const dayNumber = dayKey ? dateKeyToDayNumber(dayKey) : null;
    const monthKey = getIstanbulMonthKey(date);
    if (!dayKey || dayNumber === null || !monthKey) return [];

    return [{ result, dayKey, dayNumber, monthKey, timestamp }];
  });
}

/** Dönem filtresini (Europe/Istanbul gün sınırına göre) normalize edilmiş kayıtlara uygular. */
export function filterNormalizedByPeriod(
  normalized: NormalizedGeneralResult[],
  period: StatisticsPeriod,
  now = new Date(),
): NormalizedGeneralResult[] {
  if (period === "all") return normalized;

  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return normalized;

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoffDayNumber = todayDayNumber - (days - 1);

  return normalized.filter((item) => item.dayNumber >= cutoffDayNumber && item.dayNumber <= todayDayNumber);
}

function readValidDurationSeconds(result: ExerciseResult): number | null {
  return Number.isFinite(result.durationSeconds) && result.durationSeconds > 0 ? result.durationSeconds : null;
}

export function calculateTotalTestCount(normalized: NormalizedGeneralResult[]): number {
  return normalized.length;
}

/** Yalnız finite ve 0'dan büyük gerçek durationSeconds değerlerini toplar; teknik 0'lar sayıma dahil edilmez. */
export function calculateTotalDurationSeconds(normalized: NormalizedGeneralResult[]): number {
  return normalized.reduce((total, item) => {
    const duration = readValidDurationSeconds(item.result);
    return duration !== null ? total + duration : total;
  }, 0);
}

export function formatDurationLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  if (safeSeconds < 60) return `${safeSeconds} sn`;

  const totalMinutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (totalMinutes < 60) {
    return remainingSeconds > 0 ? `${totalMinutes} dk ${remainingSeconds} sn` : `${totalMinutes} dk`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0 ? `${hours} sa ${remainingMinutes} dk` : `${hours} sa`;
}

export function calculateActiveDayCount(normalized: NormalizedGeneralResult[]): number {
  return new Set(normalized.map((item) => item.dayKey)).size;
}

/**
 * exerciseType -> (kategori, gerçek egzersiz rotası) eşlemesi. Kaynak: exerciseCatalog.ts
 * (ASSIGNMENT_EXERCISE_CATALOG) ve exercisePreviewGroups.ts (CATEGORY_EXERCISE_SLUGS),
 * data.ts'teki gerçek kategori kimlikleriyle çapraz doğrulanmıştır. Yeni kategori adı
 * uydurulmamıştır.
 *
 * Not: "memory-game" iki farklı egzersiz tarafından paylaşılıyor (Hafıza Geliştirme'nin
 * kategorisi "memory", Yeni Kartı Bul'un kategorisi "brain-exercises") ve exerciseType tek
 * başına hangisinin üretildiğini ayırt edemiyor; bu yüzden kategori için ağırlıklı/birincil
 * kaynak olan "memory" seçildi, rota için ise tek güvenilir bir hedef belirlenemediğinden
 * `route: null` bırakıldı (Son 10 Test'te bu tür kayıtlar tıklanabilir yapılmaz).
 */
const EXERCISE_TYPE_META: Record<ExerciseType, { categoryId: string; route: string | null }> = {
  tachistoscope: { categoryId: "attention", route: "/egzersizler/takistoskop" },
  "similar-words": { categoryId: "attention", route: "/egzersizler/benzer-kelimeler" },
  "block-reading": { categoryId: "fluency", route: "/egzersizler/blok-okuma" },
  "shadow-reading": { categoryId: "fluency", route: "/egzersizler/golgeleme" },
  "focused-reading": { categoryId: "fluency", route: "/egzersizler/odakli-okuma" },
  "two-side-focus": { categoryId: "focus", route: "/egzersizler/cift-tarafli-odak" },
  "attention-maze": { categoryId: "word-games", route: "/egzersizler/dikkat-labirenti" },
  "memory-game": { categoryId: "memory", route: null },
  "word-finding": { categoryId: "attention", route: "/egzersizler/kelime-bulma" },
  "eye-muscle": { categoryId: "eye", route: "/egzersizler/goz-kaslari" },
  "reading-comprehension": { categoryId: "assessment", route: "/egzersizler/anlama-testi" },
  "letter-number-counting-focus": { categoryId: "focus", route: "/egzersizler/harf-rakam-sayma" },
  "card-matching": { categoryId: "memory", route: "/egzersizler/kart-eslestirme" },
  "visual-puzzle": { categoryId: "word-games", route: "/egzersizler/gorsel-puzzle" },
  "eye-brain": { categoryId: "eye", route: "/egzersizler/goz-beyin" },
  "word-guess": { categoryId: "word-games", route: "/egzersizler/kelime-tahmin" },
  "catch-same": { categoryId: "focus", route: "/egzersizler/ayni-olani-yakala" },
  hangman: { categoryId: "word-games", route: "/egzersizler/adam-asmaca" },
  "grouping-reading": { categoryId: "fluency", route: "/egzersizler/gruplama-calismasi" },
  "eye-columns": { categoryId: "attention", route: "/egzersizler/goz-egzersizleri-kolonlar" },
  "square-vision": { categoryId: "attention", route: "/egzersizler/kare-gorme-alani" },
  "color-match": { categoryId: "brain-exercises", route: "/egzersizler/renk-uyumu" },
  "reading-speed-test": { categoryId: "assessment", route: "/egzersizler/okuma-hizi-testi" },
};

const OTHER_CATEGORY_ID = "other";
const OTHER_CATEGORY_TITLE = "Diğer";

const CATEGORY_TITLE_BY_ID = new Map(panelCategories.map((category) => [category.id, category.title]));

function resolveCategoryId(exerciseType: ExerciseType): string {
  return EXERCISE_TYPE_META[exerciseType]?.categoryId ?? OTHER_CATEGORY_ID;
}

function resolveCategoryTitle(categoryId: string): string {
  return categoryId === OTHER_CATEGORY_ID ? OTHER_CATEGORY_TITLE : CATEGORY_TITLE_BY_ID.get(categoryId) ?? OTHER_CATEGORY_TITLE;
}

export type CategoryDistributionEntry = {
  categoryId: string;
  title: string;
  count: number;
  percentage: number;
};

export function calculateCategoryDistribution(normalized: NormalizedGeneralResult[]): CategoryDistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of normalized) {
    const categoryId = resolveCategoryId(item.result.exerciseType);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  const total = normalized.length;
  return Array.from(counts.entries())
    .map(([categoryId, count]) => ({
      categoryId,
      title: resolveCategoryTitle(categoryId),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export type HeatmapCell = {
  dayKey: string;
  dayNumber: number;
  count: number;
  weekday: number;
  isFuture: boolean;
};

/**
 * Son `weeks` haftayı (varsayılan 12, Pazartesi başlangıçlı) gün gün döndürür.
 * Girdi olarak her zaman TÜM ZAMANLAR normalize edilmiş kayıtlar verilmeli — bu fonksiyon
 * dönem filtresinden bağımsız olacak şekilde tasarlanmıştır.
 */
export function calculateActivityHeatmap(
  normalizedAllTime: NormalizedGeneralResult[],
  weeks = 12,
  now = new Date(),
): HeatmapCell[] {
  const todayKey = getIstanbulDateKey(now);
  const todayDayNumber = todayKey ? dateKeyToDayNumber(todayKey) : null;
  if (todayDayNumber === null) return [];

  const todayWeekday = new Date(todayDayNumber * MS_PER_DAY).getUTCDay();
  const mondayOfCurrentWeek = todayDayNumber - ((todayWeekday + 6) % 7);
  const startDayNumber = mondayOfCurrentWeek - (weeks - 1) * 7;

  const countsByDay = new Map<number, number>();
  for (const item of normalizedAllTime) {
    countsByDay.set(item.dayNumber, (countsByDay.get(item.dayNumber) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i += 1) {
    const dayNumber = startDayNumber + i;
    const date = new Date(dayNumber * MS_PER_DAY);
    cells.push({
      dayKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
      dayNumber,
      count: dayNumber > todayDayNumber ? 0 : countsByDay.get(dayNumber) ?? 0,
      weekday: date.getUTCDay(),
      isFuture: dayNumber > todayDayNumber,
    });
  }
  return cells;
}

export type MonthlyProgressEntry = {
  monthKey: string;
  label: string;
  count: number;
};

function capitalizeTurkish(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1) : value;
}

/** Son `months` ayı (varsayılan 6) sabit bir eksen olarak döndürür; count, girdideki (dönem filtreli olabilecek) kayıtlardan gelir. */
export function calculateMonthlyProgress(
  normalized: NormalizedGeneralResult[],
  months = 6,
  now = new Date(),
): MonthlyProgressEntry[] {
  const todayKey = getIstanbulDateKey(now);
  if (!todayKey) return [];

  const [todayYearRaw, todayMonthRaw] = todayKey.split("-");
  const todayYear = Number(todayYearRaw);
  const todayMonth = Number(todayMonthRaw);

  const counts = new Map<string, number>();
  for (const item of normalized) {
    counts.set(item.monthKey, (counts.get(item.monthKey) ?? 0) + 1);
  }

  const entries: MonthlyProgressEntry[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const totalMonthIndex = todayYear * 12 + (todayMonth - 1) - i;
    const year = Math.floor(totalMonthIndex / 12);
    const monthIndexZeroBased = ((totalMonthIndex % 12) + 12) % 12;
    const monthKey = `${year}-${String(monthIndexZeroBased + 1).padStart(2, "0")}`;
    const label = capitalizeTurkish(MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, monthIndexZeroBased, 1))));
    entries.push({ monthKey, label, count: counts.get(monthKey) ?? 0 });
  }
  return entries;
}

function formatCountNumber(value: number): string {
  return Math.round(value).toLocaleString("tr-TR");
}

function clampPercentage(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

function readDetailNumber(details: Record<string, unknown> | undefined, key: string): number | null {
  const value = details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type RecentTestMetric = {
  label: string;
  value: string;
};

export type RecentTestEntry = {
  id: string;
  exerciseType: ExerciseType;
  title: string;
  categoryTitle: string;
  dayKey: string;
  timestamp: number;
  metric: RecentTestMetric;
  href: string | null;
};

/**
 * Ana ölçüm haritası (exerciseType analizine göre): reading-speed-test -> gerçek WPM,
 * reading-comprehension -> gerçek başarı %, "gerçek doğruluk ailesi" -> successRate %,
 * ilerleme/pacing egzersizleri -> tamamlanma %, kazan/kaybet egzersizleri -> Kazandı/Kaybetti,
 * eye-brain -> süre. Teknik placeholder score/successRate:0 değerleri asla puan olarak
 * gösterilmez; eşlenemeyen tipler "Tamamlandı" gösterir.
 */
const ACCURACY_METRIC_TYPES = new Set<ExerciseType>([
  "square-vision",
  "word-finding",
  "visual-puzzle",
  "card-matching",
  "memory-game",
  "letter-number-counting-focus",
  "attention-maze",
  "catch-same",
  "color-match",
  "similar-words",
  "tachistoscope",
]);
const COMPLETION_METRIC_TYPES = new Set<ExerciseType>([
  "shadow-reading",
  "focused-reading",
  "block-reading",
  "grouping-reading",
  "eye-columns",
]);
const OUTCOME_METRIC_TYPES = new Set<ExerciseType>(["hangman", "word-guess"]);

function resolvePrimaryMetric(result: ExerciseResult): RecentTestMetric {
  const type = result.exerciseType;

  if (type === "reading-speed-test") {
    const wpm = readDetailNumber(result.details, "readingSpeedWpm");
    return wpm !== null
      ? { label: "Okuma Hızı", value: `${formatCountNumber(wpm)} kelime/dk` }
      : { label: "Sonuç", value: "Tamamlandı" };
  }

  if (type === "reading-comprehension") {
    return { label: "Anlama Başarısı", value: `%${clampPercentage(result.successRate)}` };
  }

  if (ACCURACY_METRIC_TYPES.has(type)) {
    return { label: "Doğruluk", value: `%${clampPercentage(result.successRate)}` };
  }

  if (COMPLETION_METRIC_TYPES.has(type)) {
    return { label: "Tamamlanma", value: `%${clampPercentage(result.successRate)}` };
  }

  if (OUTCOME_METRIC_TYPES.has(type)) {
    return { label: "Sonuç", value: result.successRate >= 100 ? "Kazandı" : "Kaybetti" };
  }

  if (type === "eye-brain") {
    const seconds = Number.isFinite(result.score) && result.score > 0 ? result.score : null;
    return seconds !== null
      ? { label: "Süre", value: formatDurationLabel(seconds) }
      : { label: "Sonuç", value: "Tamamlandı" };
  }

  return { label: "Sonuç", value: "Tamamlandı" };
}

export function selectRecentTests(normalized: NormalizedGeneralResult[], limit = 10): RecentTestEntry[] {
  return [...normalized]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, limit)
    .map((item): RecentTestEntry => {
      const meta = EXERCISE_TYPE_META[item.result.exerciseType];
      return {
        id: item.result.id,
        exerciseType: item.result.exerciseType,
        title: item.result.exerciseTitle?.trim() || "Çalışma",
        categoryTitle: resolveCategoryTitle(meta?.categoryId ?? OTHER_CATEGORY_ID),
        dayKey: item.dayKey,
        timestamp: item.timestamp,
        metric: resolvePrimaryMetric(item.result),
        href: meta?.route ?? null,
      };
    });
}
