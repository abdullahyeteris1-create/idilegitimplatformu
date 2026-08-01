"use client";

import { useEffect, useState } from "react";
import { IdilThemeProvider } from "@/components/theme/IdilThemeProvider";
import { HeroBanner } from "@/components/auth/login/HeroBanner";
import { LoginCard } from "@/components/auth/login/LoginCard";
import { getRandomLoginTheme, LOGIN_THEMES, type LoginTheme } from "@/components/auth/login/LoginThemeEngine";

export function PortalLoginPage() {
  const [theme, setTheme] = useState<LoginTheme>(LOGIN_THEMES[0]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setTheme(getRandomLoginTheme()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <IdilThemeProvider className="login-page">
      <main className="login-stage">
        <HeroBanner key={theme.id} theme={theme} />
        <LoginCard theme={theme} />
      </main>
    </IdilThemeProvider>
  );
}
