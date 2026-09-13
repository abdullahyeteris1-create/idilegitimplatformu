import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  readStudentSessionToken,
  STUDENT_SESSION_COOKIE_NAME,
} from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { canAccessParagraphExercises } from "./paragraphAccessPolicy";

export { canAccessParagraphExercises } from "./paragraphAccessPolicy";

export async function getParagraphExerciseAccess() {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "";
  const session = readStudentSessionToken(token);

  if (!session) {
    return { authenticated: false, enabled: false };
  }

  const access = await verifyStudentAccessToken(token);
  if (!access.ok) {
    return { authenticated: false, enabled: false };
  }

  return {
    authenticated: true,
    enabled: canAccessParagraphExercises(access),
  };
}

export async function requireParagraphExerciseAccess(): Promise<void> {
  const access = await getParagraphExerciseAccess();
  if (!access.authenticated) {
    redirect("/giris");
  }
}
