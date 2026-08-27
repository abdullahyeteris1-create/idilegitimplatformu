"use client";

import { EXERCISE_EXIT_HREF, EXERCISE_LIST_HREF, useExerciseExitNavigation } from "./useExerciseExitNavigation";
import styles from "./ExerciseEndScreenActions.module.css";

export type ExerciseEndScreenActionsProps = {
  /** Bitis ekranindaki "Tekrar Oyna" - oyunun mevcut yeniden baslatma davranisi. */
  onReplay: () => void;
  /** Bazi egzersizlerde bitis ekraninda yeniden oynama aksiyonu zaten ayri gosterilir. */
  showReplay?: boolean;
  /** Egzersizin listelendigi kategori route'u (varsayilan: tum egzersizler). */
  backHref?: string;
  /** Uygulamadan cikis hedefi (varsayilan: ogrenci paneli). */
  exitHref?: string;
  /** Cikis aksiyonunun gorunen metni. */
  exitLabel?: string;
  /** Egitim programi akisinda sabit "Devam Et" bari icin alt bosluk birakir. */
  reserveBottomOverlaySpace?: boolean;
  className?: string;
};

/**
 * Egzersiz/oyun bitis ekranlarinin ortak aksiyon alani:
 * [ Tekrar Oyna ] [ Egzersizlere Dön ] [ Çıkış ]
 *
 * Navigasyon davranisi ExerciseNavigationControls ile ayni kaynaktan
 * (useExerciseExitNavigation) gelir: once tam ekran kapatilir, sonra
 * uygulama ici yonlendirme yapilir.
 */
export function ExerciseEndScreenActions({
  onReplay,
  showReplay = true,
  backHref = EXERCISE_LIST_HREF,
  exitHref = EXERCISE_EXIT_HREF,
  exitLabel = "Çıkış",
  reserveBottomOverlaySpace = false,
  className = "",
}: ExerciseEndScreenActionsProps) {
  const { isNavigating, navigateTo } = useExerciseExitNavigation();

  const containerClassName = [
    styles.actions,
    reserveBottomOverlaySpace ? styles.withOverlaySpace : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="group" aria-label="Bitiş ekranı işlemleri" className={containerClassName}>
      {showReplay ? (
        <button type="button" className={styles.replay} disabled={isNavigating} onClick={onReplay}>
          Tekrar Oyna
        </button>
      ) : null}
      <button type="button" className={styles.back} disabled={isNavigating} onClick={() => void navigateTo(backHref)}>
        Egzersizlere Dön
      </button>
      <button type="button" className={styles.exit} disabled={isNavigating} onClick={() => void navigateTo(exitHref)}>
        {exitLabel}
      </button>
    </div>
  );
}
