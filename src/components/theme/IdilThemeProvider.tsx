"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

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

  useLayoutEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(IDIL_THEME_STORAGE_KEY);
      const storedAccent = window.localStorage.getItem(IDIL_ACCENT_STORAGE_KEY);

      if (isTheme(storedTheme)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage before first paint; localStorage isn't readable during render/SSR.
        setTheme(storedTheme);
      }

      if (isAccent(storedAccent)) {
        setAccent(storedAccent);
      }
    } catch {
      // localStorage may be unavailable (privacy mode, blocked storage); keep defaults.
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem(IDIL_THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-idil-theme", theme);
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem(IDIL_ACCENT_STORAGE_KEY, accent);
    document.documentElement.setAttribute("data-idil-accent", accent);
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
      <div
        suppressHydrationWarning
        data-idil-theme={mounted ? theme : undefined}
        data-idil-accent={mounted ? accent : undefined}
        className={className}
      >
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