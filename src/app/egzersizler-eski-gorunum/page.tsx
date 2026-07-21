import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ExercisesCenterClient } from "@/app/egzersizler/ExercisesCenterClient";

export const metadata: Metadata = {
  title: "Egzersizler (Eski Görünüm) | İDİL Hızlı Okuma",
  description: "Egzersizler sayfasının önceki tasarımı; gelişme/geri dönüş amaçlı arşiv görünümü.",
};

const EXERCISES_NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/egzersizler", label: "Egzersizler" },
  { href: "/sonuc", label: "Sonuclarim" },
];

type ExercisesPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ExercisesOldViewPage({ searchParams }: ExercisesPageProps) {
  await searchParams;

  return (
    <AppShell
      title="Egzersizler"
      subtitle="Dikkat, okuma, hafiza ve anlama calismalarini tek merkezden baslat."
      navItems={EXERCISES_NAV_ITEMS}
      compactHeader
      wide
      headerVariant="student-vibrant"
    >
      <ExercisesCenterClient />
    </AppShell>
  );
}
