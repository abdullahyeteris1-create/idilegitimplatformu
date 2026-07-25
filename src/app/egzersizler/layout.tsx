import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";
import { AssignmentTaskProvider } from "@/components/assignments/AssignmentTaskProvider";
import { AssignmentTaskTimer } from "@/components/assignments/AssignmentTaskTimer";

type ExercisesLayoutProps = {
  children: ReactNode;
};

/**
 * AssignmentTaskProvider/Timer TUM egzersizleri tek noktadan sarar: URL'de
 * ?programTaskId= varsa ogretmenin belirledigi sure/seviye/ayarlar sunucudan
 * okunur, ortak geri sayim sayaci calisir ve sure bitince gorev guvenli
 * bicimde tamamlanip "Tebrikler" ekrani gosterilir. Serbest calismada
 * (parametre yoksa) ikisi de hicbir sey yapmaz - mevcut akis degismez.
 */
export default function ExercisesLayout({ children }: ExercisesLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentSessionWatcher />
      <AssignmentTaskProvider>
        {children}
        <AssignmentTaskTimer />
      </AssignmentTaskProvider>
    </div>
  );
}
