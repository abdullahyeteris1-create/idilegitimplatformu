"use client";

import { useEffect } from "react";

const SESSION_CHECK_INTERVAL_MS = 30_000;
const SESSION_CHECK_TIMEOUT_MS = 10_000;

export function StudentSessionWatcher() {
  useEffect(() => {
    let disposed = false;
    let redirecting = false;
    let checking = false;
    let activeController: AbortController | null = null;
    let intervalId: number | null = null;

    const handleFocus = () => {
      void checkSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    const stopWatching = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const redirectToLogin = () => {
      if (disposed || redirecting) {
        return;
      }

      redirecting = true;
      stopWatching();
      activeController?.abort();
      window.location.replace("/giris");
    };

    async function checkSession() {
      if (disposed || redirecting || checking) {
        return;
      }

      checking = true;
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);

      try {
        const response = await fetch("/api/student/session-status", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
        }
      } catch {
        // Network and timeout failures are temporary; the next scheduled check retries.
      } finally {
        window.clearTimeout(timeoutId);
        if (activeController === controller) {
          activeController = null;
        }
        checking = false;
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    intervalId = window.setInterval(() => void checkSession(), SESSION_CHECK_INTERVAL_MS);
    void checkSession();

    return () => {
      disposed = true;
      stopWatching();
      activeController?.abort();
    };
  }, []);

  return null;
}
