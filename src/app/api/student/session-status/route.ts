import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
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
    { ok: false, message: access.message },
    { status: access.status, headers: NO_STORE_HEADERS },
  );

  if (access.status === 401 || access.status === 403) {
    clearStudentSessionCookie(response);
  }

  return response;
}
