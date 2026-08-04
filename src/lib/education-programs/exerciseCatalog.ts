export type EducationProgramExerciseDefinition = {
  slug: string;
  title: string;
  resultExerciseType: string;
  supportsLevel: boolean;
  levelMin?: number;
  levelMax?: number;
  // Yoksa (undefined) sure destekliyor sayilir - mevcut 12 egzersizin hepsi
  // bu alani hic tanimlamaz, geriye donuk davranislari degismez. Yalniz
  // dogasi geregi sure/zamanlayici kavrami olmayan calismalar (Anlama Testi,
  // Okuma Hizi Testi gibi) bunu acikca false yapar.
  supportsDuration?: boolean;
  // supportsDuration:false olan calismalarda bilincli olarak atlanir -
  // Template Editor bu calismalar icin sure alanini hic gostermez.
  defaultDurationSeconds?: number;
  settingsSchemaVersion: number;
  settingsPlaceholder: string;
  /**
   * GECICI ASKIYA ALMA anahtari - yalniz YENI gorev eklerken kullanilan
   * egzersiz SECICISINI kontrol eder.
   *
   * Tanimsiz (undefined) = secilebilir. `false` yapildiginda egzersiz
   * Template Editor'un egzersiz listesinden cikar AMA katalog kaydinin
   * kendisi SILINMEZ: getEducationProgramExercise() onu bulmaya devam eder,
   * boylece daha once kaydedilmis programlardaki gorevler adiyla cozumlenir,
   * ogretmen bunlari gorup duzenleyebilir, ogrenci acip tamamlayabilir ve
   * validation gecerli sayar. Yeniden etkinlestirmek icin bu alani silmek
   * veya true yapmak yeterlidir.
   */
  isEducationProgramSelectable?: boolean;
};

const READONLY_SETTINGS_PLACEHOLDER = "Egzersize özel ayarlar sonraki fazda düzenlenecek.";

/**
 * Education Program alanına ait bağımsız katalog.
 *
 * Bu katalog başka bir program/ödev alanından import edilmez. Faz 1'de yalnız
 * yönetici şablon editörünün temel egzersiz, süre ve seviye alanlarını besler;
 * egzersiz çalıştırma entegrasyonu yapmaz.
 */
export const EDUCATION_PROGRAM_EXERCISE_CATALOG: readonly EducationProgramExerciseDefinition[] = [
  {
    slug: "kare-gorme-alani",
    title: "Kare Görme Alanı",
    resultExerciseType: "square-vision",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 9,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "ayni-olani-yakala",
    title: "Aynı Olanı Yakala",
    resultExerciseType: "catch-same",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "benzer-kelimeler",
    title: "Benzer Kelimeler",
    resultExerciseType: "similar-words",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kelime-bulma",
    title: "Kelime Bulma",
    resultExerciseType: "word-finding",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "goz-egzersizleri-kolonlar",
    title: "Göz Egzersizleri Kolonlar",
    resultExerciseType: "eye-columns",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "takistoskop",
    title: "Takistoskop",
    resultExerciseType: "tachistoscope",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 15,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "harf-rakam-sayma",
    title: "Harf Rakam Sayma",
    resultExerciseType: "letter-number-counting-focus",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 4,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "hafiza-gelistirme",
    title: "Hafıza Geliştirme",
    resultExerciseType: "memory-game",
    supportsLevel: true,
    levelMin: 2,
    levelMax: 10,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kart-eslestirme",
    title: "Kart Eşleştirme",
    resultExerciseType: "card-matching",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "blok-okuma",
    title: "Blok Okuma",
    resultExerciseType: "block-reading",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "cift-tarafli-odak",
    title: "Çift Taraflı Odak",
    resultExerciseType: "two-side-focus",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "kelime-yarisi",
    title: "Kelime Yarışı",
    resultExerciseType: "word-race",
    // Seviye ve hiz oyunun KENDI baslangic ekranindan secilir (prototip
    // davranisi korunuyor), bu yuzden platform tarafinda seviye ayari yok.
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "goz-kaslari",
    title: "Göz Kaslarını Geliştirme Çalışması",
    resultExerciseType: "eye-muscle",
    supportsLevel: true,
    levelMin: 1,
    levelMax: 5,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
    // GECICI ASKIYA ALMA (2026-07-30): yeni Egitim Programi gorevlerinde
    // secilemez. Katalog kaydi KASITLI olarak duruyor - mevcut programlardaki
    // gorevler cozumlenmeye, calismaya ve tamamlanmaya devam eder.
    // Geri almak icin: bu satiri sil veya true yap.
    isEducationProgramSelectable: false,
  },
  {
    slug: "13-nokta-emoji-takip",
    title: "13 Nokta Emoji Takip Egzersizi",
    resultExerciseType: "thirteen-point-emoji-tracking",
    supportsLevel: false,
    defaultDurationSeconds: 60,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "buyuyen-sekiller-altigen",
    title: "Büyüyen Şekiller",
    resultExerciseType: "growing-shapes-hexagon",
    supportsLevel: false,
    defaultDurationSeconds: 60,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "golgeleme",
    title: "Gölgeleme",
    resultExerciseType: "shadow-reading",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "gruplama-calismasi",
    title: "Gruplama Çalışması",
    resultExerciseType: "grouping-reading",
    supportsLevel: false,
    defaultDurationSeconds: 300,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "anlama-testi",
    title: "Anlama Testi",
    resultExerciseType: "reading-comprehension",
    supportsLevel: false,
    supportsDuration: false,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
  {
    slug: "okuma-hizi-testi",
    title: "Okuma Hızı Testi",
    resultExerciseType: "reading-speed-test",
    supportsLevel: false,
    supportsDuration: false,
    settingsSchemaVersion: 1,
    settingsPlaceholder: READONLY_SETTINGS_PLACEHOLDER,
  },
] as const;

export const EDUCATION_PROGRAM_EXERCISE_BY_SLUG = new Map<
  string,
  EducationProgramExerciseDefinition
>(
  EDUCATION_PROGRAM_EXERCISE_CATALOG.map((exercise) => [exercise.slug, exercise]),
);

/**
 * YENI gorev eklerken kullanilacak egzersiz listesi (Template Editor
 * secicisi). Askiya alinmis calismalar buradan cikarilir.
 *
 * DIKKAT: mevcut gorevleri COZUMLEMEK icin bu liste KULLANILMAMALIDIR -
 * o is icin tam katalog lookup'i olan getEducationProgramExercise()
 * kullanilir; aksi halde eski programlardaki gorevler "Bilinmeyen egzersiz"
 * gibi gorunurdu.
 */
export const SELECTABLE_EDUCATION_PROGRAM_EXERCISE_CATALOG: readonly EducationProgramExerciseDefinition[] =
  EDUCATION_PROGRAM_EXERCISE_CATALOG.filter(
    (exercise) => exercise.isEducationProgramSelectable !== false,
  );

/** Tam katalog lookup'i - askiya alinmis kayitlari da DONER (bilerek). */
export function getEducationProgramExercise(
  slug: string,
): EducationProgramExerciseDefinition | undefined {
  return EDUCATION_PROGRAM_EXERCISE_BY_SLUG.get(slug);
}

/** Bir egzersiz YENI programlara eklenebilir mi? */
export function isEducationProgramExerciseSelectable(slug: string): boolean {
  return EDUCATION_PROGRAM_EXERCISE_BY_SLUG.get(slug)?.isEducationProgramSelectable !== false;
}
