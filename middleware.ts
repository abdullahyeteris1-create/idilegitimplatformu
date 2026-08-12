import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValidEdge } from "@/lib/auth/adminSessionEdge";

function createLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/giris";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  const hasValidSession = await isAdminSessionTokenValidEdge(token);

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
