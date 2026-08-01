"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "../student-panel-preview.module.css";
import { HERO_THEMES, type HeroTheme } from "./heroThemes";

const THEME_STORAGE_KEY = "idil-student-hero-theme-v1";

/** "auto" her ziyarette temayı değiştirir; "fixed" öğrencinin seçtiği temada kalır. */
export type HeroThemeMode = "auto" | "fixed";

type StoredHeroTheme = { mode?: string; id?: string; date?: string; index?: number };

export type HeroThemeController = {
  theme: HeroTheme;
  mode: HeroThemeMode;
  /** Kayıtlı tercih okunana kadar false kalır; ilk boyamada geçiş animasyonunu bastırır. */
  ready: boolean;
  selectTheme: (themeId: string) => void;
  shuffleTheme: () => void;
  enableAutoTheme: () => void;
};

function dateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function randomIndexExcept(previousIndex: number): number {
  if (HERO_THEMES.length < 2) return 0;
  const next = Math.floor(Math.random() * HERO_THEMES.length);
  return next === previousIndex ? (next + 1) % HERO_THEMES.length : next;
}

function readStoredTheme(): StoredHeroTheme | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null") as StoredHeroTheme | null;
    return stored && typeof stored === "object" ? stored : null;
  } catch {
    // Depolama kapalıysa varsayılan tema kullanılabilir kalır.
    return null;
  }
}

function writeStoredTheme(value: StoredHeroTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Gizli sekme/depolama kapalı ortamlarda tema yine de görüntülenir.
  }
}

export function useHeroThemeController(): HeroThemeController {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<HeroThemeMode>("auto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    const storedIndex = typeof stored?.index === "number" ? stored.index : -1;
    const fixedIndex = stored?.mode === "fixed" && typeof stored.id === "string"
      ? HERO_THEMES.findIndex((theme) => theme.id === stored.id)
      : -1;

    // Kayıtlı tercihi bir sonraki karede uygulamak, effect içinde zincirleme
    // render tetiklemeden hidrasyon sonrası temaya geçmemizi sağlar.
    if (fixedIndex >= 0) {
      const fixedFrame = window.requestAnimationFrame(() => {
        setMode("fixed");
        setIndex(fixedIndex);
        setReady(true);
      });

      return () => window.cancelAnimationFrame(fixedFrame);
    }

    const nextIndex = randomIndexExcept(storedIndex);
    writeStoredTheme({ mode: "auto", date: dateKey(), index: nextIndex });
    const frame = window.requestAnimationFrame(() => {
      setIndex(nextIndex);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectTheme = useCallback((themeId: string) => {
    const nextIndex = HERO_THEMES.findIndex((theme) => theme.id === themeId);
    if (nextIndex < 0) return;
    setMode("fixed");
    setIndex(nextIndex);
    writeStoredTheme({ mode: "fixed", id: themeId, date: dateKey(), index: nextIndex });
  }, []);

  const shuffleTheme = useCallback(() => {
    setIndex((currentIndex) => {
      const nextIndex = randomIndexExcept(currentIndex);
      writeStoredTheme({ mode: "auto", date: dateKey(), index: nextIndex });
      return nextIndex;
    });
    setMode("auto");
  }, []);

  const enableAutoTheme = useCallback(() => {
    setMode("auto");
    writeStoredTheme({ mode: "auto", date: dateKey(), index });
  }, [index]);

  return useMemo(
    () => ({ theme: HERO_THEMES[index] ?? HERO_THEMES[0], mode, ready, selectTheme, shuffleTheme, enableAutoTheme }),
    [enableAutoTheme, index, mode, ready, selectTheme, shuffleTheme],
  );
}

const HeroThemeContext = createContext<HeroThemeController | null>(null);

/**
 * Seçili banner temasını tüm öğrenci paneline yayar. Sarmalayıcı `display:contents`
 * ile çizilir; yalnızca `--hero-accent` değişkenini ve tema kimliğini aktarır,
 * mevcut grid/flex yerleşimlerine dokunmaz.
 */
export function HeroThemeProvider({ children }: { children: ReactNode }) {
  const controller = useHeroThemeController();

  return (
    <HeroThemeContext.Provider value={controller}>
      <div
        className={styles.heroThemeScope}
        data-hero-theme={controller.theme.id}
        data-hero-ready={controller.ready ? "true" : undefined}
        style={{ "--hero-accent": controller.theme.accentColor } as React.CSSProperties}
      >
        {children}
      </div>
    </HeroThemeContext.Provider>
  );
}

export function useHeroThemeContext(): HeroThemeController {
  const controller = useContext(HeroThemeContext);
  if (!controller) throw new Error("useHeroThemeContext, HeroThemeProvider içinde çağrılmalıdır.");
  return controller;
}
