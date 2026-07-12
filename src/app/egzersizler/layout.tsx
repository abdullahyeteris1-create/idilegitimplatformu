import type { ReactNode } from "react";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";

type ExercisesLayoutProps = {
  children: ReactNode;
};

export default function ExercisesLayout({ children }: ExercisesLayoutProps) {
  return (
    <IdilThemeProvider className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      {children}
    </IdilThemeProvider>
  );
}
