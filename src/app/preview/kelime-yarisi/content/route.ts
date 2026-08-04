import { isValidWordRacePreviewToken } from "@/lib/preview/wordRacePreview";
import { readWordRaceHtml } from "@/lib/word-race/wordRaceAsset";

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!isValidWordRacePreviewToken(token)) {
    return notFound();
  }

  let html: string;

  try {
    // Kaynak prototipin ham hali - egzersiz akisindaki sonuc koprusu YOK.
    html = await readWordRaceHtml();
  } catch {
    return notFound();
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
