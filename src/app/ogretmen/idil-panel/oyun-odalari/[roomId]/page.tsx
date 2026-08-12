import { GameRoomLobbyClient } from "@/components/multiplayer/GameRoomLobbyClient";
import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export default async function TeacherGameRoomLobbyPage({ params }: { params: Promise<{ roomId: string }> }) {
  await requireTeacherSession();
  const { roomId } = await params;

  return (
    <AppShell
      title="Canlı Oyun Lobisi"
      subtitle="Katılımcıları ve hazır durumlarını anlık takip edin."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <GameRoomLobbyClient roomId={roomId} role="teacher" />
    </AppShell>
  );
}
