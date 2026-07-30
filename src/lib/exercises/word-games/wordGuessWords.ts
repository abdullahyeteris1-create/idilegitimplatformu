// Yeni kelime eklerken Türkçe karakterleri ve büyük harfleri koruyun; ilgili uzunluk grubuna ekleyin.
export const WORD_GUESS_WORDS_BY_LENGTH: Record<number, readonly string[]> = {
  4: ["AĞAÇ", "AİLE", "İNCİ", "ÇİLE", "DAĞA", "ELMA", "GÖLÜ", "IŞIK", "KAPI", "KÖYÜ"],
  5: ["BAHÇE", "BALIK", "BULUT", "ÇİÇEK", "DENİZ", "DÜNYA", "EĞİMİ", "GÜNEŞ", "IRMAK", "KALEM"],
  6: ["ADALAR", "BİLGİM", "ÇİÇEĞİ", "GÖZLÜK", "IŞIKLI", "İNSANI", "KAĞIDI", "KARDEŞ", "MÜZİĞİ", "NEHİRE"],
  7: ["AĞAÇLAR", "BİLGİLİ", "GÖZLÜĞÜ", "KİTAPÇI", "ÖĞRENCİ", "ÖĞRETİM", "PENCERE", "SAĞLIĞI", "ŞEMSİYE", "YILDIZI"],
  8: ["ARKADAŞI", "ÇİKOLATA", "EĞİTİMİZ", "HAYVANIM", "İSTANBUL", "KİTAPLAR", "ORMANLAR", "RÜZGARLI", "TÜRKİYEM", "YAĞMURLU"],
  9: ["BİLGİLİCE", "ÇOCUKLARI", "DENİZİMİZ", "GÜNEŞLİĞİ", "KARDEŞLER", "KÜTÜPHANE", "ÖĞRENCİMİ", "ÖĞRETMENİ", "PENCERELİ", "YAĞMURLUK"],
} as const;
