import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (access.ok) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  }

  const response = NextResponse.json(
    { ok: false, message: access.message, reason: access.reason },
    { status: access.status, headers: NO_STORE_HEADERS },
  );

  // This endpoint is polled by the client watcher. Do not clear the cookie here:
  // a stale response from a request started before a successful login could erase
  // the newly-issued student session cookie.
  return response;
}
