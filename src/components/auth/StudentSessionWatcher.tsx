"use client";

import { useEffect } from "react";
import { STUDENT_LOGIN_GENERATION_KEY } from "./LoginForm";

const SESSION_CHECK_INTERVAL_MS = 30_000;
const SESSION_CHECK_TIMEOUT_MS = 10_000;
const SESSION_RETRY_DELAY_MS = 300;

export function StudentSessionWatcher() {
  useEffect(() => {
    console.info("[student-session-watcher] mounted");
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
      console.info("[student-session-watcher] redirect_giris");
      window.location.replace("/giris");
    };

    async function checkSession() {
      if (disposed || redirecting || checking) {
        return;
      }

      checking = true;
      let loginGenerationAtStart: string | null = null;
      try {
        loginGenerationAtStart = window.sessionStorage.getItem(STUDENT_LOGIN_GENERATION_KEY);
      } catch {
        // Session storage is optional; the server response remains authoritative.
      }
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
      console.info("[student-session-watcher] status_request_start");

      try {
        const request = () => fetch("/api/student/session-status", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        let response = await request();
        let reason = "session_invalid";

        if (response.ok) {
          console.info("[student-session-watcher] status_200");
        }

        if (response.status === 401 || response.status === 403) {
          try {
            if (window.sessionStorage.getItem(STUDENT_LOGIN_GENERATION_KEY) !== loginGenerationAtStart) return;
          } catch {
            // Continue with the normal retry when session storage is unavailable.
          }
          try {
            const body = (await response.clone().json()) as { reason?: unknown };
            if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason;
          } catch {
            // Retry below; an invalid response body is not enough to log out.
          }

          console.info(`[student-session-watcher] status_${response.status} reason=${reason}`);

          console.info("[student-session-watcher] retry");
          await new Promise<void>((resolve) => window.setTimeout(resolve, SESSION_RETRY_DELAY_MS));
          if (controller.signal.aborted || disposed || redirecting) return;
          response = await request();

          if (response.ok) {
            console.info("[student-session-watcher] status_200");
          }

          if (response.status === 401 || response.status === 403) {
            try {
              if (window.sessionStorage.getItem(STUDENT_LOGIN_GENERATION_KEY) !== loginGenerationAtStart) return;
            } catch {
              // Continue with the normal redirect when session storage is unavailable.
            }
            try {
              const body = (await response.clone().json()) as { reason?: unknown };
              if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason;
            } catch {
              // Keep the safe generic reason.
            }
            console.info(`[student-session-watcher] status_${response.status} reason=${reason}`);
            redirectToLogin();
          }
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
      console.info("[student-session-watcher] unmounted");
    };
  }, []);

  return null;
}
