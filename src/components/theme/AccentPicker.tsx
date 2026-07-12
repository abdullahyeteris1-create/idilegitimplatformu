"use client";

import { useIdilTheme, type IdilAccent } from "@/components/theme/IdilThemeProvider";

const ACCENT_OPTIONS: { value: IdilAccent; label: string; previewClassName: string }[] = [
  { value: "red", label: "Kırmızı", previewClassName: "from-red-500 to-orange-400" },
  { value: "orange", label: "Turuncu", previewClassName: "from-orange-500 to-amber-400" },
  { value: "purple", label: "Mor", previewClassName: "from-fuchsia-500 to-violet-500" },
  { value: "blue", label: "Mavi", previewClassName: "from-sky-500 to-blue-500" },
  { value: "green", label: "Yeşil", previewClassName: "from-emerald-500 to-lime-500" },
];

export function AccentPicker() {
  const { accent, setAccent } = useIdilTheme();

  return (
    <div className="rounded-[24px] border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-3 shadow-[0_16px_40px_var(--idil-shadow)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Renk Teması</p>
          <p className="mt-1 text-sm font-semibold text-[var(--idil-text)]">Panel vurgusunu değiştir</p>
        </div>
        <span className="rounded-full border border-[var(--idil-border)] bg-[var(--idil-surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--idil-text)]">
          {ACCENT_OPTIONS.find((option) => option.value === accent)?.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ACCENT_OPTIONS.map((option) => {
          const isActive = option.value === accent;

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={isActive}
              onClick={() => setAccent(option.value)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition duration-200 ${
                isActive
                  ? "border-[var(--idil-accent-strong)] bg-[var(--idil-surface-soft)] shadow-[0_12px_24px_var(--idil-shadow)]"
                  : "border-[var(--idil-border)] bg-[var(--idil-surface)] hover:-translate-y-0.5"
              }`}
              title={option.label}
            >
              <span className={`h-6 w-6 rounded-full bg-gradient-to-br ${option.previewClassName}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}