import type { ReactNode } from "react";

type ExerciseWorkPanelStat = {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "ok" | "bad" | "brand";
};

type ExerciseWorkPanelProps = {
  title: string;
  subtitle?: string;
  statusText?: string;
  stats?: ExerciseWorkPanelStat[];
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function getToneClass(tone: ExerciseWorkPanelStat["tone"]): string {
  if (tone === "ok") {
    return "text-[var(--ok)]";
  }

  if (tone === "bad") {
    return "text-[var(--bad)]";
  }

  if (tone === "brand") {
    return "text-[var(--brand)]";
  }

  return "text-slate-900";
}

export function ExerciseWorkPanel({
  title,
  subtitle,
  statusText,
  stats,
  children,
  footer,
  className,
}: ExerciseWorkPanelProps) {
  return (
    <section className={`relative isolate mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-red-100 bg-white shadow-2xl shadow-red-200/35 ring-1 ring-red-50 ${className ?? ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(254,202,202,0.35),transparent_24%)]"
      />

      <div className="relative bg-gradient-to-r from-red-800 via-red-600 to-red-500 px-4 py-5 text-white md:px-6 md:py-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Çalışma Ekranı</p>
              <h2 className="mt-1 text-2xl font-black leading-tight md:text-3xl">{title}</h2>
              {subtitle ? <p className="mt-1.5 text-sm leading-6 text-red-50/90 md:text-base">{subtitle}</p> : null}
            </div>

            {statusText ? (
              <div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-sm backdrop-blur">
                {statusText}
              </div>
            ) : null}
          </div>

          {stats && stats.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {stats.map((item) => (
                <article
                  key={`${item.label}-${String(item.value)}`}
                  className="rounded-xl border border-white/20 bg-white/12 px-3 py-3 shadow-sm backdrop-blur"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-50/85">{item.label}</p>
                  <p className={`mt-1 text-base font-extrabold text-white ${getToneClass(item.tone)}`}>{item.value}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-slate-50 to-white px-3 py-4 md:px-6 md:py-6">
        <div className="rounded-2xl border border-red-100 bg-white/95 p-3 shadow-inner shadow-red-100/40 md:min-h-[360px] md:p-5">
          <div className="flex min-h-[220px] items-center justify-center md:min-h-[320px]">{children}</div>
        </div>
      </div>

      {footer ? (
        <div className="relative border-t border-red-100 bg-slate-50 px-3 py-4 md:px-6 md:py-5">{footer}</div>
      ) : null}
    </section>
  );
}
