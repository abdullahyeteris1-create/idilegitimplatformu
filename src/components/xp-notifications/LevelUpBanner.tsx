import styles from "./xp-notifications.module.css";

type LevelUpBannerProps = {
  currentLevel: number;
  currentTitle: string;
  previousLevel: number;
  onClose?: () => void;
};

export function LevelUpBanner({
  currentLevel,
  currentTitle,
  previousLevel,
  onClose,
}: LevelUpBannerProps) {
  const levelGain = Math.max(0, currentLevel - previousLevel);

  return (
    <section className={`${styles.banner} ${styles.levelBanner}`} role="status" aria-live="polite">
      <div className={styles.bannerMark} aria-hidden="true">🎉</div>
      <div className={styles.bannerBody}>
        <p className={styles.bannerEyebrow}>Seviye atladın</p>
        <h2 className={styles.bannerTitle}>
          Artık Seviye {currentLevel}
          {levelGain > 1 ? ` (+${levelGain})` : ""}
        </h2>
        <p className={styles.bannerText}>{currentTitle} oldun. Yolculuk büyüyor.</p>
      </div>
      <button type="button" className={styles.closeButton} aria-label="Bildirimi kapat" onClick={onClose}>
        ×
      </button>
    </section>
  );
}
