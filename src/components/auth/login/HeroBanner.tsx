import type { CSSProperties } from "react";
import type { LoginTheme } from "./LoginThemeEngine";

export function HeroBanner({ theme }: { theme: LoginTheme }) {
  return (
    <section className={`login-hero login-hero--${theme.art}`} style={{ "--hero-palette": theme.palette, "--hero-accent": theme.accent } as CSSProperties} aria-label={theme.title}>
      <div className="login-hero__glow" aria-hidden="true" />
      <div className="login-hero__stars" aria-hidden="true">✦　·　✧　　　·　✦　　✧</div>
      <div className="login-hero__art" aria-hidden="true">
        <span className="login-hero__orb" />
        <span className="login-hero__book">▱</span>
        <span className="login-hero__spark">✦</span>
        <span className="login-hero__cloud">☁</span>
        <span className="login-hero__figure">◒</span>
      </div>
      <div className="login-hero__overlay" aria-hidden="true" />
      <div className="login-hero__copy">
        <p className="login-hero__eyebrow">İDİL HIZLI OKUMA · {theme.eyebrow}</p>
        <h1>{theme.title}</h1>
        <p className="login-hero__quote">{theme.quote}</p>
      </div>
      <div className="login-hero__theme" aria-hidden="true"><span /> {theme.id === "space" ? "01" : theme.id === "library" ? "02" : theme.id === "nature" ? "03" : theme.id === "arena" ? "04" : theme.id === "clouds" ? "05" : "06"}</div>
    </section>
  );
}
