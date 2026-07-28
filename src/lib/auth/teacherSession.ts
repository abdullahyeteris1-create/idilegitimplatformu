import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "./adminSession";

function isTeacherSessionTokenValid(token: string | null | undefined): boolean {
  return typeof token === "string" && token.trim().length >= 16;
}

export async function requireTeacherSession(): Promise<string> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  if (!isTeacherSessionTokenValid(token)) {
    redirect("/giris");
  }

  return token?.trim() ?? "";
}
