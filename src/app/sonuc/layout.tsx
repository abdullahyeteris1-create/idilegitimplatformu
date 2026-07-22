import type { ReactNode } from "react";
import { StudentSessionWatcher } from "@/components/auth/StudentSessionWatcher";

type ResultLayoutProps = {
  children: ReactNode;
};

export default function ResultLayout({ children }: ResultLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentSessionWatcher />
      {children}
    </div>
  );
}
