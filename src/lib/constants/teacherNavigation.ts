// Eski "Ödev Programı" (assignment-program şablon kütüphanesi) yönetici
// panelinde kalabalık yarattığı için gizlendi - özellik silinmedi (route,
// API, migration, veri hepsi korunuyor; bkz. ASSIGNMENT_PROGRAM_HREF).
// Geri getirmek için bu sabiti true yapmak yeterlidir - tek kaynak burası,
// başka hiçbir dosyada bu karar tekrar hardcode edilmemelidir.
export const SHOW_ASSIGNMENT_PROGRAM = false;
export const ASSIGNMENT_PROGRAM_HREF = "/ogretmen/idil-panel/odev-programi";

const ALL_TEACHER_NAV_ITEMS = [
  { href: "/ogretmen", label: "Ana Sayfa" },
  { href: "/ogretmen/idil-panel", label: "Yönetim Merkezi" },
  { href: "/ogretmen/idil-panel/haftalik-program", label: "Haftalık Program" },
  { href: "/ogretmen/idil-panel/ogrenci-takip", label: "Öğrenciler" },
  { href: "/ogretmen/idil-panel/odevler", label: "Ödevler" },
  { href: ASSIGNMENT_PROGRAM_HREF, label: "Ödev Programı" },
  { href: "/ogretmen/idil-panel/egitim-programlari", label: "Eğitim Programları" },
  { href: "/ogretmen/idil-panel/ogrenci-programlari", label: "Öğrenci Programları" },
  { href: "/ogretmen/idil-panel/oyun-odalari", label: "Oyun Odaları" },
  { href: "/ogretmen/idil-panel/ders-kayitlari", label: "Ders Kayıtları" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuçlar" },
  { href: "/ogretmen/icerik-yonetimi", label: "İçerik Yönetimi" },
  { href: "/ogretmen/icerik-yonetimi/ai-icerik-ureticisi", label: "AI Analiz" },
  // Bu route CSV ile toplu öğrenci aktarma ekranı; daha önce "Raporlar"
  // etiketiyle listeleniyordu ve rapor arayan öğretmeni yanlış sayfaya
  // götürüyordu. Etiket hedefle eşleşecek şekilde düzeltildi.
  { href: "/ogretmen/idil-panel/toplu-ogrenci-aktar", label: "Toplu Öğrenci Aktar" },
];

export const TEACHER_NAV_ITEMS = ALL_TEACHER_NAV_ITEMS.filter(
  (item) => SHOW_ASSIGNMENT_PROGRAM || item.href !== ASSIGNMENT_PROGRAM_HREF,
);
