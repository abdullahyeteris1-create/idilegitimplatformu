"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import {
  WORD_RACE_BRIDGE_MESSAGE_SOURCE,
  WORD_RACE_EXERCISE_TITLE,
  WORD_RACE_HOST_MESSAGE_SOURCE,
  WORD_RACE_RESULT_EXERCISE_TYPE,
  type WordRaceFinishedPayload,
  type WordRaceLeaderboardEntryView,
  type WordRaceLeaderboardGroupLabel,
} from "@/lib/word-race/wordRaceBridge";

const EXERCISE_TITLE = WORD_RACE_EXERCISE_TITLE;
const RESULT_EXERCISE_TYPE = WORD_RACE_RESULT_EXERCISE_TYPE;
const GAME_SRC = "/egzersizler/kelime-yarisi/oyun";

type SaveStatus = "idle" | "saving" | "success" | "error";

/**
 * Oyun motoru prototipin kendi HTML/JS'i olarak iframe icinde calisir; bu
 * bilesen yalnizca SONUC KOPRUSUDUR. Oyun bittiginde iframe postMessage ile
 * skoru bildirir, burada platformun standart guvenli sonuc akisina yazilir
 * (XP, odev/program tamamlama dahil).
 */
function isFinishedPayload(value: unknown): value is WordRaceFinishedPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.score === "number" &&
    typeof candidate.correctCount === "number" &&
    typeof candidate.wrongCount === "number" &&
    typeof candidate.durationSeconds === "number" &&
    typeof candidate.reachedLevel === "number" &&
    typeof candidate.lanes === "number" &&
    typeof candidate.reachedSpeedMs === "number" &&
    typeof candidate.carId === "string" &&
    typeof candidate.completionReason === "string" &&
    typeof candidate.maxWrong === "number"
  );
}

export function WordRaceExerciseClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const saveInFlightRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isGameRunning, setIsGameRunning] = useState(false);
  useEducationProgramExerciseRunning(Boolean(educationProgramLaunch) && isGameRunning);

  const educationProgramTaskId = educationProgramLaunch?.taskId;
  const { completionStatus, completeTaskAfterResultSave } =
    useEducationProgramTaskCompletion(educationProgramTaskId, RESULT_EXERCISE_TYPE);

  /**
   * Sinif siralamasini cekip oyunun KENDI sonuc ekranina gonderir. Sonuc
   * kaydedildikten SONRA cagrilir ki oyuncunun yeni skoru da listeye girsin.
   * iframe sandbox'li (opaque origin) oldugu icin veriyi kendisi cekemez;
   * bu yuzden postMessage ile iceri aktarilir.
   */
  const pushLeaderboard = useCallback(async () => {
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;

    let entries: WordRaceLeaderboardEntryView[] = [];
    let groupLabel: WordRaceLeaderboardGroupLabel = "Sınıf";

    try {
      const response = await fetch("/api/student/word-race-leaderboard", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        groupLabel?: unknown;
        entries?: unknown;
      };

      if (response.ok && payload.ok && Array.isArray(payload.entries)) {
        entries = payload.entries as WordRaceLeaderboardEntryView[];
        groupLabel = payload.groupLabel === "Lise" ? "Lise" : "Sınıf";
      }
    } catch {
      // Siralama gosterilemezse oyun akisi bozulmaz; bolum bos gecilir.
    }

    frame.postMessage(
      { source: WORD_RACE_HOST_MESSAGE_SOURCE, type: "leaderboard", groupLabel, entries },
      "*",
    );
  }, []);

  const persistResult = useCallback(
    async (payload: WordRaceFinishedPayload) => {
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      setSaveStatus("saving");
      setSaveMessage("Sonuç kaydediliyor…");

      const answered = payload.correctCount + payload.wrongCount;
      const successRate = answered > 0 ? Math.round((payload.correctCount / answered) * 100) : 0;

      try {
        await saveExerciseResultSecure({
          exerciseType: RESULT_EXERCISE_TYPE,
          exerciseTitle: EXERCISE_TITLE,
          score: Math.max(0, Math.round(payload.score)),
          successRate,
          correctCount: payload.correctCount,
          wrongCount: payload.wrongCount,
          durationSeconds: payload.durationSeconds,
          details: {
            category: "word-games",
            reachedLevel: payload.reachedLevel,
            lanes: payload.lanes,
            reachedSpeedMs: payload.reachedSpeedMs,
            carId: payload.carId,
            completionReason: payload.completionReason,
            maxWrong: payload.maxWrong,
          },
        });
        setSaveStatus("success");
        setSaveMessage("Sonuç kaydedildi.");
        await completeTaskAfterResultSave();
      } catch {
        setSaveStatus("error");
        setSaveMessage("Sonuç kaydedilemedi. Tekrar oynadığında yeniden denenecek.");
      } finally {
        saveInFlightRef.current = false;
        // Kayit basarisiz olsa bile mevcut siralama gosterilir.
        await pushLeaderboard();
      }
    },
    [completeTaskAfterResultSave, pushLeaderboard],
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // iframe sandbox'li (opaque origin) oldugu icin origin yerine pencere
      // kimligi dogrulanir: mesaj yalnizca bizim yukledigimiz oyun cercevesinden
      // kabul edilir.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;

      const data = event.data as { source?: unknown; type?: unknown; payload?: unknown } | null;
      if (!data || data.source !== WORD_RACE_BRIDGE_MESSAGE_SOURCE) {
        return;
      }

      if (data.type === "started") {
        setIsGameRunning(true);
        return;
      }

      if (data.type !== "finished") return;
      setIsGameRunning(false);

      if (!isFinishedPayload(data.payload)) return;

      // Hic soru cevaplanmadan kapatilan turlar sonuc/XP uretmez; siralama
      // yine de gosterilir.
      if (data.payload.correctCount + data.payload.wrongCount <= 0) {
        void pushLeaderboard();
        return;
      }

      void persistResult(data.payload);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [persistResult, pushLeaderboard]);

  const statusText = saveStatus === "idle" ? "" : saveMessage;

  return (
    <main className="flex min-h-screen w-full flex-col bg-slate-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">{EXERCISE_TITLE}</span>
          {statusText ? (
            <span
              className={
                saveStatus === "error"
                  ? "text-rose-300"
                  : saveStatus === "success"
                    ? "text-emerald-300"
                    : "text-slate-400"
              }
              role="status"
            >
              {statusText}
            </span>
          ) : null}
          {completionStatus.state !== "idle" && completionStatus.message ? (
            <span className="text-slate-400" role="status">
              {completionStatus.message}
            </span>
          ) : null}
        </div>
        <Link
          href={educationProgramLaunch ? "/ogrenci/egitim-programim" : "/egzersizler"}
          className="underline underline-offset-2 hover:text-white"
        >
          {educationProgramLaunch ? "Eğitim Programım" : "Egzersizler"}
        </Link>
      </div>
      <iframe
        ref={frameRef}
        title={EXERCISE_TITLE}
        src={GAME_SRC}
        sandbox="allow-scripts"
        className="w-full flex-1 border-0"
        style={{ minHeight: "calc(100dvh - 2.5rem)" }}
      />
    </main>
  );
}
