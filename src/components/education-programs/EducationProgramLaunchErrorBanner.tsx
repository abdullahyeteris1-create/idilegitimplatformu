"use client";

import { useSearchParams } from "next/navigation";
import { getEducationProgramLaunchErrorMessage } from "@/lib/education-programs/launchErrorCodes";
import styles from "./EducationProgramLaunchErrorBanner.module.css";

export function EducationProgramLaunchErrorBanner() {
  const searchParams = useSearchParams();
  const message = getEducationProgramLaunchErrorMessage(searchParams.get("error"));

  if (!message) return null;

  return (
    <div className={styles.banner} role="alert">
      {message}
    </div>
  );
}
