"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { navItems } from "@/components/student-panel-preview/data";
import { Icon } from "@/components/student-panel-preview/icons";
import panelStyles from "@/components/student-panel-preview/student-panel-preview.module.css";

const ACTIVE_HREF = "/egzersizler";
const COMING_SOON_MESSAGE = "Bu özellik yakında eklenecek.";

// The shared panel navItems point "Öğrenci Paneli" at the design-preview route.
// This sidebar lives on the real exercises hub, so it must resolve to the real panel instead.
const HREF_OVERRIDES: Record<string, string> = {
  "Öğrenci Paneli": "/ogrenci",
};

type NavListProps = { onDemo: (message: string) => void; onNavigate?: () => void };

export function PreviewNavLinks({ onDemo, onNavigate }: NavListProps) {
  return (
    <>
      {navItems.map((item) => {
        const href = HREF_OVERRIDES[item.label] ?? item.href;
        const active = href === ACTIVE_HREF;
        const content = (
          <>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </>
        );

        if (href) {
          return (
            <Link key={item.label} href={href} className={active ? panelStyles.activeNav : undefined} onClick={onNavigate}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              onDemo(COMING_SOON_MESSAGE);
              onNavigate?.();
            }}
          >
            {content}
          </button>
        );
      })}
    </>
  );
}

export function PreviewSidebar({ onDemo }: { onDemo: (message: string) => void }) {
  return (
    <aside className={panelStyles.sidebar}>
      <div className={panelStyles.brand}>
        <span className={panelStyles.brandMark}>
          <Icon name="rocket" />
        </span>
        <span>
          <strong>İDİL</strong>
          <small>HIZLI OKUMA</small>
        </span>
      </div>

      <nav aria-label="Ana menü">
        <PreviewNavLinks onDemo={onDemo} />
      </nav>

      <section className={`${panelStyles.levelCard} ${panelStyles.levelCompact}`} aria-label="Seviye sistemi hazırlanıyor">
        <div className={panelStyles.levelTop}>
          <div>
            <strong>Seviye sistemi hazırlanıyor</strong>
            <span>Gelişim özellikleri yakında</span>
          </div>
          <div className={panelStyles.hexBadge}>★</div>
        </div>
        <div className={panelStyles.xp}>
          <b>Gelişim</b>
          <strong>Yakında</strong>
        </div>
        <div className={panelStyles.progress} role="progressbar" aria-label="Seviye sistemi hazırlanıyor" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <span style={{ "--progress": "0%" } as CSSProperties} />
        </div>
      </section>

      <div className={panelStyles.streakCard}>
        <span>🔥</span>
        <div>
          <small>Günlük Seri</small>
          <strong>0 gün</strong>
          <p>Henüz aktif seri yok</p>
        </div>
      </div>

      <button
        type="button"
        className={panelStyles.support}
        onClick={() => onDemo(COMING_SOON_MESSAGE)}
      >
        <Icon name="help" /> Yardım &amp; Destek
      </button>
    </aside>
  );
}
