"use client";

import { Icon } from "@/components/student-panel-preview/icons";
import panelStyles from "@/components/student-panel-preview/student-panel-preview.module.css";

type PreviewHeaderProps = {
  light: boolean;
  onToggleTheme: () => void;
  onNotify: () => void;
  onProfile: () => void;
  studentName: string;
  classLabel: string;
};

export function PreviewHeader({ light, onToggleTheme, onNotify, onProfile, studentName, classLabel }: PreviewHeaderProps) {
  return (
    <header className={panelStyles.header}>
      <div>
        <h1>
          Egzersizler <span>🚀</span>
        </h1>
        <p>Dikkat, okuma, hafıza ve anlama becerilerini geliştiren çalışmalar.</p>
      </div>
      <div className={panelStyles.headerActions}>
        <button
          type="button"
          className={panelStyles.themeButton}
          onClick={onToggleTheme}
          aria-label={`${light ? "Koyu" : "Açık"} temaya geç`}
        >
          <small>Tema</small>
          <Icon name={light ? "moon" : "sparkles"} />
        </button>
        <button type="button" className={panelStyles.iconButton} aria-label="Bildirimleri aç" onClick={onNotify}>
          <Icon name="bell" />
          <span>3</span>
        </button>
        <button type="button" className={panelStyles.profile} aria-label="Profil menüsünü aç" onClick={onProfile}>
          <span>👨‍🚀</span>
          <div>
            <strong>{studentName}</strong>
            <small>{classLabel}</small>
          </div>
          <Icon name="arrow" />
        </button>
      </div>
    </header>
  );
}
