"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/student-panel-preview/icons";
import panelStyles from "@/components/student-panel-preview/student-panel-preview.module.css";
import { CategoryCards } from "./CategoryCards";
import { ExerciseGroupPanel } from "./ExerciseGroupPanel";
import { PreviewHeader } from "./PreviewHeader";
import { PreviewNavLinks, PreviewSidebar } from "./PreviewSidebar";
import { PREVIEW_EXERCISE_GROUPS, resolvePreviewGroupId } from "./exercisePreviewGroups";
import previewStyles from "./exercises-preview.module.css";

const DEMO_STUDENT_NAME = "Demo Öğrenci";
const DEMO_CLASS_LABEL = "Önizleme hesabı";

export function ExercisesPreviewShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [light, setLight] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const activeGroupId = useMemo(
    () => resolvePreviewGroupId(searchParams.get("category")),
    [searchParams],
  );
  const activeGroup = useMemo(
    () => PREVIEW_EXERCISE_GROUPS.find((group) => group.id === activeGroupId) ?? PREVIEW_EXERCISE_GROUPS[0],
    [activeGroupId],
  );

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const handleSelectGroup = (groupId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("category", groupId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <main className={`${panelStyles.preview} ${light ? `${panelStyles.light} ${previewStyles.light}` : ""}`}>
      <div className={panelStyles.shell}>
        <PreviewSidebar onDemo={showToast} />

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
            <button type="button" aria-label="Bildirimler" onClick={() => showToast("Bu özellik önizleme aşamasında.")}>
              <Icon name="bell" />
            </button>
          </div>

          <PreviewHeader
            light={light}
            onToggleTheme={() => setLight((value) => !value)}
            onNotify={() => showToast("Bu özellik önizleme aşamasında.")}
            onProfile={() => showToast("Bu özellik önizleme aşamasında.")}
            studentName={DEMO_STUDENT_NAME}
            classLabel={DEMO_CLASS_LABEL}
          />

          <div className={previewStyles.pageHeadRow}>
            <div>
              <span className={previewStyles.pageHeadEyebrow}>Egzersiz Merkezi</span>
              <h2>Kategoriler arasında gezin</h2>
              <p>Göz, dikkat, okuma ve hafıza becerilerini geliştiren çalışmalardan birini seç.</p>
            </div>
            <Link href="/egzersizler" className={panelStyles.subtleButton}>
              Klasik Görünüme Dön <Icon name="arrow" />
            </Link>
          </div>

          <CategoryCards groups={PREVIEW_EXERCISE_GROUPS} activeGroupId={activeGroupId} onSelect={handleSelectGroup} />

          <ExerciseGroupPanel group={activeGroup} />
        </div>
      </div>

      <nav className={panelStyles.mobileNav} aria-label="Mobil menü">
        <Link href="/ogrenci" aria-label="Panel">
          <Icon name="home" />
        </Link>
        <Link href="/egzersizler-yeni-onizleme" className={panelStyles.mobileActive} aria-label="Egzersizler">
          <Icon name="rocket" />
        </Link>
        <button type="button" aria-label="Rozetler" onClick={() => showToast("Bu özellik önizleme aşamasında.")}>
          <Icon name="badge" />
        </button>
        <Link href="/sonuc" aria-label="Sonuçlar">
          <Icon name="chart" />
        </Link>
        <button type="button" aria-label="Profil" onClick={() => showToast("Bu özellik önizleme aşamasında.")}>
          <Icon name="user" />
        </button>
      </nav>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className={panelStyles.panelBackdrop}
            aria-label="Menüyü kapat"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className={panelStyles.mobileMenuPanel} aria-label="Mobil ana menü">
            <PreviewNavLinks onDemo={showToast} onNavigate={() => setMobileMenuOpen(false)} />
          </nav>
        </>
      )}

      {toast && (
        <div className={panelStyles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}
