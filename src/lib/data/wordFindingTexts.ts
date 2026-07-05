export type WordFindingText = {
  id: string;
  title: string;
  category?: string;
  text: string;
};

export const WORD_FINDING_TEXTS: WordFindingText[] = [
  {
    id: "gunluk-ritim",
    title: "Gunluk Ritim",
    category: "Genel",
    text: "Her sabah ayni saatte uyanirim ve kisa bir esneme yaparim. Pencereyi acinca temiz hava odaya dolar. Masamin uzerindeki kitap, kalem ve defter gunun ilk calismasini bekler. Kahvaltida zeytin, peynir ve sicak cay olur. Sonra okul cantami kontrol eder, eksik bir sey kalmadigindan emin olurum.",
  },
  {
    id: "orman-yuruyusu",
    title: "Orman Yuruyusu",
    category: "Doga",
    text: "Ormanda yururken yapraklarin arasindan gelen isik yolu aydinlatir. Kus sesleri dallarin arasinda yankilanir ve rüzgar agaclarin tepesinde hafifce dolasir. Patikanin kenarinda kucuk bir dere akar. Cocuklar dere kenarinda taslari inceler, ogretmenleri ise orman hakkinda sakin bir hikaye anlatir.",
  },
  {
    id: "kutuphane",
    title: "Kutuphane Saati",
    category: "Okul",
    text: "Kutuphane sessiz ve aydinlik bir calisma alanidir. Raflarda romanlar, dergiler, ansiklopediler ve renkli kapakli kitaplar bulunur. Ogrenciler aradiklari bilgiyi bulmak icin once kataloglara bakar. Sonra masaya oturup not alir, onemli cumlelerin altini cizer ve okuduklarini arkadaslariyla paylasir.",
  },
  {
    id: "bilim-atolyesi",
    title: "Bilim Atolyesi",
    category: "Bilim",
    text: "Bilim atolyesinde ogrenciler merak ettikleri sorulara deneylerle cevap arar. Masalarda mikroskop, cetvel, renkli kartlar ve kucuk deney kaplari vardir. Her grup once tahminini yazar, sonra sonucu dikkatle gozlemler. Basarili bir deney icin sabir, dikkat ve duzenli not tutmak cok onemlidir.",
  },
];
