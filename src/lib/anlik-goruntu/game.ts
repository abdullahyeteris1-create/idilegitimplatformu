/**
 * Anlık Görüntü (takistoskopik kelime algılama) oyun mantığı.
 *
 * Kural özeti (prototipten korunmuştur):
 * - Seçilen gösterim hızı oturum boyunca SABİT kalır; zorluk yalnızca kelime
 *   uzunluğu ile artar.
 * - 13 seviye vardır: 3 harften 15 harfe. Her seviyede 10 tur oynanır.
 * - Şıklar hedefe görsel olarak benzeyen gerçek Türkçe kelimelerden seçilir;
 *   programatik ek getirilerek uydurma kelime üretilmez.
 */

export type AnlikGoruntuSpeedId =
  | "beginner"
  | "comfortable"
  | "normal"
  | "fast"
  | "very-fast"
  | "expert"
  | "master";

export type AnlikGoruntuSpeed = {
  id: AnlikGoruntuSpeedId;
  name: string;
  exposureMs: number;
  description: string;
};

export type AnlikGoruntuLevelStat = {
  level: number;
  letterCount: number;
  exposureMs: number;
  rounds: number;
  correct: number;
  wrong: number;
  accuracy: number;
  averageResponseTimeMs: number;
};

type RandomFn = () => number;

export const ANLIK_GORUNTU_SPEEDS: readonly AnlikGoruntuSpeed[] = [
  { id: "beginner", name: "Başlangıç", exposureMs: 1500, description: "Kelime uzun süre ekranda kalır." },
  { id: "comfortable", name: "Rahat", exposureMs: 1000, description: "Rahat tempoda algılama." },
  { id: "normal", name: "Normal", exposureMs: 500, description: "Dengeli çalışma temposu." },
  { id: "fast", name: "Hızlı", exposureMs: 150, description: "Tek bakışta algılama." },
  { id: "very-fast", name: "Çok Hızlı", exposureMs: 100, description: "Göz kırpması kadar kısa." },
  { id: "expert", name: "Uzman", exposureMs: 50, description: "İleri düzey algı hızı." },
  { id: "master", name: "Usta", exposureMs: 10, description: "Tek karelik gösterim." },
];

/** Seviye -> gösterilecek kelimenin harf sayısı. 13 seviye, 3'ten 15'e. */
export const ANLIK_GORUNTU_LEVELS: readonly number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const ANLIK_GORUNTU_ROUNDS_PER_LEVEL = 10;

/** Sabit gösterim süresinden sonra şıklar açılmadan önceki boş aralık (art imge kırılır). */
export const ANLIK_GORUNTU_POST_STIMULUS_GAP_MS = 130;

/** Kelime gelmeden önce bakışı ortalayan sabitleme haçının süresi. */
export const ANLIK_GORUNTU_FIXATION_MS = 450;

export const ANLIK_GORUNTU_FEEDBACK_MS = { correct: 550, wrong: 900 } as const;

/** "Güvenilir" sayılan seviye başarısı: bir seviyenin 10 turunda en az %75. */
export const ANLIK_GORUNTU_RELIABLE_ACCURACY = 75;

export const ANLIK_GORUNTU_TUTORIAL_WORD = "KİTAP";

export const ANLIK_GORUNTU_WORDS_BY_LENGTH: Readonly<Record<number, readonly string[]>> = {
  3: ["GÖZ", "HIZ", "SÖZ", "YAZ", "OKU", "BAK", "GÖR", "SAY", "YOL", "SES"],
  4: ["ALGI", "AKIL", "ELMA", "RENK", "MASA", "KAPI", "IŞIK", "KUZU", "AYVA", "UMUT"],
  5: ["KİTAP", "KALEM", "DENİZ", "ÇİÇEK", "BAHÇE", "BULUT", "ORMAN", "BALIK", "MEYVE", "SEBZE"],
  6: ["YASTIK", "HAZİNE", "SANDAL", "BARDAK", "MUTFAK", "SALATA", "ZEYTİN", "GÖMLEK", "BAYRAK", "KARDEŞ"],
  7: ["ÖĞRENCİ", "PENCERE", "TELEFON", "OYUNCAK", "ARKADAŞ", "KELEBEK", "KARINCA", "YUMURTA", "DOMATES", "PATATES"],
  8: ["YOLCULUK", "MERDİVEN", "BİSİKLET", "ASTRONOT", "SANDALYE", "ÇİÇEKLER", "KOMŞULAR", "SEVİNÇLİ", "KARANLIK", "DİKKATLİ"],
  9: ["KÜTÜPHANE", "ARAŞTIRMA", "BAŞARILAR", "ÇALIŞMAYA", "BİLGİLİCE", "KONUŞMACI", "BAŞLANGIÇ", "SORULARIN", "KİTAPLARA", "ÖĞRENCİYE"],
  10: ["BİLGİSAYAR", "ODAKLANMAK", "TELEVİZYON", "ARKADAŞLAR", "ÖĞRENCİLER", "DUYGULARIM", "SORUMLULUK", "ÇALIŞMALAR", "DÜŞÜNCELER", "HAYALLERİM"],
  11: ["BAŞARILARIM", "ÇALIŞKANLIK", "DUYARSIZLIK", "ÖĞRETMENLİK", "ARAŞTIRMACI", "KÜTÜPHANECİ", "MATEMATİKÇİ", "YARDIMCILAR", "GÖZLEMCİLER", "DÜŞÜNCELERİ"],
  12: ["BAŞARISIZLIK", "HAYALLERİMİZ", "KÜTÜPHANELER", "ÇALIŞKANLIĞI", "DUYARLILIKLA", "SORUMLULUKTA", "ARAŞTIRMALAR", "BİLGİLERİMİZ", "ÖĞRENCİLERİM", "BAŞARILARINA"],
  13: ["SORUMLULUKLAR", "BAŞARILARIMIZ", "DUYARSIZLAŞMA", "BİLGİSAYARLAR", "KÜTÜPHANELERİ", "BAŞARISIZLIĞI", "HAYALLERİMİZE", "ÇALIŞKANLIKTA", "DÜŞÜNCELERİNE", "ÖĞRETMENLERİM"],
  14: ["DUYARSIZLAŞMAK", "ÖĞRENCİLERİMİZ", "KÜTÜPHANELERDE", "BAŞARILARIMIZA", "ARAŞTIRMALARDA", "SORUMLULUKLARA", "ÇALIŞKANLIKLAR", "ÖĞRETMENLERİNİ", "BİLGİSAYARLARI", "HAYALLERİMİZDE"],
  15: ["BAŞARISIZLIKLAR", "ÇALIŞKANLIKLARI", "ÖĞRETMENLERİMİZ", "KÜTÜPHANELERİMİ", "SORUMLULUKLARIN", "SORUMLULUKLARIM", "BAŞARILARIMIZLA", "DUYARSIZLAŞMAYA", "ÖĞRENCİLERİMİZE", "HAYALLERİMİZDEN"],
};

/**
 * Elle seçilmiş, birbirine çok benzeyen gerçek kelime setleri. Bu hedefler
 * geldiğinde benzerlik puanı yerine doğrudan bu çeldiriciler kullanılır.
 */
const SIMILAR_WORD_SETS: readonly { target: string; distractors: readonly string[] }[] = [
  { target: "KÜTÜPHANE", distractors: ["KÜTÜPHANECİ", "KÜTÜPHANELER", "KÜTÜPHANESİ"] },
  { target: "ÖĞRENCİ", distractors: ["ÖĞRENCİLER", "ÖĞRETMEN", "ÖĞRENMEK"] },
  { target: "PENCERE", distractors: ["PENCERELER", "TENCERE", "PERVANE"] },
  { target: "KALEM", distractors: ["KALEMLİK", "KALEMİ", "KALECİ"] },
  { target: "KİTAP", distractors: ["KİTABI", "KİTAPLAR", "KİTAPÇI"] },
  { target: "DENİZ", distractors: ["DENİZCİ", "DENİZLER", "DEĞİŞİM"] },
  { target: "MASA", distractors: ["MAYA", "MAMA", "MAÇA"] },
  { target: "GÖZ", distractors: ["GÖÇ", "SÖZ", "GÜÇ"] },
  { target: "YAZ", distractors: ["YAS", "YAY", "YAT"] },
  { target: "BAK", distractors: ["BAL", "BAS", "BAŞ"] },
];

const ALL_WORDS: readonly string[] = Object.values(ANLIK_GORUNTU_WORDS_BY_LENGTH).flat();

export function getAnlikGoruntuLetterCount(word: string): number {
  return Array.from(word.replace(/\s+/g, "")).length;
}

export function getAnlikGoruntuSpeed(speedId: AnlikGoruntuSpeedId): AnlikGoruntuSpeed {
  return ANLIK_GORUNTU_SPEEDS.find((item) => item.id === speedId) ?? ANLIK_GORUNTU_SPEEDS[2];
}

/** Seviye numarası (1 tabanlı) -> o seviyedeki kelimelerin harf sayısı. */
export function getAnlikGoruntuLevelLetterCount(levelNumber: number): number {
  const index = Math.min(Math.max(levelNumber, 1), ANLIK_GORUNTU_LEVELS.length) - 1;
  return ANLIK_GORUNTU_LEVELS[index];
}

export function shuffleAnlikGoruntu<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const result = items.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function levenshteinDistance(source: string, target: string): number {
  const row = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let i = 1; i <= source.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= target.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (source[i - 1] === target[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }

  return row[target.length];
}

/**
 * Hedefe görsel benzerlik puanı. Yüksek puan = daha zor çeldirici.
 * Aynı uzunluk, ortak ön ek ve ortak son ek en çok ağırlığı taşır; ileri
 * seviyelerde (>= 10. seviye) ön ek benzerliği ek olarak ödüllendirilir.
 */
function calculateWordSimilarity(target: string, candidate: string, levelIndex: number): number {
  const targetLetters = Array.from(target);
  const candidateLetters = Array.from(candidate);
  const sharedPrefix = (limit: number) =>
    targetLetters.slice(0, limit).join("") === candidateLetters.slice(0, limit).join("") ? limit : 0;
  const sharedSuffix = targetLetters.slice(-2).join("") === candidateLetters.slice(-2).join("") ? 2 : 0;
  const commonLetterRatio =
    new Set(targetLetters.filter((letter) => candidateLetters.includes(letter))).size /
    Math.max(targetLetters.length, candidateLetters.length);
  const lengthDelta = Math.abs(targetLetters.length - candidateLetters.length);
  const lengthScore = lengthDelta === 0 ? 32 : lengthDelta === 1 ? 18 : -40;
  const distance = levenshteinDistance(target, candidate);

  return (
    lengthScore +
    (targetLetters[0] === candidateLetters[0] ? 18 : 0) +
    sharedPrefix(2) * 9 +
    sharedPrefix(3) * 7 +
    sharedSuffix * 5 +
    commonLetterRatio * 16 +
    Math.max(0, 24 - distance * 4) +
    (levelIndex >= 9 && sharedPrefix(2) ? 8 : 0)
  );
}

/**
 * Seviyedeki kelime havuzundan, bu seviyede henüz kullanılmamış bir hedef seçer.
 * Havuz tükendiğinde kullanılmışlar listesi sıfırlanır (çağıran tarafın
 * `usedWords` set'ini temizlemesi beklenir).
 */
export function pickAnlikGoruntuTarget(
  levelNumber: number,
  usedWords: ReadonlySet<string>,
  random: RandomFn = Math.random,
): string {
  const letterCount = getAnlikGoruntuLevelLetterCount(levelNumber);
  const pool = ANLIK_GORUNTU_WORDS_BY_LENGTH[letterCount];
  const available = pool.filter((word) => !usedWords.has(word));
  const candidates = available.length > 0 ? available : pool;

  return candidates[Math.floor(random() * candidates.length)];
}

/**
 * Hedef dahil 4 benzersiz şık üretir. Doğru cevap `correctSlot` konumuna
 * yerleştirilir; böylece doğru şık sürekli aynı köşede çıkmaz.
 */
export function buildAnlikGoruntuOptions(
  target: string,
  levelNumber: number,
  correctSlot: number,
  random: RandomFn = Math.random,
): string[] {
  const handPicked = SIMILAR_WORD_SETS.find((item) => item.target === target);
  const distractors: string[] = handPicked ? handPicked.distractors.slice(0, 3) : [];
  const targetLength = getAnlikGoruntuLetterCount(target);
  const levelIndex = Math.min(Math.max(levelNumber, 1), ANLIK_GORUNTU_LEVELS.length) - 1;

  if (distractors.length < 3) {
    const ranked = ALL_WORDS.filter(
      (word) =>
        word !== target &&
        !distractors.includes(word) &&
        Math.abs(getAnlikGoruntuLetterCount(word) - targetLength) <= 1,
    )
      .map((word) => ({ word, score: calculateWordSimilarity(target, word, levelIndex) }))
      .sort((left, right) => right.score - left.score);

    for (const { word } of ranked) {
      if (distractors.length >= 3) break;
      distractors.push(word);
    }
  }

  // Son çare: benzerlik filtresine takılmayan herhangi bir farklı kelime.
  for (const word of ALL_WORDS) {
    if (distractors.length >= 3) break;
    if (word !== target && !distractors.includes(word)) distractors.push(word);
  }

  const options = shuffleAnlikGoruntu(distractors.slice(0, 3), random);
  const slot = Math.min(Math.max(correctSlot, 0), 3);
  options.splice(slot, 0, target);

  return options;
}

/**
 * Bir seviyenin 10 turu için doğru cevabın hangi şık konumunda olacağını
 * belirleyen dağılım. Her konum en az iki kez geçer.
 */
export function buildAnlikGoruntuAnswerSlots(random: RandomFn = Math.random): number[] {
  return shuffleAnlikGoruntu([0, 1, 2, 3, 0, 1, 2, 3, 0, 1], random);
}

/** Doğru cevap puanı: taban + combo bonusu + kelime uzunluğu bonusu. */
export function calculateAnlikGoruntuPoints(letterCount: number, combo: number): number {
  const lengthBonus =
    letterCount <= 5 ? 0 : letterCount <= 8 ? 10 : letterCount <= 11 ? 20 : letterCount <= 13 ? 30 : 40;

  return 100 + Math.min(Math.max(combo, 0) * 10, 50) + lengthBonus;
}

/**
 * Oturumun başlık metriği: en az %75 doğrulukla tamamlanmış seviyeler
 * arasındaki en uzun kelime uzunluğu. Tek bir şanslı doğru cevap bu değeri
 * yükseltemez, çünkü ölçüm tamamlanmış seviye üzerinden yapılır.
 */
export function resolveAnlikGoruntuCapacity(levelStats: readonly AnlikGoruntuLevelStat[]): number {
  const reliable = levelStats.filter((item) => item.accuracy >= ANLIK_GORUNTU_RELIABLE_ACCURACY);
  return reliable.length > 0 ? Math.max(...reliable.map((item) => item.letterCount)) : 0;
}

export function resolveAnlikGoruntuRank(capacityLetterCount: number): string {
  if (capacityLetterCount >= 14) return "Şimşek Göz ⚡";
  if (capacityLetterCount >= 11) return "Usta Algılayıcı 🏆";
  if (capacityLetterCount >= 8) return "Hızlı Okuyucu 🚀";
  if (capacityLetterCount >= 5) return "Gelişen Göz 🌱";
  if (capacityLetterCount > 0) return "Yeni Başlayan 🔍";
  return "Çalışmaya Devam 💪";
}
