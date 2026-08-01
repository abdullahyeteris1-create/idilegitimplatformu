export type HeroTheme = {
  id: string;
  title: string;
  subtitle: string;
  motivationText: string;
  backgroundClass: string;
  accentColor: string;
  illustration: "space" | "library" | "nature" | "arena" | "clouds" | "sunrise";
  floatingElements: string[];
  animationPreset: "float" | "glow" | "drift";
  particles: "stars" | "pages" | "leaves" | "confetti" | "clouds" | "birds";
};

export const HERO_THEMES: HeroTheme[] = [
  { id: "space-adventure", title: "🚀 Uzay Macerası", subtitle: "Mor uzayda yeni bir keşif", motivationText: "Bugün yeni bir gezegen keşfetmeye hazır mısın?", backgroundClass: "themeSpace", accentColor: "#9f8cff", illustration: "space", floatingElements: ["robot", "books", "crystals", "planets"], animationPreset: "float", particles: "stars" },
  { id: "magic-library", title: "📚 Sihirli Kütüphane", subtitle: "Parlayan sayfaların arasında", motivationText: "Her kitap yeni bir süper güç kazandırır.", backgroundClass: "themeLibrary", accentColor: "#ffd27a", illustration: "library", floatingElements: ["books", "owl", "candles", "pages"], animationPreset: "glow", particles: "pages" },
  { id: "nature-discovery", title: "🌿 Doğa ve Keşif", subtitle: "Yeşil bir keşif yolculuğu", motivationText: "Bugün doğa kadar sakin, rüzgâr kadar hızlı oku.", backgroundClass: "themeNature", accentColor: "#9ee6b5", illustration: "nature", floatingElements: ["student", "butterfly", "waterfall", "flowers"], animationPreset: "drift", particles: "leaves" },
  { id: "champion-arena", title: "🏆 Şampiyonluk Arenası", subtitle: "Bugünün sahnesi senin", motivationText: "Her çalışma seni zirveye biraz daha yaklaştırıyor.", backgroundClass: "themeArena", accentColor: "#ffd36e", illustration: "arena", floatingElements: ["trophy", "medals", "confetti", "spotlight"], animationPreset: "glow", particles: "confetti" },
  { id: "cloud-books", title: "☁️ Bulutlar ve Uçan Kitaplar", subtitle: "Hayal gücünle yüksel", motivationText: "Hayal gücünü de yanına al.", backgroundClass: "themeClouds", accentColor: "#ffd2f0", illustration: "clouds", floatingElements: ["clouds", "books", "balloons", "rainbow"], animationPreset: "float", particles: "clouds" },
  { id: "sunrise", title: "🌅 Gün Doğumu", subtitle: "Yeni bir gün, yeni bir başlangıç", motivationText: "Bugün yeni başlangıçların günü.", backgroundClass: "themeSunrise", accentColor: "#ffd18a", illustration: "sunrise", floatingElements: ["sun", "mountains", "birds", "light"], animationPreset: "drift", particles: "birds" },
];

