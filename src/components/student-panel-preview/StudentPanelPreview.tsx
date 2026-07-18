"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCurrentStudent } from "@/lib/auth/auth";
import type { DailyAssignment, DailyAssignmentItem } from "@/lib/assignments/assignmentTypes";
import { categories, navItems, stats, type Category, type NavItem } from "./data";
import { Icon } from "./icons";
import styles from "./student-panel-preview.module.css";

type DemoPanel = "menu" | "notifications" | "profile" | null;
type PreviewStudentIdentity = { name: string; classLabel: string; studentId: string | null; resolved: boolean };
type DailyTaskState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; assignment: DailyAssignment };

const FALLBACK_STUDENT_IDENTITY: PreviewStudentIdentity = {
  name: "Öğrenci",
  classLabel: "Sınıf bilgisi yok",
  studentId: null,
  resolved: false,
};

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
  return <section className={`${styles.levelCard} ${compact ? styles.levelCompact : ""}`} aria-label="Seviye sistemi hazırlanıyor"><div className={styles.levelTop}><div><strong>Seviye sistemi hazırlanıyor</strong><span>Gelişim özellikleri yakında</span></div><div className={styles.hexBadge}>★</div></div><div className={styles.xp}><b>Gelişim</b><strong>Yakında</strong></div><Progress value={0} label="Seviye sistemi hazırlanıyor"/>{!compact && <div className={styles.levelFoot}><span>Puan ve seviye özelliği</span><strong>hazırlanıyor</strong></div>}</section>;
}

function Header({ onToggleTheme, light, panel, onTogglePanel, studentName, classLabel }: { onToggleTheme: () => void; light: boolean; panel: DemoPanel; onTogglePanel: (panel: Exclude<DemoPanel, null>) => void; studentName: string; classLabel: string }) {
  return <header className={styles.header}><div><h1>Öğrenci Paneli <span>🚀</span></h1><p>Okuma yolculuğunda bugün yeni bir seviyeye çık!</p></div><div className={styles.headerActions}><button type="button" className={styles.themeButton} onClick={onToggleTheme} aria-label={`${light ? "Koyu" : "Açık"} temaya geç`}><small>Tema</small><Icon name={light ? "moon" : "sparkles"}/></button><button type="button" className={styles.iconButton} aria-label="Bildirimleri aç" aria-expanded={panel === "notifications"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("notifications")}><Icon name="bell"/><span>3</span></button><button type="button" className={styles.profile} aria-label="Profil menüsünü aç" aria-expanded={panel === "profile"} aria-controls="preview-demo-panel" onClick={() => onTogglePanel("profile")}><span>👨‍🚀</span><div><strong>{studentName}</strong><small>{classLabel}</small></div><Icon name="arrow"/></button></div></header>;
}

function SpaceScene() {
  return <div className={styles.spaceScene} aria-hidden="true"><span className={styles.planet}>◉</span><span className={styles.starOne}>✦</span><span className={styles.starTwo}>✧</span><div className={styles.rocket}><Icon name="rocket"/></div><div className={styles.rocketTrail}/></div>;
}

function Hero({ onDemo, studentName }: { onDemo: (message: string) => void; studentName: string }) {
  return <section className={styles.hero}><div className={styles.heroCopy}><h2>Hoş geldin, {studentName}! <span>👋</span></h2><p>Bugün odaklan, öğren, gelişimini bir üst seviyeye taşı.</p><div className={styles.tags}><span>◉ Odak</span><span>✦ Hız</span><span>♢ Anlama</span><span>⊙ Akıcılık</span></div><div className={styles.heroActions}><Link href="/ogrenci">Bugünkü Görevine Başla <Icon name="arrow"/></Link><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}>Kaldığın Yerden Devam Et <Icon name="arrow"/></button></div></div><SpaceScene/></section>;
}

function StatCard({ stat, index }: { stat: typeof stats[number]; index: number }) {
  return <article className={`${styles.statCard} ${styles[stat.tone]}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div><Icon name={stat.icon}/>{stat.icon === "activity" && <div className={styles.sparkline}>⌁⌁⌁</div>}</article>;
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return (
    <article
      className={`${styles.categoryCard} ${styles[category.tone]}`}
      data-category={category.id}
      style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
    >
      <div className={styles.categoryHead}>
        <div>
          <Link href={category.href} className={styles.categoryTitleLink} aria-label={`${category.title} kategorisini aç`}>
            <h3>{category.title}</h3>
          </Link>
          <p>{category.count} {category.countLabel ?? "çalışma"}</p>
        </div>
        <span className={styles.categoryIcon}><Icon name={category.icon}/></span>
      </div>
      {category.description && <p className={styles.categoryDescription}>{category.description}</p>}
      {category.examples && category.examples.length > 0 && (
        <div className={styles.categoryExamples} aria-label={`${category.title} örnek egzersizleri`}>
          {category.examples.slice(0, 4).map((example) => <Link href={example.href} key={example.href}>{example.title}</Link>)}
        </div>
      )}
      <div className={styles.percent}>%{category.progress}</div>
      <Progress value={category.progress} label={`${category.title} tamamlanma oranı yüzde ${category.progress}`}/>
      <Link href={category.href}>Devam Et <Icon name="arrow"/></Link>
    </article>
  );
}

function selectDailyTaskItem(items: DailyAssignmentItem[]): DailyAssignmentItem | null {
  return items.find((item) => item.status === "started")
    ?? items.find((item) => item.status === "pending")
    ?? items.find((item) => item.status !== "completed")
    ?? null;
}

function DailyTask({ studentId, studentResolved }: { studentId: string | null; studentResolved: boolean }) {
  const [taskState, setTaskState] = useState<DailyTaskState>({ status: "loading" });

  useEffect(() => {
    if (!studentResolved) return;

    let cancelled = false;
    const controller = new AbortController();

    const loadTask = async () => {
      if (!studentId) {
        if (!cancelled) setTaskState({ status: "empty" });
        return;
      }

      setTaskState({ status: "loading" });

      try {
        const response = await fetch("/api/student/daily-assignment?readOnly=true", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as { ok?: boolean; assignment?: DailyAssignment | null };

        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setTaskState({ status: "error" });
          return;
        }

        setTaskState(data.assignment ? { status: "ready", assignment: data.assignment } : { status: "empty" });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setTaskState({ status: "error" });
        }
      }
    };

    void loadTask();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [studentId, studentResolved]);

  if (taskState.status === "loading") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="loading"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyStateMessage}>Görev yükleniyor...</p></section>;
  }

  if (taskState.status === "error") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="error"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyStateMessage}>Günlük görev şu anda görüntülenemiyor.</p></section>;
  }

  if (taskState.status === "empty") {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="empty"><span className={styles.cornerSpark}>✦</span><h2>Bugün için atanmış görev yok</h2><p className={styles.dailyStateMessage}>Serbest çalışmalarından birini seçerek devam edebilirsin.</p><Link href="/egzersizler">Egzersizleri Gör <Icon name="arrow"/></Link></section>;
  }

  const { assignment } = taskState;
  const selectedItem = selectDailyTaskItem(assignment.items);
  const completedCount = assignment.items.filter((item) => item.status === "completed").length;
  const totalCount = assignment.items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!selectedItem) {
    return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="completed"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü görevlerini tamamladın</h2><p className={styles.dailyStateMessage}>Bugünkü tüm çalışmalarını başarıyla tamamladın.</p><div className={styles.dailyProgressLabel}><span>{completedCount} / {totalCount} tamamlandı</span><strong>%{progress}</strong></div><Progress value={progress} label={`Bugünkü görevler yüzde ${progress} tamamlandı`}/><Link href="/egzersizler">Serbest Çalışmalara Git <Icon name="arrow"/></Link></section>;
  }

  const durationMinutes = typeof selectedItem.settingsJson.durationMinutes === "number"
    ? selectedItem.settingsJson.durationMinutes
    : null;
  const statusLabel = selectedItem.status === "started"
    ? "Başlandı"
    : selectedItem.status === "pending"
      ? "Bekliyor"
      : "Atlandı";
  const itemHref = `/egzersizler/${selectedItem.exerciseSlug}?assignmentItemId=${encodeURIComponent(selectedItem.id)}`;

  return <section className={`${styles.sideCard} ${styles.dailyCard}`} data-daily-task-state="ready"><span className={styles.cornerSpark}>✦</span><h2>Bugünkü Görevin</h2><p className={styles.dailyTaskTitle}>{selectedItem.exerciseTitle}</p><div className={styles.dailyTaskMeta}><small><b>Durum:</b> {statusLabel}</small>{durationMinutes !== null && <small><b>Süre:</b> {durationMinutes} dakika</small>}{selectedItem.assignedTextTitle && <small><b>Metin:</b> {selectedItem.assignedTextTitle}</small>}{selectedItem.teacherNote && <small><b>Öğretmen notu:</b> {selectedItem.teacherNote}</small>}</div><div className={styles.dailyProgressLabel}><span>{completedCount} / {totalCount} tamamlandı</span><strong>%{progress}</strong></div><Progress value={progress} label={`Bugünkü görevler yüzde ${progress} tamamlandı`}/><div className={styles.astronaut}>👨‍🚀</div><Link href={itemHref}>Göreve Devam Et <Icon name="arrow"/></Link></section>;
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

function DemoPopover({ panel, onDemo, onClose, studentName, classLabel }: { panel: Exclude<DemoPanel, "menu" | null>; onDemo: (message: string) => void; onClose: () => void; studentName: string; classLabel: string }) {
  return <section id="preview-demo-panel" className={styles.demoPopover} role="dialog" aria-modal="true" aria-label={panel === "notifications" ? "Bildirimler" : "Profil menüsü"}><div className={styles.popoverTitle}><div><small>ÖNİZLEME</small><h2>{panel === "notifications" ? "Bildirimler" : studentName}</h2></div><button type="button" onClick={onClose} aria-label="Paneli kapat">×</button></div>{panel === "notifications" ? <div className={styles.notificationList}><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>🚀</span><div><strong>Günlük görevin hazır</strong><small>15 dakikalık odak çalışması</small></div></button><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><span>⭐</span><div><strong>Yeni rozet kazandın</strong><small>7 günlük seriyi tamamladın</small></div></button></div> : <div className={styles.profileMenu}><div className={styles.profileSummary}><span>👨‍🚀</span><div><strong>{studentName}</strong><small>{classLabel} · Seviye sistemi hazırlanıyor</small></div></div><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="user"/> Profili Gör</button><button type="button" onClick={() => onDemo("Bu özellik önizleme aşamasında.")}><Icon name="settings"/> Ayarlar</button></div>}</section>;
}

export function StudentPanelPreview() {
  const [light, setLight] = useState(false);
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<DemoPanel>(null);
  const [studentIdentity, setStudentIdentity] = useState<PreviewStudentIdentity>(FALLBACK_STUDENT_IDENTITY);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const togglePanel = (nextPanel: Exclude<DemoPanel, null>) => setPanel((current) => current === nextPanel ? null : nextPanel);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentStudent = getCurrentStudent();
      if (!currentStudent) {
        setStudentIdentity({ ...FALLBACK_STUDENT_IDENTITY, resolved: true });
        return;
      }

      setStudentIdentity({
        name: currentStudent.name?.trim() || FALLBACK_STUDENT_IDENTITY.name,
        classLabel: currentStudent.classLevel?.trim() || currentStudent.className?.trim() || FALLBACK_STUDENT_IDENTITY.classLabel,
        studentId: currentStudent.id?.trim() || null,
        resolved: true,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  return <main className={`${styles.preview} ${light ? styles.light : ""}`}><div className={styles.shell}><Sidebar onDemo={showToast}/><div className={styles.content}><div className={styles.mobileHeader}><Brand/><button type="button" aria-label="Menüyü aç" aria-expanded={panel === "menu"} onClick={() => togglePanel("menu")}><Icon name="menu"/></button><button type="button" aria-label="Bildirimler" aria-expanded={panel === "notifications"} onClick={() => togglePanel("notifications")}><Icon name="bell"/></button></div><Header light={light} panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onToggleTheme={() => setLight((value) => !value)} onTogglePanel={togglePanel}/><div className={styles.heroGrid}><Hero onDemo={showToast} studentName={studentIdentity.name}/><LevelCard/></div><div className={styles.dashboardGrid}><div className={styles.mainColumn}><section className={styles.statsGrid} aria-label="İstatistikler">{stats.map((stat,index) => <StatCard key={stat.label} stat={stat} index={index}/>)}</section><section className={styles.categoriesSection}><div className={styles.sectionTitle}><div><h2>🚀 Egzersiz Kategorileri</h2><p>Göz, dikkat, okuma ve hafıza becerilerini geliştir.</p></div><Link href="/egzersizler">Tüm Egzersizler <Icon name="arrow"/></Link></div><div className={styles.categoryGrid}>{categories.map((category,index) => <CategoryCard key={category.title} category={category} index={index}/>)}</div></section></div><aside className={styles.rightColumn}><DailyTask studentId={studentIdentity.studentId} studentResolved={studentIdentity.resolved}/><ReadingTest/><Badges onDemo={showToast}/><section className={styles.motivation}><div><strong>Unutma!</strong><p>Her gün küçük adımlar,<br/>büyük gelişimler getirir.</p></div><span>🪐</span></section></aside></div></div></div><MobileNav onDemo={showToast} onProfile={() => togglePanel("profile")}/>{panel && <><button type="button" className={styles.panelBackdrop} aria-label="Açık paneli kapat" onClick={() => setPanel(null)}/>{panel === "menu" ? <MobileMenu onDemo={showToast} onClose={() => setPanel(null)}/> : <DemoPopover panel={panel} studentName={studentIdentity.name} classLabel={studentIdentity.classLabel} onDemo={showToast} onClose={() => setPanel(null)}/>}</>}{toast && <div className={styles.toast} role="status" aria-live="polite">{toast}</div>}</main>;
}
