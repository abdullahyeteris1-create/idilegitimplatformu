import { AppShell } from "@/components/layout/AppShell";
import { ExercisesCenterClient } from "./ExercisesCenterClient";

const EXERCISES_NAV_ITEMS = [
  { href: "/ogrenci", label: "Ogrenci" },
  { href: "/ogretmen", label: "Ogretmen" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuc" },
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
