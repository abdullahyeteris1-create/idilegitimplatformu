"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccentPicker } from "@/components/theme/AccentPicker";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Icon } from "@/components/student-panel-preview/icons";
import styles from "./student-profile.module.css";

type Profile = {
  name: string;
  birthDate: string;
  classLevel: string;
  schoolName: string;
  username: string;
};

type ProfileResponse = { ok: boolean; message?: string; profile?: Profile };

const emptyProfile: Profile = { name: "", birthDate: "", classLevel: "", schoolName: "", username: "" };

async function readProfileResponse(response: Response): Promise<ProfileResponse> {
  try {
    return (await response.json()) as ProfileResponse;
  } catch {
    return { ok: false, message: "Profil yanıtı okunamadı." };
  }
}

export function StudentProfileClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(emptyProfile);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadProfile() {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/student/profile", { credentials: "same-origin", cache: "no-store" });
      const result = await readProfileResponse(response);
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/giris");
        return;
      }
      if (!response.ok || !result.ok || !result.profile) throw new Error(result.message ?? "Profil bilgileri alınamadı.");
      setProfile(result.profile);
      setSavedProfile(result.profile);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Profil bilgileri alınamadı.");
    }
  }

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(loadTask);
  }, []);

  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          birthDate: profile.birthDate,
          classLevel: profile.classLevel,
          schoolName: profile.schoolName,
        }),
      });
      const result = await readProfileResponse(response);
      if (!response.ok || !result.ok || !result.profile) throw new Error(result.message ?? "Profil bilgileriniz güncellenemedi.");
      setProfile(result.profile);
      setSavedProfile(result.profile);
      setMessage("Profil bilgileriniz güncellendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profil bilgileriniz güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  if (status === "loading") {
    return <main className={styles.page}><div className={styles.shell}><div className={styles.skeleton} aria-label="Profil yükleniyor">Profil bilgileri yükleniyor...</div></div></main>;
  }

  if (status === "error") {
    return <main className={styles.page}><div className={styles.shell}><div className={styles.errorCard} role="alert"><h1>Profil bilgileri yüklenemedi</h1><p>{message}</p><button type="button" className={styles.primaryButton} onClick={() => void loadProfile()}>Tekrar Dene</button></div></div></main>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Öğrenci Paneli</p>
            <h1>Profilim</h1>
            <p className={styles.subtitle}>Kişisel bilgilerini güncel tut, hesabını güvenle kullan.</p>
          </div>
          <div className={styles.headerActions}><ThemeSwitcher /><AccentPicker /><Link href="/ogrenci" className={styles.backLink}><Icon name="arrow" className={styles.backIcon} /> Panele Dön</Link></div>
        </header>

        <div className={styles.grid}>
          <form className={styles.card} onSubmit={handleSubmit}>
            <div className={styles.cardHeading}><span className={styles.cardIcon}><Icon name="user" /></span><div><h2>Kişisel Bilgiler</h2><p>Yalnızca kendi profil bilgilerini güncelleyebilirsin.</p></div></div>
            <div className={styles.formGrid}>
              <label htmlFor="profile-name">Ad Soyad<span className={styles.required}>*</span><input id="profile-name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} aria-describedby="profile-name-help" aria-required="true" /></label>
              <label htmlFor="profile-birth-date">Doğum Tarihi<span className={styles.required}>*</span><input id="profile-birth-date" type="date" value={profile.birthDate} onChange={(event) => setProfile({ ...profile, birthDate: event.target.value })} aria-describedby="profile-birth-help" aria-required="true" /><small id="profile-birth-help">Tarih yalnızca profil bilgisi olarak kullanılır.</small></label>
              <label htmlFor="profile-class">Sınıf<span className={styles.required}>*</span><input id="profile-class" value={profile.classLevel} onChange={(event) => setProfile({ ...profile, classLevel: event.target.value })} aria-required="true" placeholder="Örn. 4-A" /></label>
              <label htmlFor="profile-school">Okul Adı <span className={styles.optional}>(İsteğe bağlı)</span><input id="profile-school" value={profile.schoolName} onChange={(event) => setProfile({ ...profile, schoolName: event.target.value })} aria-describedby="profile-school-help" /><small id="profile-school-help">Boş bırakabilirsin.</small></label>
            </div>
            <div className={styles.formFooter}><button type="submit" className={styles.primaryButton} disabled={isSaving || !isDirty}>{isSaving ? "Kaydediliyor..." : "Kişisel Bilgileri Kaydet"}</button>{message ? <p className={styles.message} role="status" aria-live="polite">{message}</p> : null}</div>
          </form>

          <section className={styles.card}>
            <div className={styles.cardHeading}><span className={styles.cardIcon}><Icon name="lock" /></span><div><h2>Hesap Bilgileri</h2><p>Kullanıcı adın öğretmenin tarafından belirlenir.</p></div></div>
            <label htmlFor="profile-username">Kullanıcı Adı<input id="profile-username" value={profile.username} readOnly aria-describedby="profile-username-help" className={styles.readonly} /><small id="profile-username-help">Kullanıcı adı değiştirilemez.</small></label>
          </section>

          <section className={`${styles.card} ${styles.securityCard}`}>
            <div className={styles.cardHeading}><span className={styles.cardIcon}><Icon name="lock" /></span><div><h2>Şifre Değiştir</h2><p>Hesap güvenliği için ayrı bir işlem.</p></div></div>
            <div className={styles.securityNotice} role="status"><strong>Şifre değişikliği şu anda kullanılamıyor.</strong><p>Bu öğrenci hesabı sistemi henüz güvenli Auth yeniden doğrulama akışına bağlı değil. Mevcut şifreyi düz metin olarak kontrol eden veya doğrulamasız değiştiren bir işlem sunulmuyor.</p><p>Şifreni değiştirmek için öğretmeninle iletişime geçebilirsin.</p></div>
          </section>
        </div>
      </div>
    </main>
  );
}
