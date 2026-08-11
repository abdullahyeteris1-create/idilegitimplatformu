"use client";

import { formatRemainingTime } from "@/lib/exercises/timing";

export function EducationProgramCountdownBadge({
  remainingSeconds,
}: {
  remainingSeconds: number;
}) {
  const safeRemainingSeconds = Math.max(0, Math.floor(remainingSeconds));
  const warning = safeRemainingSeconds <= 60;
  const critical = safeRemainingSeconds <= 10;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Kalan süre ${formatRemainingTime(safeRemainingSeconds)}`}
      className={`fixed left-1/2 top-3 z-[9998] max-w-[calc(100vw-1rem)] -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-black tabular-nums shadow-lg sm:px-4 sm:text-sm ${
        critical
          ? "border-red-500 bg-red-600 text-white"
          : warning
            ? "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-300 dark:bg-amber-950 dark:text-amber-100"
            : "border-slate-700 bg-slate-900/95 text-white"
      }`}
    >
      <span className="mr-1.5 text-[10px] uppercase tracking-wider opacity-80">Kalan Süre</span>
      {formatRemainingTime(safeRemainingSeconds)}
    </div>
  );
}
