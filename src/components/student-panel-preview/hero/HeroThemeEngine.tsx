"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useIdilTheme, type IdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "../student-panel-preview.module.css";
import { HERO_THEMES, type HeroTheme } from "./heroThemes";

const THEME_STORAGE_KEY = "idil-student-hero-theme-v1";

/** Panelin açık/koyu ekseni; renk temasından (`HeroTheme`) tamamen bağımsızdır. */
export type AppearanceMode = IdilTheme;

/**
 * Tüm `--dashboard-*` değişkenlerini tek yerde üretir. Yüzey tonları YALNIZCA
 * `appearance`'tan, renkler YALNIZCA aktif temanın vurgu renginden gelir; böylece
 * tema değiştirmek açık/koyu modu bozamaz (ve tersi).
 */
function getDashboardThemeStyle(theme: HeroTheme, appearance: AppearanceMode): CSSProperties {
  const accent = theme.accentColor;
  const surfaceLight = appearance === "light";
  // Hero banner her temada koyu örtülü bir fotoğrafın üzerinde durur; bu yüzden
  // hero ve tema seçici tonu açık/koyu moda değil, bannerın kendi örtüsüne bağlıdır.
  const heroLight = theme.heroTone === "light";
  const toneText = (light: boolean) => light ? "#172033" : "#f8fbff";
  const toneMuted = (light: boolean) => light ? "#647089" : "#b8c4d6";
  const pageBg = surfaceLight ? "#eef3ff" : "#050b18";
  const pageGradient = surfaceLight
    ? `linear-gradient(180deg, color-mix(in srgb, ${accent} 18%, #eef3ff) 0%, #eef3ff 52%, #e8eef8 100%)`
    : `linear-gradient(180deg, color-mix(in srgb, ${accent} 20%, #071226) 0%, #071226 48%, #050b18 100%)`;

  return {
    "--dashboard-page-bg": pageBg,
    "--dashboard-page-gradient": pageGradient,
    "--dashboard-surface-primary": surfaceLight ? "rgba(255,255,255,.9)" : "rgba(10,24,45,.82)",
    "--dashboard-surface-secondary": surfaceLight ? "rgba(255,255,255,.84)" : "rgba(13,28,52,.78)",
    "--dashboard-surface-quiet": surfaceLight ? "rgba(255,255,255,.76)" : "rgba(12,25,46,.7)",
    "--dashboard-surface-border": surfaceLight ? `color-mix(in srgb, ${accent} 28%, #cbd5e1)` : `color-mix(in srgb, ${accent} 34%, #293958)`,
    "--dashboard-text-primary": toneText(surfaceLight),
    "--dashboard-text-secondary": toneMuted(surfaceLight),
    "--dashboard-header-text": toneText(surfaceLight),
    "--dashboard-header-muted": toneMuted(surfaceLight),
    "--dashboard-sidebar-text": toneText(surfaceLight),
    "--dashboard-sidebar-muted": toneMuted(surfaceLight),
    "--dashboard-sidebar-icon": surfaceLight ? "#334155" : "#dbeafe",
    "--dashboard-sidebar-bg": surfaceLight ? "rgba(255,255,255,.9)" : "rgba(7,17,32,.96)",
    "--dashboard-header-bg": surfaceLight ? "rgba(255,255,255,.72)" : "rgba(5,13,28,.18)",
    "--dashboard-hero-text": toneText(heroLight),
    "--dashboard-hero-muted": toneMuted(heroLight),
    "--dashboard-card-text": toneText(surfaceLight),
    "--dashboard-card-muted": toneMuted(surfaceLight),
    "--dashboard-right-column-text": toneText(surfaceLight),
    "--dashboard-right-column-muted": toneMuted(surfaceLight),
    "--dashboard-button-text": heroLight ? "#172033" : "#ffffff",
    "--dashboard-card-button-text": surfaceLight ? "#172033" : "#ffffff",
    "--dashboard-accent": accent,
    "--dashboard-accent-soft": `color-mix(in srgb, ${accent} 18%, transparent)`,
    "--dashboard-card-shadow": surfaceLight ? "0 12px 28px rgba(15,23,42,.08)" : "0 12px 30px rgba(2,8,23,.34)",
    "--dashboard-card-glow": `0 0 30px color-mix(in srgb, ${accent} 16%, transparent)`,
    "--dashboard-chart-accent": accent,
    "--theme-switcher-bg": heroLight ? "rgba(255,255,255,.72)" : "rgba(7,16,32,.72)",
    "--theme-switcher-border": heroLight ? `color-mix(in srgb, ${accent} 40%, #cbd5e1)` : `color-mix(in srgb, ${accent} 42%, #ffffff)`,
    "--theme-switcher-text": toneText(heroLight),
    "--theme-switcher-active-bg": heroLight ? `color-mix(in srgb, ${accent} 22%, #ffffff)` : `color-mix(in srgb, ${accent} 48%, transparent)`,
    "--theme-switcher-active-text": heroLight ? "#172033" : "#ffffff",
    "--theme-switcher-hover-bg": heroLight ? `color-mix(in srgb, ${accent} 14%, #ffffff)` : "rgba(255,255,255,.16)",
  } as CSSProperties;
}

/** "auto" her ziyarette temayı değiştirir; "fixed" öğrencinin seçtiği temada kalır. */
export type HeroThemeMode = "auto" | "fixed";

type StoredHeroTheme = { mode?: string; id?: string; date?: string; index?: number };

export type HeroThemeController = {
  theme: HeroTheme;
  mode: HeroThemeMode;
  /** Açık/koyu ekseni — renk temasından bağımsız, `IdilThemeProvider` içinde saklanır. */
  appearanceMode: AppearanceMode;
  /** Kayıtlı tercih okunana kadar false kalır; ilk boyamada geçiş animasyonunu bastırır. */
  ready: boolean;
  selectTheme: (themeId: string) => void;
  shuffleTheme: () => void;
  enableAutoTheme: () => void;
  setAppearanceMode: (appearance: AppearanceMode) => void;
  toggleAppearanceMode: () => void;
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
  // Açık/koyu modun tek kaynağı: kalıcı global tema deposu. Panelde ikinci bir
  // kopya tutulmaz, böylece iki eksen birbirinden bağımsız ama senkron kalır.
  const { theme: appearanceMode, setTheme: setAppearanceMode } = useIdilTheme();

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

  const toggleAppearanceMode = useCallback(() => {
    setAppearanceMode(appearanceMode === "light" ? "dark" : "light");
  }, [appearanceMode, setAppearanceMode]);

  return useMemo(
    () => ({
      theme: HERO_THEMES[index] ?? HERO_THEMES[0],
      mode,
      appearanceMode,
      ready,
      selectTheme,
      shuffleTheme,
      enableAutoTheme,
      setAppearanceMode,
      toggleAppearanceMode,
    }),
    [appearanceMode, enableAutoTheme, index, mode, ready, selectTheme, setAppearanceMode, shuffleTheme, toggleAppearanceMode],
  );
}

const HeroThemeContext = createContext<HeroThemeController | null>(null);

/**
 * Panelin iki tema eksenini (renk teması + açık/koyu mod) tek bir kabukta birleştirir.
 * Bütün `--dashboard-*` değişkenleri burada, her iki eksen de hesaba katılarak
 * üretilir; alt bileşenler kendi başlarına ton kararı vermez.
 */
export function HeroThemeProvider({ children }: { children: ReactNode }) {
  const controller = useHeroThemeController();

  return (
    <HeroThemeContext.Provider value={controller}>
      <div
        className={`${styles.heroThemeScope} ${styles.dashboardThemeShell}`}
        data-hero-theme={controller.theme.id}
        data-appearance={controller.appearanceMode}
        data-hero-ready={controller.ready ? "true" : undefined}
        style={{
          "--hero-accent": controller.theme.accentColor,
          ...getDashboardThemeStyle(controller.theme, controller.appearanceMode),
        } as CSSProperties}
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
