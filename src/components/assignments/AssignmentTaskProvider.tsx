"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Ogretmenin sablonda belirledigi, TEK bir odev gorevine ait calisma ayarlari.
 * Bu degerler HER ZAMAN sunucudan (oturum cookie'siyle dogrulanarak) okunur -
 * URL'den asla alinmaz, boylece ogrenci adres cubugundan sureyi/seviyeyi
 * degistiremez. URL yalniz gorev kimligini (?programTaskId=) tasir.
 */
export type AssignmentTaskConfig = {
  id: string;
  status: string;
  exerciseSlug: string;
  title: string;
  dayNumber: number;
  taskOrder: number;
  currentLevel: number;
  durationSeconds: number;
  settings: Record<string, string | number | boolean>;
};

/** Egzersiz bilesenleri bunu cagirarak odev ayarlarini okur; serbest calismada null doner. */
const AssignmentTaskContext = createContext<AssignmentTaskConfig | null>(null);

export function useAssignmentTask(): AssignmentTaskConfig | null {
  return useContext(AssignmentTaskContext);
}

/**
 * Bir egzersize ozel ayari (ör. "speedMs") odevden okur; odev modunda
 * degilsek veya o anahtar sablonda tanimli degilse `fallback` doner.
 * Deger tipi beklenenden farkliysa da guvenle `fallback`e duser.
 */
export function useAssignmentSetting<T extends string | number | boolean>(
  key: string,
  fallback: T,
): T {
  const task = useAssignmentTask();
  if (!task) return fallback;
  const value = task.settings[key];
  return typeof value === typeof fallback ? (value as T) : fallback;
}

/**
 * Egzersizin kullanacagi TOPLAM oturum suresi (saniye). Odev modunda
 * ogretmenin belirledigi sure, serbest calismada egzersizin kendi secimi
 * gecerlidir.
 *
 * Bu, "bazi calismalar 300 saniye secilmesine ragmen 1 dakikadan geri
 * sayiyordu" sorununun kok cozumudur: egzersizlerin kendi varsayilan sure
 * secicileri (cogunda 60 sn) odev modunda devre disi kalir.
 */
export function useAssignedDurationSeconds(fallbackSeconds: number): number {
  const task = useAssignmentTask();
  if (!task || task.durationSeconds <= 0) return fallbackSeconds;
  return task.durationSeconds;
}

/** Odev modunda mi? (sure/seviye seciciler bu durumda gizlenir) */
export function useIsAssignmentMode(): boolean {
  return useAssignmentTask() !== null;
}

function readProgramTaskId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("programTaskId")?.trim() || null;
}

type TaskResponse = {
  ok?: boolean;
  message?: string;
  task?: AssignmentTaskConfig;
};

/**
 * Tum egzersiz sayfalarini saran saglayici (bkz. src/app/egzersizler/layout.tsx).
 * URL'de ?programTaskId= yoksa hicbir istek atmaz ve hicbir sey degistirmez -
 * serbest calisma akisi tamamen etkilenmez.
 */
export function AssignmentTaskProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<AssignmentTaskConfig | null>(null);

  useEffect(() => {
    const taskId = readProgramTaskId();
    if (!taskId) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/student/assignment-program-tasks/${encodeURIComponent(taskId)}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        const payload = (await response.json()) as TaskResponse;
        if (cancelled) return;

        if (response.ok && payload.ok && payload.task) {
          setTask(payload.task);
        }
      } catch {
        // Ayarlar okunamazsa egzersiz kendi varsayilanlariyla calismaya devam
        // eder - ogrencinin calismasi engellenmez.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <AssignmentTaskContext.Provider value={task}>{children}</AssignmentTaskContext.Provider>;
}
