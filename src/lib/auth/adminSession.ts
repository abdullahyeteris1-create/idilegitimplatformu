import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE_NAME = "idil_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function getAdminSessionFromCookies(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
}

export function isAdminSessionValid(request: NextRequest): boolean {
  const token = getAdminSessionFromCookies(request);
  return typeof token === "string" && token.trim().length >= 16;
}
