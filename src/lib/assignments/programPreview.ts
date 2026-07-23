import { getAssignmentExerciseDefinition, isAssignmentReadyExerciseSlug } from "@/lib/assignments/assignmentExerciseCatalog";
import type { AssignmentClassGroup } from "@/lib/assignments/classGroups";
import type {
  ProgramClassExerciseSetting,
  ProgramPreview,
  ProgramPreviewDay,
  ProgramPreviewTask,
} from "@/lib/assignments/types";

/**
 * Saf, deterministic 20x5 program onizleme uretici. DB'ye hicbir sekilde
 * baglanmaz/yazmaz - girdi olarak yalniz zaten yuklenmis
 * ProgramClassExerciseSetting satirlarini alir, cikti olarak bir ProgramPreview
 * dondurur. Ayni girdilerle (ayni satirlar + ayni generationSeed) her zaman
 * BIREBIR AYNI sonucu uretir - Math.random KULLANILMAZ.
 */

const TOTAL_DAYS = 20;
const TASKS_PER_DAY = 5;

/**
 * Gunluk 5 slotun hedef kategorisi. Okuma/Anlama (comprehension) egzersizleri
 * ARTIK KATALOGDA GORUNUYOR (bkz. assignmentExerciseCatalog.ts) - ama
 * hepsinin integrationStatus'u "needs_minor_changes"/"needs_major_changes",
 * hicbiri "ready" degil (tek-metinlik/tek-seferlik bilesen kodu henuz
 * surekli-calisma moduna uyarlanmadi). generateProgramPreview yalniz
 * "ready" adaylari havuza aldigi icin (bkz. toPreviewCandidate), bugun
 * "comprehension" kategorisinden secilebilecek HICBIR aday yok - bu yuzden
 * 5. slot hala "Okuma ve Anlama" yerine, dengeyi korumak icin gun indeksine
 * gore DONEN (rotating) bir "dengeleyici" slot. Bu durum sessizce
 * gecistirilmez: asagida `candidatesByCategory`'de "comprehension" hic
 * bulunmuyorsa acik bir warning uretilir (bkz. generateProgramPreview
 * sonundaki kontrol). Bir Okuma/Anlama egzersizi "ready" oldugunda, bu
 * sabit liste VE slot modeli ayri bir faz olarak guncellenmelidir.
 */
const CATEGORY_BUCKET_ORDER = ["attention", "memory", "eye", "speed"] as const;

/** Uyarinin sabit metni - yalniz "ready" bir comprehension adayi hic yoksa uretilir. */
export const NO_READY_COMPREHENSION_WARNING = "Anlama kategorisinde programa hazır egzersiz bulunmuyor.";

const SLOT_FIXED_CATEGORIES: readonly (string | null)[] = [
  "attention", // Slot 1: Dikkat/Odak
  "memory", // Slot 2: Hafiza Guclendirme
  "eye", // Slot 3: Goz/Gorsel Algi
  "speed", // Slot 4: Takistoskop'un da bulundugu "hiz" kategorisi
  null, // Slot 5: asagida gun indeksine gore CATEGORY_BUCKET_ORDER icinde doner
];

type PreviewCandidate = {
  setting: ProgramClassExerciseSetting;
  category: string;
  title: string;
};

export type GenerateProgramPreviewInput = {
  classGroup: AssignmentClassGroup;
  generationSeed: string;
  exerciseSettings: readonly ProgramClassExerciseSetting[];
};

export type GenerateProgramPreviewResult = { ok: true; preview: ProgramPreview } | { ok: false; message: string };

/** Havuz yetersizse dondurulen sabit, acik hata mesaji. */
export const INSUFFICIENT_EXERCISE_POOL_MESSAGE =
  "Bu sınıf şablonunda 20 günlük program oluşturmak için yeterli uygun egzersiz bulunmuyor.";

/**
 * Bir string seed'i stabil (JS runtime'lari arasinda ayni sonucu veren) bir
 * 32-bit tam sayiya cevirir. FNV-1a 32-bit varyanti - saf tam sayi
 * aritmetigi, Math.random/crypto KULLANMAZ.
 */
export function hashSeedToUint32(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * mulberry32 - kucuk, deterministic, JS runtime'lari arasinda stabil bir
 * PRNG. Her cagrida [0,1) araliginda bir float dondurur.
 */
export function createDeterministicRandom(seed: string): () => number {
  let state = hashSeedToUint32(seed);
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Kumulatif agirlik yaklasimiyla deterministic tartili secim. Adaylari
 * agirlik kadar array'e kopyalamaz - O(n) tek gecis + tek rastgele cekim.
 */
export function selectWeightedDeterministic<T>(
  candidates: readonly T[],
  getWeight: (item: T) => number,
  random: () => number,
): T | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const cumulative: number[] = [];
  let total = 0;
  for (const candidate of candidates) {
    total += Math.max(0, getWeight(candidate));
    cumulative.push(total);
  }

  if (total <= 0) {
    return undefined;
  }

  const draw = random() * total;
  for (let index = 0; index < cumulative.length; index += 1) {
    if (draw < cumulative[index]) {
      return candidates[index];
    }
  }
  return candidates[candidates.length - 1];
}

function toPreviewCandidate(setting: ProgramClassExerciseSetting): PreviewCandidate | null {
  // Ikinci savunma katmani: DB'de zaten CHECK constraint ile yasakli
  // slug'lar engelleniyor, ama burada da ayni kontrol tekrarlanir - client'tan
  // gelen category/title'a asla guvenilmez, kategori/baslik HER ZAMAN
  // sunucu katalogundan (definition.category / definition.title) alinir.
  //
  // isAssignmentReadyExerciseSlug KASITLI kullanilir (isAssignmentCatalogExerciseSlug
  // DEGIL): katalogda GORUNEN ama integrationStatus'u "ready" olmayan bir
  // egzersiz (ör. okuma-hizi-testi, anlama-testi) - ogretmen sablonunda
  // enabled=true/dailyWeight>0 olarak kaydedilmis olsa BILE - hicbir zaman
  // gercek bir program gorevine donusmemelidir. Bu kontrol yalniz API
  // validation'a birakilmaz, saf generator'in kendisinde de zorunlu kilinir.
  if (!isAssignmentReadyExerciseSlug(setting.exerciseSlug)) {
    return null;
  }
  const definition = getAssignmentExerciseDefinition(setting.exerciseSlug);
  if (!definition) {
    return null;
  }
  return { setting, category: definition.category, title: definition.title };
}

/** Girdileri once stabil sirala: displayOrder, sonra exerciseSlug. */
function sortCandidatesStably(candidates: PreviewCandidate[]): PreviewCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.setting.displayOrder !== b.setting.displayOrder) {
      return a.setting.displayOrder - b.setting.displayOrder;
    }
    return a.setting.exerciseSlug < b.setting.exerciseSlug ? -1 : a.setting.exerciseSlug > b.setting.exerciseSlug ? 1 : 0;
  });
}

function buildTask(taskOrder: number, candidate: PreviewCandidate): ProgramPreviewTask {
  return {
    taskOrder,
    exerciseSlug: candidate.setting.exerciseSlug,
    exerciseTitle: candidate.title,
    category: candidate.category,
    startingLevel: candidate.setting.startingLevel,
    durationSeconds: candidate.setting.durationSeconds,
    settings: candidate.setting.settings,
  };
}

/**
 * Girdi ProgramClassExerciseSetting satirlarindan deterministic bir 20x5
 * program onizlemesi uretir. DB'ye hicbir yazma islemi yapmaz.
 */
export function generateProgramPreview(input: GenerateProgramPreviewInput): GenerateProgramPreviewResult {
  const eligibleCandidates = sortCandidatesStably(
    input.exerciseSettings
      .filter((setting) => setting.enabled && setting.dailyWeight > 0)
      .map(toPreviewCandidate)
      .filter((candidate): candidate is PreviewCandidate => candidate !== null),
  );

  if (eligibleCandidates.length === 0) {
    return { ok: false, message: INSUFFICIENT_EXERCISE_POOL_MESSAGE };
  }

  const candidatesByCategory = new Map<string, PreviewCandidate[]>();
  for (const candidate of eligibleCandidates) {
    const bucket = candidatesByCategory.get(candidate.category) ?? [];
    bucket.push(candidate);
    candidatesByCategory.set(candidate.category, bucket);
  }

  const occurrenceCount = new Map<string, number>();
  const lastUsedDay = new Map<string, number>();
  const warnings: string[] = [];
  let cooldownRelaxationCount = 0;

  // "ready" bir comprehension (Okuma/Anlama) adayi hic yoksa acikca bildir -
  // sahte bir gorev uretmek veya bu boslugu sessizce baska kategoriyle
  // doldurmak yerine, durum warning olarak raporlanir. Bu kontrol yalniz
  // gercekten "ready" adaylardan olusan candidatesByCategory'ye bakar; katalogda
  // GORUNEN ama henuz ready olmayan (okuma-hizi-testi, anlama-testi vb.)
  // egzersizler zaten toPreviewCandidate tarafindan elenmis oldugu icin
  // burada hic sayilmaz.
  if (!candidatesByCategory.has("comprehension") || candidatesByCategory.get("comprehension")!.length === 0) {
    warnings.push(NO_READY_COMPREHENSION_WARNING);
  }

  const days: ProgramPreviewDay[] = [];

  for (let dayIndex = 0; dayIndex < TOTAL_DAYS; dayIndex += 1) {
    const dayNumber = dayIndex + 1;
    const usedSlugsToday = new Set<string>();
    const tasks: ProgramPreviewTask[] = [];

    for (let slotIndex = 0; slotIndex < TASKS_PER_DAY; slotIndex += 1) {
      const taskOrder = slotIndex + 1;
      const fixedCategory = SLOT_FIXED_CATEGORIES[slotIndex];
      const targetCategory = fixedCategory ?? CATEGORY_BUCKET_ORDER[dayIndex % CATEGORY_BUCKET_ORDER.length];

      const isEligible = (candidate: PreviewCandidate, options: { allowCooldownRelax: boolean }) => {
        if (usedSlugsToday.has(candidate.setting.exerciseSlug)) {
          return false;
        }
        const max = candidate.setting.maxOccurrencesPerProgram;
        if (max !== null && (occurrenceCount.get(candidate.setting.exerciseSlug) ?? 0) >= max) {
          return false;
        }
        if (!options.allowCooldownRelax) {
          const lastDay = lastUsedDay.get(candidate.setting.exerciseSlug);
          const cooldown = candidate.setting.repeatCooldownDays;
          if (lastDay !== undefined && dayNumber - lastDay <= cooldown) {
            return false;
          }
        }
        return true;
      };

      const pickFrom = (pool: PreviewCandidate[], allowCooldownRelax: boolean) =>
        pool.filter((candidate) => isEligible(candidate, { allowCooldownRelax }));

      const primaryPool = candidatesByCategory.get(targetCategory) ?? [];
      let selectionPool = pickFrom(primaryPool, false);
      let usedFallback = false;
      let usedCooldownRelax = false;

      if (selectionPool.length === 0) {
        // Kategori havuzunda (cooldown dahil) uygun aday yok - fallback:
        // TUM kategorilerden (aynı gun tekrar YASAK, max occurrence YASAK
        // kalmaya devam eder), cooldown korunarak dene.
        selectionPool = pickFrom(eligibleCandidates, false);
        usedFallback = selectionPool.length > 0;
      }

      if (selectionPool.length === 0) {
        // Cooldown, secimi imkansiz kiliyor - yalniz cooldown gevsetilir;
        // ayni gun duplicate ve maxOccurrences KESINLIKLE gevsetilmez.
        selectionPool = pickFrom(eligibleCandidates, true);
        usedFallback = true;
        usedCooldownRelax = selectionPool.length > 0;
      }

      if (selectionPool.length === 0) {
        return { ok: false, message: INSUFFICIENT_EXERCISE_POOL_MESSAGE };
      }

      const seed = `${input.generationSeed}:${dayNumber}:${taskOrder}`;
      const chosen = selectWeightedDeterministic(selectionPool, (candidate) => candidate.setting.dailyWeight, createDeterministicRandom(seed));

      if (!chosen) {
        return { ok: false, message: INSUFFICIENT_EXERCISE_POOL_MESSAGE };
      }

      if (usedFallback && chosen.category !== targetCategory) {
        warnings.push(
          `${dayNumber}. gün ${taskOrder}. görev icin "${targetCategory}" kategorisinde uygun egzersiz kalmadigi icin baska kategoriden secim yapildi.`,
        );
      }
      if (usedCooldownRelax) {
        cooldownRelaxationCount += 1;
      }

      usedSlugsToday.add(chosen.setting.exerciseSlug);
      occurrenceCount.set(chosen.setting.exerciseSlug, (occurrenceCount.get(chosen.setting.exerciseSlug) ?? 0) + 1);
      lastUsedDay.set(chosen.setting.exerciseSlug, dayNumber);

      tasks.push(buildTask(taskOrder, chosen));
    }

    days.push({ dayNumber, tasks });
  }

  const categoryCounts: Record<string, number> = {};
  const exerciseCounts: Record<string, number> = {};
  for (const day of days) {
    for (const task of day.tasks) {
      categoryCounts[task.category] = (categoryCounts[task.category] ?? 0) + 1;
      exerciseCounts[task.exerciseSlug] = (exerciseCounts[task.exerciseSlug] ?? 0) + 1;
    }
  }

  if (cooldownRelaxationCount > 0) {
    warnings.push(`Havuz kucuk oldugu icin cooldown kurali ${cooldownRelaxationCount} secimde gevsetildi.`);
  }

  return {
    ok: true,
    preview: {
      generationSeed: input.generationSeed,
      classGroup: input.classGroup,
      totalDays: TOTAL_DAYS,
      tasksPerDay: TASKS_PER_DAY,
      totalTasks: TOTAL_DAYS * TASKS_PER_DAY,
      categorySummary: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
      exerciseSummary: Object.entries(exerciseCounts).map(([exerciseSlug, count]) => ({ exerciseSlug, count })),
      days,
      summary: {
        totalDays: TOTAL_DAYS,
        totalTasks: TOTAL_DAYS * TASKS_PER_DAY,
        tasksPerDay: TASKS_PER_DAY,
        uniqueExerciseCount: Object.keys(exerciseCounts).length,
        categoryCounts,
        exerciseCounts,
        cooldownRelaxationCount,
        warnings,
      },
    },
  };
}
