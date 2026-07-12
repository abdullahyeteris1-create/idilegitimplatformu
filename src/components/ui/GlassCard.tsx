import type { CSSProperties, ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function GlassCard({ children, className = "", style }: GlassCardProps) {
  return (
    <section
      className={`rounded-[24px] border border-[var(--idil-border)] bg-[var(--idil-surface)] shadow-[0_18px_48px_var(--idil-shadow)] backdrop-blur-2xl ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}