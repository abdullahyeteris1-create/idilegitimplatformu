export const WORD_COLUMNS_WORDS = [
  "ada", "adım", "ağaç", "akıl", "akşam", "alan", "alev", "anahtar", "anlam", "arı",
  "armağan", "ayna", "bahar", "balık", "barış", "başarı", "bayrak", "beden", "beyin", "bilgi",
  "bitki", "bulut", "burç", "buzul", "cadde", "ceviz", "çiçek", "çizgi", "çocuk", "dağ",
  "dalga", "damla", "dans", "davet", "deniz", "denge", "dere", "destek", "dikkat", "doğa",
  "dost", "dünya", "duygu", "düşünce", "ekran", "elma", "enerji", "esinti", "evren", "fener",
  "fidan", "fikir", "gemi", "genç", "gezi", "göl", "gölge", "görev", "gözlem", "güneş",
  "haber", "hafıza", "harita", "hayal", "hedef", "heyecan", "hız", "ışık", "ırmak", "içerik",
  "ilgi", "ilham", "insan", "ipucu", "istek", "iz", "kalem", "kalp", "kanat", "kapı",
  "karar", "kavram", "kaynak", "kıyı", "kitap", "kolon", "konu", "köprü", "kural", "kuş",
  "kutu", "lamba", "liman", "masa", "mavi", "merak", "metin", "meyve", "müzik", "nehir",
  "nesne", "not", "odak", "okul", "orman", "oyun", "öğrenci", "öykü", "pencere", "renk",
  "ritim", "rüzgar", "saat", "sabır", "sayfa", "ses", "sıra", "soru", "süre", "şehir",
  "şekil", "takip", "taş", "tempo", "toprak", "ufuk", "uyum", "uzay", "vadi", "varlık",
  "yaprak", "yaşam", "yazı", "yıldız", "yol", "yön", "zaman", "zeka", "zihin", "zirve",
  "açı", "ağ", "anı", "araç", "artı", "başlangıç", "beceri", "çaba", "çatı", "çember",
  "çözüm", "değer", "düş", "eğitim", "etki", "fırsat", "gece", "gelişim", "güç", "hareket",
  "hazine", "hikaye", "iletişim", "işaret", "kare", "kelime", "kırmızı", "kök", "merkez", "nokta",
  "okuma", "örnek", "plan", "sabah", "satır", "seçim", "sistem", "sonuç", "sütun", "tablo",
  "tasarım", "tekrar", "uygulama", "yakın", "yapı", "yöntem", "yumuşak", "zengin", "zorluk", "çevre",
  "bölüm", "birikim", "bağlantı", "cesaret", "çalışma", "dakika", "deneyim", "düzen", "fark", "görüş",
  "güven", "hatıra", "huzur", "inceleme", "karşılık", "kazanım", "lider", "macera", "miktar", "özgür",
  "parça", "sakin", "sevinç", "sınır", "sürpriz", "takım", "üretim", "veri", "yaklaşım", "yarın",
  "yetenek", "yolculuk", "zincir", "adalet", "akış", "antrenman", "bağ", "çözümleme", "detay", "doğruluk",
  "etkinlik", "görüntü", "hızlanma", "konsantrasyon", "mantık", "odaklanma", "performans", "seviye", "alışkanlık", "algılama",
] as const;

export function shuffleWordColumnsWords(
  previousLastWord?: string | null,
  random: () => number = Math.random,
): string[] {
  const copy = [...WORD_COLUMNS_WORDS];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  if (previousLastWord && copy[0] === previousLastWord) {
    const replacementIndex = copy.findIndex((word) => word !== previousLastWord);
    if (replacementIndex > 0) {
      [copy[0], copy[replacementIndex]] = [copy[replacementIndex], copy[0]];
    }
  }

  return copy;
}
