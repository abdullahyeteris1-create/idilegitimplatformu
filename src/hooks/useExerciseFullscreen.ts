"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type WebkitDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useExerciseFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  useEffect(() => {
    const target = targetRef.current as WebkitElement | null;
    setIsFullscreenSupported(Boolean(target?.requestFullscreen || target?.webkitRequestFullscreen));

    const sync = () => setIsFullscreen(fullscreenElement() === targetRef.current);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync as EventListener);
    sync();

    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync as EventListener);
    };
  }, [targetRef]);

  const enterFullscreen = useCallback(async () => {
    const target = targetRef.current as WebkitElement | null;
    if (!target) return;
    if (target.requestFullscreen) await target.requestFullscreen();
    else await target.webkitRequestFullscreen?.();
  }, [targetRef]);

  const exitFullscreen = useCallback(async () => {
    const doc = document as WebkitDocument;
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (fullscreenElement() === targetRef.current) await exitFullscreen();
    else await enterFullscreen();
  }, [enterFullscreen, exitFullscreen, targetRef]);

  return { enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen, isFullscreenSupported };
}
