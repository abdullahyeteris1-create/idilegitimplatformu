"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

export type ExerciseNavigationControlsProps = {
  backHref?: string;
  exitHref?: string;
  backLabel?: string;
  exitLabel?: string;
  onBeforeExit?: () => void;
  compact?: boolean;
};

const DEFAULT_BACK_HREF = "/egzersizler";
const DEFAULT_EXIT_HREF = "/ogrenci";

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

export function ExerciseNavigationControls({
  backHref = DEFAULT_BACK_HREF,
  exitHref = DEFAULT_EXIT_HREF,
  backLabel = "Egzersizlere Dön",
  exitLabel = "Uygulamadan Çık",
  onBeforeExit,
  compact = false,
}: ExerciseNavigationControlsProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = async (href: string, beforeNavigate?: () => void) => {
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
  };

  return (
    <nav aria-label="Egzersiz navigasyonu" className="relative z-[70] flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        disabled={isNavigating}
        onClick={() => void navigateTo(backHref)}
        className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-wait disabled:opacity-60 ${
          compact ? "px-2.5 sm:px-3" : "px-3 sm:px-4"
        }`}
        title={backLabel}
      >
        <ArrowLeftIcon />
        <span className={compact ? "hidden lg:inline" : "hidden sm:inline"}>{backLabel}</span>
        <span className={compact ? "lg:hidden" : "sm:hidden"}>Geri</span>
      </button>

      <button
        type="button"
        disabled={isNavigating}
        onClick={() => void navigateTo(exitHref, onBeforeExit)}
        className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-700 shadow-sm shadow-red-100/40 transition duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md disabled:cursor-wait disabled:opacity-60 ${
          compact ? "px-2.5 sm:px-3" : "px-3 sm:px-4"
        }`}
        title={exitLabel}
      >
        <ExitIcon />
        <span className={compact ? "hidden lg:inline" : "hidden sm:inline"}>{exitLabel}</span>
        <span className={compact ? "lg:hidden" : "sm:hidden"}>Çık</span>
      </button>
    </nav>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none">
      <path d="m14.5 18-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none">
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10m4-4 3-3-3-3m3 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
