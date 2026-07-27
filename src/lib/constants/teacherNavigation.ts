// Eski "Odev Programi" (assignment-program sablon kutuphanesi) yonetici
// panelinde kalabalik yarattigi icin gizlendi - ozellik silinmedi (route,
// API, migration, veri hepsi korunuyor; bkz. ASSIGNMENT_PROGRAM_HREF).
// Geri getirmek icin bu sabiti true yapmak yeterlidir - tek kaynak burasi,
// baska hicbir dosyada bu karar tekrar hardcode edilmemelidir.
export const SHOW_ASSIGNMENT_PROGRAM = false;
export const ASSIGNMENT_PROGRAM_HREF = "/ogretmen/idil-panel/odev-programi";

const ALL_TEACHER_NAV_ITEMS = [
  { href: "/ogretmen", label: "Ana Sayfa" },
  { href: "/ogretmen/idil-panel", label: "Yonetim Merkezi" },
  { href: "/ogretmen/idil-panel/haftalik-program", label: "Haftalik Program" },
  { href: "/ogretmen/idil-panel/ogrenci-takip", label: "Ogrenciler" },
  { href: "/ogretmen/idil-panel/odevler", label: "Odevler" },
  { href: ASSIGNMENT_PROGRAM_HREF, label: "Odev Programi" },
  { href: "/ogretmen/idil-panel/egitim-programlari", label: "Egitim Programlari" },
  { href: "/ogretmen/idil-panel/ogrenci-programlari", label: "Ogrenci Programlari" },
  { href: "/ogretmen/idil-panel/ders-kayitlari", label: "Ders Kayitlari" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclar" },
  { href: "/ogretmen/icerik-yonetimi", label: "Icerik Yonetimi" },
  { href: "/ogretmen/icerik-yonetimi/ai-icerik-ureticisi", label: "AI Analiz" },
  { href: "/ogretmen/idil-panel/toplu-ogrenci-aktar", label: "Raporlar" },
];

export const TEACHER_NAV_ITEMS = ALL_TEACHER_NAV_ITEMS.filter(
  (item) => SHOW_ASSIGNMENT_PROGRAM || item.href !== ASSIGNMENT_PROGRAM_HREF,
);
