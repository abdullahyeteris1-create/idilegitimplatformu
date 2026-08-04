import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getWordRaceClassLeaderboard } from "@/lib/word-race/wordRaceLeaderboard";

export const runtime = "nodejs";

/**
 * Kelime Yarisi sinif ici ilk 10 listesi. Yalniz oturumu dogrulanmis ogrenci
 * cagirabilir ve yanit KENDI sinifiyla sinirlidir; govdede yalniz gorunen ad
 * (adin ilk kelimesi) ve skor doner.
 */
export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);

  if (!access.ok) {
    const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }

  const entries = await getWordRaceClassLeaderboard(access.studentId);

  return NextResponse.json(
    { ok: true, entries },
    { headers: { "Cache-Control": "no-store" } },
  );
}
