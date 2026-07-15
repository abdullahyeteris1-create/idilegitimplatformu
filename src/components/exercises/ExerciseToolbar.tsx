import type { ReactNode } from "react";

type ExerciseToolbarProps = {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  hasSettings: boolean;
  settingsOpen: boolean;
  onSettingsToggle: () => void;
  allowFullscreen: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  onFullscreenToggle: () => void;
  onExit?: () => void;
};

const buttonClass = "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-200/80 bg-white px-3 py-2 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

export function ExerciseToolbar({
  title, subtitle, status, hasSettings, settingsOpen, onSettingsToggle,
  allowFullscreen, isFullscreen, isFullscreenSupported, onFullscreenToggle, onExit,
}: ExerciseToolbarProps) {
  return (
    <header className="exercise-stage__toolbar shrink-0 border-b border-red-100/80 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur md:px-4 md:py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0 flex-1 basis-[150px]">
          <h1 className="truncate text-sm font-black text-slate-950 md:text-base">{title}</h1>
          {subtitle ? <p className="truncate text-[11px] text-slate-500 md:text-xs">{subtitle}</p> : null}
        </div>
        {status ? <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-1.5 md:order-none md:w-auto">{status}</div> : null}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {hasSettings ? (
            <button type="button" className={buttonClass} aria-expanded={settingsOpen} aria-controls="exercise-settings-panel" onClick={onSettingsToggle}>
              {settingsOpen ? "Ayarları Küçült" : "Ayarları Büyüt"}
            </button>
          ) : null}
          {allowFullscreen && isFullscreenSupported ? (
            <button type="button" className={buttonClass} aria-label={isFullscreen ? "Tam ekrandan çık" : "Tam ekrana geç"} onClick={onFullscreenToggle}>
              {isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
            </button>
          ) : null}
          {onExit ? <button type="button" className={buttonClass} onClick={onExit}>Çıkış</button> : null}
        </div>
      </div>
    </header>
  );
}
