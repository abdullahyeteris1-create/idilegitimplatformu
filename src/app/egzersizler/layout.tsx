import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";

type ExercisesLayoutProps = {
  children: ReactNode;
};

export default function ExercisesLayout({ children }: ExercisesLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentSessionWatcher />
      {children}
    </div>
  );
}
