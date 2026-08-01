export type LoginTheme = {
  id: string;
  name?: string;
  title: string;
  eyebrow: string;
  quote: string;
  palette: string;
  accent: string;
  art: "space" | "library" | "nature" | "arena" | "clouds" | "sunrise";
  imagePath?: string;
  desktopPosition?: string;
  tabletPosition?: string;
  mobilePosition?: string;
  overlay?: string;
  cardTone?: "midnight" | "soft";
  textTone?: "light" | "soft";
  cardDesktopPosition?: "center" | "center-left" | "center-right";
  cardTabletPosition?: "center" | "center-left" | "center-right";
  cardMobilePosition?: "center" | "center-left" | "center-right";
};

/** Yeni bir tema eklemek için yalnızca bu listeye yeni bir obje ekleyin. */
export const LOGIN_THEMES: LoginTheme[] = [
  { id: "space", title: "Uzay macerasına hazır mısın?", eyebrow: "SINIRLARI AŞ", quote: "Her sayfa yeni bir keşif.", palette: "#111d4d", accent: "#7c6cff", art: "space", imagePath: "/login-backgrounds/space-reading.webp", desktopPosition: "42% center", tabletPosition: "46% center", mobilePosition: "48% center", overlay: "linear-gradient(90deg, rgba(7,9,30,.14), rgba(7,9,30,.18) 46%, rgba(18,12,58,.58)), linear-gradient(0deg, rgba(5,8,28,.38), transparent 58%)", cardTone: "midnight", textTone: "light" },
  { id: "library", title: "Hayal gücünün kütüphanesi", eyebrow: "MERAKINI BESLE", quote: "Okudukça dünyan büyür.", palette: "#35204f", accent: "#f2b66d", art: "library", imagePath: "/login-backgrounds/magical-library.webp", desktopPosition: "34% center", tabletPosition: "38% center", mobilePosition: "38% center", overlay: "linear-gradient(90deg, rgba(7,8,25,.12), rgba(7,8,25,.22) 44%, rgba(7,8,25,.68)), linear-gradient(0deg, rgba(7,8,25,.5), transparent 54%)", cardTone: "soft", textTone: "light" },
  { id: "nature", title: "Keşfet, öğren, ilerle", eyebrow: "DOĞAYI KEŞFET", quote: "Her adımda biraz daha güçlen.", palette: "#123b3c", accent: "#9bdb7b", art: "nature", imagePath: "/login-backgrounds/nature-reading.webp", desktopPosition: "42% center", tabletPosition: "48% center", mobilePosition: "55% center", overlay: "linear-gradient(90deg, rgba(6,29,30,.12), rgba(6,29,30,.2) 46%, rgba(4,24,32,.6)), linear-gradient(0deg, rgba(4,24,25,.34), transparent 58%)", cardTone: "soft", textTone: "light" },
  { id: "arena", title: "Başarı arenada başlar", eyebrow: "KENDİ REKORUNU KIR", quote: "Bugünün emeği yarının başarısı.", palette: "#462331", accent: "#ffcc72", art: "arena", imagePath: "/login-backgrounds/achievement-arena.webp", desktopPosition: "46% center", tabletPosition: "52% center", mobilePosition: "60% center", overlay: "linear-gradient(90deg, rgba(16,12,43,.12), rgba(16,12,43,.2) 45%, rgba(20,10,44,.66)), linear-gradient(0deg, rgba(17,10,35,.38), transparent 58%)", cardTone: "midnight", textTone: "light" },
  { id: "clouds", title: "Hayallerin gökyüzünde", eyebrow: "YÜKSELMEYE DEVAM ET", quote: "Küçük adımlar büyük başarılar getirir.", palette: "#244769", accent: "#b8e6ff", art: "clouds", imagePath: "/login-backgrounds/sky-books-01.webp", desktopPosition: "38% center", tabletPosition: "42% center", mobilePosition: "42% center", overlay: "linear-gradient(90deg, rgba(3,15,39,.1), rgba(3,15,39,.18) 44%, rgba(22,22,72,.62)), linear-gradient(0deg, rgba(3,15,39,.36), transparent 56%)", cardTone: "midnight", textTone: "light" },
  { id: "sunrise", title: "Yeni bir gün, yeni bir hedef", eyebrow: "BUGÜNÜNÜ BAŞLAT", quote: "En güzel hikâyeler bir adımla başlar.", palette: "#5b2f3c", accent: "#ffcf83", art: "sunrise", imagePath: "/login-backgrounds/sunrise-reading.webp", desktopPosition: "46% center", tabletPosition: "52% center", mobilePosition: "58% center", overlay: "linear-gradient(90deg, rgba(54,28,45,.1), rgba(54,28,45,.18) 45%, rgba(33,18,46,.62)), linear-gradient(0deg, rgba(44,22,40,.32), transparent 58%)", cardTone: "soft", textTone: "light" },
];

export function getRandomLoginTheme(): LoginTheme {
  return LOGIN_THEMES[Math.floor(Math.random() * LOGIN_THEMES.length)] ?? LOGIN_THEMES[0];
}
