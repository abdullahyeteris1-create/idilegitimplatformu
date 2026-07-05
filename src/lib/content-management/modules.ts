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
    title: "Algi ve Dikkat",
    shortTitle: "Algi ve Dikkat",
    description: "Hizli algilama, dikkat, gorsel ayirt etme ve kelime farkindaligi egzersizlerinin iceriklerini yonetin.",
    icon: "AD",
    tone: "from-rose-500 to-red-600",
    softClass: "border-rose-200 bg-rose-50 text-rose-800",
    panelClass: "border-rose-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_52%,#fdf2f8_100%)]",
    modules: [
      {
        id: "tachistoscope-settings",
        title: "Takistoskop Ayarlari",
        description: "Takistoskop calismasinda kullanilacak icerik turleri, seviye mantigi ve hiz seceneklerini yonetin.",
        href: "#",
        status: "preparing",
        icon: "TK",
        tone: "from-rose-500 to-red-600",
        tags: ["Hiz", "Seviye", "Icerik"],
      },
      {
        id: "similar-word-content",
        title: "Benzer Kelimeler Icerikleri",
        description: "Benzer Kelimeler calismasinda kullanilacak ayni/farkli kelime ciftlerini yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "BK",
        tone: "from-pink-500 to-red-600",
        tags: ["Kelime", "Cift", "Dikkat"],
      },
      {
        id: "two-side-focus-content",
        title: "Cift Tarafli Odak Icerikleri",
        description: "Cift Tarafli Odak calismasinda kullanilacak kelime gruplarini ve seviye ayarlarini yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "CO",
        tone: "from-fuchsia-500 to-rose-600",
        tags: ["Odak", "Kelime", "Seviye"],
      },
      {
        id: "word-finding-content",
        title: "Kelime Bulma Icerikleri",
        description: "Kelime Bulma calismasinda kullanilacak paragraflari ve hedef kelimeleri yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "KB",
        tone: "from-red-500 to-orange-600",
        tags: ["Paragraf", "Hedef", "Tarama"],
      },
      {
        id: "letter-number-counting-settings",
        title: "Harf / Rakam Sayma Ayarlari",
        description: "Harf/rakam sayma calismasinda kullanilacak mod, seviye, hiz ve zorluk ayarlarini yonetin.",
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
    title: "Okuma Akiciligi",
    shortTitle: "Okuma Akiciligi",
    description: "Blok okuma, golgeleme ve odakli okuma icin metin kaynaklarini tek kutuphaneden yonetin.",
    icon: "OA",
    tone: "from-indigo-500 to-sky-600",
    softClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
    panelClass: "border-indigo-200 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_52%,#eff6ff_100%)]",
    modules: [
      {
        id: "block-reading-texts",
        title: "Blok Okuma Metinleri",
        description: "Blok Okuma calismasinda kullanilacak metinleri yonetin.",
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
        description: "Golgeleme calismasinda kullanilacak metinleri yonetin.",
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
        description: "Odakli Okuma calismasinda kullanilacak metinleri yonetin.",
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
    title: "Hafiza ve Zihinsel Takip",
    shortTitle: "Hafiza",
    description: "Kisa sureli hafiza, hedef takip ve tur ayarlarini merkezi olarak planlayin.",
    icon: "HZ",
    tone: "from-amber-500 to-orange-600",
    softClass: "border-amber-200 bg-amber-50 text-amber-900",
    panelClass: "border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_52%,#fff7ed_100%)]",
    modules: [
      {
        id: "memory-settings",
        title: "Hafiza Gelistirme Ayarlari",
        description: "Kutu sayisi, seviye hedefleri, gosterim suresi ve tur ayarlarini yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "HG",
        tone: "from-amber-500 to-orange-600",
        tags: ["Kutu", "Sure", "Seviye"],
      },
    ],
  },
  {
    id: "eye",
    title: "Goz Egzersizleri",
    shortTitle: "Goz Egzersizleri",
    description: "Goz kaslari calismasinda kullanilan simge ve seviye hareket mantigini yonetmeye hazir alan.",
    icon: "GE",
    tone: "from-emerald-500 to-teal-600",
    softClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panelClass: "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_52%,#f0fdfa_100%)]",
    modules: [
      {
        id: "eye-symbols",
        title: "Goz Egzersizi Simgeleri",
        description: "Goz Kaslarini Gelistirme calismasinda kullanilacak simgeleri yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "GS",
        tone: "from-emerald-500 to-teal-600",
        tags: ["Simge", "Gorsel", "Goz"],
      },
      {
        id: "eye-level-settings",
        title: "Goz Egzersizi Seviye Ayarlari",
        description: "Seviye hareket noktalarini, hiz seceneklerini ve yanip sonme duzenini yonetin.",
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
    title: "Olcme ve Degerlendirme",
    shortTitle: "Olcme",
    description: "Okuma hizi, anlama orani, soru setleri ve test kayitlarini yonetim merkezinden takip edin.",
    icon: "OD",
    tone: "from-slate-700 to-indigo-700",
    softClass: "border-slate-200 bg-slate-50 text-slate-800",
    panelClass: "border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_52%,#eef2ff_100%)]",
    modules: [
      {
        id: "comprehension-texts",
        title: "Anlama Testi Metinleri",
        description: "Anlama Testi'nde kullanilacak okuma metinlerini yonetin.",
        href: TEXT_LIBRARY_HREF,
        status: "text-library",
        icon: "AT",
        tone: "from-slate-700 to-indigo-700",
        tags: ["Metin", "Anlama", "Aktif"],
        actionLabel: "Metin Kutuphanesine Git",
      },
      {
        id: "comprehension-questions",
        title: "Anlama Testi Sorulari",
        description: "Metinlere bagli sorulari, secenekleri ve dogru cevaplari yonetin.",
        href: "#",
        status: "coming-soon",
        icon: "SR",
        tone: "from-indigo-500 to-violet-600",
        tags: ["Soru", "Cevap", "Olcme"],
      },
      {
        id: "reading-test-records",
        title: "Okuma Testi Kayitlari",
        description: "Ogrencilerin okuma hizi ve anlama orani gecmisini inceleyin.",
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
