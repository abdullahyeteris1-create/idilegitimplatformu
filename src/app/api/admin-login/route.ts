import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/adminSession";

type AdminLoginBody = {
  username?: unknown;
  password?: unknown;
};

function getConfiguredAdminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function createSessionToken(): string {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

export async function POST(request: Request) {
  const credentials = getConfiguredAdminCredentials();

  if (!credentials) {
    return NextResponse.json(
      { ok: false, message: "Sunucu yonetici girisine hazir degil." },
      { status: 500 },
    );
  }

  let body: AdminLoginBody;

  try {
    body = (await request.json()) as AdminLoginBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Kullanici adi veya sifre hatali." },
      { status: 401 },
    );
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (username !== credentials.username || password !== credentials.password) {
    return NextResponse.json(
      { ok: false, message: "Kullanici adi veya sifre hatali." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
