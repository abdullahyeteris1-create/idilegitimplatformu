import { GlassCard } from "@/components/ui/GlassCard";

type ExerciseCategoryCardProps = {
  title: string;
  description: string;
  badge: string;
  metric: string;
  icon: string;
  sticker?: string;
  orbit?: string;
  spark?: string;
  trail?: string;
  highlights?: string[];
  theme?: "light" | "dark";
  tone?: "accent" | "orange" | "blue" | "green" | "rose";
};

const TONE_CLASS: Record<NonNullable<ExerciseCategoryCardProps["tone"]>, string> = {
  accent: "from-[var(--idil-accent)]/18 to-[var(--idil-accent-strong)]/10",
  orange: "from-orange-500/18 to-amber-400/10",
  blue: "from-sky-500/18 to-blue-500/10",
  green: "from-emerald-500/18 to-lime-500/10",
  rose: "from-rose-500/18 to-pink-500/10",
};

export function ExerciseCategoryCard({ title, description, badge, metric, icon, sticker, orbit, spark, trail, highlights = [], theme = "dark", tone = "accent" }: ExerciseCategoryCardProps) {
  const sceneTone = {
    accent: "linear-gradient(135deg, rgba(168,85,247,0.24), rgba(99,102,241,0.08))",
    orange: "linear-gradient(135deg, rgba(249,115,22,0.24), rgba(251,191,36,0.08))",
    blue: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(37,99,235,0.08))",
    green: "linear-gradient(135deg, rgba(16,185,129,0.24), rgba(132,204,22,0.08))",
    rose: "linear-gradient(135deg, rgba(244,63,94,0.24), rgba(236,72,153,0.08))",
  }[tone];

  const cinematicSurface =
    theme === "dark"
      ? "border-white/8 bg-[linear-gradient(180deg,rgba(9,15,27,0.96),rgba(15,23,42,0.88))] shadow-[0_26px_70px_rgba(2,6,23,0.52)]"
      : "border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.76))] shadow-[0_20px_50px_rgba(15,23,42,0.08)]";

  return (
    <GlassCard className={`group relative overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_var(--idil-shadow)] ${cinematicSurface}`}>
      <div className={`absolute inset-x-0 top-0 h-full bg-gradient-to-br ${TONE_CLASS[tone]} opacity-100`} />
      {theme === "dark" ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_24%)]" /> : null}
      <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/6 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] px-3 py-1 text-[11px] font-semibold tracking-[0.01em] text-[var(--idil-muted)]">
            {badge}
          </span>
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[26px] border border-white/10 bg-white/6 p-2 backdrop-blur-xl" style={{ backgroundImage: sceneTone }}>
            <span className="absolute left-2 top-2 h-8 w-8 rounded-full bg-white/14 blur-sm" />
            {trail ? (
              <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                {trail}
              </span>
            ) : null}
            <span className="absolute bottom-2 left-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/14 text-xl shadow-[0_14px_30px_rgba(15,23,42,0.18)] idil-float">
              {sticker}
            </span>
            {orbit ? (
              <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/12 text-sm text-white/85 idil-drift">
                {orbit}
              </span>
            ) : null}
            {spark ? (
              <span className="absolute bottom-3 right-14 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/10 bg-white/12 px-1.5 text-[11px] font-semibold text-white/90">
                {spark}
              </span>
            ) : null}
            <span className="absolute bottom-2 right-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>
              {icon}
            </span>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--idil-accent)" }} />
          <span className="text-xs font-semibold tracking-[0.01em] text-[var(--idil-muted)]">{metric}</span>
        </div>

        <h3 className="mt-3 text-xl font-semibold leading-6 tracking-[-0.03em] text-[var(--idil-text)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--idil-muted)]">{description}</p>

        {highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.slice(0, 2).map((highlight) => (
              <span key={highlight} className="rounded-full border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-2.5 py-1 text-[11px] font-semibold text-[var(--idil-muted)]">
                {highlight}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--idil-border)] bg-[var(--idil-soft-block)] px-3 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--idil-text)]">{description.split(" ").slice(0, 2).join(" ")}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--idil-muted)]">Kişisel öneri akışı</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--idil-accent),var(--idil-accent-strong))" }}>
            Başlat
          </span>
        </div>
      </div>
    </GlassCard>
  );
}