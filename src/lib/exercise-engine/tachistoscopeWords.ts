export type TachistoscopeLevel =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export const TACHISTOSCOPE_WORDS_BY_LEVEL: Record<TachistoscopeLevel, string[]> = {
  1: ["a", "e", "ı", "i", "o", "ö", "u", "ü"],
  2: ["su", "ev", "el", "at", "ok", "ay", "ot", "ip", "iz", "un", "ad", "an"],
  3: ["kuş", "top", "gül", "arı", "yol", "oda", "cam", "kar", "yaz", "göz", "ses", "bal", "taş", "çay", "köy", "nar", "fil", "dal"],
  4: ["masa", "kedi", "okul", "renk", "oyun", "spor", "mavi", "sarı", "anne", "baba", "aile", "elma", "kapı", "hava", "dere", "saat", "park", "ders", "kule", "lale"],
  5: ["kitap", "kalem", "köpek", "çiçek", "bulut", "güneş", "deniz", "orman", "bahçe", "tahta", "sevgi", "saygı", "masal", "bilgi", "şeker", "çanta", "meyve", "güzel", "mutlu", "ekran"],
  6: ["defter", "hikaye", "başarı", "dikkat", "yardım", "oyuncu", "sevinç", "hayvan", "doktor", "ressam", "sinema", "bilmek", "görmek", "yazmak", "gezmek", "sevmek"],
  7: ["öğrenci", "arkadaş", "kelebek", "çalışma", "meraklı", "oyuncak", "uçurtma", "resimli", "müzikli", "bulutlu", "güneşli", "denizci", "çiçekçi", "okuyucu"],
  8: ["öğretmen", "yardımcı", "başarılı", "çalışkan", "düşünmek", "kitaplık", "bilimsel", "dikkatli", "anlatmak", "dinlemek", "öğrenmek", "gelişmek", "mutluluk", "güvenmek", "başlamak", "hazırlık", "bisiklet", "telefon"],
  9: ["kütüphane", "anlayışlı", "paylaşmak", "cesaretli", "odaklanma", "araştırma", "deneyimli", "düşünceli", "planlama", "başarılar", "gözlemler", "yenilikçi"],
  10: ["bilgisayar", "sorumluluk", "gülümsemek", "öğrenciler", "arkadaşlar", "alışkanlık", "odaklanmak", "paylaşmayı", "gözlemleme", "güvenilir", "hazırlanmak"],
  11: ["kütüphaneci", "gözlemlemek", "dikkatlilik", "çalışkanlık", "geliştirmek", "hızlandırmak", "güvenilirlik", "okuyabilmek", "bilinçlenmek", "değerlendir", "odaklanıyor"],
  12: ["başarabiliriz", "öğrencilerim", "alışkanlıklar", "paylaşabilmek", "başarılarımız", "deneyimlerim", "okuduklarımız", "anladıkların", "gözlemliyord", "odaklanırsın"],
  13: ["karşılaştırma", "sonuçlandırma", "hazırlanabilir", "odaklanıyoruz", "geliştiriyoruz", "dinleyebiliriz", "uygulamalarım", "öğrenebilirim"],
  14: ["sorumlulukları", "öğrendiklerimiz", "hatırlayabilir", "yorumlayabilir", "odaklanabilmek", "bilgilendirme", "değerlendirme"],
  15: ["odaklanabilmeli", "değerlendirmeli", "anlamlandırmalı", "sorumluluklarım", "hatırlayabilecek", "yorumlayabilecek", "öğretmenlerimiz", "karşılaştıracak"],
};

export function normalizeTachistoscopeLevel(value: unknown): TachistoscopeLevel {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/\D/g, ""));

  if (!Number.isFinite(numericValue)) {
    return 5;
  }

  const roundedValue = Math.round(numericValue);

  if (roundedValue < 1) return 1;
  if (roundedValue > 15) return 15;

  return roundedValue as TachistoscopeLevel;
}

function getWordLength(word: string) {
  return Array.from(word.trim()).length;
}

export function getTachistoscopeWords(level: unknown) {
  const normalizedLevel = normalizeTachistoscopeLevel(level);
  return TACHISTOSCOPE_WORDS_BY_LEVEL[normalizedLevel] ?? TACHISTOSCOPE_WORDS_BY_LEVEL[5];
}

export function getRandomTachistoscopeWord(level: unknown, previousWord?: string) {
  const words = getTachistoscopeWords(level).filter((word) => {
    const wordLength = getWordLength(word);

    if (normalizeTachistoscopeLevel(level) === 15) {
      return wordLength >= 15;
    }

    return wordLength === normalizeTachistoscopeLevel(level);
  });

  const fallbackWords = getTachistoscopeWords(level);
  const source = words.length > 0 ? words : fallbackWords;

  if (source.length === 0) {
    return "";
  }

  if (source.length === 1) {
    return source[0];
  }

  let selectedWord = source[Math.floor(Math.random() * source.length)];
  let tryCount = 0;

  while (selectedWord === previousWord && tryCount < 10) {
    selectedWord = source[Math.floor(Math.random() * source.length)];
    tryCount += 1;
  }

  return selectedWord;
}