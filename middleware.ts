import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";

function createLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/giris";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasValidSession = isAdminSessionValid(request);

  if (hasValidSession) {
    return NextResponse.next();
  }

  if (pathname === "/api/admin-logout") {
    return NextResponse.json({ ok: false, message: "Yetkisiz erisim." }, { status: 401 });
  }

  return createLoginRedirect(request);
}

export const config = {
  matcher: ["/ogretmen/:path*", "/api/admin-logout"],
};
