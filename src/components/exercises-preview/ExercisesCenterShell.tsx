"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/student-panel-preview/icons";
import panelStyles from "@/components/student-panel-preview/student-panel-preview.module.css";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import { CategoryCards } from "./CategoryCards";
import { ExerciseGroupPanel } from "./ExerciseGroupPanel";
import { PreviewHeader } from "./PreviewHeader";
import { PreviewNavLinks, PreviewSidebar } from "./PreviewSidebar";
import { StudentAccountMenu } from "@/components/student-panel-preview/StudentAccountMenu";
import { logoutCurrentStudent } from "@/lib/auth/auth";
import { PREVIEW_EXERCISE_GROUPS, resolvePreviewGroupId } from "./exercisePreviewGroups";
import previewStyles from "./exercises-preview.module.css";

const STUDENT_NAME = "Öğrenci";
const CLASS_LABEL = "Hızlı Okuma";
const COMING_SOON_MESSAGE = "Bu özellik yakında eklenecek.";
const EXERCISES_HREF = "/egzersizler";

export function ExercisesCenterShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useIdilTheme();
  const light = theme === "light";
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const toastTimer = useRef<number | null>(null);

  const activeGroupId = useMemo(
    () => resolvePreviewGroupId(searchParams.get("category")),
    [searchParams],
  );
  const activeGroup = useMemo(
    () => PREVIEW_EXERCISE_GROUPS.find((group) => group.id === activeGroupId) ?? PREVIEW_EXERCISE_GROUPS[0],
    [activeGroupId],
  );
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const closeId = window.setTimeout(() => { setMobileMenuOpen(false); setAccountMenuOpen(false); }, 0);
    return () => window.clearTimeout(closeId);
  }, [pathname, searchParamsKey]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      await logoutCurrentStudent();
      window.location.replace("/giris");
    } catch {
      setLogoutError("Çıkış şu anda tamamlanamadı. Lütfen tekrar dene.");
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const closeMenu = () => setMobileMenuOpen(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") closeMenu();
    };

    window.addEventListener("pageshow", closeMenu);
    window.addEventListener("focus", closeMenu);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", closeMenu);
      window.removeEventListener("focus", closeMenu);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const handleSelectGroup = (groupId: string) => {
    setMobileMenuOpen(false);
    if (groupId === activeGroupId) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("category", groupId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <main className={`${panelStyles.preview} ${light ? `${panelStyles.light} ${previewStyles.light}` : ""}`}>
      <div className={panelStyles.shell}>
        <PreviewSidebar onDemo={showToast} onAccountMenu={() => setAccountMenuOpen(true)} accountMenuOpen={accountMenuOpen} />

        <div className={panelStyles.content}>
          <div className={panelStyles.mobileHeader}>
            <div className={panelStyles.brand}>
              <span className={panelStyles.brandMark}>
                <Icon name="rocket" />
              </span>
              <span>
                <strong>İDİL</strong>
                <small>HIZLI OKUMA</small>
              </span>
            </div>
            <button
              type="button"
              aria-label="Menüyü aç"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              <Icon name="menu" />
            </button>
            <button type="button" aria-label="Bildirimler" onClick={() => showToast(COMING_SOON_MESSAGE)}>
              <Icon name="bell" />
            </button>
          </div>

          <PreviewHeader
            light={light}
            onToggleTheme={() => setTheme(light ? "dark" : "light")}
            onNotify={() => showToast(COMING_SOON_MESSAGE)}
            profileOpen={accountMenuOpen}
            onProfileMenu={() => setAccountMenuOpen((value) => !value)}
            studentName={STUDENT_NAME}
            classLabel={CLASS_LABEL}
          />

          <div className={previewStyles.pageHeadRow}>
            <div>
              <span className={previewStyles.pageHeadEyebrow}>Egzersiz Merkezi</span>
              <h2>Kategoriler arasında gezin</h2>
              <p>Göz, dikkat, okuma ve hafıza becerilerini geliştiren çalışmalardan birini seç.</p>
            </div>
          </div>

          <CategoryCards groups={PREVIEW_EXERCISE_GROUPS} activeGroupId={activeGroupId} onSelect={handleSelectGroup} />

          <ExerciseGroupPanel group={activeGroup} />
        </div>
      </div>

      <nav className={panelStyles.mobileNav} aria-label="Mobil menü">
        <Link href="/ogrenci" aria-label="Panel">
          <Icon name="home" />
        </Link>
        <Link href={EXERCISES_HREF} className={panelStyles.mobileActive} aria-label="Egzersizler">
          <Icon name="rocket" />
        </Link>
        <button type="button" aria-label="Rozetler" onClick={() => showToast(COMING_SOON_MESSAGE)}>
          <Icon name="badge" />
        </button>
        <Link href="/sonuc" aria-label="Sonuçlar">
          <Icon name="chart" />
        </Link>
        <Link href="/ogrenci/profil" aria-label="Profil">
          <Icon name="user" />
        </Link>
      </nav>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className={`${panelStyles.panelBackdrop} ${panelStyles.panelBackdropOpen}`}
            aria-label="Menüyü kapat"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className={panelStyles.mobileMenuPanel} aria-label="Mobil ana menü">
            <PreviewNavLinks onDemo={showToast} onNavigate={() => setMobileMenuOpen(false)} onAccountMenu={() => setAccountMenuOpen(true)} accountMenuOpen={accountMenuOpen} />
          </nav>
        </>
      )}

      {accountMenuOpen && (
        <>
          <button type="button" className={`${panelStyles.panelBackdrop} ${panelStyles.panelBackdropOpen}`} aria-label="Hesap menüsünü kapat" onClick={() => setAccountMenuOpen(false)} />
          <StudentAccountMenu studentName={STUDENT_NAME} classLabel={CLASS_LABEL} onClose={() => setAccountMenuOpen(false)} onLogout={() => void handleLogout()} isLoggingOut={isLoggingOut} />
        </>
      )}

      {logoutError && <div className={panelStyles.logoutError} role="alert">{logoutError}</div>}

      {toast && (
        <div className={panelStyles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}
