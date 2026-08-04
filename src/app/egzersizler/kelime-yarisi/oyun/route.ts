import { readWordRaceGameHtml } from "@/lib/word-race/wordRaceAsset";

/**
 * Egzersiz sayfasindaki iframe'in yukledigi oyun HTML'i. Diger egzersiz
 * route'lari gibi ogrenciye aciktir; sonuc/XP kaydi iframe'in kendisinde degil,
 * postMessage ile haber verilen ANA sayfada (WordRaceExerciseClient) yapilir.
 */
export async function GET() {
  const html = await readWordRaceGameHtml();

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Prototipin son hali her zaman gorunsun; uzun sureli public cache yok.
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
