import { GameRoomEntryClient } from "@/components/multiplayer/GameRoomEntryClient";
import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export default async function TeacherGameRoomsPage() {
  await requireTeacherSession();

  return (
    <AppShell
      title="Oyun Odaları"
      subtitle="Çok oyunculu çalışmalar için güvenli ve canlı lobiler oluşturun."
      navItems={TEACHER_NAV_ITEMS}
      wide
    >
      <GameRoomEntryClient role="teacher" />
    </AppShell>
  );
}
