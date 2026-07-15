"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ExerciseSettingsPanelProps = { open: boolean; children: ReactNode; onClose: () => void };

export function ExerciseSettingsPanel({ open, children, onClose }: ExerciseSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, select, input, [tabindex]:not([tabindex='-1'])")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("button, select, input, textarea, [tabindex]:not([tabindex='-1'])")].filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="exercise-stage__settings absolute inset-0 z-40 flex items-end justify-end bg-slate-950/35 md:items-stretch" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} id="exercise-settings-panel" role="dialog" aria-modal="true" aria-label="Egzersiz ayarları" className="flex max-h-[85%] w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:max-h-none md:w-[min(24rem,90vw)] md:rounded-none md:rounded-l-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-black text-slate-950">Ayarlar</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 font-bold text-red-700 hover:bg-red-50" aria-label="Ayarları kapat">Kapat</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}

