import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GameRoomLobbyClient } from "@/components/multiplayer/GameRoomLobbyClient";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";

export default async function StudentGameRoomLobbyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "");
  if (!access.ok) redirect("/giris");
  const { roomId } = await params;

  return (
    <main className="min-h-screen bg-[var(--idil-page-bg)] px-4 py-8 text-[var(--idil-text)] md:px-8">
      <div className="mx-auto mb-5 max-w-5xl">
        <Link href="/ogrenci/oyun-odalari" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--idil-border)] bg-[var(--idil-surface)] px-4 text-sm font-bold">← Oyun Odaları</Link>
      </div>
      <GameRoomLobbyClient roomId={roomId} role="student" />
    </main>
  );
}
