import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PanelCard } from "@/components/ui/PanelCard";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/teacherNavigation";
import { TeacherOnly } from "@/components/auth/TeacherOnly";

const visuals = [
  { title: "Takistoskop", src: "/exercise-visuals/exercises/tachistoscope.svg" },
  { title: "Kart Eslestirme", src: "/memory-card-visuals/apple.svg" },
  { title: "Gorsel Puzzle", src: "/exercise-visuals/exercises/visual-puzzle.svg" },
  { title: "Gokkusagi", src: "/memory-card-visuals/rainbow.svg" },
];

export default function PuzzleVisualsPage() {
  return (
    <AppShell
      title="Puzzle Gorselleri"
      subtitle="Egzersizlerde kullanilan gorsel setleri buradan inceleyebilirsin."
      navItems={TEACHER_NAV_ITEMS}
      compactHeader
      wide
    >
      <TeacherOnly>
        <PanelCard
          title="Gorsel Kutuphane"
          subtitle="Egzersiz tasariminda kullanilan ornek gorsel setleri."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visuals.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-3">
                <Image src={item.src} alt={item.title} width={260} height={160} className="h-auto w-full rounded-xl" />
                <p className="mt-2 text-sm font-semibold text-slate-700">{item.title}</p>
              </article>
            ))}
          </div>
        </PanelCard>
      </TeacherOnly>
    </AppShell>
  );
}