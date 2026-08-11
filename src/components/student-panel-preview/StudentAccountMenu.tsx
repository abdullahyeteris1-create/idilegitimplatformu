"use client";

import Link from "next/link";
import { useEffect, type RefObject } from "react";
import { logoutCurrentStudent } from "@/lib/auth/auth";
import { Icon } from "./icons";
import styles from "./student-panel-preview.module.css";

type StudentAccountMenuProps = {
  studentName: string;
  classLabel: string;
  onClose: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  popoverRef?: RefObject<HTMLElement | null>;
};

export function StudentAccountMenu({
  studentName,
  classLabel,
  onClose,
  onLogout,
  isLoggingOut = false,
  popoverRef,
}: StudentAccountMenuProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    const frame = window.requestAnimationFrame(() => {
      popoverRef?.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.cancelAnimationFrame(frame);
    };
  }, [onClose, popoverRef]);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }

    await logoutCurrentStudent();
    window.location.replace("/giris");
  };

  return (
    <section
      id="student-account-menu"
      ref={popoverRef}
      className={styles.demoPopover}
      role="menu"
      aria-label="Hesap menüsü"
    >
      <div className={styles.popoverTitle}>
        <div>
          <small>HESAP</small>
          <h2>{studentName}</h2>
          <span className={styles.accountClassLabel}>{classLabel}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Hesap menüsünü kapat">
          ×
        </button>
      </div>
      <div className={styles.profileMenu}>
        <Link href="/ogrenci/profil" className={styles.profileMenuLink} role="menuitem" onClick={onClose}>
          <Icon name="user" /> Profil
        </Link>
        <button
          type="button"
          className={styles.profileLogout}
          role="menuitem"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
        >
          <Icon name="arrow" /> {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
        </button>
      </div>
    </section>
  );
}
