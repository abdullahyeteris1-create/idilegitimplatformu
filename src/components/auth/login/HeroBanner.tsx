"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { LoginTheme } from "./LoginThemeEngine";

export function HeroBanner({ theme }: { theme: LoginTheme }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(theme.imagePath) && !imageFailed;
  const cardPosition = (position: LoginTheme["cardDesktopPosition"] = "center") => position === "center-left" ? "34%" : position === "center-right" ? "66%" : "50%";
  const heroStyle = {
    "--hero-palette": theme.palette,
    "--hero-accent": theme.accent,
    "--hero-image-position": theme.desktopPosition ?? "center center",
    "--hero-image-position-tablet": theme.tabletPosition ?? theme.desktopPosition ?? "center center",
    "--hero-image-position-mobile": theme.mobilePosition ?? theme.desktopPosition ?? "center center",
    "--hero-image-overlay": theme.overlay ?? "linear-gradient(90deg, rgba(4,8,20,.28), rgba(4,8,20,.1) 55%, rgba(4,8,20,.66)), linear-gradient(0deg, rgba(4,8,20,.5), transparent 45%)",
    "--card-left": cardPosition(theme.cardDesktopPosition),
    "--card-left-tablet": cardPosition(theme.cardTabletPosition ?? theme.cardDesktopPosition),
    "--card-left-mobile": cardPosition(theme.cardMobilePosition ?? "center"),
  } as CSSProperties;

  return (
    <section className={`login-hero login-hero--${theme.art}${hasImage ? " login-hero--has-image" : ""}`} style={heroStyle} aria-label={theme.title}>
      {theme.imagePath ? <Image className="login-hero__image" src={theme.imagePath} alt="" fill priority={Boolean(hasImage)} sizes="100vw" onError={(event) => { event.currentTarget.style.display = "none"; setImageFailed(true); }} aria-hidden="true" /> : null}
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
    </section>
  );
}
