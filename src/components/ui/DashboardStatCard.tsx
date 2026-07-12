import { GlassCard } from "@/components/ui/GlassCard";

type DashboardStatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: string;
};

export function DashboardStatCard({ label, value, detail, icon }: DashboardStatCardProps) {
  return (
    <GlassCard className="relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-white/8" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--idil-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--idil-text)]">{value}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm text-[var(--idil-muted)]">{detail}</p>
    </GlassCard>
  );
}