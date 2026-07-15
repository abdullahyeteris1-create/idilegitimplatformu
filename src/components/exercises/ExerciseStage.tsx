"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ExerciseSettingsPanel } from "./ExerciseSettingsPanel";
import { ExerciseToolbar } from "./ExerciseToolbar";
import { useExerciseFullscreen } from "@/hooks/useExerciseFullscreen";

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
  allowFullscreen = true, defaultFullscreen = false, maxWidth = "80rem",
  contentClassName = "", stageClassName = "",
}: ExerciseStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen, isFullscreenSupported } = useExerciseFullscreen(stageRef);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (defaultFullscreen && isFullscreenSupported) void enterFullscreen().catch(() => undefined);
  }, [defaultFullscreen, enterFullscreen, isFullscreenSupported]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== "f" || event.altKey || event.ctrlKey || event.metaKey || target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!allowFullscreen || !isFullscreenSupported || settingsOpen) return;
      event.preventDefault();
      void toggleFullscreen().catch(() => undefined);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [allowFullscreen, isFullscreenSupported, settingsOpen, toggleFullscreen]);

  const handleExit = useCallback(async () => {
    if (isFullscreen) await exitFullscreen().catch(() => undefined);
    onExit?.();
  }, [exitFullscreen, isFullscreen, onExit]);

  return (
    <div ref={stageRef} className={`exercise-stage relative isolate h-[100dvh] min-h-[100dvh] w-full min-w-0 max-w-full overflow-hidden bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] p-1 text-slate-900 sm:p-2 md:p-3 ${stageClassName}`}>
      <div className="mx-auto flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[20px] border border-white/80 bg-white/80 shadow-[0_18px_58px_rgba(153,27,27,0.13)] backdrop-blur md:rounded-[28px]" style={{ maxWidth }}>
        <ExerciseToolbar title={title} subtitle={subtitle} status={status} hasSettings={Boolean(settings)} settingsOpen={settingsOpen} onSettingsToggle={() => setSettingsOpen((value) => !value)} allowFullscreen={allowFullscreen} isFullscreen={isFullscreen} isFullscreenSupported={isFullscreenSupported} onFullscreenToggle={() => void toggleFullscreen().catch(() => undefined)} onExit={onExit ? () => void handleExit() : undefined} />
        {settings && !settingsOpen ? (
          <section
            className="exercise-stage__quick-settings shrink-0 min-w-0 max-w-full overflow-auto border-b border-red-100/75 bg-red-50/65 px-2 py-1.5 md:px-4"
            aria-label="Hızlı egzersiz ayarları"
          >
            <div className="mx-auto min-w-0 max-w-6xl">{settings}</div>
          </section>
        ) : null}
        <main className={`exercise-stage__content min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain ${contentClassName}`}>
          <div className="box-border h-full min-h-0 min-w-0 max-w-full">{children}</div>
        </main>
        {footer ? <footer className="exercise-stage__footer shrink-0 min-w-0 max-w-full overflow-visible border-t border-red-100/75 bg-white/92 px-2 py-1.5 [padding-bottom:max(0.375rem,env(safe-area-inset-bottom))] md:px-4 md:py-2">{footer}</footer> : null}
      </div>
      {settings ? <ExerciseSettingsPanel open={settingsOpen} onClose={closeSettings}>{settings}</ExerciseSettingsPanel> : null}
    </div>
  );
}

export default ExerciseStage;
