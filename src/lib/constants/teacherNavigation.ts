import type { IconName } from "@/components/student-panel-preview/icons";

export const SHOW_ASSIGNMENT_PROGRAM = false;
export const ASSIGNMENT_PROGRAM_HREF = "/ogretmen/idil-panel/odev-programi";

export type TeacherNavItem = { href: string; label: string; icon: IconName };
export type TeacherNavGroup = { label: string; items: TeacherNavItem[] };

export const TEACHER_NAV_GROUPS: TeacherNavGroup[] = [
  { label: "Genel", items: [
    { href: "/ogretmen", label: "Ana Sayfa", icon: "home" },
    { href: "/ogretmen/idil-panel", label: "Yönetim Merkezi", icon: "grid" },
    { href: "/ogretmen/idil-panel/haftalik-program", label: "Haftalık Program", icon: "clock" },
  ] },
  { label: "Öğrenciler", items: [
    { href: "/ogretmen/idil-panel/ogrenci-takip", label: "Öğrenciler", icon: "user" },
    { href: "/ogretmen/idil-panel/ogrenci-programlari", label: "Öğrenci Programları", icon: "bookOpen" },
    { href: "/ogretmen/idil-panel/toplu-ogrenci-aktar", label: "Toplu Öğrenci Aktar", icon: "type" },
  ] },
  { label: "Çalışma ve Program", items: [
    { href: "/ogretmen/idil-panel/odevler", label: "Ödevler", icon: "checkbox" },
    { href: "/ogretmen/idil-panel/egitim-programlari", label: "Eğitim Programları", icon: "book" },
    { href: "/ogretmen/idil-panel/oyun-odalari", label: "Oyun Odaları", icon: "puzzle" },
    ...(SHOW_ASSIGNMENT_PROGRAM ? [{ href: ASSIGNMENT_PROGRAM_HREF, label: "Ödev Programı", icon: "checkbox" as IconName }] : []),
  ] },
  { label: "Analiz", items: [
    { href: "/ogretmen/idil-panel/ders-kayitlari", label: "Ders Kayıtları", icon: "activity" },
    { href: "/ogretmen/idil-panel/ders-kayitlari/gelisim-raporu", label: "Gelişim Raporları", icon: "chart" },
    { href: "/sonuc", label: "Sonuçlar", icon: "gauge" },
  ] },
  { label: "İçerik", items: [
    { href: "/ogretmen/icerik-yonetimi", label: "İçerik Yönetimi", icon: "settings" },
    { href: "/ogretmen/icerik-yonetimi/metin-kutuphanesi", label: "Metin Kütüphanesi", icon: "type" },
    { href: "/ogretmen/icerik-yonetimi/anlama-testi-olustur", label: "Anlama Testi", icon: "bookOpen" },
    { href: "/ogretmen/icerik-yonetimi/takistoskop", label: "Takistoskop", icon: "eye" },
    { href: "/ogretmen/icerik-yonetimi/benzer-kelimeler", label: "Benzer Kelimeler", icon: "activity" },
    { href: "/ogretmen/icerik-yonetimi/cift-tarafli-odak", label: "Çift Taraflı Odak", icon: "target" },
    { href: "/ogretmen/icerik-yonetimi/puzzle-gorselleri", label: "Puzzle Görselleri", icon: "sparkles" },
    { href: "/ogretmen/icerik-yonetimi/ai-icerik-ureticisi", label: "AI İçerik Üreticisi", icon: "brain" },
  ] },
];

export const TEACHER_NAV_ITEMS = TEACHER_NAV_GROUPS.flatMap((group) => group.items).map(({ href, label }) => ({ href, label }));
