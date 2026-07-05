export type Difficulty = "easy" | "medium" | "hard";

export type WordPools = Record<number, Record<Difficulty, string[]>>;

export const DISPLAY_DURATION_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1000,
  medium: 500,
  hard: 250,
};

export const WORD_POOLS: WordPools = {
  3: {
    easy: ["bal", "gol", "yol", "tas", "kum", "sut", "gun", "cam", "dal", "yaz", "kis", "ruz"],
    medium: ["kor", "izn", "pay", "yar", "tek", "ser", "can", "var", "nok", "dam", "son", "sel"],
    hard: ["zih", "fik", "soy", "nev", "tez", "bur", "kir", "tun", "mek", "vak", "yal", "mik"],
  },
  4: {
    easy: ["masa", "kedi", "saat", "kalp", "film", "dene", "yazi", "renk", "hava", "oyun", "agac", "kapi"],
    medium: ["plan", "graf", "zihin", "ders", "vadi", "hiza", "caba", "akil", "sure", "nota", "bina", "doga"],
    hard: ["epik", "vary", "spek", "tavr", "naks", "fazl", "kavr", "yank", "qori", "morf", "sint", "tema"],
  },
  5: {
    easy: ["kalem", "deniz", "bahar", "islem", "kitap", "cocuk", "oyunc", "kural", "cadir", "panel", "beyin", "zaman"],
    medium: ["ritim", "algin", "duzey", "sente", "plani", "odakl", "akran", "cevik", "denge", "sorum", "bakis", "izlem"],
    hard: ["sarka", "kivrim", "sekli", "fitil", "tetik", "sarmal", "yutak", "yanki", "zifir", "narin", "kayra", "vurgu"],
  },
  6: {
    easy: ["okumae", "gelisim", "bilgim", "sayfai", "egitim", "odakin", "sinavi", "kavram", "ogrenc", "duzeyi", "takipi", "basari"],
    medium: ["hizlanm", "algisal", "secenek", "gorselc", "cevrimi", "stratej", "hedefi", "duzeni", "tekrari", "temponu", "ogreni", "isaret"],
    hard: ["prosesi", "senkron", "anlikca", "siralam", "kompakt", "doyumsu", "turuncu", "baglams", "kisalik", "tepkime", "vurgulu", "devinim"],
  },
  7: {
    easy: ["okumaci", "derslik", "hedefim", "gelisime", "zihinsel", "egitimc", "odaklan", "izlemea", "basarim", "programi", "rehberi", "konulari"],
    medium: ["anliklik", "yontemi", "kavrama", "pratigi", "tempolu", "algisal", "sayisali", "uygulam", "degerli", "planlar", "esneklik", "tekrari"],
    hard: ["baglanti", "siralama", "zihinsal", "yankisal", "gorsellk", "analizi", "bicimsel", "karmasik", "yapisal", "dongusel", "incelem", "gelisic"],
  },
  8: {
    easy: ["platform", "egzersiz", "ogrencim", "gelisimc", "basarili", "izlemeci", "calismam", "odaklanm", "karsilam", "ogretmen", "raporlama", "takistos"],
    medium: ["uygulama", "stratejik", "yaklasimi", "kavrayisi", "performan", "sistemati", "olcumleme", "gorsellik", "surecleri", "degerlend", "planlama", "analitik"],
    hard: ["senkronik", "baglamsal", "dongusell", "islenimsl", "temsiliy", "paradigm", "algoritmi", "farkindal", "tetikleme", "optimizas", "yogunlasm", "tutarlik"],
  },
};
