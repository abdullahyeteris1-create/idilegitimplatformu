export type ContentModuleStatus = "active" | "coming-soon";

export type ContentModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: ContentModuleStatus;
  icon: string;
  tone: string;
  connectedExercises: string[];
};

export const CONTENT_MODULES: ContentModule[] = [
  {
    id: "text-library",
    title: "Metin Kutuphanesi",
    description: "Blok Okuma, Golgeleme, Odakli Okuma ve Anlama Testi icin kullanilacak metinleri yonetin.",
    href: "/ogretmen/icerik-yonetimi/metin-kutuphanesi",
    status: "active",
    icon: "MT",
    tone: "from-red-500 to-rose-600",
    connectedExercises: ["Blok Okuma", "Golgeleme", "Odakli Okuma", "Anlama Testi"],
  },
  {
    id: "question-library",
    title: "Soru Kutuphanesi",
    description: "Anlama Testi ve ilerideki olcme calismalari icin sorulari yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "SR",
    tone: "from-indigo-500 to-violet-600",
    connectedExercises: ["Anlama Testi", "Olcme calismalari"],
  },
  {
    id: "word-pool",
    title: "Kelime Havuzu",
    description: "Takistoskop, Kelime Bulma ve dikkat calismalarinda kullanilacak kelimeleri yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "KH",
    tone: "from-sky-500 to-blue-600",
    connectedExercises: ["Takistoskop", "Kelime Bulma", "Dikkat calismalari"],
  },
  {
    id: "similar-word-pairs",
    title: "Benzer Kelime Ciftleri",
    description: "Benzer Kelimeler calismasinda kullanilacak ayni/farkli kelime ciftlerini yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "BK",
    tone: "from-pink-500 to-red-600",
    connectedExercises: ["Benzer Kelimeler"],
  },
  {
    id: "paragraph-targets",
    title: "Paragraf ve Hedef Kelimeler",
    description: "Kelime Bulma calismasinda kullanilacak paragraflari ve hedef kelimeleri yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "PH",
    tone: "from-amber-500 to-orange-600",
    connectedExercises: ["Kelime Bulma"],
  },
  {
    id: "eye-symbols",
    title: "Goz Egzersizi Simgeleri",
    description: "Goz Kaslarini Gelistirme calismasinda kullanilacak simgeleri yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "GS",
    tone: "from-emerald-500 to-teal-600",
    connectedExercises: ["Goz Kaslari"],
  },
  {
    id: "exercise-settings",
    title: "Egzersiz Ayarlari",
    description: "Egzersizlerin seviye, hiz, sure ve varsayilan ayarlarini yonetin.",
    href: "#",
    status: "coming-soon",
    icon: "EA",
    tone: "from-slate-700 to-indigo-700",
    connectedExercises: ["Tum egzersizler", "Hafiza Gelistirme"],
  },
];
