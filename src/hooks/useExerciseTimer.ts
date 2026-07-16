"use client";

import { useEffect, useRef } from "react";

type UseExerciseTimerOptions = {
  running: boolean;
  paused?: boolean;
  delayMs: number | null;
  onTick: () => void;
};

export function useExerciseTimer({
  running,
  paused = false,
  delayMs,
  onTick,
}: UseExerciseTimerOptions): void {
  const callbackRef = useRef(onTick);

  useEffect(() => {
    callbackRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running || paused || delayMs === null) {
      return;
    }

    const safeDelay = Number(delayMs);

    if (!Number.isFinite(safeDelay) || safeDelay <= 0) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const scheduleNextTick = () => {
      timerId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        callbackRef.current();
        scheduleNextTick();
      }, safeDelay);
    };

    scheduleNextTick();

    return () => {
      cancelled = true;

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [delayMs, paused, running]);
}
