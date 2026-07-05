import type { ReactNode } from "react";

type PanelCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function PanelCard({ title, subtitle, children, className = "" }: PanelCardProps) {
  return (
    <section className={`idil-card relative overflow-hidden p-5 md:p-7 ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500"
      />
      {title ? <h2 className="text-xl font-bold md:text-2xl">{title}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm text-[var(--muted)] md:text-base">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-5" : ""}>{children}</div>
    </section>
  );
}
