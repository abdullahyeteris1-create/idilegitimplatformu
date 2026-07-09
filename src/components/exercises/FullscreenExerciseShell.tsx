import type { CSSProperties, ReactNode } from "react";

export type FullscreenExerciseStat = {
  label: string;
  value: ReactNode;
  tone?: "default" | "ok" | "bad" | "brand";
};

type FullscreenExerciseShellProps = {
  title: string;
  subtitle: string;
  stats?: FullscreenExerciseStat[];
  children: ReactNode;
  footer?: ReactNode;
  finishButton?: ReactNode;
  backgroundClassName?: string;
  stageClassName?: string;
  mainClassName?: string;
};

type FullscreenExerciseIntroProps = {
  title: string;
  description: string;
  buttonLabel: string;
  onStart: () => void;
  secondary?: ReactNode;
};

export const FULLSCREEN_TOUCH_STYLE: CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

export const FULLSCREEN_PRIMARY_BUTTON_CLASS =
  "relative z-50 w-full min-h-[42px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-3 py-2 text-sm font-bold text-white shadow-md shadow-red-300/40 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-300/55 disabled:cursor-not-allowed disabled:opacity-60";

export const FULLSCREEN_SECONDARY_BUTTON_CLASS =
  "relative z-50 min-h-[38px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-xl border border-red-200/90 bg-white/95 px-3 py-2 text-xs font-bold text-red-700 shadow-sm shadow-red-100/60 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60";

export const FULLSCREEN_SELECT_CLASS =
  "h-9 w-full rounded-xl border border-red-100 bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-red-100/45 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200/80";

export const FULLSCREEN_STAGE_CLASS =
  "fx-slide-up flex min-h-[340px] w-full items-center justify-center rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,249,247,0.88)_100%)] px-3 py-4 shadow-[0_14px_42px_rgba(185,28,28,0.10)] backdrop-blur md:min-h-[420px] md:px-5 md:py-5";

function getToneClass(tone: FullscreenExerciseStat["tone"]): string {
  if (tone === "ok") {
    return "border-green-100 bg-green-50/90 text-green-700 shadow-green-100/60";
  }

  if (tone === "bad") {
    return "border-red-100 bg-red-50/90 text-red-700 shadow-red-100/60";
  }

  if (tone === "brand") {
    return "border-red-200/90 bg-red-50/85 text-red-700 shadow-red-100/60";
  }

  return "border-red-100 bg-white/90 text-red-700 shadow-red-100/70";
}

export function FullscreenExerciseIntro({ title, description, buttonLabel, onStart, secondary }: FullscreenExerciseIntroProps) {
  return (
    <section className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ffd7dd_0%,#fff7f4_44%,#f8f0ea_100%)] px-2 py-3 text-slate-900 md:px-4 md:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col md:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 items-center justify-center">
          <div className="fx-slide-up flex w-full max-w-2xl flex-col items-center rounded-[28px] border border-white/75 bg-white/85 px-5 py-6 text-center shadow-[0_18px_54px_rgba(153,27,27,0.13)] backdrop-blur md:px-7 md:py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">Egzersiz</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            <button
              type="button"
              onClick={onStart}
              className="mt-5 inline-flex min-h-[46px] w-full max-w-sm items-center justify-center rounded-xl border border-red-950/20 bg-[linear-gradient(135deg,#ef4444_0%,#d72839_48%,#b91c1c_100%)] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-300/45 transition duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-300/60"
              style={FULLSCREEN_TOUCH_STYLE}
            >
              {buttonLabel}
            </button>
            {secondary ? <div className="mt-3 w-full max-w-md">{secondary}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FullscreenExerciseShell({
  title,
  subtitle,
  stats = [],
  children,
  footer,
  finishButton,
  backgroundClassName,
  stageClassName,
  mainClassName,
}: FullscreenExerciseShellProps) {
  const shellBackgroundClassName =
    backgroundClassName ??
    "min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ffd4da_0%,#fff8f5_38%,#f7eee8_100%)] px-2 py-2 text-slate-900 md:px-4 md:py-4";

  return (
    <section className={backgroundClassName ? `${shellBackgroundClassName} px-2 py-2 md:px-4 md:py-4` : shellBackgroundClassName}>
      <div className="mx-auto flex w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/76 shadow-[0_18px_58px_rgba(153,27,27,0.13)] backdrop-blur">
        <header className="z-30 border-b border-red-100/80 bg-white/88 shadow-[0_6px_22px_rgba(185,28,28,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4">
            <div className="mr-auto min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">{title}</p>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
              {stats.map((stat) => (
                <span
                  key={stat.label}
                  className={`compact-stat-chip ${getToneClass(stat.tone)}`}
                >
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>

            {finishButton}
          </div>
        </header>

        <main className={mainClassName ?? "flex items-center justify-center px-2 py-3 md:px-4 md:py-4"}>
          <div className="flex w-full max-w-6xl flex-col items-center justify-center text-center">
            <div className={stageClassName ?? FULLSCREEN_STAGE_CLASS}>{children}</div>
          </div>
        </main>

        {footer ? (
          <footer className="glass-control-bar border-t border-red-100/75 px-2.5 py-2 md:px-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
}
