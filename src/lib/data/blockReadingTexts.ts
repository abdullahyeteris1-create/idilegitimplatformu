export type BlockReadingCategory = "Genel" | "Hikaye" | "Bilim" | "Ilkokul" | "Ortaokul";

export type BlockReadingText = {
  id: string;
  title: string;
  category: BlockReadingCategory;
  text: string;
  level?: string;
};

export const BLOCK_READING_TEXTS: BlockReadingText[] = [
  {
    id: "genel-01",
    title: "Sabah Rutinim",
    category: "Genel",
    level: "Baslangic",
    text: "Her sabah ayni saatte uyanirim. Kisa bir esneme yaparim. Ilik su icerim. Sonra gunluk hedeflerimi not ederim.",
  },
  {
    id: "hikaye-01",
    title: "Kucuk Fener",
    category: "Hikaye",
    level: "Baslangic",
    text: "Mina karanlik odada kucuk bir fener buldu. Dugmeye bastiginda duvarda yildizlar gibi isiklar dans etti. Mina gulumseyerek kitabini okumaya basladi.",
  },
  {
    id: "bilim-01",
    title: "Beyin ve Dikkat",
    category: "Bilim",
    level: "Orta",
    text: "Odakli okuma sirasinda beyin gereksiz uyaranlari filtreler. Tekrarli alistirmalar sinir aglarini guclendirir. Bu sayede bilgi daha hizli islenir.",
  },
  {
    id: "ilkokul-01",
    title: "Okul Bahcesi",
    category: "Ilkokul",
    level: "1-3",
    text: "Teneffuste herkes okul bahcesine cikti. Top oynayanlar, ip atlayanlar ve kosturanlar vardi. Zil calinca ogrenciler siniflarina geri dondu.",
  },
  {
    id: "ortaokul-01",
    title: "Bilim Sergisi",
    category: "Ortaokul",
    level: "5-8",
    text: "Okulda bilim sergisi icin ekipler kuruldu. Her grup bir deney tasarladi. Sunum gunu herkes sirayla projesini anlatti ve sorulari yanitladi.",
  },
  {
    id: "genel-02",
    title: "Kisa Mola",
    category: "Genel",
    level: "Baslangic",
    text: "Yirmi dakikalik calismadan sonra kisa mola vermek zihni tazeler. Derin nefes almak ve kisa yuruyus yapmak dikkati toparlamaya yardim eder.",
  },
];

export const BLOCK_READING_CATEGORIES: BlockReadingCategory[] = [
  "Genel",
  "Hikaye",
  "Bilim",
  "Ilkokul",
  "Ortaokul",
];
