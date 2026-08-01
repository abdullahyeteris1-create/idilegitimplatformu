import Image from "next/image";
import { Suspense, type CSSProperties } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import type { LoginTheme } from "./LoginThemeEngine";

export function LoginCard({ theme }: { theme: LoginTheme }) {
  const cardPosition = (position: LoginTheme["cardDesktopPosition"] = "center") => position === "center-left" ? "34%" : position === "center-right" ? "66%" : "50%";
  const cardStyle = {
    "--card-left": cardPosition(theme.cardDesktopPosition),
    "--card-left-tablet": cardPosition(theme.cardTabletPosition ?? theme.cardDesktopPosition),
    "--card-left-mobile": cardPosition(theme.cardMobilePosition ?? "center"),
  } as CSSProperties;

  return (
    <aside className={`login-card login-card--${theme.cardTone ?? "midnight"} login-card--text-${theme.textTone ?? "light"}`} style={cardStyle} aria-label="Giriş formu">
      <div className="login-card__brand">
        <Image src="/logo-idil.png" alt="İdil Hızlı Okuma" width={180} height={54} priority className="login-card__logo" />
        <span className="login-card__secure"><i /> Güvenli giriş</span>
      </div>
      <div className="login-card__heading">
        <p>Tekrar hoş geldin</p>
        <h2>Öğrenmeye<br className="sm:hidden" /> devam edelim.</h2>
      </div>
      <Suspense fallback={<div className="login-card__loading">Giriş hazırlanıyor...</div>}>
        <LoginForm />
      </Suspense>
      <p className="login-card__motto">Küçük adımlar büyük başarılar getirir.</p>
    </aside>
  );
}
