"use client";

import { useEffect, useState } from "react";
import { HERO_THEMES, type HeroTheme } from "./heroThemes";

const THEME_STORAGE_KEY = "idil-student-hero-theme-v1";

function dateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function chooseTheme(previousIndex: number): number {
  if (HERO_THEMES.length < 2) return 0;
  const next = Math.floor(Math.random() * HERO_THEMES.length);
  return next === previousIndex ? (next + 1) % HERO_THEMES.length : next;
}

export function useHeroTheme(): HeroTheme {
  const [theme, setTheme] = useState<HeroTheme>(HERO_THEMES[0]);

  useEffect(() => {
    const today = dateKey();
    let previousIndex = -1;
    let storedDate = "";

    try {
      const stored = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null") as { date?: string; index?: number } | null;
      storedDate = typeof stored?.date === "string" ? stored.date : "";
      previousIndex = typeof stored?.index === "number" ? stored.index : -1;
    } catch {
      // Local storage is optional; the default theme remains usable.
    }

    const nextIndex = storedDate === today && previousIndex >= 0
      ? chooseTheme(previousIndex)
      : chooseTheme(previousIndex);
    const nextTheme = HERO_THEMES[nextIndex] ?? HERO_THEMES[0];
    const frame = window.requestAnimationFrame(() => setTheme(nextTheme));

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ date: today, index: nextIndex }));
    } catch {
      // Private browsing/storage-disabled environments still render the theme.
    }

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return theme;
}
