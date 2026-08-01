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
  sceneType: "image";
  imagePath: string;
  desktopPosition: string;
  tabletPosition: string;
  mobilePosition: string;
  overlay: string;
  animationPreset: "slowZoom" | "gentleFloat";
  textColor: string;
  /**
   * Banner örtüsünün tonu — hero metninin kontrastını belirler. Panelin açık/koyu
   * modundan bağımsızdır; yüzey tonları için `AppearanceMode` kullanılır.
   */
  heroTone: "light" | "dark";
  particles: "stars" | "pages" | "leaves" | "confetti" | "clouds" | "sparks";
};

export const HERO_THEMES: HeroTheme[] = [
  { id: "live-space", emoji: "🚀", shortTitle: "Uzay", title: "🚀 Uzay Macerası", subtitle: "Gezegenler arasında yeni bilgiler keşfet", motivationText: "Merakın seni her gün daha uzağa götürsün.", backgroundClass: "themeLiveSpace", accentColor: "#9f8cff", sceneType: "image", imagePath: "/login-backgrounds/space-reading.webp", desktopPosition: "center center", tabletPosition: "58% center", mobilePosition: "68% center", overlay: "linear-gradient(90deg, rgba(8,10,38,.9) 0%, rgba(20,18,70,.62) 48%, rgba(12,8,42,.18) 100%)", animationPreset: "slowZoom", textColor: "#fff", heroTone: "dark",particles: "stars" },
  { id: "live-library", emoji: "📚", shortTitle: "Kitaplık", title: "📚 Sihirli Kütüphane", subtitle: "Parlayan sayfaların arasında ilerle", motivationText: "Her kitap yeni bir süper güç kazandırır.", backgroundClass: "themeLiveLibrary", accentColor: "#ffd27a", sceneType: "image", imagePath: "/login-backgrounds/magical-library.webp", desktopPosition: "center center", tabletPosition: "54% center", mobilePosition: "62% center", overlay: "linear-gradient(90deg, rgba(31,17,40,.9) 0%, rgba(54,28,60,.64) 50%, rgba(22,11,35,.18) 100%)", animationPreset: "gentleFloat", textColor: "#fff", heroTone: "dark",particles: "pages" },
  { id: "live-sky-books", emoji: "☁️", shortTitle: "Bulut", title: "☁️ Bulutlar ve Uçan Kitaplar", subtitle: "Hayal gücünle gökyüzüne yüksel", motivationText: "Her sayfa, hedeflerine açılan yeni bir kanat.", backgroundClass: "themeLiveSky", accentColor: "#ffd18a", sceneType: "image", imagePath: "/login-backgrounds/sky-books-01.webp", desktopPosition: "center center", tabletPosition: "55% center", mobilePosition: "58% center", overlay: "linear-gradient(90deg, rgba(20,43,91,.78) 0%, rgba(48,80,140,.42) 52%, rgba(13,31,71,.1) 100%)", animationPreset: "slowZoom", textColor: "#fff", heroTone: "dark",particles: "clouds" },
  { id: "live-nature", emoji: "🌿", shortTitle: "Doğa", title: "🌿 Doğa ve Keşif", subtitle: "Doğanın içinde yeni yollar keşfet", motivationText: "Her küçük adım, büyük bir keşfin başlangıcıdır.", backgroundClass: "themeLiveNature", accentColor: "#9ee6b5", sceneType: "image", imagePath: "/login-backgrounds/nature-reading.webp", desktopPosition: "center center", tabletPosition: "58% center", mobilePosition: "64% center", overlay: "linear-gradient(90deg, rgba(13,44,42,.82) 0%, rgba(30,74,61,.48) 52%, rgba(12,35,28,.1) 100%)", animationPreset: "gentleFloat", textColor: "#fff", heroTone: "dark",particles: "leaves" },
  { id: "live-arena", emoji: "🏆", shortTitle: "Arena", title: "🏆 Başarı Arenası", subtitle: "Bugünün sahnesi senin", motivationText: "Her çalışma seni zirveye biraz daha yaklaştırır.", backgroundClass: "themeLiveArena", accentColor: "#ffd36e", sceneType: "image", imagePath: "/login-backgrounds/achievement-arena.webp", desktopPosition: "center center", tabletPosition: "56% center", mobilePosition: "63% center", overlay: "linear-gradient(90deg, rgba(61,25,38,.86) 0%, rgba(106,50,45,.5) 53%, rgba(48,19,32,.12) 100%)", animationPreset: "slowZoom", textColor: "#fff", heroTone: "dark",particles: "confetti" },
  { id: "live-sunrise", emoji: "🌅", shortTitle: "Gün", title: "🌅 Gün Doğumu", subtitle: "Yeni güne umutla başla", motivationText: "Her sabah, başarıya atılan yepyeni bir adımdır.", backgroundClass: "themeLiveSunrise", accentColor: "#ffd28a", sceneType: "image", imagePath: "/login-backgrounds/sunrise-reading.webp", desktopPosition: "center center", tabletPosition: "55% center", mobilePosition: "60% center", overlay: "linear-gradient(90deg, rgba(83,39,48,.76) 0%, rgba(128,71,56,.4) 52%, rgba(70,31,37,.08) 100%)", animationPreset: "slowZoom", textColor: "#fff", heroTone: "dark",particles: "sparks" },
];
