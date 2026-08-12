import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE_NAME = "idil_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  iat: number;
  exp: number;
  nonce: string;
};

function getAdminSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || null;
}

function encodePayload(payload: AdminSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createAdminSessionToken(now = Math.floor(Date.now() / 1000)): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const encodedPayload = encodePayload({
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
    nonce: crypto.randomUUID(),
  });
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function isAdminSessionTokenValid(token: string | null | undefined, now = Math.floor(Date.now() / 1000)): boolean {
  const secret = getAdminSessionSecret();
  if (!secret || typeof token !== "string") return false;

  const [encodedPayload, providedSignature, ...extraParts] = token.split(".");
  if (!encodedPayload || !providedSignature || extraParts.length > 0) return false;

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    const issuedAt = payload.iat;
    const expiresAt = payload.exp;
    if (typeof issuedAt !== "number" || !Number.isSafeInteger(issuedAt)) return false;
    if (typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt)) return false;
    if (typeof payload.nonce !== "string" || payload.nonce.length < 16) return false;
    return expiresAt > now
      && issuedAt <= now
      && expiresAt - issuedAt <= ADMIN_SESSION_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

export function getAdminSessionFromCookies(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
}

export function isAdminSessionValid(request: NextRequest): boolean {
  const token = getAdminSessionFromCookies(request);
  return isAdminSessionTokenValid(token);
}
