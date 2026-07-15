"use client";

import { useEffect, useState, type RefObject } from "react";

export type ElementSize = { width: number; height: number };

export function useElementSize(ref: RefObject<Element | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = (width: number, height: number) => {
      setSize((current) => current.width === width && current.height === height ? current : { width, height });
    };
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    const rect = element.getBoundingClientRect();
    update(rect.width, rect.height);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

