import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import type { AssignmentExerciseDefinition, AssignmentSettingsSchema } from "@/lib/assignments/types";

/**
 * 20 gunluk odev programi icin SUNUCU-GUVENLI (server-safe) egzersiz
 * KATALOGU. Bu dosya hicbir React bileseni veya browser API'si import
 * ETMEZ - yalnizca src/lib/assignments/exerciseCatalog.ts'teki (kendisi de
 * saf veri, React'siz) gercek katalog kayitlarindan title/route/category/
 * resultExerciseType degerlerini TURETIR; bu degerler burada tekrar
 * yazilmaz/kopyalanmaz, boylece katalog degisirse burasi asenkron kalmaz.
 *
 * KATALOG GORUNURLUGU vs GERCEK HAZIRLIK: Bu liste, odev sistemi icin genel
 * olarak UYGUN ADAY sayilan TUM egzersizleri temsil eder (Okuma/Anlama
 * dahil) - "pilot havuz" terimi burada KALICI bir dislama anlamina gelmez.
 * Ancak her kaydin GERCEKTEN bir programa atanabilir olup olmadigi ayri bir
 * alanla (`integrationStatus`, bkz. types.ts) belirtilir:
 *   - "ready": bilesen kodu zaten hazir, program uretim havuzuna girer
 *     (bkz. programPreview.ts - yalniz bu durumdaki kayitlar secilir).
 *   - "needs_minor_changes" / "needs_major_changes": katalogda GORUNUR
 *     (ör. ogretmen ekraninda "Entegrasyon gerekli" gibi gosterilebilir)
 *     ama program uretim havuzuna ASLA girmez.
 * Bu ayrim, "Okuma/Anlama calismalari programda bulunmali" is kuraliyla
 * "henuz calismayan bir bileseni gercek gorevlere sokma" teknik kisitini
 * AYNI ANDA karsilamak icindir.
 *
 * settingsSchema/defaultSettings/level araligi degerleri, ilgili egzersiz
 * bilesenlerinin GERCEK kodundan (useState varsayilanlari, sabit secenek
 * dizileri) tek tek dogrulanarak alinmistir - tahmine dayali hicbir alan
 * yoktur:
 *   - kare-gorme-alani: src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx
 *   - ayni-olani-yakala: src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx
 *   - benzer-kelimeler: src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx
 *   - kelime-bulma: src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx
 *   - goz-egzersizleri-kolonlar: src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx
 *   - takistoskop: src/components/exercises/TachistoscopeExerciseClient.tsx (gercek anahtar
 *     "speedMs"dir - "displayDurationMs" DEGILDIR, bu isim yalniz eski/varsayimsal
 *     dokumantasyonda geciyordu)
 *   - harf-rakam-sayma: src/app/egzersizler/harf-rakam-sayma/LetterNumberCountingFocusClient.tsx
 *     + src/lib/exercise-engine/letterNumberCountingFocus.ts
 *   - hafiza-gelistirme: src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx
 *     (DIKKAT: bu egzersizde seviye 1'den degil 2'den baslar - LEVEL_OPTIONS=[2..10])
 *   - kart-eslestirme: src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx
 *   - goz-beyin: src/app/egzersizler/goz-beyin/EyeBrainExerciseClient.tsx
 *   - okuma-hizi-testi: src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx
 *     (zaten saveExerciseResultSecure kullaniyor; "bitis" bir buton
 *     cagrisi, metin-tukenmesi sinyali yok -> needs_minor_changes)
 *   - blok-okuma / gruplama-calismasi / golgeleme / odakli-okuma: hepsi ayni
 *     mimari (tek "blok/gurup tukendi" callback'i + legacy kayit) ->
 *     needs_minor_changes (legacy->secure gecisi + coklu-metin skor toplama
 *     gerekir, ama net bir kanca noktasi var)
 *   - anlama-testi: src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx
 *     (otomatik bitis sinyali yok - "Sorulara Gec" manuel tiklama; skor
 *     metne ozel onceden yazilmis MCQ setine kilitli; cift legacy yazim
 *     (saveExerciseResult + saveReadingTestResult), saveExerciseResultSecure
 *     hic kullanilmiyor) -> needs_major_changes
 *
 * KESINLIKLE DISLANANLAR (bkz. ASSIGNMENT_DENIED_EXERCISE_SLUGS):
 *   (a) kullanici tarafindan pasif yapilan: goz-calismasi, parcali-resim-kelime
 *   (b) Akil ve Zeka Oyunlari nedeniyle dislanan: kelime-tahmin, adam-asmaca,
 *       gorsel-puzzle, dikkat-labirenti
 * Bu 6 slug BILINCLI olarak katalogda hic GORUNMUYOR (deny-set'te kaliyor,
 * "disabled" olarak listelenmeleri zorunlu degil - gereksiz genisleme
 * getirmemek icin tercih edilmedi). Migration'daki CHECK constraint'lerle
 * ayni sert kural burada da uygulanir (iki katmanli savunma). Katalogun
 * kendi `category` alaninda "Akil ve Zeka Oyunlari" icin ayri bir deger
 * YOKTUR (bu 4 slug katalogda "attention"/"memory" olarak isaretli, yalniz
 * UI gruplamasindan dislaniyor) - bu yuzden kategoriye degil, ACIK SLUG
 * LISTESINE dayali bir deny-set kullanilir. Gelecekte bu UI grubuna yeni
 * bir egzersiz eklenirse bu liste OTOMATIK GUNCELLENMEZ - katalogA yeni bir
 * slug eklenirken bu listeyle CAPRAZ KONTROL edilmesi gerekir.
 */

export const ASSIGNMENT_DENIED_EXERCISE_SLUGS = [
  // Kullanici tarafindan pasif yapilan (katalogda assignmentEnabled:false)
  "goz-calismasi",
  "parcali-resim-kelime",
  // Akil ve Zeka Oyunlari nedeniyle dislanan (UI gruplamasi, bkz. yukarida)
  "kelime-tahmin",
  "adam-asmaca",
  "gorsel-puzzle",
  "dikkat-labirenti",
] as const;

const ASSIGNMENT_DENIED_EXERCISE_SLUG_SET = new Set<string>(ASSIGNMENT_DENIED_EXERCISE_SLUGS);

export function isDeniedAssignmentExerciseSlug(exerciseSlug: string): boolean {
  return ASSIGNMENT_DENIED_EXERCISE_SLUG_SET.has(exerciseSlug);
}

type AllowlistMetadata = Omit<AssignmentExerciseDefinition, "title" | "route" | "category" | "resultExerciseType">;

const ALLOWLIST_METADATA: readonly AllowlistMetadata[] = [
  // ---- integrationStatus: "ready" (mevcut 10, Faz 1'de zaten dahildi) ----
  {
    exerciseSlug: "kare-gorme-alani",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 9,
    supportsSpeed: false,
    settingsSchema: {
      gridSize: { kind: "enum", values: [7, 9, 11, 13, 15] },
      soundEnabled: { kind: "boolean" },
    },
    defaultSettings: { gridSize: 13, soundEnabled: true },
  },
  {
    exerciseSlug: "ayni-olani-yakala",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      mode: { kind: "enum", values: ["word", "letter", "symbol", "number"] },
      speed: { kind: "enum", values: [1500, 1000, 750, 500] },
    },
    defaultSettings: { mode: "word", speed: 1000 },
  },
  {
    exerciseSlug: "benzer-kelimeler",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: false,
    supportsSpeed: false,
    settingsSchema: {
      boxCount: { kind: "enum", values: [12, 16, 20, 24] },
      targetDifferentCount: { kind: "enum", values: [3, 4, 5, 6, 7, 8] },
    },
    defaultSettings: { boxCount: 16, targetDifferentCount: 4 },
  },
  {
    exerciseSlug: "kelime-bulma",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: false,
    supportsSpeed: false,
    settingsSchema: {
      targetWordsPerText: { kind: "enum", values: [3, 4, 5, 6] },
    },
    defaultSettings: { targetWordsPerText: 3 },
  },
  {
    exerciseSlug: "goz-egzersizleri-kolonlar",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      jumpSpeed: {
        kind: "enum",
        values: [200, 400, 600, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
      },
      columnCount: { kind: "enum", values: [3, 4, 5, 6, 7] },
      flowDirection: { kind: "enum", values: ["column", "row"] },
    },
    defaultSettings: { jumpSpeed: 1000, columnCount: 5, flowDirection: "column" },
  },
  {
    exerciseSlug: "takistoskop",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 15,
    supportsSpeed: true,
    settingsSchema: {
      speedMs: { kind: "enum", values: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] },
      workMode: { kind: "enum", values: ["manual", "automatic"] },
      contentType: { kind: "enum", values: ["letter", "number", "mixed"] },
    },
    defaultSettings: { speedMs: 300, workMode: "manual", contentType: "letter" },
  },
  {
    exerciseSlug: "harf-rakam-sayma",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 4,
    supportsSpeed: true,
    settingsSchema: {
      mode: { kind: "enum", values: ["letters", "numbers", "mixed"] },
      difficulty: { kind: "enum", values: ["normal", "hard"] },
      speedSeconds: { kind: "integer", min: 3, max: 15 },
    },
    defaultSettings: { mode: "letters", difficulty: "normal", speedSeconds: 8 },
  },
  {
    exerciseSlug: "hafiza-gelistirme",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: true,
    levelMin: 2,
    levelMax: 10,
    supportsSpeed: true,
    settingsSchema: {
      gridLayout: { kind: "enum", values: ["5x5", "5x10", "10x10"] },
      displayMs: { kind: "enum", values: [500, 750, 1000, 1500, 2000] },
      fontSize: { kind: "enum", values: [12, 16, 20, 24] },
    },
    defaultSettings: { gridLayout: "5x5", displayMs: 1000, fontSize: 16 },
  },
  {
    exerciseSlug: "kart-eslestirme",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    supportsSpeed: true,
    settingsSchema: {
      previewDurationMs: { kind: "enum", values: [2000, 3000, 4000, 5000, 7000, 10000] },
      flipBackDelayMs: { kind: "enum", values: [500, 750, 1000, 1250, 1500, 2000] },
    },
    defaultSettings: { previewDurationMs: 4000, flipBackDelayMs: 1000 },
  },
  {
    exerciseSlug: "goz-beyin",
    assignmentEligible: true,
    integrationStatus: "ready",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      speedMs: { kind: "enum", values: [1000, 1250, 1500, 1750, 2000, 2250, 2500] },
    },
    defaultSettings: { speedMs: 1500 },
  },

  // ---- integrationStatus: "needs_minor_changes" (Okuma/Anlama - kucuk uyarlama) ----
  {
    // src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx
    // Zaten saveExerciseResultSecure kullaniyor (L9, L275-297). Tek ayar:
    // fontSize (FONT_SIZE_OPTIONS, L53, default 18, L81). Hiz/seviye yok -
    // serbest hizda okuma testi. "Bitis" tetigi manuel buton
    // (handleFinishReading), otomatik metin-tukenmesi sinyali yok.
    exerciseSlug: "okuma-hizi-testi",
    assignmentEligible: true,
    integrationStatus: "needs_minor_changes",
    supportsLevel: false,
    supportsSpeed: false,
    settingsSchema: {
      fontSize: { kind: "enum", values: [12, 14, 16, 18, 20, 22, 24, 26, 28] },
    },
    defaultSettings: { fontSize: 18 },
  },
  {
    // src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx
    // blockSize (L31, default 3), speedMode "interval"|"wpm" (blockReading.ts, default "interval"),
    // intervalInputMs (L459: Math.min(60_000, Math.max(100,...)), default 750),
    // wordsPerMinute (L193: normalizeReadingSpeed(v,150,1) - yalniz alt sinir var, ust sinir yok),
    // fontSize (L32, default 40). Legacy save (saveExerciseResult, L16/L266-287).
    exerciseSlug: "blok-okuma",
    assignmentEligible: true,
    integrationStatus: "needs_minor_changes",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      blockSize: { kind: "enum", values: [1, 2, 3, 4, 5] },
      speedMode: { kind: "enum", values: ["interval", "wpm"] },
      intervalMs: { kind: "integer", min: 100, max: 60000 },
      wordsPerMinute: { kind: "integer", min: 1 },
      fontSize: { kind: "enum", values: [24, 32, 40, 48, 56] },
    },
    defaultSettings: { blockSize: 3, speedMode: "interval", intervalMs: 750, wordsPerMinute: 150, fontSize: 40 },
  },
  {
    // src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx
    // groupSize (L25, default 2), displayMode "keep"|"fade" (L26, default "keep"),
    // scrollMode "line"|"page" (L27, default "page"), speedMode
    // "milliseconds"|"wordsPerMinute" (L28, default "milliseconds"),
    // customMilliseconds (L132: normalizeDelayMs(v,1000,50,10000), default 1000),
    // customWordsPerMinute (L133: normalizeReadingSpeed(v,300,1) - ust sinir yok),
    // fontSize (L29, default 20). Legacy save (saveExerciseResult, L10/L211-238).
    exerciseSlug: "gruplama-calismasi",
    assignmentEligible: true,
    integrationStatus: "needs_minor_changes",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      groupSize: { kind: "enum", values: [2, 3, 4, 5] },
      displayMode: { kind: "enum", values: ["keep", "fade"] },
      scrollMode: { kind: "enum", values: ["line", "page"] },
      speedMode: { kind: "enum", values: ["milliseconds", "wordsPerMinute"] },
      customMilliseconds: { kind: "integer", min: 50, max: 10000 },
      customWordsPerMinute: { kind: "integer", min: 1 },
      fontSize: { kind: "enum", values: [14, 16, 18, 20, 22, 24, 26, 28] },
    },
    defaultSettings: {
      groupSize: 2,
      displayMode: "keep",
      scrollMode: "page",
      speedMode: "milliseconds",
      customMilliseconds: 1000,
      customWordsPerMinute: 300,
      fontSize: 20,
    },
  },
  {
    // src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx
    // blockSize (L35, default 2), speedMode "interval"|"wpm" (shadowReading.ts, default "interval"),
    // intervalInputMs - JUMP_SPEED_OPTIONS select (L59-64: 50,100,...,1000 (adim 50) + 1100,2000,5000,
    // default 500), wordsPerMinute (L77: normalizeReadingSpeed(v,150,1) - ust sinir yok),
    // fontSize (L38, default 20). Legacy save (saveExerciseResult, L20/L289-316).
    exerciseSlug: "golgeleme",
    assignmentEligible: true,
    integrationStatus: "needs_minor_changes",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      blockSize: { kind: "enum", values: [1, 2, 3, 4, 5] },
      speedMode: { kind: "enum", values: ["interval", "wpm"] },
      intervalMs: {
        kind: "enum",
        values: [
          50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100,
          2000, 5000,
        ],
      },
      wordsPerMinute: { kind: "integer", min: 1 },
      fontSize: { kind: "enum", values: [12, 14, 16, 18, 20, 22, 24, 26, 28] },
    },
    defaultSettings: { blockSize: 2, speedMode: "interval", intervalMs: 500, wordsPerMinute: 150, fontSize: 20 },
  },
  {
    // src/app/egzersizler/odakli-okuma/FocusedReadingExerciseClient.tsx
    // blockSize (L34, default 2), speedMode "interval"|"wpm" (default "interval"),
    // intervalInputMs - ayni JUMP_SPEED_OPTIONS (L58-63), default 500,
    // wordsPerMinute (L76: normalizeReadingSpeed(v,150,50,1000) - GERCEK ust sinir var, 1000),
    // fontSize (L37, default 40). Legacy save (saveExerciseResult, L19/L247-274).
    exerciseSlug: "odakli-okuma",
    assignmentEligible: true,
    integrationStatus: "needs_minor_changes",
    supportsLevel: false,
    supportsSpeed: true,
    settingsSchema: {
      blockSize: { kind: "enum", values: [1, 2, 3, 4, 5] },
      speedMode: { kind: "enum", values: ["interval", "wpm"] },
      intervalMs: {
        kind: "enum",
        values: [
          50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100,
          2000, 5000,
        ],
      },
      wordsPerMinute: { kind: "integer", min: 50, max: 1000 },
      fontSize: { kind: "enum", values: [20, 24, 28, 32, 36, 40, 44, 48, 56] },
    },
    defaultSettings: { blockSize: 2, speedMode: "interval", intervalMs: 500, wordsPerMinute: 150, fontSize: 40 },
  },

  // ---- integrationStatus: "needs_major_changes" (Okuma/Anlama - buyuk uyarlama) ----
  {
    // src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx
    // Otomatik bitis sinyali YOK (handleGoToQuestions yalniz manuel tikla-
    // mayla tetiklenir, L288-297); skor tek metnin onceden yazilmis MCQ
    // setine kilitli (L133); cift legacy yazim (saveExerciseResult L20/321-349
    // + saveReadingTestResult L21/351-367), saveExerciseResultSecure hic
    // kullanilmiyor. Tek gercek ayar: fontSize (L65, default 18).
    exerciseSlug: "anlama-testi",
    assignmentEligible: true,
    integrationStatus: "needs_major_changes",
    supportsLevel: false,
    supportsSpeed: false,
    settingsSchema: {
      fontSize: { kind: "enum", values: [12, 14, 16, 18, 20, 22, 24, 26, 28] },
    },
    defaultSettings: { fontSize: 18 },
  },
];

function buildCatalog(): AssignmentExerciseDefinition[] {
  const entries: AssignmentExerciseDefinition[] = [];

  for (const metadata of ALLOWLIST_METADATA) {
    if (ASSIGNMENT_DENIED_EXERCISE_SLUG_SET.has(metadata.exerciseSlug)) {
      // Savunma amacli tutarlilik kontrolu: katalog metadata'sinda yasakli
      // bir slug asla bulunmamali. Bulunursa (gelecekte bir duzenleme
      // hatasiyla) bu satir sessizce atlanir, hicbir zaman katalogA girmez.
      continue;
    }

    const catalogEntry = ASSIGNMENT_EXERCISE_BY_SLUG.get(metadata.exerciseSlug);
    if (!catalogEntry) {
      // Gercek katalogda karsiligi olmayan bir slug icin metadata
      // tanimlanmis olamaz - boyle bir satir varsa katalogA hic girmez.
      continue;
    }

    entries.push({
      ...metadata,
      title: catalogEntry.title,
      route: catalogEntry.route,
      category: catalogEntry.category,
      resultExerciseType: catalogEntry.resultExerciseType,
    });
  }

  return entries;
}

/**
 * Odev sistemi icin GORUNUR olan (dislanmamis) TUM egzersizlerin sunucu-
 * guvenli kataloğu - "ready" olsun olmasin. Program uretim havuzu icin
 * bunun yerine `isAssignmentReadyExerciseSlug`/ready-filtreli erisim
 * kullanilmalidir (bkz. asagida).
 */
export const ASSIGNMENT_EXERCISE_CATALOG: readonly AssignmentExerciseDefinition[] = buildCatalog();

export const ASSIGNMENT_EXERCISE_CATALOG_BY_SLUG = new Map<string, AssignmentExerciseDefinition>(
  ASSIGNMENT_EXERCISE_CATALOG.map((entry) => [entry.exerciseSlug, entry]),
);

/** Bir slug katalogda GORUNUYOR mu (ready olsun olmasin) - GET metadata/ogretmen ekrani icin. */
export function isAssignmentCatalogExerciseSlug(exerciseSlug: string): boolean {
  return ASSIGNMENT_EXERCISE_CATALOG_BY_SLUG.has(exerciseSlug);
}

/**
 * Bir slug su anda GERCEK bir 20-gunluk program gorevine atanabilir mi -
 * yani katalogda var VE assignmentEligible===true VE integrationStatus===
 * "ready" mi? Program uretim havuzu (programPreview.ts) VE template PUT
 * dogrulamasi (assignmentValidation.ts / templates/route.ts) BU fonksiyonu
 * kullanmalidir - yalniz "katalogda gorunur olma" yeterli degildir.
 */
export function isAssignmentReadyExerciseSlug(exerciseSlug: string): boolean {
  const definition = ASSIGNMENT_EXERCISE_CATALOG_BY_SLUG.get(exerciseSlug);
  return definition !== undefined && definition.assignmentEligible && definition.integrationStatus === "ready";
}

export function getAssignmentExerciseDefinition(exerciseSlug: string): AssignmentExerciseDefinition | undefined {
  return ASSIGNMENT_EXERCISE_CATALOG_BY_SLUG.get(exerciseSlug);
}

export function getAssignmentSettingsSchema(exerciseSlug: string): AssignmentSettingsSchema | undefined {
  return ASSIGNMENT_EXERCISE_CATALOG_BY_SLUG.get(exerciseSlug)?.settingsSchema;
}
