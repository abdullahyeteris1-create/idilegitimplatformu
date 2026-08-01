"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../icons";
import type { ResumeTarget } from "../StudentPanelPreview";
import styles from "../student-panel-preview.module.css";
import { useHeroTheme } from "./HeroThemeEngine";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Günaydın" : hour < 18 ? "Tünaydın" : "İyi akşamlar";
}

function HeroGreeting({ studentName }: { studentName: string }) {
  return <><div className={styles.heroEyebrow}><span className={styles.heroStatusDot} /> Kişisel çalışma alanın</div><h2>{greeting()}, {studentName}! <span>👋</span></h2></>;
}

function HeroParticles({ type }: { type: string }) {
  const symbols = type === "leaves" ? ["❧", "·", "❦"] : type === "confetti" ? ["✦", "◆", "•"] : type === "pages" ? ["▱", "·", "✧"] : type === "birds" ? ["⌁", "·", "⌁"] : ["✦", "·", "✧"];
  return <div className={`${styles.heroParticles} ${styles[`particles${type}`]}`} aria-hidden="true">{symbols.map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>)}</div>;
}

function HeroIllustration({ theme }: { theme: ReturnType<typeof useHeroTheme> }) {
  return <div className={`${styles.spaceScene} ${styles[theme.backgroundClass]} ${styles[`illustration${theme.illustration}`]}`} aria-hidden="true">
    <span className={styles.heroGlow} /><span className={`${styles.cloud} ${styles.cloudOne}`} /><span className={`${styles.cloud} ${styles.cloudTwo}`} />
    <span className={`${styles.star} ${styles.starOne}`}>✦</span><span className={`${styles.star} ${styles.starTwo}`}>✧</span><span className={`${styles.star} ${styles.starThree}`}>·</span>
    <span className={styles.planet}>◉</span><span className={styles.book}>▱</span><span className={`${styles.book} ${styles.bookBack}`}>▱</span><span className={styles.pencil}>✎</span><span className={styles.xpCrystal}>◆</span><span className={styles.trophy}>♛</span>
    <div className={styles.readerIllustration}><span className={styles.readerHead} /><span className={styles.readerHair} /><span className={styles.readerBody} /><span className={styles.readerBook} /><span className={styles.robot}><i /><b /></span></div>
    <div className={styles.themeSpecificIllustration}><span className={styles.themeSun} /><span className={styles.themeOwl}>◉</span><span className={styles.themeMountain} /><span className={styles.themeBalloon}>○</span></div>
    <HeroParticles type={theme.particles} />
  </div>;
}

function HeroFloatingCards({ label }: { label: string }) {
  return <div className={styles.heroAside}><div className={styles.heroFloatCard}><span>Bugünkü hedef</span><strong>{label}</strong><small>Programına göz at ve başla</small></div><div className={`${styles.heroFloatCard} ${styles.heroFloatCardBottom}`}><span>İlerleme hissi</span><strong>Bir adım daha</strong><small>Ritmini koru, yükselmeye devam et</small></div></div>;
}

function HeroActions({ resumeAction }: { resumeAction: ReactNode }) {
  return <div className={styles.heroActions}><Link href="/ogrenci" data-hero-primary>Bugünkü Programı Başlat <Icon name="arrow" /></Link>{resumeAction}</div>;
}

export function HeroBanner({ studentName, resumeTarget, resumeContent, resumeAction }: { studentName: string; resumeTarget: ResumeTarget; resumeContent: ReactNode; resumeAction: ReactNode }) {
  const theme = useHeroTheme();
  const resumeLabel = resumeTarget.status === "assignment" ? "Devam etmeye hazır" : resumeTarget.status === "result" ? "Son çalışman hazır" : "Yeni hedef seç";
  return <section className={`${styles.hero} ${styles[theme.backgroundClass]}`} style={{ "--hero-accent": theme.accentColor } as React.CSSProperties} data-hero-theme={theme.id}>
    <div className={styles.heroCopy}><HeroGreeting studentName={studentName} /><p className={styles.heroLead}>Bugün hedeflerine ulaşmaya hazır mısın?</p><p className={styles.heroMotivation}>{theme.motivationText}</p><div className={styles.tags}><span className={styles.tagFocus}>● Odak</span><span className={styles.tagSpeed}>● Hız</span><span className={styles.tagComprehension}>● Anlama</span><span className={styles.tagFluency}>● Akıcılık</span></div><div className={styles.resumePanel} data-resume-state={resumeTarget.status}>{resumeContent}</div><HeroActions resumeAction={resumeAction} /></div>
    <HeroFloatingCards label={resumeLabel} /><HeroIllustration theme={theme} />
  </section>;
}
