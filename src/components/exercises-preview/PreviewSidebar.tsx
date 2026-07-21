"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { navItems } from "@/components/student-panel-preview/data";
import { Icon } from "@/components/student-panel-preview/icons";
import panelStyles from "@/components/student-panel-preview/student-panel-preview.module.css";

const ACTIVE_HREF = "/egzersizler";

type NavListProps = { onDemo: (message: string) => void; onNavigate?: () => void };

export function PreviewNavLinks({ onDemo, onNavigate }: NavListProps) {
  return (
    <>
      {navItems.map((item) => {
        const active = item.href === ACTIVE_HREF;
        const content = (
          <>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </>
        );

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className={active ? panelStyles.activeNav : undefined} onClick={onNavigate}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              onDemo("Bu özellik önizleme aşamasında.");
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
        onClick={() => onDemo("Bu özellik önizleme aşamasında.")}
      >
        <Icon name="help" /> Yardım &amp; Destek
      </button>
    </aside>
  );
}
