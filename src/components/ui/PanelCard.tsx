import type { ReactNode } from "react";

type PanelCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function PanelCard({ title, subtitle, children, className = "" }: PanelCardProps) {
  return (
    <section className={`idil-card idil-hover-surface relative overflow-hidden p-4 md:p-[18px] ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-red-500"
      />
      {title ? <h2 className="text-[18px] font-semibold tracking-tight text-slate-950 md:text-[20px]">{title}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm text-[var(--muted)] md:text-base">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-3" : ""}>{children}</div>
    </section>
  );
}
