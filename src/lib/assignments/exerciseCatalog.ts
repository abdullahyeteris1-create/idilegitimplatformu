export type AssignmentExerciseCategory =
  | "speed"
  | "attention"
  | "eye"
  | "memory"
  | "comprehension";

export type AssignmentExerciseDefinition = {
  slug: string;
  title: string;
  route: string;
  resultExerciseType: string;
  category: AssignmentExerciseCategory;
  assignmentEnabled: boolean;
  supportedSettings: string[];
  /**
   * GECICI ASKIYA ALMA anahtari - yalniz OGRENCI EGZERSIZ KATALOGU
   * gorunurlugunu kontrol eder (kategori listeleri ve "N calisma" sayaclari).
   *
   * Tanimsiz (undefined) = gorunur; mevcut tum egzersizlerin davranisi
   * degismez. `false` yapildiginda egzersiz ogrenci kataloglarindan cikar
   * AMA:
   *   - route'u calismaya devam eder (dogrudan link / atanmis gorev)
   *   - Assignment V2 secilebilirligi (assignmentEnabled) ETKILENMEZ
   *   - gecmis sonuclar, istatistikler ve completion akisi ETKILENMEZ
   * Yeniden etkinlestirmek icin bu alani silmek veya true yapmak yeterlidir.
   */
  isStudentCatalogVisible?: boolean;
};

export const ASSIGNMENT_EXERCISE_CATALOG: AssignmentExerciseDefinition[] = [
  {
    slug: "takistoskop",
    title: "Takistoskop",
    route: "/egzersizler/takistoskop",
    resultExerciseType: "tachistoscope",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["level", "speedMs", "durationMinutes", "targetCorrect", "contentType"],
  },
  {
    slug: "blok-okuma",
    title: "Blok Okuma",
    route: "/egzersizler/blok-okuma",
    resultExerciseType: "block-reading",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["wordsPerMinute", "durationMinutes", "groupSize", "textId"],
  },
  {
    slug: "gruplama-calismasi",
    title: "Gruplama Çalışması",
    route: "/egzersizler/gruplama-calismasi",
    resultExerciseType: "grouping-reading",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["wordsPerMinute", "durationMinutes", "groupSize", "textId"],
  },
  {
    slug: "golgeleme",
    title: "Gölgeleme",
    route: "/egzersizler/golgeleme",
    resultExerciseType: "shadow-reading",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["wordsPerMinute", "durationMinutes", "textId"],
  },
  {
    slug: "odakli-okuma",
    title: "Odaklı Okuma",
    route: "/egzersizler/odakli-okuma",
    resultExerciseType: "focused-reading",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["wordsPerMinute", "durationMinutes", "textId"],
  },
  {
    slug: "cift-tarafli-odak",
    title: "Çift Taraflı Odak",
    route: "/egzersizler/cift-tarafli-odak",
    resultExerciseType: "two-side-focus",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "kelime-yarisi",
    title: "Kelime Yarışı",
    route: "/egzersizler/kelime-yarisi",
    resultExerciseType: "word-race",
    category: "attention",
    // GECICI YAYIN DISI (2026-08-04): entegrasyon ve eski kayitlar korunur;
    // ogrenci kataloglari ile yeni Assignment atamalarinda listelenmez.
    assignmentEnabled: false,
    supportedSettings: ["level", "speedMs", "durationMinutes"],
    isStudentCatalogVisible: false,
  },
  {
    slug: "kare-gorme-alani",
    title: "Kare Görme Çalışması",
    route: "/egzersizler/kare-gorme-alani",
    resultExerciseType: "square-vision",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "harf-rakam-sayma",
    title: "Harf Rakam Sayma",
    route: "/egzersizler/harf-rakam-sayma",
    resultExerciseType: "letter-number-counting-focus",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "ayni-olani-yakala",
    title: "Aynı Olanı Yakala",
    route: "/egzersizler/ayni-olani-yakala",
    resultExerciseType: "catch-same",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "dikkat-labirenti",
    title: "Dikkat Labirenti",
    route: "/egzersizler/dikkat-labirenti",
    resultExerciseType: "attention-maze",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "benzer-kelimeler",
    title: "Benzer Kelimeler",
    route: "/egzersizler/benzer-kelimeler",
    resultExerciseType: "similar-words",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "difficulty"],
  },
  {
    slug: "goz-kaslari",
    title: "Göz Kaslarını Geliştirme Çalışması",
    route: "/egzersizler/goz-kaslari",
    resultExerciseType: "eye-muscle",
    category: "eye",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes"],
    // GECICI ASKIYA ALMA (2026-07-30): ogrenci "Göz Egzersizleri"
    // kategorisinden gizlendi. Kayit, route ve Assignment V2 destegi bilincli
    // olarak korunuyor - daha once atanmis gorevler calismaya devam eder.
    // Geri almak icin: bu satiri sil veya true yap.
    isStudentCatalogVisible: false,
  },
  {
    slug: "13-nokta-emoji-takip",
    title: "13 Nokta Emoji Takip Egzersizi",
    route: "/egzersizler/13-nokta-emoji-takip",
    resultExerciseType: "thirteen-point-emoji-tracking",
    category: "eye",
    assignmentEnabled: true,
    supportedSettings: ["durationMinutes", "speed", "emoji", "emojiMode", "movementPattern", "soundEnabled"],
  },
  {
    slug: "buyuyen-sekiller-altigen",
    title: "Büyüyen Şekiller",
    route: "/egzersizler/buyuyen-sekiller-altigen",
    resultExerciseType: "growing-shapes-hexagon",
    category: "eye",
    assignmentEnabled: true,
    supportedSettings: ["durationMinutes", "speedMode", "jumpDurationMs", "jumpEndDurationMs", "clearMode", "showMetronome", "showFocusPoint", "showCorners"],
  },
  {
    slug: "goz-calismasi",
    title: "Göz Çalışması",
    route: "/egzersizler/goz-calismasi",
    resultExerciseType: "eye-muscle",
    category: "eye",
    assignmentEnabled: false,
    supportedSettings: ["level", "durationMinutes"],
  },
  {
    slug: "goz-beyin",
    title: "Göz Beyin",
    route: "/egzersizler/goz-beyin",
    resultExerciseType: "eye-brain",
    category: "eye",
    assignmentEnabled: true,
    supportedSettings: ["speedMs", "durationMinutes"],
  },
  {
    slug: "goz-egzersizleri-kolonlar",
    title: "Göz Egzersizleri Kolonlar",
    route: "/egzersizler/goz-egzersizleri-kolonlar",
    resultExerciseType: "eye-columns",
    category: "eye",
    assignmentEnabled: true,
    supportedSettings: ["speedMs", "durationMinutes"],
  },
  {
    slug: "kelime-tahmin",
    title: "Kelime Tahmin",
    route: "/egzersizler/kelime-tahmin",
    resultExerciseType: "word-guess",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["wordLength", "targetCorrect"],
  },
  {
    slug: "kelime-bulma",
    title: "Kelime Bulma",
    route: "/egzersizler/kelime-bulma",
    resultExerciseType: "word-finding",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["durationMinutes", "targetCorrect", "textId"],
  },
  {
    slug: "hafiza-gelistirme",
    title: "Hafıza Geliştirme",
    route: "/egzersizler/hafiza-gelistirme",
    resultExerciseType: "memory-game",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["level", "gridLayout", "displayMs", "fontSize"],
  },
  {
    slug: "kart-hafiza",
    title: "Kart Hafıza",
    route: "/egzersizler/kart-hafiza",
    resultExerciseType: "memory-game",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "targetCorrect"],
  },
  {
    slug: "kart-eslestirme",
    title: "Kart Eşleştirme",
    route: "/egzersizler/kart-eslestirme",
    resultExerciseType: "card-matching",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "targetCorrect"],
  },
  {
    slug: "parcali-resim-kelime",
    title: "Parçalı Resim Kelime",
    route: "/egzersizler/parcali-resim-kelime",
    resultExerciseType: "memory-game",
    category: "memory",
    assignmentEnabled: false,
    supportedSettings: ["level", "durationMinutes", "targetCorrect"],
  },
  {
    slug: "adam-asmaca",
    title: "Adam Asmaca",
    route: "/egzersizler/adam-asmaca",
    resultExerciseType: "hangman",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["wordLength", "targetCorrect"],
  },
  {
    slug: "gorsel-puzzle",
    title: "Görsel Puzzle",
    route: "/egzersizler/gorsel-puzzle",
    resultExerciseType: "visual-puzzle",
    category: "memory",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "targetCorrect"],
  },
  {
    slug: "anlama-testi",
    title: "Anlama Testi",
    route: "/egzersizler/anlama-testi",
    resultExerciseType: "reading-comprehension",
    category: "comprehension",
    assignmentEnabled: true,
        supportedSettings: ["textId", "targetSuccessRate", "questionCount"],
  },
  {
    slug: "okuma-hizi-testi",
    title: "Okuma Hızı Testi",
    route: "/egzersizler/okuma-hizi-testi",
    resultExerciseType: "reading-speed-test",
    category: "speed",
    assignmentEnabled: true,
    supportedSettings: ["textId", "fontSize"],
  },
  {
    slug: "renk-uyumu",
    title: "Renk Uyumu",
    route: "/egzersizler/renk-uyumu",
    resultExerciseType: "color-match",
    category: "attention",
    assignmentEnabled: true,
    supportedSettings: ["level", "durationMinutes", "targetCorrect"],
  },
];

export const ASSIGNMENT_EXERCISE_BY_SLUG = new Map(
  ASSIGNMENT_EXERCISE_CATALOG.map((item) => [item.slug, item]),
);

const ASSIGNMENT_EXERCISE_BY_ROUTE = new Map(
  ASSIGNMENT_EXERCISE_CATALOG.map((item) => [item.route, item]),
);

/**
 * Ogrenci egzersiz kataloglarinda gosterilmeli mi?
 *
 * Katalogda OLMAYAN bir slug icin `true` doner: ogrenci kataloglari
 * (bkz. exercisePreviewGroups.ts) Assignment kataloguna kayitli olmayan
 * calismalari da listeleyebildigi icin, bilinmeyen bir slug'i sessizce
 * gizlemek mevcut kartlari kaybettirirdi. Askiya alma YALNIZ acikca
 * isStudentCatalogVisible:false yazilmis kayitlar icin uygulanir.
 */
export function isExerciseVisibleInStudentCatalog(slug: string): boolean {
  return ASSIGNMENT_EXERCISE_BY_SLUG.get(slug)?.isStudentCatalogVisible !== false;
}

/** Slug yerine route tasiyan eski katalog kartlari icin ayni kontrol. */
export function isExerciseRouteVisibleInStudentCatalog(route: string): boolean {
  return ASSIGNMENT_EXERCISE_BY_ROUTE.get(route)?.isStudentCatalogVisible !== false;
}
