"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

/** Egzersiz listesi (Calisma Merkezi) - "Egzersizlere Don" hedefi. */
export const EXERCISE_LIST_HREF = "/egzersizler";
/** Ogrenci paneli - egzersizlerden "Cikis" icin projedeki standart hedef. */
export const EXERCISE_EXIT_HREF = "/ogrenci";

async function closeFullscreenIfNeeded(): Promise<void> {
  const fullscreenDocument = document as FullscreenDocument;
  const fullscreenElement = fullscreenDocument.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;

  if (!fullscreenElement) {
    return;
  }

  if (typeof fullscreenDocument.exitFullscreen === "function") {
    await fullscreenDocument.exitFullscreen();
    return;
  }

  if (typeof fullscreenDocument.webkitExitFullscreen === "function") {
    await fullscreenDocument.webkitExitFullscreen();
  }
}

/**
 * Egzersizden cikis/geri donus navigasyonunun tek kaynagi: once tam ekran
 * kapatilir, sonra uygulama ici yonlendirme yapilir. Hem egzersiz ust barindaki
 * ExerciseNavigationControls hem de bitis ekranindaki ExerciseEndScreenActions
 * bu hook'u kullanir; davranis iki yerde ayri ayri yazilmaz.
 */
export function useExerciseExitNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = useCallback(
    async (href: string, beforeNavigate?: () => void) => {
      if (isNavigating) {
        return;
      }

      setIsNavigating(true);

      try {
        beforeNavigate?.();
      } catch {
        setIsNavigating(false);
        return;
      }

      try {
        await closeFullscreenIfNeeded();
      } catch {
        // Fullscreen kapatma izni reddedilse bile güvenli uygulama içi yönlendirmeyi engelleme.
      }

      try {
        router.push(href);
      } catch {
        setIsNavigating(false);
      }
    },
    [isNavigating, router],
  );

  return { isNavigating, navigateTo };
}
