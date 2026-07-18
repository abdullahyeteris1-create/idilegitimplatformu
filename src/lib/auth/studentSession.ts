import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const STUDENT_SESSION_COOKIE_NAME = "idil_student_session";
const STUDENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type StudentSessionPayload = {
  studentId: string;
  username: string;
  issuedAt: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getStudentSessionSecret(): string | null {
  return process.env.STUDENT_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || null;
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createStudentSessionToken(studentId: string, username: string): string | null {
  const secret = getStudentSessionSecret();
  if (!secret) {
    return null;
  }

  const encodedPayload = toBase64Url(
    JSON.stringify({
      studentId,
      username,
      issuedAt: Date.now(),
    } satisfies StudentSessionPayload),
  );
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function readStudentSessionToken(token: string): StudentSessionPayload | null {
  const secret = getStudentSessionSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<StudentSessionPayload>;
    if (
      typeof parsed.studentId !== "string" ||
      !parsed.studentId.trim() ||
      typeof parsed.username !== "string" ||
      !parsed.username.trim() ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isFinite(parsed.issuedAt) ||
      parsed.issuedAt > Date.now() ||
      Date.now() - parsed.issuedAt > STUDENT_SESSION_MAX_AGE_SECONDS * 1000
    ) {
      return null;
    }

    return {
      studentId: parsed.studentId.trim(),
      username: parsed.username.trim(),
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}

export function readStudentSessionFromRequest(request: NextRequest): StudentSessionPayload | null {
  return readStudentSessionToken(request.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
}

export function getStudentSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDENT_SESSION_MAX_AGE_SECONDS,
  };
}
