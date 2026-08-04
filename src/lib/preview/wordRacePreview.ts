import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Kelime Yarisi prototipi icin gizli onizleme kapisi.
 *
 * Bu modul yalnizca sunucu tarafinda calisir: preview anahtari hicbir zaman
 * istemci bundle'ina veya DOM'a yazilmaz. Sayfa anahtari dogruladiktan sonra
 * kisa omurlu bir HMAC token uretir; korumali content route'u yalnizca bu
 * token'i kabul eder.
 */

export const WORD_RACE_PREVIEW_TOKEN_TTL_SECONDS = 300;

const TOKEN_PURPOSE = "word-race-preview";

function getPreviewKey(): string | null {
  const key = process.env.WORD_RACE_PREVIEW_KEY?.trim();
  return key ? key : null;
}

export function isWordRacePreviewEnabled(): boolean {
  return process.env.WORD_RACE_PREVIEW_ENABLED === "true";
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  // timingSafeEqual esit uzunluk ister; uzunluk farki zaten kacinilmaz olarak
  // sizar, bu yuzden once uzunlugu kiyaslayip sonra sabit zamanli karsilastiriyoruz.
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

/**
 * Onizleme acik mi ve URL'deki `key` yapilandirilmis anahtarla esit mi?
 * Anahtar tanimli degilse onizleme her zaman kapalidir.
 */
export function isValidWordRacePreviewKey(candidate: unknown): boolean {
  if (!isWordRacePreviewEnabled()) {
    return false;
  }

  const key = getPreviewKey();

  if (!key || typeof candidate !== "string" || candidate.length === 0) {
    return false;
  }

  return safeEquals(candidate, key);
}

function sign(expiresAt: number, key: string): string {
  return createHmac("sha256", key).update(`${TOKEN_PURPOSE}:${expiresAt}`).digest("hex");
}

/**
 * Iframe'in kullanacagi kisa omurlu token. Anahtarin kendisi yerine bu deger
 * sayfa HTML'ine yazilir.
 */
export function createWordRacePreviewToken(nowMs: number = Date.now()): string | null {
  const key = getPreviewKey();

  if (!key) {
    return null;
  }

  const expiresAt = Math.floor(nowMs / 1000) + WORD_RACE_PREVIEW_TOKEN_TTL_SECONDS;

  return `${expiresAt}.${sign(expiresAt, key)}`;
}

export function isValidWordRacePreviewToken(candidate: unknown, nowMs: number = Date.now()): boolean {
  if (!isWordRacePreviewEnabled()) {
    return false;
  }

  const key = getPreviewKey();

  if (!key || typeof candidate !== "string") {
    return false;
  }

  const separatorIndex = candidate.indexOf(".");

  if (separatorIndex <= 0) {
    return false;
  }

  const rawExpiresAt = candidate.slice(0, separatorIndex);
  const signature = candidate.slice(separatorIndex + 1);

  if (!/^\d+$/.test(rawExpiresAt) || signature.length === 0) {
    return false;
  }

  const expiresAt = Number(rawExpiresAt);

  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= nowMs) {
    return false;
  }

  return safeEquals(signature, sign(expiresAt, key));
}
