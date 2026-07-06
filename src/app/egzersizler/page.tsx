import { AppShell } from "@/components/layout/AppShell";
import { ExercisesCenterClient } from "./ExercisesCenterClient";

const EXERCISES_NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclarim" },
];

type ExercisesPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const resolvedSearchParams = await searchParams;
  const category = Array.isArray(resolvedSearchParams.category)
    ? resolvedSearchParams.category[0]
    : resolvedSearchParams.category;

  return (
    <AppShell
      title="Egzersizler"
      subtitle="Dikkat, okuma, hafiza ve anlama calismalarini tek merkezden baslat."
      navItems={EXERCISES_NAV_ITEMS}
      compactHeader
      wide
    >
      <ExercisesCenterClient initialCategory={category} />
    </AppShell>
  );
}
