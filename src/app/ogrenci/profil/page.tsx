import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentProfileClient } from "./StudentProfileClient";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";

export const metadata: Metadata = {
  title: "Profilim | İDİL Hızlı Okuma",
  description: "Öğrenci profil bilgilerinizi görüntüleyin ve güncelleyin.",
};

export default async function StudentProfilePage() {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");

  return <StudentProfileClient />;
}
