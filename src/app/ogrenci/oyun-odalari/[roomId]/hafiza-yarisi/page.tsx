import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MemoryRaceMultiplayerClient } from "@/components/memory-race/MemoryRaceMultiplayerClient";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";

export default async function StudentMemoryRacePage({ params }: { params: Promise<{ roomId: string }> }) {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");
  const { roomId } = await params;

  return <main className="min-h-screen bg-[var(--idil-page-bg)] px-4 py-8 text-[var(--idil-text)] md:px-8"><MemoryRaceMultiplayerClient roomId={roomId} role="student" /></main>;
}
