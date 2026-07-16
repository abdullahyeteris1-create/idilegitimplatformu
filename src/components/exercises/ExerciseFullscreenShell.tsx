"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";

type ExerciseFullscreenShellProps = {
  title: string;
  description?: string;
  backHref?: string;
  exitHref?: string;
  showNavigation?: boolean;
  children: ReactNode;
  settings?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
};

export function ExerciseFullscreenShell({
  title,
  description,
  backHref = "/egzersizler",
  showNavigation = true,
  children,
  settings,
  status,
  footer,
}: ExerciseFullscreenShellProps) {
  const router = useRouter();

  return (
    <ExerciseStage
      title={title}
      subtitle={description}
      settings={settings}
      status={status}
      footer={footer}
      onExit={showNavigation ? () => router.push(backHref) : undefined}
      contentClassName="p-2 md:p-4"
    >
      <div className="box-border h-full min-h-0 min-w-0 max-w-full overflow-hidden">{children}</div>
    </ExerciseStage>
  );
}

export default ExerciseFullscreenShell;
