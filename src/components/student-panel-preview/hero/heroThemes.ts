import type { HeroSceneId } from "./heroScenes";

export type HeroTheme = {
  id: string;
  /** Tema seçicide gösterilen simge. */
  emoji: string;
  /** Tema seçici çipinde kullanılan kısa ad. */
  shortTitle: string;
  title: string;
  subtitle: string;
  motivationText: string;
  backgroundClass: string;
  accentColor: string;
  /** Bu banner'a özel illüstrasyon; her tema kendi kompozisyonunu çizer. */
  scene: HeroSceneId;
  particles:
    | "stars" | "pages" | "leaves" | "confetti" | "clouds" | "birds"
    | "bubbles" | "sparks" | "waves" | "flags" | "comets" | "petals";
};

export const HERO_THEMES: HeroTheme[] = [
  { id: "speed-reading", emoji: "⚡", shortTitle: "Hızlı Okuma", title: "⚡ Hızlı Okuma", subtitle: "Kronometre çalışıyor, tempoyu yakala", motivationText: "Her gün biraz daha hızlı, biraz daha net oku.", backgroundClass: "themeSpeed", accentColor: "#7ee0ff", scene: "speedReading", particles: "sparks" },
  { id: "reading-quest", emoji: "🗺️", shortTitle: "Okuma Serüveni", title: "🗺️ Okuma Serüveni", subtitle: "Rotanı çiz, zirveye tırman", motivationText: "Her sayfa, haritada bir adım ileri demek.", backgroundClass: "themeAdventure", accentColor: "#ffd18a", scene: "readingQuest", particles: "flags" },
  { id: "student-desk", emoji: "🎒", shortTitle: "Çalışma Masası", title: "🎒 Çalışma Masası", subtitle: "Lamban yanık, defterin açık", motivationText: "Düzenli çalışan, farkı en çabuk görendir.", backgroundClass: "themeDesk", accentColor: "#ffc98a", scene: "studentDesk", particles: "pages" },
  { id: "magic-library", emoji: "📚", shortTitle: "Kütüphane", title: "📚 Sihirli Kütüphane", subtitle: "Parlayan sayfaların arasında", motivationText: "Her kitap yeni bir süper güç kazandırır.", backgroundClass: "themeLibrary", accentColor: "#ffd27a", scene: "magicLibrary", particles: "pages" },
  { id: "space-adventure", emoji: "🚀", shortTitle: "Uzay", title: "🚀 Uzay Macerası", subtitle: "Mor uzayda yeni bir keşif", motivationText: "Bugün yeni bir gezegen keşfetmeye hazır mısın?", backgroundClass: "themeSpace", accentColor: "#9f8cff", scene: "spaceRocket", particles: "stars" },
  { id: "focus-training", emoji: "👁️", shortTitle: "Odak", title: "👁️ Odak Antrenmanı", subtitle: "Gözünü hedefe kilitle", motivationText: "Odaklanan göz, daha az yorulur daha çok görür.", backgroundClass: "themeFocus", accentColor: "#8ef0ff", scene: "focusEye", particles: "waves" },
  { id: "word-garden", emoji: "🌱", shortTitle: "Kelime Bahçesi", title: "🌱 Kelime Bahçesi", subtitle: "Öğrendiğin her kelime filizlenir", motivationText: "Küçük adımlar, kocaman bir kelime bahçesi yapar.", backgroundClass: "themeGarden", accentColor: "#9ee6b5", scene: "wordGarden", particles: "petals" },
  { id: "champion-arena", emoji: "🏆", shortTitle: "Şampiyon", title: "🏆 Şampiyonluk Kürsüsü", subtitle: "Bugünün sahnesi senin", motivationText: "Her çalışma seni zirveye biraz daha yaklaştırıyor.", backgroundClass: "themeArena", accentColor: "#ffd36e", scene: "champion", particles: "confetti" },
  { id: "ocean-depths", emoji: "🌊", shortTitle: "Okyanus", title: "🌊 Okyanus Derinlikleri", subtitle: "Kitap denizaltısıyla derine dal", motivationText: "Derine indikçe daha çok şey keşfedeceksin.", backgroundClass: "themeOcean", accentColor: "#6fd8f5", scene: "oceanDive", particles: "bubbles" },
  { id: "science-lab", emoji: "🧪", shortTitle: "Laboratuvar", title: "🧪 Bilim Laboratuvarı", subtitle: "Her deney yeni bir bilgi", motivationText: "Merak eden beyin her gün büyür.", backgroundClass: "themeLab", accentColor: "#7ef7c8", scene: "scienceLab", particles: "sparks" },
  { id: "castle-quest", emoji: "🏰", shortTitle: "Şato", title: "🏰 Şato Macerası", subtitle: "Kelimelerin kalesine giriş", motivationText: "Her doğru cevap kalenin bir kapısını açar.", backgroundClass: "themeCastle", accentColor: "#ffc38a", scene: "castle", particles: "flags" },
  { id: "night-sky", emoji: "🌌", shortTitle: "Gece Gökyüzü", title: "🌌 Gece Gökyüzü", subtitle: "Teleskopunu takımyıldıza çevir", motivationText: "Sakin bir odak, en parlak sonucu getirir.", backgroundClass: "themeAurora", accentColor: "#8ef0d8", scene: "nightSky", particles: "stars" },
];
