"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type IdilTheme = "light" | "dark";
export type IdilAccent = "red" | "orange" | "purple" | "blue" | "green";

type IdilThemeContextValue = {
  theme: IdilTheme;
  accent: IdilAccent;
  mounted: boolean;
  setTheme: (theme: IdilTheme) => void;
  setAccent: (accent: IdilAccent) => void;
};

const IDIL_THEME_STORAGE_KEY = "idil-theme";
const IDIL_ACCENT_STORAGE_KEY = "idil-accent";

const IdilThemeContext = createContext<IdilThemeContextValue | null>(null);

function isTheme(value: string | null): value is IdilTheme {
  return value === "light" || value === "dark";
}

function isAccent(value: string | null): value is IdilAccent {
  return value === "red" || value === "orange" || value === "purple" || value === "blue" || value === "green";
}

type IdilThemeProviderProps = {
  children: ReactNode;
  className?: string;
};

export function IdilThemeProvider({ children, className = "" }: IdilThemeProviderProps) {
  const [theme, setTheme] = useState<IdilTheme>("dark");
  const [accent, setAccent] = useState<IdilAccent>("purple");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextTheme = window.localStorage.getItem(IDIL_THEME_STORAGE_KEY);
      const nextAccent = window.localStorage.getItem(IDIL_ACCENT_STORAGE_KEY);

      if (isTheme(nextTheme)) {
        setTheme(nextTheme);
      }

      if (isAccent(nextAccent)) {
        setAccent(nextAccent);
      }

      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem(IDIL_THEME_STORAGE_KEY, theme);
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem(IDIL_ACCENT_STORAGE_KEY, accent);
  }, [accent, mounted]);

  const value = useMemo<IdilThemeContextValue>(() => ({
    theme,
    accent,
    mounted,
    setTheme,
    setAccent,
  }), [accent, mounted, theme]);

  return (
    <IdilThemeContext.Provider value={value}>
      <div suppressHydrationWarning data-idil-theme={theme} data-idil-accent={accent} className={className}>
        {children}
      </div>
    </IdilThemeContext.Provider>
  );
}

export function useIdilTheme() {
  const context = useContext(IdilThemeContext);

  if (!context) {
    throw new Error("useIdilTheme must be used within IdilThemeProvider");
  }

  return context;
}