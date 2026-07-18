import type { IconName } from "./icons";

export type Category = {
  id?: string;
  title: string;
  count: number;
  countLabel?: "egzersiz";
  progress: number;
  icon: IconName;
  tone: "blue" | "pink" | "green" | "purple" | "orange" | "cyan" | "indigo" | "rose";
  href: string;
  description?: string;
  examples?: { title: string; href: string }[];
};

export const categories: Category[] = [
  { title: "Göz Egzersizleri", count: 5, progress: 80, icon: "eye", tone: "blue", href: "/egzersizler/goz-beyin" },
  { title: "Göz Algılama", count: 4, progress: 60, icon: "target", tone: "pink", href: "/egzersizler/takistoskop" },
  { title: "Metin Çalışmaları", count: 6, progress: 75, icon: "type", tone: "green", href: "/egzersizler/blok-okuma" },
  { title: "Odaklanma", count: 3, progress: 40, icon: "brain", tone: "purple", href: "/egzersizler/cift-tarafli-odak" },
  {
    id: "brain-exercises",
    title: "Beyin Egzersizleri",
    count: 2,
    countLabel: "egzersiz",
    progress: 50,
    icon: "brain",
    tone: "indigo",
    href: "/egzersizler?category=brain-exercises",
    description: "Dikkat, tepki hızı, hafıza ve zihinsel esneklik becerilerini geliştiren çalışmalar.",
    examples: [
      { title: "Renk Uyumu", href: "/egzersizler/renk-uyumu" },
      { title: "Yeni Kartı Bul", href: "/egzersizler/yeni-karti-bul" },
    ],
  },
  {
    id: "word-games",
    title: "Akıl ve Zeka Oyunları",
    count: 4,
    countLabel: "egzersiz",
    progress: 70,
    icon: "puzzle",
    tone: "orange",
    href: "/egzersizler?category=word-games",
    examples: [
      { title: "Kelime Tahmin", href: "/egzersizler/kelime-tahmin" },
      { title: "Adam Asmaca", href: "/egzersizler/adam-asmaca" },
      { title: "Görsel Puzzle", href: "/egzersizler/gorsel-puzzle" },
      { title: "Dikkat Labirenti", href: "/egzersizler/dikkat-labirenti" },
    ],
  },
  { title: "Okuma & Anlama", count: 6, progress: 85, icon: "book", tone: "cyan", href: "/egzersizler/anlama-testi" },
  { title: "Hız & Akıcılık", count: 4, progress: 65, icon: "gauge", tone: "indigo", href: "/egzersizler/golgeleme" },
  { title: "Hafıza Güçlendirme", count: 3, progress: 50, icon: "grid", tone: "rose", href: "/egzersizler/hafiza-gelistirme" },
];

export type NavItem = { label: string; icon: IconName; href?: string };

export const navItems: NavItem[] = [
  { label: "Öğrenci Paneli", icon: "home", href: "/ogrenci-paneli-onizleme" },
  { label: "Ana Sayfa", icon: "house", href: "/" },
  { label: "Egzersizler", icon: "checkbox", href: "/egzersizler" },
  { label: "Çalışmalarım", icon: "clock" },
  { label: "Sonuçlarım", icon: "medal", href: "/sonuc" },
  { label: "Okuma Testlerim", icon: "bookOpen", href: "/egzersizler/anlama-testi" },
  { label: "Raporlarım", icon: "chart", href: "/sonuc" },
  { label: "Rozetlerim", icon: "badge" },
  { label: "Ayarlar", icon: "settings" },
];

export const stats: { label: string; value: string; note: string; icon: IconName; tone: string }[] = [
  { label: "Toplam Çalışma Süresi", value: "2 sa 45 dk", note: "Bu hafta", icon: "sparkles", tone: "cyan" },
  { label: "Tamamlanan Egzersiz", value: "114", note: "Toplam", icon: "activity", tone: "pink" },
  { label: "Başarı Oranı", value: "%92", note: "Harika!", icon: "circle", tone: "green" },
  { label: "Günlük Seri", value: "7 gün", note: "Devam et!", icon: "flame", tone: "orange" },
];
