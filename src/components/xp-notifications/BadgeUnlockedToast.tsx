import Link from "next/link";
import styles from "./xp-notifications.module.css";

type BadgeUnlockedToastProps = {
  badgeNames: string[];
  badgeLinkHref: string;
  onClose?: () => void;
};

export function BadgeUnlockedToast({
  badgeNames,
  badgeLinkHref,
  onClose,
}: BadgeUnlockedToastProps) {
  const previewNames = badgeNames.slice(0, 2);
  const extraCount = Math.max(0, badgeNames.length - previewNames.length);

  return (
    <section className={`${styles.toast} ${styles.badgeToast}`} role="status" aria-live="polite">
      <div className={styles.toastIcon} aria-hidden="true">🏅</div>
      <div className={styles.toastBody}>
        <p className={styles.toastEyebrow}>Yeni rozet</p>
        <h2 className={styles.toastTitle}>Yeni bir rozet kazandın</h2>
        <p className={styles.toastText}>
          {previewNames.join(", ")}
          {extraCount > 0 ? ` ve ${extraCount} rozet daha` : ""}
        </p>
        <Link href={badgeLinkHref} className={styles.linkButton}>
          Rozetlerime Git
        </Link>
      </div>
      <button type="button" className={styles.closeButton} aria-label="Bildirimi kapat" onClick={onClose}>
        ×
      </button>
    </section>
  );
}
