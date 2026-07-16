"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useExerciseFullscreen } from "@/hooks/useExerciseFullscreen";

export type FixedExerciseStageProps = {
  title: string;
  subtitle?: string;
  topStats?: ReactNode;
  children: ReactNode;
  bottomSettings?: ReactNode;
  controls?: ReactNode;
  onExit?: () => void;
  allowFullscreen?: boolean;
  className?: string;
};

export function FixedExerciseStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "ok" | "bad" | "brand";
}) {
  const toneClass = tone === "ok"
    ? "border-green-200 bg-green-50 text-green-700"
    : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "brand"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2 py-1 text-[10px] font-bold leading-none shadow-sm md:text-xs ${toneClass}`}>
      {label}: {value}
    </span>
  );
}

const toolbarButtonClass = "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

export function FixedExerciseStage({
  title,
  subtitle,
  topStats,
  children,
  bottomSettings,
  controls,
  onExit,
  allowFullscreen = true,
  className = "",
}: FixedExerciseStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLElement>(null);
  const { exitFullscreen, toggleFullscreen, isFullscreen, isFullscreenSupported } = useExerciseFullscreen(stageRef);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLocaleLowerCase("tr-TR") !== "f" || event.altKey || event.ctrlKey || event.metaKey || target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!allowFullscreen || !isFullscreenSupported) return;
      event.preventDefault();
      void toggleFullscreen().catch(() => undefined);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [allowFullscreen, isFullscreenSupported, toggleFullscreen]);

  const handleExit = useCallback(async () => {
    if (isFullscreen) await exitFullscreen().catch(() => undefined);
    onExit?.();
  }, [exitFullscreen, isFullscreen, onExit]);

  const focusSettings = () => {
    bottomBarRef.current?.querySelector<HTMLElement>("select, input, button")?.focus();
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] text-slate-900">
      <div
        ref={stageRef}
        className={`fixed-exercise-stage relative isolate mx-auto flex h-[calc(100dvh-8px)] w-[calc(100vw-8px)] max-h-[760px] max-w-[1280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl sm:h-[calc(100dvh-20px)] sm:w-[calc(100vw-20px)] lg:h-[min(760px,calc(100dvh-32px))] lg:w-[min(1280px,calc(100vw-32px))] ${isFullscreen ? "h-[100dvh]! w-screen! max-h-none! max-w-none! rounded-none! border-0!" : ""} ${className}`}
      >
        <header className="fixed-exercise-stage__topbar flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm md:px-4 md:py-2">
          <div className="mr-auto min-w-0 flex-1 basis-36">
            <h1 className="truncate text-sm font-black text-slate-950 md:text-base">{title}</h1>
            {subtitle ? <p className="truncate text-[10px] text-slate-500 md:text-xs">{subtitle}</p> : null}
          </div>
          {topStats ? <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-1 md:order-none md:w-auto md:max-w-[58%]">{topStats}</div> : null}
          <div className="flex shrink-0 items-center gap-1.5">
            {bottomSettings ? <button type="button" className={toolbarButtonClass} onClick={focusSettings}>Ayarlar</button> : null}
            {allowFullscreen && isFullscreenSupported ? (
              <button
                type="button"
                className={toolbarButtonClass}
                aria-label={isFullscreen ? "Tam ekrandan çık" : "Tam ekrana geç"}
                onClick={() => void toggleFullscreen().catch(() => undefined)}
              >
                {isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
              </button>
            ) : null}
            {onExit ? <button type="button" className={toolbarButtonClass} aria-label="Egzersizden çık" onClick={() => void handleExit()}>Çıkış</button> : null}
          </div>
        </header>

        <main className="fixed-exercise-stage__area relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-50 p-1.5 md:p-3">
          <div className="flex h-full min-h-0 min-w-0 w-full max-h-full max-w-full items-center justify-center overflow-hidden">
            {children}
          </div>
        </main>

        {bottomSettings || controls ? (
          <footer ref={bottomBarRef} className="fixed-exercise-stage__bottom flex max-h-[42dvh] shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain border-t border-slate-200 bg-white px-2 py-2 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))] md:max-h-[34dvh] md:px-4 landscape:max-h-[38dvh] landscape:gap-1 landscape:py-1.5">
            {bottomSettings ? <div className="min-w-0">{bottomSettings}</div> : null}
            {controls ? <div className="min-w-0">{controls}</div> : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default FixedExerciseStage;
