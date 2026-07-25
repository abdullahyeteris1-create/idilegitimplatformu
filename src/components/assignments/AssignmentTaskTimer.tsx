"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROGRAM_TASK_COMPLETED_EVENT } from "@/lib/results/programTaskEvents";
import { useAssignmentTask } from "@/components/assignments/AssignmentTaskProvider";

const STUDENT_PANEL_ROUTE = "/ogrenci";

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Odev gorevinin OTORITER oturum sayaci. Tum egzersiz sayfalarinda gorunur
 * (bkz. src/app/egzersizler/layout.tsx) ve yalniz URL'de ?programTaskId=
 * varken devreye girer - serbest calismada hicbir sey gostermez.
 *
 * NEDEN AYRI/USTTE BIR SAYAC: 9 hazir egzersizin sure modeli birbirinden
 * farkliydi (bazilarinin kendi 1-5 dakikalik secicisi vardi, bazilarinda -
 * takistoskop, kart eslestirme, hafiza, harf-rakam - hic oturum siniri
 * YOKTU). Ogretmenin belirledigi sureyi tek ve tutarli bir yerden uygulamak
 * icin sayac egzersizin DISINDA, ortak bir katmanda tutulur; egzersizler
 * ayrica kendi surelerini de bu degerden alir (bkz. useAssignmentTask).
 *
 * SURE DOLUMU BASARISIZLIK DEGILDIR: sure bittiginde gorev
 * completion_reason='time_expired' ile GUVENLI bicimde tamamlanir ve
 * "Tebrikler" ekrani gosterilir (bkz. 20260725160000_...sql).
 *
 * DOGRULUK NOTU: kalan sure her saniye "azaltilarak" degil, baslangicta
 * hesaplanan bir BITIS ZAMAN DAMGASINDAN turetilir - boylece tarayici arka
 * plan sekmelerinde zamanlayicilari kistiginda sayac geride kalmaz.
 */
export function AssignmentTaskTimer() {
  const task = useAssignmentTask();

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [completionFailed, setCompletionFailed] = useState(false);
  const deadlineRef = useRef<number | null>(null);

  const alreadyCompleted = task?.status === "completed";
  const shouldRun = Boolean(task) && !alreadyCompleted && (task?.durationSeconds ?? 0) > 0;

  /**
   * Gorevi sure dolumu nedeniyle tamamlar. resultId GONDERILMEZ - RPC bunu
   * 'time_expired' olarak yorumlar. Ogrenci egzersizi zaten normal bitirmisse
   * cagri idempotenttir (sunucu sessizce basarili doner), bu yuzden burada
   * ayrica bir durum kontrolu yapilmasi gerekmez.
   */
  const completeByExpiry = useCallback(async (taskId: string) => {
    setCompletionFailed(false);
    try {
      const response = await fetch(
        `/api/student/assignment-program-tasks/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          // Govde BOS: resultId gonderilmez, sunucu bunu sure dolumu olarak
          // yorumlar (bkz. complete/route.ts icindeki isTimeExpiry).
          body: JSON.stringify({}),
        },
      );
      const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      // Basarisizligi SESSIZCE yutma: aksi halde gorev sunucuda acik kalirken
      // ogrenciye "tamamlandiniz" denir ve hata fark edilmez.
      setCompletionFailed(!response.ok || payload?.ok !== true);
    } catch {
      setCompletionFailed(true);
    }
  }, []);

  // Ogrenci egzersizi kendi dogal akisinda bitirdiginde (sonuc kaydedilip
  // gorev tamamlandiginda) sayaci durdurup ayni "Tebrikler" ekranini goster.
  useEffect(() => {
    const handleCompleted = () => {
      // Egzersiz kendi akisinda gorevi tamamladi - sure dolumu cagrisina
      // gerek yok, uyari da gosterilmez.
      setCompletionFailed(false);
      setFinished(true);
    };
    window.addEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
    return () => window.removeEventListener(PROGRAM_TASK_COMPLETED_EVENT, handleCompleted);
  }, []);

  useEffect(() => {
    if (!shouldRun || !task) return;

    // Baslangic degeri STATE'e yazilmaz - ilk render'da asagida
    // `remainingSeconds ?? task.durationSeconds` ile turetilir. Boylece
    // effect govdesinde senkron setState olmaz.
    deadlineRef.current = Date.now() + task.durationSeconds * 1000;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        window.clearInterval(intervalId);
        setFinished(true);
        void completeByExpiry(task.id);
      }
    };

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [shouldRun, task, completeByExpiry]);

  if (!task) return null;

  if (finished) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="assignment-task-finished-title"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            🎉
          </div>
          <h2 id="assignment-task-finished-title" className="text-xl font-black text-slate-900">
            Tebrikler, bu çalışmayı tamamladınız!
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Sonraki çalışmaya geçebilirsiniz.
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {task.dayNumber}. gün · {task.taskOrder}. çalışma · {task.title}
          </p>

          {completionFailed ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-800">
                Çalışman kaydedilemedi, bağlantını kontrol edip tekrar dene.
              </p>
              <button
                type="button"
                onClick={() => void completeByExpiry(task.id)}
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                Tekrar Dene
              </button>
            </div>
          ) : null}

          <Link
            href={STUDENT_PANEL_ROUTE}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand,#b91c1c)] px-6 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
          >
            Ödevlerime Dön
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full bg-emerald-600/95 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
        Bu çalışmayı tamamladınız
      </div>
    );
  }

  if (!shouldRun) return null;

  // Sayac ilk saniyesini isleyene kadar ogretmenin belirledigi tam sure
  // gosterilir (bkz. yukaridaki not).
  const displaySeconds = remainingSeconds ?? task.durationSeconds;
  const isLow = displaySeconds <= 30;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Kalan süre ${formatClock(displaySeconds)}`}
      className={`pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2 rounded-full px-4 py-1.5 text-base font-black tabular-nums shadow-lg transition-colors ${
        isLow ? "bg-red-600 text-white" : "bg-slate-900/90 text-white"
      }`}
    >
      {formatClock(displaySeconds)}
    </div>
  );
}
