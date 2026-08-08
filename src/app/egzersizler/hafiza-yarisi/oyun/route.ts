import { readMemoryRaceHtml } from "@/lib/memory-race/memoryRaceAsset";

/**
 * Hafiza Yarisi oyun HTML'i. Egzersiz sayfasindaki iframe bu route'u yukler.
 *
 * Kelime Yarisi'ndaki `/oyun` route'undan farki: burada sonuc koprusu
 * enjekte EDILMEZ. Oyun tamamen kendi icinde calisir, platforma hicbir sey
 * bildirmez.
 */
export async function GET() {
  const html = await readMemoryRaceHtml();

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
