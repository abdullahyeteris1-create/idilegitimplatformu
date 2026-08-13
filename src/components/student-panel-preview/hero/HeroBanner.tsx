"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../icons";
import type { ResumeTarget } from "../StudentPanelPreview";
import styles from "../student-panel-preview.module.css";
import { useHeroThemeContext, type HeroThemeController } from "./HeroThemeEngine";
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
  sparks: ["✧", "◇", "·"],
};

function HeroParticles({ type }: { type: string }) {
  const symbols = PARTICLE_SYMBOLS[type] ?? ["✦", "·", "✧"];
  return <div className={`${styles.heroParticles} ${styles[`particles${type}`] ?? ""}`} aria-hidden="true">{symbols.map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>)}</div>;
}

function HeroIllustration({ theme }: { theme: HeroTheme }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isImageTheme = theme.sceneType === "image" && Boolean(theme.imagePath) && !imageFailed;
  const imageStyle = {
    "--hero-image-position": theme.desktopPosition ?? "center center",
    "--hero-image-position-tablet": theme.tabletPosition ?? theme.desktopPosition ?? "center center",
    "--hero-image-position-mobile": theme.mobilePosition ?? theme.tabletPosition ?? theme.desktopPosition ?? "center center",
    "--hero-image-overlay": theme.overlay ?? "linear-gradient(90deg, rgba(8,12,32,.82), rgba(8,12,32,.2))",
  } as CSSProperties;

  return <div className={`${styles.spaceScene} ${styles[theme.backgroundClass]} ${isImageTheme ? styles.imageScene : ""}`} style={imageStyle} aria-hidden="true">
    <span className={styles.heroGlow} />
    {isImageTheme ? <>
      <Image className={`${styles.heroImage} ${theme.animationPreset === "slowZoom" ? styles.heroImageSlowZoom : styles.heroImageGentleFloat}`} src={theme.imagePath!} alt="" fill sizes="(max-width: 900px) 100vw, 48vw" priority onError={() => setImageFailed(true)} />
      <span className={styles.heroImageOverlay} />
    </> : <div className={styles.heroImageFallback} />}
    <HeroParticles type={theme.particles} />
  </div>;
}

export type HeroProgressSummary = {
  status: "loading" | "error" | "empty" | "ready";
  taskLabel: string;
  completedCount: number;
  totalCount: number;
  progress: number;
  xpWithinLevel: number;
  xpRequiredForLevel: number;
  totalXp: number;
};

function HeroFloatingCards({ summary }: { summary: HeroProgressSummary }) {
  const loading = summary.status === "loading" || summary.status === "error";
  const noTasks = summary.status === "ready" && summary.totalCount === 0;
  return <div className={styles.heroAside}><div className={styles.heroFloatCard}><span>Bugünkü görev</span><strong>{summary.status === "empty" || noTasks ? "Aktif program yok" : summary.taskLabel}</strong><small>{loading ? "Veri yükleniyor" : summary.status === "empty" || noTasks ? "Serbest çalışmalardan birini seç" : `${summary.completedCount} / ${summary.totalCount} tamamlandı · %${summary.progress}`}</small></div><div className={`${styles.heroFloatCard} ${styles.heroFloatCardBottom}`}><span>Seviye ilerlemesi</span><strong>{loading ? "—" : `${summary.xpWithinLevel} / ${summary.xpRequiredForLevel} XP`}</strong><small>{loading ? "XP bilgisi bekleniyor" : `${summary.totalXp.toLocaleString("tr-TR")} XP toplam`}</small></div></div>;
}

function HeroActions({ resumeAction }: { resumeAction: ReactNode }) {
  return <div className={styles.heroActions}>{resumeAction}<Link href="/ogrenci/egitim-programim?resume=1" data-hero-primary>Bugünkü Programı Başlat <Icon name="arrow" /></Link></div>;
}

function HeroThemePicker({ controller }: { controller: HeroThemeController }) {
  const { theme, mode, selectTheme, shuffleTheme } = controller;

  // Seçim (`mode`) ile o an gösterilen tema ayrı bilgilerdir: Sürpriz modunda
  // rastgele bir tema görünür ama seçili olan Sürpriz'dir. İki durum iki ayrı
  // işaretle gösterilir; aynı anda iki çip "seçili" görünmez.
  const renderThemeButtons = (options: HeroTheme[]) => options.map((option) => {
    const selected = mode === "fixed" && option.id === theme.id;
    const showing = mode === "auto" && option.id === theme.id;

    return (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={styles.heroThemeChip}
        data-active={selected ? "true" : undefined}
        data-current={showing ? "true" : undefined}
        style={{ "--chip-accent": option.accentColor } as CSSProperties}
        onClick={() => selectTheme(option.id)}
        title={showing ? `${option.title} (şu an gösteriliyor)` : option.title}
      >
        <span aria-hidden="true">{option.emoji}</span>
        {option.shortTitle}
        {showing ? <span className={styles.srOnly}> (şu an gösteriliyor)</span> : null}
      </button>
    );
  });
  const liveThemes = HERO_THEMES;

  return (
    <div className={styles.heroThemePicker}>
      <div className={styles.heroThemePickerBar} role="radiogroup" aria-label="Banner teması">
        {renderThemeButtons(liveThemes)}
        <button
          type="button"
          role="radio"
          aria-checked={mode === "auto"}
          className={`${styles.heroThemeChip} ${styles.heroThemeShuffle}`}
          data-active={mode === "auto" ? "true" : undefined}
          onClick={shuffleTheme}
          title="Rastgele bir tema seç ve her girişte değişsin"
        >
          <span aria-hidden="true">🎲</span>
          <span className={styles.themeSwitchName}>Sürpriz</span>
        </button>
      </div>
    </div>
  );
}

export function HeroBanner({ studentName, resumeTarget, resumeContent, resumeAction, progressSummary }: { studentName: string; resumeTarget: ResumeTarget; resumeContent: ReactNode; resumeAction: ReactNode; progressSummary: HeroProgressSummary }) {
  const controller = useHeroThemeContext();
  const { theme, ready } = controller;

  return <section className={`${styles.hero} ${styles[theme.backgroundClass]}`} style={{ "--hero-accent": theme.accentColor, color: theme.textColor } as CSSProperties} data-hero-theme={theme.id} data-hero-ready={ready ? "true" : undefined}>
    <div className={styles.heroCopy}><HeroGreeting studentName={studentName} /><p className={styles.heroLead}>Bugün hedeflerine ulaşmaya hazır mısın?</p><p key={theme.id} className={styles.heroMotivation}>{theme.motivationText}</p><div className={styles.tags}><span className={styles.tagFocus}>● Odak</span><span className={styles.tagSpeed}>● Hız</span><span className={styles.tagComprehension}>● Anlama</span><span className={styles.tagFluency}>● Akıcılık</span></div><div className={styles.resumePanel} data-resume-state={resumeTarget.status}>{resumeContent}</div><HeroActions resumeAction={resumeAction} /><HeroThemePicker controller={controller} /></div>
    <HeroFloatingCards summary={progressSummary} /><HeroIllustration key={theme.id} theme={theme} />
  </section>;
}
