import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";

export default function StudentDashboardPage() {
  return (
    <IdilThemeProvider className="min-h-screen bg-[var(--idil-page-bg)] text-[var(--idil-text)]">
      <StudentDashboardClient />
    </IdilThemeProvider>
  );
}
