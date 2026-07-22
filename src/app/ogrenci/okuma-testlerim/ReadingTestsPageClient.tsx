"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { Icon } from "@/components/student-panel-preview/icons";
import type { AuthenticatedStudent, StudentResultApiItem } from "@/components/student-panel-preview/StudentPanelPreview";
import { ReadingTestsStatistics } from "@/components/student-panel-preview/ReadingTestsStatistics";
import type { ExerciseResult } from "@/lib/results/types";
import styles from "./okuma-testlerim.module.css";

type ResultsState = {
  status: "loading" | "ready" | "error";
  results: ExerciseResult[];
};

type ReadingTestsPageClientProps = {
  authenticatedStudent: AuthenticatedStudent;
};

export function ReadingTestsPageClient({ authenticatedStudent }: ReadingTestsPageClientProps) {
  const { theme } = useIdilTheme();
  const [resultsState, setResultsState] = useState<ResultsState>({ status: "loading", results: [] });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadResults = async () => {
      setResultsState({ status: "loading", results: [] });
      try {
        const response = await fetch("/api/student/results", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: StudentResultApiItem[] };
        if (!response.ok || !Array.isArray(payload.results)) {
          throw new Error("Student results request failed");
        }

        const results = payload.results.map((result): ExerciseResult => {
          if (result.studentId !== authenticatedStudent.id) {
            throw new Error("Student result identity mismatch");
          }

          return {
            ...result,
            studentName: authenticatedStudent.name,
            username: authenticatedStudent.username ?? undefined,
          };
        });
        if (cancelled) return;
        setResultsState({ status: "ready", results });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setResultsState({ status: "error", results: [] });
        }
      }
    };

    void loadResults();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authenticatedStudent.id, authenticatedStudent.name, authenticatedStudent.username]);

  return (
    <div className={`${styles.page} ${theme === "light" ? styles.light : ""}`}>
      <div className={styles.shell}>
        <Link href="/ogrenci" className={styles.backLink}>
          <Icon name="arrow" /> Öğrenci Paneline Dön
        </Link>
        <header className={styles.pageHeader}>
          <h1>Okuma Testlerim</h1>
          <p>Okuma hızınızı ve anlama testlerindeki gelişiminizi tarih sırasına göre takip edin.</p>
        </header>
        <ReadingTestsStatistics results={resultsState.results} status={resultsState.status} hideHeader />
      </div>
    </div>
  );
}
