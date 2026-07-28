import styles from "./xp-notifications.module.css";

type XpRewardToastProps = {
  title: string;
  awardedXp: number;
  subtitle?: string;
  totalXpLabel?: string;
  onClose?: () => void;
};

export function XpRewardToast({
  title,
  awardedXp,
  subtitle,
  totalXpLabel,
  onClose,
}: XpRewardToastProps) {
  return (
    <section className={`${styles.toast} ${styles.xpToast}`} role="status" aria-live="polite">
      <div className={styles.toastIcon} aria-hidden="true">✨</div>
      <div className={styles.toastBody}>
        <p className={styles.toastEyebrow}>XP ödülü</p>
        <h2 className={styles.toastTitle}>{title}</h2>
        <p className={styles.toastText}>
          <strong>+{awardedXp} XP</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </p>
        {totalXpLabel ? <p className={styles.toastMeta}>{totalXpLabel}</p> : null}
      </div>
      <button type="button" className={styles.closeButton} aria-label="Bildirimi kapat" onClick={onClose}>
        ×
      </button>
    </section>
  );
}
