"use client";

import type { ReactNode } from "react";
import { FixedExerciseStage } from "./FixedExerciseStage";

export type ExerciseStageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  settings?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
  onExit?: () => void;
  allowFullscreen?: boolean;
  defaultFullscreen?: boolean;
  maxWidth?: string;
  contentClassName?: string;
  stageClassName?: string;
};

export function ExerciseStage({
  title, subtitle, children, settings, status, footer, onExit,
  allowFullscreen = true,
  contentClassName = "", stageClassName = "",
}: ExerciseStageProps) {
  return (
    <FixedExerciseStage
      title={title}
      subtitle={subtitle}
      topStats={status}
      bottomSettings={settings}
      controls={footer}
      onExit={onExit}
      allowFullscreen={allowFullscreen}
      className={stageClassName}
    >
      <div className={`h-full min-h-0 min-w-0 w-full max-w-full overflow-auto ${contentClassName}`}>
        {children}
      </div>
    </FixedExerciseStage>
  );
}

export default ExerciseStage;
