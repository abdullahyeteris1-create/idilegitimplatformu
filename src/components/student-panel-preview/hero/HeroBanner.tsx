"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../icons";
import type { ResumeTarget } from "../StudentPanelPreview";
import styles from "../student-panel-preview.module.css";
import { useHeroThemeContext, type HeroThemeController } from "./HeroThemeEngine";
import { HeroScene } from "./heroScenes";
import { HERO_THEMES, type HeroTheme } from "./heroThemes";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Günaydın" : hour < 18 ? "Tünaydın" : "İyi akşamlar";
}

function HeroGreeting({ studentName }: { studentName: string }) {
  return <><div className={styles.heroEyebrow}><span className={styles.heroStatusDot} /> Kişisel çalışma alanın</div><h2>{greeting()}, {studentName}! <span>👋</span></h2></>;
}

const PARTICLE_SYMBOLS: Record<string, string[]> = {
  leaves: ["❧", "·", "❦"],
  confetti: ["✦", "◆", "•"],
  pages: ["▱", "·", "✧"],
  birds: ["⌁", "·", "⌁"],
  bubbles: ["○", "∘", "◦"],
  sparks: ["✧", "◇", "·"],
  waves: ["〜", "✦", "〰"],
  flags: ["⚑", "·", "✦"],
  comets: ["☄", "·", "✦"],
  petals: ["✿", "·", "❀"],
};

function HeroParticles({ type }: { type: string }) {
  const symbols = PARTICLE_SYMBOLS[type] ?? ["✦", "·", "✧"];
  return <div className={`${styles.heroParticles} ${styles[`particles${type}`] ?? ""}`} aria-hidden="true">{symbols.map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>)}</div>;
}

function HeroIllustration({ theme }: { theme: HeroTheme }) {
  return <div className={`${styles.spaceScene} ${styles[theme.backgroundClass]}`} aria-hidden="true">
    <span className={styles.heroGlow} />
    <div className={styles.heroSceneStage}><HeroScene scene={theme.scene} /></div>
    <HeroParticles type={theme.particles} />
  </div>;
}

function HeroFloatingCards({ label, theme }: { label: string; theme: HeroTheme }) {
  return <div className={styles.heroAside}><div className={styles.heroFloatCard}><span>Bugünkü hedef</span><strong>{label}</strong><small>Programına göz at ve başla</small></div><div className={`${styles.heroFloatCard} ${styles.heroFloatCardBottom}`}><span>Bugünün teması</span><strong>{theme.emoji} {theme.shortTitle}</strong><small>{theme.subtitle}</small></div></div>;
}

function HeroActions({ resumeAction }: { resumeAction: ReactNode }) {
  return <div className={styles.heroActions}><Link href="/ogrenci" data-hero-primary>Bugünkü Programı Başlat <Icon name="arrow" /></Link>{resumeAction}</div>;
}

function HeroThemePicker({ controller }: { controller: HeroThemeController }) {
  const { theme, mode, selectTheme, shuffleTheme } = controller;

  return (
    <div className={styles.heroThemePicker}>
      <span className={styles.heroThemePickerLabel} id="hero-theme-picker-label">🎨 Banner temanı seç</span>
      <div className={styles.heroThemeChips} role="radiogroup" aria-labelledby="hero-theme-picker-label">
        {HERO_THEMES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === "fixed" && option.id === theme.id}
            className={styles.heroThemeChip}
            data-active={option.id === theme.id ? "true" : undefined}
            style={{ "--chip-accent": option.accentColor } as React.CSSProperties}
            onClick={() => selectTheme(option.id)}
            title={option.title}
          >
            <span aria-hidden="true">{option.emoji}</span>
            {option.shortTitle}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.heroThemeChip} ${styles.heroThemeShuffle}`}
          data-active={mode === "auto" ? "true" : undefined}
          onClick={shuffleTheme}
          title="Rastgele bir tema seç ve her girişte değişsin"
        >
          <span aria-hidden="true">🎲</span>
          Sürpriz
        </button>
      </div>
    </div>
  );
}

export function HeroBanner({ studentName, resumeTarget, resumeContent, resumeAction }: { studentName: string; resumeTarget: ResumeTarget; resumeContent: ReactNode; resumeAction: ReactNode }) {
  const controller = useHeroThemeContext();
  const { theme, ready } = controller;
  const resumeLabel = resumeTarget.status === "assignment" ? "Devam etmeye hazır" : resumeTarget.status === "result" ? "Son çalışman hazır" : "Yeni hedef seç";

  return <section className={`${styles.hero} ${styles[theme.backgroundClass]}`} style={{ "--hero-accent": theme.accentColor } as React.CSSProperties} data-hero-theme={theme.id} data-hero-ready={ready ? "true" : undefined}>
    <div className={styles.heroCopy}><HeroGreeting studentName={studentName} /><p className={styles.heroLead}>Bugün hedeflerine ulaşmaya hazır mısın?</p><p key={theme.id} className={styles.heroMotivation}>{theme.motivationText}</p><div className={styles.tags}><span className={styles.tagFocus}>● Odak</span><span className={styles.tagSpeed}>● Hız</span><span className={styles.tagComprehension}>● Anlama</span><span className={styles.tagFluency}>● Akıcılık</span></div><div className={styles.resumePanel} data-resume-state={resumeTarget.status}>{resumeContent}</div><HeroActions resumeAction={resumeAction} /><HeroThemePicker controller={controller} /></div>
    <HeroFloatingCards label={resumeLabel} theme={theme} /><HeroIllustration key={theme.id} theme={theme} />
  </section>;
}
