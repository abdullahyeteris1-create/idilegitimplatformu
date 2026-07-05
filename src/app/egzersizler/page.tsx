import { AppShell } from "@/components/layout/AppShell";
import { ExercisesCenterClient } from "./ExercisesCenterClient";

const EXERCISES_NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclarim" },
];

export default function ExercisesPage() {
  return (
    <AppShell
      title="Egzersizler"
      subtitle="Dikkat, okuma, hafiza ve anlama calismalarini tek merkezden baslat."
      navItems={EXERCISES_NAV_ITEMS}
      compactHeader
      wide
    >
      <ExercisesCenterClient />
    </AppShell>
  );
}
