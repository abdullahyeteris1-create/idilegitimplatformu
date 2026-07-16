"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories, navItems, stats, type Category, type NavItem } from "./data";
import { Icon } from "./icons";
import styles from "./student-panel-preview.module.css";

type DemoPanel = "menu" | "notifications" | "profile" | null;

function Progress({ value, label }: { value: number; label: string }) {
  return <div className={styles.progress} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ "--progress": `${value}%` } as React.CSSProperties} /></div>;
}

function Brand() {
  return <div className={styles.brand}><span className={styles.brandMark}><Icon name="rocket" /></span><span><strong>İDİL</strong><small>HIZLI OKUMA</small></span></div>;
}

function NavAction({ item, active = false, onDemo, onNavigate }: { item: NavItem; active?: boolean; onDemo: (message: string) => void; onNavigate?: () => void }) {
  const content = <><Icon name={item.icon}/><span>{item.label}</span></>;
  const className = active ? styles.activeNav : undefined;

  if (item.href) {
    return <Link href={item.href} className={className} onClick={onNavigate}>{content}</Link>;
  }

  return <button type="button" className={className} onClick={() => { onDemo("Bu özellik önizleme aşamasında."); onNavigate?.(); }}>{content}</button>;
}

function Sidebar({ onDemo }: { onDemo: (message: string) => void }) {
  return <aside className={styles.sidebar}><Brand/><nav aria-label="Ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo}/>)}</nav><LevelCard compact/><div className={styles.streakCard}><span>🔥</span><div><small>Seri</small><strong>7 gün</strong><p>Harika gidiyorsun!</p></div></div><button type="button" className={styles.support} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="help"/> Yardım &amp; Destek</button></aside>;
}

function LevelCard({ compact = false }: { compact?: boolean }) {
  return <section className={`${styles.levelCard} ${compact ? styles.levelCompact : ""}`} aria-label="Seviye ilerlemesi"><div className={styles.levelTop}><div><strong>Seviye 12</strong><span>Galaksi Kaşifi</span></div><div className={styles.hexBadge}>★</div></div><div className={styles.xp}><b>XP</b><strong>1.280 <span>/ 2.000</span></strong></div><Progress value={64} label="Seviye ilerlemesi yüzde 64"/>{!compact && <div className={styles.levelFoot}><span>Bir sonraki seviye için</span><strong>720 XP kaldı</strong></div>}</section>;
}

function Header({ onToggleTheme, light, panel, onTogglePanel }: { onToggleTheme: () => void; light: boolean; panel: DemoPanel; onTogglePanel: (panel: Exclude<DemoPanel, null>) => void }) {
  return <header className={styles.header}><div><h1>Öğrenci Paneli <span>🚀</span></h1><p>Okuma yolculuğunda bugün yeni bir seviyeye çık!</p></div><div className={styles.headerActions}><button type="button" className={styles.themeButton} onClick={onToggleTheme} aria-label={`${light ? "Koyu" : "Açık"} temaya geç`}><small>Tema</small><Icon name={light ? "moon" : "sparkles"}/></button><button type="button" className={styles.iconButton} aria-label="Bildirimleri aç" aria-expanded={panel === "notifications"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("notifications")}><Icon name="bell"/><span>3</span></button><button type="button" className={styles.profile} aria-label="Profil menüsünü aç" aria-expanded={panel === "profile"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("profile")}><span>👨‍🚀</span><div><strong>Demo Öğrenci</strong><small>5. Sınıf</small></div><Icon name="arrow"/></button></div></header>;
}

function SpaceScene() {
  return <div className={styles.spaceScene} aria-hidden="true"><span className={styles.planet}>◉</span><span className={styles.starOne}>✦</span><span className={styles.starTwo}>✧</span><div className={styles.rocket}><Icon name="rocket"/></div><div className={styles.rocketTrail}/></div>;
}

function Hero({ onDemo }: { onDemo: (message: string) => void }) {
  return <section className={styles.hero}><div className={styles.heroCopy}><h2>Hoş geldin, Demo Öğrenci! <span>👋</span></h2><p>Bugün odaklan, öğren, gelişimini bir üst seviyeye taşı.</p><div className={styles.tags}><span>◉ Odak</span><span>✦ Hız</span><span>♢ Anlama</span><span>⊙ Akıcılık</span></div><div className={styles.heroActions}><Link href="/ogrenci">Bugünkü Görevine Başla <Icon name="arrow"/></Link><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}>Kaldığın Yerden Devam Et <Icon name="arrow"/></button></div></div><SpaceScene/></section>;
}

function StatCard({ stat, index }: { stat: typeof stats[number]; index: number }) {
  return <article className={`${styles.statCard} ${styles[stat.tone]}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div><Icon name={stat.icon}/>{stat.icon === "activity" && <div className={styles.sparkline}>⌁⌁⌁</div>}</article>;
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return <article className={`${styles.categoryCard} ${styles[category.tone]}`} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}><div className={styles.categoryHead}><div><h3>{category.title}</h3><p>{category.count} çalışma</p></div><span className={styles.categoryIcon}><Icon name={category.icon}/></span></div><div className={styles.percent}>%{category.progress}</div><Progress value={category.progress} label={`${category.title} tamamlanma oranı yüzde ${category.progress}`}/><Link href={category.href}>Devam Et <Icon name="arrow"/></Link></article>;
}

function DailyTask() {
  return <section className={`${styles.sideCard} ${styles.dailyCard}`}><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p>Odaklanma Çalışması</p><small>15 dakika</small><strong>%60</strong><Progress value={60} label="Bugünkü görev yüzde 60 tamamlandı"/><div className={styles.astronaut}>👨‍🚀</div><Link href="/egzersizler/cift-tarafli-odak">Devam Et <Icon name="arrow"/></Link></section>;
}

function ReadingTest() {
  return <section className={styles.sideCard}><span className={styles.cornerSpark}>✦</span><h2>Son Okuma Testim</h2><div className={styles.testBody}><div className={styles.scoreRing}><strong>293</strong><span>kelime/dk</span></div><div><p>Anlama <b>%100</b></p><small>16 Tem 2026</small></div></div><Link href="/sonuc" className={styles.subtleButton}>Sonuçları Gör <Icon name="bookOpen"/></Link></section>;
}

function Badges({ onDemo }: { onDemo: (message: string) => void }) {
  return <section className={styles.sideCard}><div className={styles.cardTitle}><h2>Rozetlerim</h2><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}>Tümünü Gör</button></div><div className={styles.badges}><span>🚀</span><span>⭐</span><span>🪐</span><span>📖</span><span>+12</span></div></section>;
}

const mobileItems: NavItem[] = [
  { icon: "home", label: "Panel", href: "/ogrenci-paneli-onizleme" },
  { icon: "rocket", label: "Egzersizler", href: "/egzersizler" },
  { icon: "badge", label: "Rozetler" },
  { icon: "chart", label: "Sonuçlar", href: "/sonuc" },
];

function MobileNav({ onDemo, onProfile }: { onDemo: (message: string) => void; onProfile: () => void }) {
  return <nav className={styles.mobileNav} aria-label="Mobil menü">{mobileItems.map((item, index) => item.href ? <Link href={item.href} key={item.label} className={index === 0 ? styles.mobileActive : undefined} aria-label={item.label}><Icon name={item.icon}/></Link> : <button type="button" key={item.label} aria-label={item.label} onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name={item.icon}/></button>)}<button type="button" aria-label="Profil" onClick={onProfile}><Icon name="user"/></button></nav>;
}

function MobileMenu({ onDemo, onClose }: { onDemo: (message: string) => void; onClose: () => void }) {
  return <nav className={styles.mobileMenuPanel} aria-label="Mobil ana menü">{navItems.map((item, index) => <NavAction key={item.label} item={item} active={index === 0} onDemo={onDemo} onNavigate={onClose}/>)}</nav>;
}

function DemoPopover({ panel, onDemo, onClose }: { panel: Exclude<DemoPanel, "menu" | null>; onDemo: (message: string) => void; onClose: () => void }) {
  return <section id="preview-demo-panel" className={styles.demoPopover} role="dialog" aria-modal="true" aria-label={panel === "notifications" ? "Bildirimler" : "Profil menüsü"}><div className={styles.popoverTitle}><div><small>ÖNİZLEME</small><h2>{panel === "notifications" ? "Bildirimler" : "Demo Öğrenci"}</h2></div><button type="button" onClick={onClose} aria-label="Paneli kapat">×</button></div>{panel === "notifications" ? <div className={styles.notificationList}><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>🚀</span><div><strong>Günlük görevin hazır</strong><small>15 dakikalık odak çalışması</small></div></button><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>⭐</span><div><strong>Yeni rozet kazandın</strong><small>7 günlük seriyi tamamladın</small></div></button></div> : <div className={styles.profileMenu}><div className={styles.profileSummary}><span>👨‍🚀</span><div><strong>Demo Öğrenci</strong><small>5. Sınıf · Seviye 12</small></div></div><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="user"/> Profili Gör</button><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="settings"/> Ayarlar</button></div>}</section>;
}

export function StudentPanelPreview() {
  const [light, setLight] = useState(false);
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<DemoPanel>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const togglePanel = (nextPanel: Exclude<DemoPanel, null>) => setPanel((current) => current === nextPanel ? null : nextPanel);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  return <main className={`${styles.preview} ${light ? styles.light : ""}`}><div className={styles.shell}><Sidebar onDemo={showToast}/><div className={styles.content}><div className={styles.mobileHeader}><Brand/><button type="button" aria-label="Menüyü aç" aria-expanded={panel === "menu"} onClick={() => togglePanel("menu")}><Icon name="menu"/></button><button type="button" aria-label="Bildirimler" aria-expanded={panel === "notifications"} onClick={() => togglePanel("notifications")}><Icon name="bell"/></button></div><Header light={light} panel={panel} onToggleTheme={() => setLight((value) => !value)} onTogglePanel={togglePanel}/><div className={styles.heroGrid}><Hero onDemo={showToast}/><LevelCard/></div><div className={styles.dashboardGrid}><div className={styles.mainColumn}><section className={styles.statsGrid} aria-label="İstatistikler">{stats.map((stat,index) => <StatCard key={stat.label} stat={stat} index={index}/>)}</section><section className={styles.categoriesSection}><div className={styles.sectionTitle}><div><h2>🚀 Egzersiz Kategorileri</h2><p>Göz, dikkat, okuma ve hafıza becerilerini geliştir.</p></div><Link href="/egzersizler">Tüm Egzersizler <Icon name="arrow"/></Link></div><div className={styles.categoryGrid}>{categories.map((category,index) => <CategoryCard key={category.title} category={category} index={index}/>)}</div></section></div><aside className={styles.rightColumn}><DailyTask/><ReadingTest/><Badges onDemo={showToast}/><section className={styles.motivation}><div><strong>Unutma!</strong><p>Her gün küçük adımlar,<br/>büyük gelişimler getirir.</p></div><span>🪐</span></section></aside></div></div></div><MobileNav onDemo={showToast} onProfile={() => togglePanel("profile")}/>{panel && <><button type="button" className={styles.panelBackdrop} aria-label="Açık paneli kapat" onClick={() => setPanel(null)}/>{panel === "menu" ? <MobileMenu onDemo={showToast} onClose={() => setPanel(null)}/> : <DemoPopover panel={panel} onDemo={showToast} onClose={() => setPanel(null)}/>}</>}{toast && <div className={styles.toast} role="status" aria-live="polite">{toast}</div>}</main>;
}
