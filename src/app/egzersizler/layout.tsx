import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";
import { AssignmentTaskProvider } from "@/components/assignments/AssignmentTaskProvider";
import { AssignmentTaskTimer } from "@/components/assignments/AssignmentTaskTimer";

type ExercisesLayoutProps = {
  children: ReactNode;
};

/**
 * AssignmentTaskProvider/Timer TUM egzersizleri tek noktadan sarar: URL'de
 * ?programTaskId= varsa öğretmenin belirlediği snapshot sunucudan okunur.
 * V2 flag açıkken provider gerçek start/completion state makinesini ve
 * sunucu deadline'ını kullanır; adapter yoksa fail-closed kalır. Flag kapalı
 * ve serbest çalışma dalları mevcut davranışlarını korur.
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
