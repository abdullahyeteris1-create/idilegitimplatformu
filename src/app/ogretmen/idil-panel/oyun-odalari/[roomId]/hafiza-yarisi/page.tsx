import { MemoryRaceMultiplayerClient } from "@/components/memory-race/MemoryRaceMultiplayerClient";
import { AppShell } from "@/components/layout/AppShell";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";

export default async function TeacherMemoryRacePage({ params }: { params: Promise<{ roomId: string }> }) {
  await requireTeacherSession();
  const { roomId } = await params;

  return <AppShell title="Hafıza Yarışı" subtitle="Oyunu ve oyuncuların ilerlemesini canlı izleyin." navItems={TEACHER_NAV_ITEMS} wide><MemoryRaceMultiplayerClient roomId={roomId} role="teacher" /></AppShell>;
}
