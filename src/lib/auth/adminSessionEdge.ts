export const ADMIN_SESSION_COOKIE_NAME = "idil_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || null;
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

function encodeText(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer as ArrayBuffer;
}

export async function isAdminSessionTokenValidEdge(
  token: string | null | undefined,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const secret = getAdminSessionSecret();
  if (!secret || typeof token !== "string") return false;

  const [encodedPayload, providedSignature, ...extraParts] = token.split(".");
  if (!encodedPayload || !providedSignature || extraParts.length > 0) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as {
      iat?: unknown;
      exp?: unknown;
      nonce?: unknown;
    };
    if (
      typeof payload.iat !== "number" || !Number.isSafeInteger(payload.iat)
      || typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp)
      || typeof payload.nonce !== "string" || payload.nonce.length < 16
      || payload.exp <= now || payload.iat > now
      || payload.exp - payload.iat > ADMIN_SESSION_MAX_AGE_SECONDS
    ) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      encodeText(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(providedSignature),
      encodeText(encodedPayload),
    );
  } catch {
    return false;
  }
}
