import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValid } from "./adminSession";

export async function requireTeacherSession(): Promise<string> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  if (!isAdminSessionTokenValid(token)) {
    redirect("/giris");
  }

  return token?.trim() ?? "";
}
