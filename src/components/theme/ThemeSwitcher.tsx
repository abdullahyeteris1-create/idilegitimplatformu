"use client";

import { useIdilTheme, type IdilTheme } from "@/components/theme/IdilThemeProvider";

const THEME_OPTIONS: { value: IdilTheme; label: string; icon: string }[] = [
  { value: "light", label: "Açık", icon: "Güneş" },
  { value: "dark", label: "Koyu", icon: "Gece" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useIdilTheme();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--idil-border)] bg-[var(--idil-surface-strong)] p-1 shadow-[0_12px_32px_var(--idil-shadow)] backdrop-blur-xl">
      <span className="pl-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--idil-muted)]">Tema</span>
      <div className="grid grid-cols-2 gap-1">
        {THEME_OPTIONS.map((option) => {
          const isActive = option.value === theme;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition duration-200 ${
                isActive
                  ? "bg-[var(--idil-strong)] text-[var(--idil-strong-contrast)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-[var(--idil-text)] hover:bg-[var(--idil-surface-soft)]"
              }`}
              aria-pressed={isActive}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-xs opacity-75">{option.icon === "Güneş" ? "☼" : "◐"}</span>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}