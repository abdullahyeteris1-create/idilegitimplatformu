export type ContentModuleStatus = "active" | "coming-soon" | "text-library" | "preparing" | "linked";

export type ContentModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: ContentModuleStatus;
  icon: string;
  tone: string;
  tags: string[];
  actionLabel?: string;
};

export type ContentGroup = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  tone: string;
  softClass: string;
  panelClass: string;
  modules: ContentModule[];
};

const TEXT_LIBRARY_HREF = "/ogretmen/icerik-yonetimi/metin-kutuphanesi";

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    id: "attention",
    title: "Göz Algılama Çalışmaları",
    shortTitle: "Göz Algılama",
    description: "Görsel algı, hızlı fark etme ve dikkat becerilerini geliştiren çalışmaların içeriklerini yönetin.",
    icon: "AD",
    tone: "from-rose-500 to-red-600",
    softClass: "border-rose-200 bg-rose-50 text-rose-800",
    panelClass: "border-rose-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_52%,#fdf2f8_100%)]",
    modules: [
      {
        id: "tachistoscope-settings",
        title: "Takistoskop Ayarlari",
        description: "Takistoskop çalışmasında kullanılacak içerik türleri, seviye mantığı ve hız seçeneklerini yönetin.",
        href: "#",
        status: "preparing",
        icon: "TK",
        tone: "from-rose-500 to-red-600",
        tags: ["Hiz", "Seviye", "Icerik"],
      },
      {
        id: "similar-word-content",
        title: "Benzer Kelimeler Icerikleri",
        description: "Benzer Kelimeler çalışmasında kullanılacak aynı/farklı kelime çiftlerini yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "BK",
        tone: "from-pink-500 to-red-600",
        tags: ["Kelime", "Cift", "Dikkat"],
      },
      {
        id: "two-side-focus-content",
        title: "Çift Taraflı Odak İçerikleri",
        description: "Çift Taraflı Odak çalışmasında kullanılacak kelime gruplarını ve seviye ayarlarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "CO",
        tone: "from-fuchsia-500 to-rose-600",
        tags: ["Odak", "Kelime", "Seviye"],
      },
      {
        id: "word-finding-content",
        title: "Kelime Bulma Icerikleri",
        description: "Kelime Bulma çalışmasında kullanılacak paragrafları ve hedef kelimeleri yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "KB",
        tone: "from-red-500 to-orange-600",
        tags: ["Paragraf", "Hedef", "Tarama"],
      },
      {
        id: "letter-number-counting-settings",
        title: "Harf / Rakam Sayma Ayarları",
        description: "Harf/rakam sayma çalışmasında kullanılacak mod, seviye, hız ve zorluk ayarlarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "HR",
        tone: "from-rose-500 to-orange-600",
        tags: ["Harf", "Rakam", "Sayma"],
      },
    ],
  },
  {
    id: "fluency",
    title: "Metin Çalışmaları",
    shortTitle: "Metin Çalışmaları",
    description: "Blok okuma, gölgeleme ve odaklı okuma için metin kaynaklarını tek kütüphaneden yönetin.",
    icon: "OA",
    tone: "from-indigo-500 to-sky-600",
    softClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
    panelClass: "border-indigo-200 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_52%,#eff6ff_100%)]",
    modules: [
      {
        id: "block-reading-texts",
        title: "Blok Okuma Metinleri",
        description: "Blok Okuma çalışmasında kullanılacak metinleri yönetin.",
        href: TEXT_LIBRARY_HREF,
        status: "active",
        icon: "BO",
        tone: "from-indigo-500 to-sky-600",
        tags: ["Metin", "Blok Okuma", "Aktif"],
        actionLabel: "Metin Kutuphanesine Git",
      },
      {
        id: "shadowing-texts",
        title: "Golgeleme Metinleri",
        description: "Gölgeleme çalışmasında kullanılacak metinleri yönetin.",
        href: TEXT_LIBRARY_HREF,
        status: "text-library",
        icon: "GL",
        tone: "from-blue-500 to-cyan-600",
        tags: ["Metin", "Golgeleme"],
        actionLabel: "Metin Kutuphanesine Git",
      },
      {
        id: "focused-reading-texts",
        title: "Odakli Okuma Metinleri",
        description: "Odaklı Okuma çalışmasında kullanılacak metinleri yönetin.",
        href: TEXT_LIBRARY_HREF,
        status: "text-library",
        icon: "OO",
        tone: "from-violet-500 to-indigo-600",
        tags: ["Metin", "Odakli Okuma"],
        actionLabel: "Metin Kutuphanesine Git",
      },
    ],
  },
  {
    id: "memory",
    title: "Hafıza Teknikleri",
    shortTitle: "Hafıza Teknikleri",
    description: "Görsel hafıza, eşleştirme ve parça-bütün algısını geliştiren çalışmaların içeriklerini yönetin.",
    icon: "HZ",
    tone: "from-amber-500 to-orange-600",
    softClass: "border-amber-200 bg-amber-50 text-amber-900",
    panelClass: "border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_52%,#fff7ed_100%)]",
    modules: [
      {
        id: "memory-settings",
        title: "Hafıza Geliştirme Ayarları",
        description: "Kutu sayısı, seviye hedefleri, gösterim süresi ve tur ayarlarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "HG",
        tone: "from-amber-500 to-orange-600",
        tags: ["Kutu", "Sure", "Seviye"],
      },
      {
        id: "card-matching-settings",
        title: "Kart Eşleştirme Ayarları",
        description: "Kart eşleştirme çalışmasında kullanılacak görsel setleri, seviye ve kapanma süresi ayarlarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "KE",
        tone: "from-amber-500 to-pink-600",
        tags: ["Kart", "Gorsel", "Seviye"],
      },
      {
        id: "visual-puzzle-settings",
        title: "Görsel Puzzle Ayarları",
        description: "Puzzle çalışmasında kullanılacak görselleri, seviye ve parça sayılarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "GP",
        tone: "from-yellow-500 to-orange-600",
        tags: ["Puzzle", "Gorsel", "Parca"],
      },
    ],
  },
  {
    id: "eye",
    title: "Göz Egzersizleri",
    shortTitle: "Göz Egzersizleri",
    description: "Göz kasları çalışmasında kullanılan simge ve seviye hareket mantığını yönetmeye hazır alan.",
    icon: "GE",
    tone: "from-emerald-500 to-teal-600",
    softClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panelClass: "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_52%,#f0fdfa_100%)]",
    modules: [
      {
        id: "eye-symbols",
        title: "Göz Egzersizi Simgeleri",
        description: "Göz Kaslarını Geliştirme çalışmasında kullanılacak simgeleri yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "GS",
        tone: "from-emerald-500 to-teal-600",
        tags: ["Simge", "Gorsel", "Goz"],
      },
      {
        id: "eye-brain-settings",
        title: "Göz Beyin Çalışması Ayarları",
        description: "Göz Beyin Çalışması'nda kullanılacak simgeleri ve hız ayarlarını yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "GB",
        tone: "from-cyan-500 to-blue-600",
        tags: ["Simge", "Hiz", "Odak"],
      },
      {
        id: "eye-level-settings",
        title: "Göz Egzersizi Seviye Ayarları",
        description: "Seviye hareket noktalarını, hız seçeneklerini ve yanıp sönme düzenini yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "SA",
        tone: "from-teal-500 to-cyan-600",
        tags: ["Seviye", "Hiz", "Nokta"],
      },
    ],
  },
  {
    id: "assessment",
    title: "Okuma ve Anlama Testleri",
    shortTitle: "Anlama Testleri",
    description: "Okuma hızı, anlama oranı, soru setleri ve test kayıtlarını yönetim merkezinden takip edin.",
    icon: "OD",
    tone: "from-slate-700 to-indigo-700",
    softClass: "border-slate-200 bg-slate-50 text-slate-800",
    panelClass: "border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_52%,#eef2ff_100%)]",
    modules: [
      {
        id: "comprehension-texts",
        title: "Anlama Testi Metinleri",
        description: "Anlama Testi'nde kullanılacak okuma metinlerini yönetin.",
        href: TEXT_LIBRARY_HREF,
        status: "text-library",
        icon: "AT",
        tone: "from-slate-700 to-indigo-700",
        tags: ["Metin", "Anlama", "Aktif"],
        actionLabel: "Metin Kutuphanesine Git",
      },
      {
        id: "comprehension-questions",
        title: "Anlama Testi Soruları",
        description: "Metinlere bağlı soruları, seçenekleri ve doğru cevapları yönetin.",
        href: "#",
        status: "coming-soon",
        icon: "SR",
        tone: "from-indigo-500 to-violet-600",
        tags: ["Soru", "Cevap", "Olcme"],
      },
      {
        id: "reading-test-records",
        title: "Okuma Testi Kayıtları",
        description: "Öğrencilerin okuma hızı ve anlama oranı geçmişini inceleyin.",
        href: "/sonuc",
        status: "linked",
        icon: "OK",
        tone: "from-blue-600 to-indigo-700",
        tags: ["Sonuc", "Rapor", "Takip"],
        actionLabel: "Sonuclari Ac",
      },
    ],
  },
];

export const CONTENT_MODULES: ContentModule[] = CONTENT_GROUPS.flatMap((group) => group.modules);
