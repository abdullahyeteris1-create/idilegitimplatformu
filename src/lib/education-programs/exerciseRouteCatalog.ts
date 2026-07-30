// Egitim Programi snapshot gorevlerinde kullanilan exercise_slug -> egzersiz
// route eslemesi. Sabit bir allow-list: redirect hedefi hicbir zaman slug
// client'tan geliyormus gibi dogrudan URL'e enterpole edilerek kurulmaz.
// Assignment System V2'nin kendi kataloguna (assignmentExerciseCatalog.ts)
// hicbir bagimliligi yoktur.
const EDUCATION_PROGRAM_EXERCISE_ROUTE_BY_SLUG: Readonly<Record<string, string>> = {
  "kare-gorme-alani": "/egzersizler/kare-gorme-alani",
  "ayni-olani-yakala": "/egzersizler/ayni-olani-yakala",
  "benzer-kelimeler": "/egzersizler/benzer-kelimeler",
  "kelime-bulma": "/egzersizler/kelime-bulma",
  "goz-egzersizleri-kolonlar": "/egzersizler/goz-egzersizleri-kolonlar",
  "takistoskop": "/egzersizler/takistoskop",
  "harf-rakam-sayma": "/egzersizler/harf-rakam-sayma",
  "hafiza-gelistirme": "/egzersizler/hafiza-gelistirme",
  "kart-eslestirme": "/egzersizler/kart-eslestirme",
  "blok-okuma": "/egzersizler/blok-okuma",
  "cift-tarafli-odak": "/egzersizler/cift-tarafli-odak",
  "goz-kaslari": "/egzersizler/goz-kaslari",
  "13-nokta-emoji-takip": "/egzersizler/13-nokta-emoji-takip",
  "buyuyen-sekiller-altigen": "/egzersizler/buyuyen-sekiller-altigen",
  "golgeleme": "/egzersizler/golgeleme",
  "gruplama-calismasi": "/egzersizler/gruplama-calismasi",
  "anlama-testi": "/egzersizler/anlama-testi",
  "okuma-hizi-testi": "/egzersizler/okuma-hizi-testi",
};

export function resolveEducationProgramExerciseRoute(exerciseSlug: string): string | null {
  return EDUCATION_PROGRAM_EXERCISE_ROUTE_BY_SLUG[exerciseSlug] ?? null;
}
