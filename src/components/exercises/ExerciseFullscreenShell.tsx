"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type FullscreenTargetElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenTargetDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type ExerciseFullscreenShellProps = {
  title: string;
  description?: string;
  backHref?: string;
  children: ReactNode;
};

const DEFAULT_BACK_HREF = "/egzersizler";

function getFullscreenElement(doc: FullscreenTargetDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function ExerciseFullscreenShell({
  title,
  description,
  backHref = DEFAULT_BACK_HREF,
  children,
}: ExerciseFullscreenShellProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const immersiveMode = isFullscreenActive || isFocusMode;

  const syncFullscreenState = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const activeElement = getFullscreenElement(document as FullscreenTargetDocument);
    const currentWrapper = wrapperRef.current;
    setIsFullscreenActive(Boolean(activeElement && currentWrapper && activeElement === currentWrapper));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      syncFullscreenState();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
    };
  }, [syncFullscreenState]);

  const openNativeFullscreen = useCallback(async () => {
    const wrapper = wrapperRef.current as FullscreenTargetElement | null;
    if (!wrapper) {
      throw new Error("Fullscreen wrapper bulunamadi.");
    }

    if (typeof wrapper.requestFullscreen === "function") {
      await wrapper.requestFullscreen();
      return;
    }

    if (typeof wrapper.webkitRequestFullscreen === "function") {
      await wrapper.webkitRequestFullscreen();
      return;
    }

    throw new Error("Bu tarayici native fullscreen desteklemiyor.");
  }, []);

  const closeNativeFullscreen = useCallback(async () => {
    const doc = document as FullscreenTargetDocument;

    if (typeof doc.exitFullscreen === "function") {
      await doc.exitFullscreen();
      return;
    }

    if (typeof doc.webkitExitFullscreen === "function") {
      await doc.webkitExitFullscreen();
    }
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    if (isFullscreenActive) {
      await closeNativeFullscreen();
      return;
    }

    if (isFocusMode) {
      setIsFocusMode(false);
      return;
    }

    try {
      await openNativeFullscreen();
      setIsFocusMode(false);
    } catch {
      setIsFocusMode(true);
    }
  }, [closeNativeFullscreen, isFocusMode, isFullscreenActive, openNativeFullscreen]);

  return (
    <section
      ref={wrapperRef}
      className={
        immersiveMode
          ? "fixed inset-0 z-50 bg-slate-100 text-slate-900"
          : "min-h-screen bg-gradient-to-br from-slate-100 via-rose-50 to-slate-100 text-slate-900"
      }
    >
      <div className={immersiveMode ? "flex h-full flex-col" : "mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-4 md:px-5 md:py-6"}>
        <header
          className={
            immersiveMode
              ? "sticky top-0 z-20 flex min-h-[62px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 shadow-sm md:px-5"
              : "flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:px-5"
          }
        >
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-950 md:text-lg">{title}</h1>
            {description ? <p className="truncate text-xs text-slate-600 md:text-sm">{description}</p> : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 md:min-h-[40px] md:text-sm"
            >
              {isFullscreenActive || isFocusMode ? "Tam Ekran Kapat" : "Tam Ekran Ac"}
            </button>

            <Link
              href={backHref}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100 md:min-h-[40px] md:text-sm"
            >
              Egzersizlere Don
            </Link>
          </div>
        </header>

        <main className={immersiveMode ? "flex-1 overflow-auto px-2 py-2 md:px-4 md:py-4" : "flex-1 py-3"}>
          <div className={immersiveMode ? "h-full" : "h-full"}>{children}</div>
        </main>
      </div>
    </section>
  );
}

export default ExerciseFullscreenShell;
