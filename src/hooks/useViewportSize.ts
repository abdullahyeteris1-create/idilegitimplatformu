"use client";

import { useEffect, useState } from "react";

export function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const width = Math.round(viewport?.width ?? window.innerWidth);
      const height = Math.round(viewport?.height ?? window.innerHeight);
      setSize((current) => current.width === width && current.height === height ? current : { width, height });
    };
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return size;
}

