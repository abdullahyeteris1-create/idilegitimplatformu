import { readFile } from "node:fs/promises";
import path from "node:path";
import { isValidWordRacePreviewToken } from "@/lib/preview/wordRacePreview";

/**
 * Prototip HTML'i `public/` altinda degil, web'den dogrudan erisilemeyen
 * `src/private-previews/` altinda durur. Tek cikis kapisi burasidir ve
 * kisa omurlu preview token'i olmadan 404 doner.
 */
const PREVIEW_HTML_PATH = path.join(process.cwd(), "src", "private-previews", "kelime-yarisi.html");

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
    html = await readFile(PREVIEW_HTML_PATH, "utf8");
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
