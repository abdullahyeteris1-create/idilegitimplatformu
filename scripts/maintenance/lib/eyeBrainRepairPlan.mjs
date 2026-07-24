// Saf (Supabase/IO'dan bagimsiz) yardimci fonksiyonlar ve sabitler -
// "goz-beyin" bakim scripti (Faz 2.6A.1) icin. Bu dosya hicbir network/DB
// cagrisi icermez, yalniz veri donusturme/dogrulama fonksiyonlari barindirir
// - boylece tests/repair-eye-brain-assignment.test.mjs bunlari Supabase'e
// baglanmadan dogrudan test edebilir.

import { createHash } from "node:crypto";

export const OPERATION_NAME = "repair-eye-brain-assignment-2.6A.1";

const EYE_BRAIN_SLUG = "goz-beyin";

/**
 * Siradan bir deep-equal: JSON.stringify KULLANMAZ, cunku Postgres/PostgREST
 * JSONB kolonlari anahtar SIRASINI koruma garantisi vermez - iki obje
 * semantik olarak ayni olsa bile farkli anahtar sirasiyla donebilir. Bu
 * fonksiyon anahtar sirasindan BAGIMSIZ karsilastirir.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key, index) => key === bKeys[index] && deepEqual(a[key], b[key]));
}

const AYNI_OLANI_YAKALA = Object.freeze({
  exerciseSlug: "ayni-olani-yakala",
  title: "Aynı Olanı Yakala",
  category: "attention",
  startingLevel: 1,
  currentLevel: 1,
  durationSeconds: 300,
  settings: Object.freeze({ mode: "symbol", speed: 1500 }),
});

const HAFIZA_GELISTIRME = Object.freeze({
  exerciseSlug: "hafiza-gelistirme",
  title: "Hafıza Geliştirme",
  category: "memory",
  startingLevel: 2,
  currentLevel: 2,
  durationSeconds: 300,
  settings: Object.freeze({ displayMs: 1000, fontSize: 16, gridLayout: "5x5" }),
});

const GOZ_EGZERSIZLERI_KOLONLAR = Object.freeze({
  exerciseSlug: "goz-egzersizleri-kolonlar",
  title: "Göz Egzersizleri Kolonlar",
  category: "eye",
  startingLevel: 1,
  currentLevel: 1,
  durationSeconds: 300,
  settings: Object.freeze({ columnCount: 3, flowDirection: "column", jumpSpeed: 2500 }),
});

/**
 * Deterministik, sabit 14 pozisyonluk degisim eslesmesi. Her giris, canlida
 * su an "goz-beyin" olan TAM OLARAK bir (dayNumber, taskOrder) pozisyonuna
 * karsilik gelmelidir - bu, matchMappingToLiveTasks() ile canli veriye karsi
 * dogrulanir.
 */
export const EYE_BRAIN_REPLACEMENT_MAPPING = Object.freeze([
  { dayNumber: 1, taskOrder: 3, ...GOZ_EGZERSIZLERI_KOLONLAR },
  { dayNumber: 4, taskOrder: 1, ...AYNI_OLANI_YAKALA },
  { dayNumber: 7, taskOrder: 4, ...AYNI_OLANI_YAKALA },
  { dayNumber: 8, taskOrder: 5, ...AYNI_OLANI_YAKALA },
  { dayNumber: 9, taskOrder: 5, ...AYNI_OLANI_YAKALA },
  { dayNumber: 10, taskOrder: 3, ...HAFIZA_GELISTIRME },
  { dayNumber: 11, taskOrder: 3, ...AYNI_OLANI_YAKALA },
  { dayNumber: 12, taskOrder: 3, ...HAFIZA_GELISTIRME },
  { dayNumber: 13, taskOrder: 3, ...AYNI_OLANI_YAKALA },
  { dayNumber: 14, taskOrder: 5, ...HAFIZA_GELISTIRME },
  { dayNumber: 15, taskOrder: 5, ...AYNI_OLANI_YAKALA },
  { dayNumber: 16, taskOrder: 4, ...HAFIZA_GELISTIRME },
  { dayNumber: 18, taskOrder: 4, ...AYNI_OLANI_YAKALA },
  { dayNumber: 20, taskOrder: 4, ...HAFIZA_GELISTIRME },
]);

/** id'yi loglarda guvenle gostermek icin maskeler: ilk4...son4. */
export function maskId(id) {
  if (typeof id !== "string" || id.length < 10) {
    return "****";
  }
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/**
 * Execute onay token'i - GIZLI DEGILDIR (loglanabilir), ama yanlis
 * programda/commit'te/gorev kumesinde calismayi engellemek icin
 * deterministik olarak turetilir. Girdilerden biri degisirse token degisir.
 */
export function deriveConfirmationToken({ programId, headCommit, taskIds, operationName = OPERATION_NAME }) {
  if (!programId || typeof programId !== "string") {
    throw new Error("deriveConfirmationToken: programId zorunlu");
  }
  if (!headCommit || typeof headCommit !== "string") {
    throw new Error("deriveConfirmationToken: headCommit zorunlu");
  }
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw new Error("deriveConfirmationToken: taskIds zorunlu ve bos olamaz");
  }
  const sortedTaskIds = [...taskIds].sort();
  const canonical = `${operationName}|${headCommit}|${programId}|${sortedTaskIds.join(",")}`;
  return createHash("sha256").update(canonical).digest("hex");
}

/** Mapping'in kendi icinde (canli veriden bagimsiz) yapisal olarak gecerli oldugunu dogrular. */
export function validateMappingShape(mapping) {
  const errors = [];
  if (!Array.isArray(mapping) || mapping.length !== 14) {
    errors.push(`mapping tam 14 giris icermeli, bulunan: ${Array.isArray(mapping) ? mapping.length : "dizi degil"}`);
    return { ok: false, errors };
  }

  const positions = new Set();
  for (const entry of mapping) {
    const key = `${entry.dayNumber}:${entry.taskOrder}`;
    if (positions.has(key)) {
      errors.push(`yinelenen mapping pozisyonu: gun ${entry.dayNumber} sira ${entry.taskOrder}`);
    }
    positions.add(key);

    if (!(Number.isInteger(entry.dayNumber) && entry.dayNumber >= 1 && entry.dayNumber <= 20)) {
      errors.push(`gecersiz dayNumber: ${entry.dayNumber}`);
    }
    if (!(Number.isInteger(entry.taskOrder) && entry.taskOrder >= 1 && entry.taskOrder <= 5)) {
      errors.push(`gecersiz taskOrder: ${entry.taskOrder}`);
    }
    if (!entry.exerciseSlug || entry.exerciseSlug === EYE_BRAIN_SLUG) {
      errors.push(`gecersiz replacement slug: gun ${entry.dayNumber} sira ${entry.taskOrder} -> ${entry.exerciseSlug}`);
    }
  }

  if (positions.size !== 14) {
    errors.push(`14 benzersiz pozisyon saglanamadi (bulunan: ${positions.size})`);
  }

  return { ok: errors.length === 0, errors };
}

/** Bir gorev satirinin hic baslatilmamis/tamamlanmamis oldugunu (degistirmek icin guvenli) dogrular. */
export function isTaskUntouched(task) {
  return (
    (task.status === "locked" || task.status === "available") &&
    task.startedAt == null &&
    task.expiresAt == null &&
    task.completedAt == null &&
    task.completionReason == null &&
    task.resultId == null &&
    task.lastHeartbeatAt == null
  );
}

/**
 * Mapping'i canlidaki gercek "goz-beyin" gorevleriyle 1:1 eslestirir.
 * - Canlida TAM OLARAK 14 goz-beyin gorevi olmali.
 * - Mapping'teki her pozisyonda canlida bir goz-beyin gorevi olmali.
 * - Canlidaki her goz-beyin gorevi mapping'de karsilik bulmali (fazlalik olamaz).
 * - Eslesen her gorev "dokunulmamis" (isTaskUntouched) olmali.
 */
export function matchMappingToLiveTasks(mapping, liveTasks) {
  const errors = [];
  const eyeBrainTasks = liveTasks.filter((task) => task.exerciseSlug === EYE_BRAIN_SLUG);

  if (eyeBrainTasks.length !== 14) {
    errors.push(`canlida tam 14 "${EYE_BRAIN_SLUG}" gorevi bekleniyordu, bulunan: ${eyeBrainTasks.length}`);
  }

  const byPosition = new Map(liveTasks.map((task) => [`${task.dayNumber}:${task.taskOrder}`, task]));
  const matched = [];

  for (const entry of mapping) {
    const key = `${entry.dayNumber}:${entry.taskOrder}`;
    const liveTask = byPosition.get(key);

    if (!liveTask) {
      errors.push(`canlida karsilik gelen gorev bulunamadi: gun ${entry.dayNumber} sira ${entry.taskOrder}`);
      continue;
    }
    if (liveTask.exerciseSlug !== EYE_BRAIN_SLUG) {
      errors.push(`gun ${entry.dayNumber} sira ${entry.taskOrder}: canlida "${liveTask.exerciseSlug}" var, "${EYE_BRAIN_SLUG}" degil`);
      continue;
    }
    if (!isTaskUntouched(liveTask)) {
      errors.push(`gun ${entry.dayNumber} sira ${entry.taskOrder}: gorev zaten baslamis/tamamlanmis, guvenli sekilde degistirilemez`);
      continue;
    }
    matched.push({ mappingEntry: entry, liveTask });
  }

  const matchedIds = new Set(matched.map((m) => m.liveTask.id));
  for (const task of eyeBrainTasks) {
    if (!matchedIds.has(task.id)) {
      errors.push(`canlidaki bir "${EYE_BRAIN_SLUG}" gorevi mapping'de karsiliksiz kaldi: gun ${task.dayNumber} sira ${task.taskOrder}`);
    }
  }

  return { ok: errors.length === 0 && matched.length === 14, errors, matched };
}

/**
 * Bir replacement slug'inin gercekten atanabilir oldugunu dogrular:
 * katalogda ready + route + resultExerciseType, VE kaynak template'te
 * enabled + dailyWeight>0 + mapping'le uyumlu starting level/duration/settings.
 */
export function validateReplacementEligibility({ mappingEntry, catalogDefinition, templateSetting }) {
  const errors = [];
  const slug = mappingEntry.exerciseSlug;

  if (!catalogDefinition) {
    errors.push(`katalogda "${slug}" bulunamadi`);
    return errors;
  }
  if (catalogDefinition.integrationStatus !== "ready") {
    errors.push(`"${slug}" katalogda ready degil (integrationStatus=${catalogDefinition.integrationStatus})`);
  }
  if (!catalogDefinition.route) {
    errors.push(`"${slug}" icin katalogda route yok`);
  }
  if (!catalogDefinition.resultExerciseType) {
    errors.push(`"${slug}" icin katalogda resultExerciseType yok`);
  }

  if (!templateSetting) {
    errors.push(`"${slug}" kaynak template'te (program_class_exercise_settings) tanimli degil`);
    return errors;
  }
  if (templateSetting.enabled !== true) {
    errors.push(`"${slug}" kaynak template'te disabled`);
  }
  if (!(templateSetting.dailyWeight > 0)) {
    errors.push(`"${slug}" kaynak template'te dailyWeight <= 0`);
  }
  if (templateSetting.startingLevel !== mappingEntry.startingLevel) {
    errors.push(
      `"${slug}" startingLevel uyumsuz (gun ${mappingEntry.dayNumber} sira ${mappingEntry.taskOrder}): template=${templateSetting.startingLevel} mapping=${mappingEntry.startingLevel}`,
    );
  }
  if (templateSetting.durationSeconds !== mappingEntry.durationSeconds) {
    errors.push(
      `"${slug}" durationSeconds uyumsuz (gun ${mappingEntry.dayNumber} sira ${mappingEntry.taskOrder}): template=${templateSetting.durationSeconds} mapping=${mappingEntry.durationSeconds}`,
    );
  }
  if (!deepEqual(templateSetting.settings, mappingEntry.settings)) {
    errors.push(`"${slug}" settings uyumsuz (gun ${mappingEntry.dayNumber} sira ${mappingEntry.taskOrder})`);
  }

  return errors;
}

/**
 * Katalogdaki hangi egzersizlerin bu program icin GERCEKTEN replacement
 * adayi olabilecegini hesaplar: ready + route + resultExerciseType +
 * goz-beyin disi + kaynak template'te enabled + dailyWeight>0.
 */
export function computeReplacementCandidates(catalog, templateSettingsBySlug) {
  return catalog
    .filter((entry) => {
      if (entry.exerciseSlug === EYE_BRAIN_SLUG) return false;
      if (entry.integrationStatus !== "ready") return false;
      if (!entry.route) return false;
      if (!entry.resultExerciseType) return false;
      const setting = templateSettingsBySlug[entry.exerciseSlug];
      if (!setting || setting.enabled !== true) return false;
      if (!(setting.dailyWeight > 0)) return false;
      return true;
    })
    .map((entry) => entry.exerciseSlug);
}

/** Mapping'i canli gorev listesine (yalniz bellekte) uygular - hicbir yazma yapmaz. */
export function simulateReplacement(liveTasks, mapping) {
  const byPosition = new Map(mapping.map((entry) => [`${entry.dayNumber}:${entry.taskOrder}`, entry]));
  return liveTasks.map((task) => {
    const replacement = byPosition.get(`${task.dayNumber}:${task.taskOrder}`);
    if (!replacement || task.exerciseSlug !== EYE_BRAIN_SLUG) {
      return task;
    }
    return {
      ...task,
      exerciseSlug: replacement.exerciseSlug,
      exerciseTitle: replacement.title,
      category: replacement.category,
      startingLevel: replacement.startingLevel,
      currentLevel: replacement.currentLevel,
      durationSeconds: replacement.durationSeconds,
      settings: replacement.settings,
    };
  });
}

/** Bir gun icinde ayni slug'in birden fazla gorevde gecmedigini dogrular. */
export function findDuplicateSlugsPerDay(tasks) {
  const counts = new Map();
  for (const task of tasks) {
    const key = `${task.dayNumber} ${task.exerciseSlug}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = [];
  for (const [key, count] of counts) {
    if (count > 1) {
      const [dayNumber, slug] = key.split(" ");
      duplicates.push({ dayNumber: Number(dayNumber), slug, count });
    }
  }
  return duplicates;
}

/** Simulasyon SONRASI beklenen tum degismezleri (invariant) dogrular. */
export function validatePostSimulationInvariants(simulatedTasks) {
  const errors = [];

  if (simulatedTasks.length !== 100) {
    errors.push(`simulasyon sonrasi 100 gorev bekleniyordu, bulunan: ${simulatedTasks.length}`);
  }

  const eyeBrainCount = simulatedTasks.filter((task) => task.exerciseSlug === EYE_BRAIN_SLUG).length;
  if (eyeBrainCount !== 0) {
    errors.push(`simulasyon sonrasi "${EYE_BRAIN_SLUG}" sayisi 0 olmali, bulunan: ${eyeBrainCount}`);
  }

  const perDay = new Map();
  for (const task of simulatedTasks) {
    const list = perDay.get(task.dayNumber) ?? [];
    list.push(task);
    perDay.set(task.dayNumber, list);
  }
  if (perDay.size !== 20) {
    errors.push(`20 gun bekleniyordu, bulunan: ${perDay.size}`);
  }
  for (const [dayNumber, dayTasks] of perDay) {
    if (dayTasks.length !== 5) {
      errors.push(`gun ${dayNumber}: 5 gorev bekleniyordu, bulunan ${dayTasks.length}`);
    }
    const uniqueSlugs = new Set(dayTasks.map((task) => task.exerciseSlug));
    if (uniqueSlugs.size !== dayTasks.length) {
      errors.push(`gun ${dayNumber}: yinelenen slug var`);
    }
  }

  const byStatus = {};
  for (const task of simulatedTasks) {
    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  }
  if ((byStatus.available ?? 0) !== 5) {
    errors.push(`available gorev sayisi 5 olmali, bulunan: ${byStatus.available ?? 0}`);
  }
  if ((byStatus.locked ?? 0) !== 95) {
    errors.push(`locked gorev sayisi 95 olmali, bulunan: ${byStatus.locked ?? 0}`);
  }
  for (const status of ["in_progress", "completed", "cancelled"]) {
    if ((byStatus[status] ?? 0) !== 0) {
      errors.push(`${status} gorev sayisi 0 olmali, bulunan: ${byStatus[status] ?? 0}`);
    }
  }

  return errors;
}

/** Gun tablosunun durum dagilimini dogrular: 1 available + 19 locked. */
export function validateDayStatusDistribution(days) {
  const errors = [];
  if (days.length !== 20) {
    errors.push(`20 gun bekleniyordu, bulunan: ${days.length}`);
  }
  const byStatus = {};
  for (const day of days) {
    byStatus[day.status] = (byStatus[day.status] ?? 0) + 1;
  }
  if ((byStatus.available ?? 0) !== 1) {
    errors.push(`1 available gun bekleniyordu, bulunan: ${byStatus.available ?? 0}`);
  }
  if ((byStatus.locked ?? 0) !== 19) {
    errors.push(`19 locked gun bekleniyordu, bulunan: ${byStatus.locked ?? 0}`);
  }
  return errors;
}

/** Simulasyon sonrasi 1. gunun 5 gorevinin de gecerli (katalogda route'lu) oldugunu dogrular. */
export function validateDay1Routes(simulatedTasks, getCatalogDefinition) {
  const errors = [];
  const day1Tasks = simulatedTasks.filter((task) => task.dayNumber === 1);
  if (day1Tasks.length !== 5) {
    errors.push(`gun 1'de 5 gorev bekleniyordu, bulunan: ${day1Tasks.length}`);
  }
  for (const task of day1Tasks) {
    const definition = getCatalogDefinition(task.exerciseSlug);
    if (!definition || !definition.route) {
      errors.push(`gun 1, sira ${task.taskOrder} (${task.exerciseSlug}) icin gecerli bir route yok`);
    }
  }
  return errors;
}
