export type WordFindingText = {
  id: string;
  title: string;
  category?: string;
  text: string;
};

export const WORD_FINDING_TEXTS: WordFindingText[] = [
  {
    id: "gunluk-ritim",
    title: "Günlük Ritim",
    category: "Genel",
    text: "Her sabah aynı saatte uyanırım ve kısa bir esneme yaparım. Pencereyi açınca temiz hava odaya dolar. Masamın üzerindeki kitap, kalem ve defter günün ilk çalışmasını bekler. Kahvaltıda zeytin, peynir ve sıcak çay olur. Sonra okul çantamı kontrol eder, eksik bir şey kalmadığından emin olurum.",
  },
  {
    id: "orman-yuruyusu",
    title: "Orman Yürüyüşü",
    category: "Doğa",
    text: "Ormanda yürürken yaprakların arasından gelen ışık yolu aydınlatır. Kuş sesleri dalların arasında yankılanır ve rüzgâr ağaçların tepesinde hafifçe dolaşır. Patikanın kenarında küçük bir dere akar. Çocuklar dere kenarında taşları inceler, öğretmenleri ise orman hakkında sakin bir hikâye anlatır.",
  },
  {
    id: "kutuphane",
    title: "Kütüphane Saati",
    category: "Okul",
    text: "Kütüphane sessiz ve aydınlık bir çalışma alanıdır. Raflarda romanlar, dergiler, ansiklopediler ve renkli kapaklı kitaplar bulunur. Öğrenciler aradıkları bilgiyi bulmak için önce kataloglara bakar. Sonra masaya oturup not alır, önemli cümlelerin altını çizer ve okuduklarını arkadaşlarıyla paylaşır.",
  },
  {
    id: "bilim-atolyesi",
    title: "Bilim Atölyesi",
    category: "Bilim",
    text: "Bilim atölyesinde öğrenciler merak ettikleri sorulara deneylerle cevap arar. Masalarda mikroskop, cetvel, renkli kartlar ve küçük deney kapları vardır. Her grup önce tahminini yazar, sonra sonucu dikkatle gözlemler. Başarılı bir deney için sabır, dikkat ve düzenli not tutmak çok önemlidir.",
  },
];
