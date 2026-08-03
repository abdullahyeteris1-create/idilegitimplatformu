"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExerciseFullscreenShell from "@/components/exercises/ExerciseFullscreenShell";
import { useAssignmentTask } from "@/components/assignments/AssignmentTaskProvider";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { WordRaceEngine } from "./wordRaceEngine";
import {
  WORD_RACE_CARS,
  WORD_RACE_LEVELS,
  WORD_RACE_MAX_WRONG,
  WORD_RACE_RESULT_TYPE,
  WORD_RACE_SPEEDS,
  WORD_RACE_TITLE,
  getWordRaceLevel,
  isWordRaceSpeed,
} from "./wordRaceConfig";
import type { WordRaceCarId, WordRaceResult, WordRaceSnapshot } from "./types";
import styles from "./word-race.module.css";

type WordRaceGameProps = {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

const INITIAL_SNAPSHOT: WordRaceSnapshot = {
  phase: "menu",
  score: 0,
  correct: 0,
  wrong: 0,
  level: 1,
  lanes: 3,
  speedMs: 2_500,
  levelProgress: 0,
  maxLevelProgress: 10,
};

function readNumberSetting(
  settings: Record<string, string | number | boolean> | undefined,
  key: string,
): number | null {
  const value = settings?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function WordRaceGame({ educationProgramLaunch }: WordRaceGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<WordRaceEngine | null>(null);
  const finishHandlerRef = useRef<(result: WordRaceResult) => void>(() => undefined);
  const pendingPayloadRef = useRef<SecureExerciseResultInput | null>(null);
  const saveInFlightRef = useRef(false);
  const saveCompletedRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);
  const assignmentTask = useAssignmentTask();
  const isLockedLaunch = Boolean(assignmentTask || educationProgramLaunch);

  const assignedLevel = assignmentTask?.currentLevel ?? educationProgramLaunch?.initialLevel ?? 1;
  const assignedSpeed =
    readNumberSetting(assignmentTask?.settings, "speedMs") ??
    readNumberSetting(educationProgramLaunch?.settings, "speedMs") ??
    2_500;

  const [selectedLevel, setSelectedLevel] = useState(() => getWordRaceLevel(assignedLevel).level);
  const [selectedSpeedMs, setSelectedSpeedMs] = useState(() => isWordRaceSpeed(assignedSpeed) ? assignedSpeed : 2_500);
  const [selectedCarId, setSelectedCarId] = useState<WordRaceCarId>("spor");
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [result, setResult] = useState<WordRaceResult | null>(null);
  const [banner, setBanner] = useState<{ title: string; message: string } | null>(null);
  const [speedTransition, setSpeedTransition] = useState<{ from: number; to: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const effectiveLevel = isLockedLaunch ? getWordRaceLevel(assignedLevel).level : selectedLevel;
  const effectiveSpeedMs = isLockedLaunch && isWordRaceSpeed(assignedSpeed)
    ? assignedSpeed
    : selectedSpeedMs;

  const educationProgramTaskId = educationProgramLaunch && !assignmentTask
    ? educationProgramLaunch.taskId
    : undefined;
  const { completionStatus, completeTaskAfterResultSave, retryTaskCompletion } =
    useEducationProgramTaskCompletion(educationProgramTaskId, WORD_RACE_RESULT_TYPE);

  const persistResult = useCallback(async (payload: SecureExerciseResultInput) => {
    if (saveInFlightRef.current || saveCompletedRef.current) return;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    try {
      const saved = await saveExerciseResultSecure(payload);
      saveCompletedRef.current = true;
      const completionOk = await completeTaskAfterResultSave();
      setSaveStatus("success");
      if (saved.assignmentCompletionStatus === "failed") {
        setSaveMessage("Sonuç kaydedildi ancak görev tamamlanamadı.");
      } else if (!completionOk) {
        setSaveMessage("Sonuç kaydedildi; program ilerlemesi yeniden denenebilir.");
      } else {
        setSaveMessage("Sonuç başarıyla kaydedildi.");
      }
    } catch {
      setSaveStatus("error");
      setSaveMessage("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [completeTaskAfterResultSave]);

  const handleFinish = useCallback((finishedResult: WordRaceResult) => {
    setResult(finishedResult);
    setSpeedTransition(null);
    const payload: SecureExerciseResultInput = {
      exerciseType: WORD_RACE_RESULT_TYPE,
      exerciseTitle: WORD_RACE_TITLE,
      score: finishedResult.score,
      successRate: finishedResult.successRate,
      correctCount: finishedResult.correct,
      wrongCount: finishedResult.wrong,
      durationSeconds: finishedResult.durationSeconds,
      completedAt: new Date().toISOString(),
      details: {
        category: "attention",
        reachedLevel: finishedResult.reachedLevel,
        reachedSpeedMs: finishedResult.reachedSpeedMs,
        startingLevel: finishedResult.startingLevel,
        startingSpeedMs: finishedResult.startingSpeedMs,
        carId: finishedResult.carId,
        completionReason: finishedResult.completionReason,
        completedSpeedTiers: finishedResult.completedSpeedTiers,
        maxWrong: WORD_RACE_MAX_WRONG,
      },
    };
    pendingPayloadRef.current = payload;
    void persistResult(payload);
  }, [persistResult]);

  useEffect(() => {
    finishHandlerRef.current = handleFinish;
  }, [handleFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;
    const engine = new WordRaceEngine(canvas, {
      onSnapshot: setSnapshot,
      onBanner: (title, message) => {
        if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
        setBanner({ title, message });
        bannerTimerRef.current = window.setTimeout(() => {
          bannerTimerRef.current = null;
          setBanner(null);
        }, 1_500);
      },
      onSpeedTransition: (from, to) => setSpeedTransition({ from, to }),
      onFinish: (finishedResult) => finishHandlerRef.current(finishedResult),
    });
    engineRef.current = engine;
    return () => {
      if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const startGame = () => {
    saveCompletedRef.current = false;
    saveInFlightRef.current = false;
    pendingPayloadRef.current = null;
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage("");
    setSpeedTransition(null);
    engineRef.current?.start({
      level: effectiveLevel,
      speedMs: effectiveSpeedMs,
      carId: selectedCarId,
    });
  };

  const returnToMenu = () => {
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage("");
    setSnapshot((current) => ({ ...current, phase: "menu" }));
  };

  const retrySave = () => {
    if (!pendingPayloadRef.current) return;
    void persistResult(pendingPayloadRef.current);
  };

  const status = useMemo(() => (
    <>
      <span className="compact-stat-chip">Puan: {snapshot.score}</span>
      <span className="compact-stat-chip">Doğru: {snapshot.correct}</span>
      <span className="compact-stat-chip">Yanlış: {snapshot.wrong}/{WORD_RACE_MAX_WRONG}</span>
      <span className="compact-stat-chip">Seviye: {snapshot.level}</span>
      <span className="compact-stat-chip">Hız: {snapshot.speedMs} ms</span>
    </>
  ), [snapshot]);

  return (
    <ExerciseFullscreenShell
      title={WORD_RACE_TITLE}
      description="Doğru kelimeyi takip et, şerit değiştir ve dikkatini koru."
      backHref="/egzersizler?category=focus"
      status={status}
    >
      <div className={styles.root}>
        <div className={styles.stage}>
          <canvas ref={canvasRef} className={styles.canvas} aria-label="Kelime Yarışı oyun alanı" />

          {snapshot.phase !== "menu" && snapshot.phase !== "ended" ? (
            <div className={styles.hud}>
              <div className={styles.progressCard}>
                <span>Seviye {snapshot.level} · {snapshot.lanes} şerit</span>
                <strong>{snapshot.levelProgress} / {snapshot.maxLevelProgress}</strong>
                <i><b style={{ width: `${snapshot.levelProgress / snapshot.maxLevelProgress * 100}%` }} /></i>
              </div>
              <button
                type="button"
                className={styles.smallButton}
                onClick={() => snapshot.phase === "paused" ? engineRef.current?.resume() : engineRef.current?.pause()}
                disabled={snapshot.phase === "transition"}
              >
                {snapshot.phase === "paused" ? "Devam" : "Duraklat"}
              </button>
            </div>
          ) : null}

          {snapshot.phase === "playing" ? (
            <div className={styles.controls}>
              <button type="button" aria-label="Sola geç" onClick={() => engineRef.current?.shift(-1)}>←</button>
              <button type="button" aria-label="Sağa geç" onClick={() => engineRef.current?.shift(1)}>→</button>
            </div>
          ) : null}

          {banner ? (
            <div className={styles.banner} role="status">
              <strong>{banner.title}</strong>
              <span>{banner.message}</span>
            </div>
          ) : null}

          {snapshot.phase === "menu" ? (
            <div className={styles.overlay}>
              <section className={styles.sheet}>
                <h2>🏁 Kelime Yarışı</h2>
                <p>Her sırada diğerlerinden farklı olan kelimeyi bul ve arabanı o şeride yönlendir.</p>
                <div className={styles.rules}>
                  <span><b>+10</b> doğru şerit</span>
                  <span><b>−5</b> yanlış şerit</span>
                </div>

                <h3>Araba</h3>
                <div className={styles.carGrid}>
                  {WORD_RACE_CARS.map((car) => (
                    <button
                      type="button"
                      key={car.id}
                      className={selectedCarId === car.id ? styles.activeChoice : undefined}
                      onClick={() => setSelectedCarId(car.id)}
                    >
                      <i style={{ background: car.color }} />
                      {car.name}
                    </button>
                  ))}
                </div>

                <h3>Hız</h3>
                <div className={styles.choiceGrid}>
                  {WORD_RACE_SPEEDS.map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      disabled={isLockedLaunch}
                      className={effectiveSpeedMs === speed ? styles.activeChoice : undefined}
                      onClick={() => setSelectedSpeedMs(speed)}
                    >{speed} ms</button>
                  ))}
                </div>

                <h3>Başlangıç seviyesi</h3>
                <div className={styles.choiceGrid}>
                  {WORD_RACE_LEVELS.map((level) => (
                    <button
                      type="button"
                      key={level.level}
                      disabled={isLockedLaunch}
                      className={effectiveLevel === level.level ? styles.activeChoice : undefined}
                      onClick={() => setSelectedLevel(level.level)}
                    >Seviye {level.level}<small>{level.lanes} şerit</small></button>
                  ))}
                </div>
                <button type="button" className={styles.primaryButton} onClick={startGame}>Çalışmayı Başlat</button>
                <p className={styles.hint}>← →, A / D, dokunmatik düğmeler veya kaydırma ile şerit değiştir.</p>
              </section>
            </div>
          ) : null}

          {snapshot.phase === "paused" ? (
            <div className={styles.overlay}>
              <section className={styles.sheet}>
                <h2>Duraklatıldı</h2>
                <p>Hazır olduğunda aynı yerden devam edebilirsin.</p>
                {!isLockedLaunch ? (
                  <div className={styles.choiceGrid}>
                    {WORD_RACE_SPEEDS.map((speed) => (
                      <button
                        type="button"
                        key={speed}
                        className={snapshot.speedMs === speed ? styles.activeChoice : undefined}
                        onClick={() => engineRef.current?.setSpeed(speed)}
                      >{speed} ms</button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className={styles.primaryButton} onClick={() => engineRef.current?.resume()}>Devam Et</button>
                <button type="button" className={styles.secondaryButton} onClick={() => engineRef.current?.finish("user_exit")}>Çalışmayı Bitir ve Özeti Gör</button>
              </section>
            </div>
          ) : null}

          {snapshot.phase === "transition" && speedTransition ? (
            <div className={styles.overlay} role="dialog" aria-modal="true">
              <section className={styles.sheet}>
                <h2>Tebrikler! 🎉</h2>
                <p>{speedTransition.from} ms hızındaki bütün seviyeleri tamamladın.</p>
                <div className={styles.speedTransition}>{speedTransition.from} ms → {speedTransition.to} ms</div>
                <p>Yeni hızda 1. seviyeden otomatik devam ediliyor…</p>
              </section>
            </div>
          ) : null}

          {result ? (
            <div className={styles.overlay} role="dialog" aria-modal="true">
              <section className={styles.sheet}>
                <h2>{result.completionReason === "all_levels_completed" ? "Muhteşem! 🏆" : "Çalışma Tamamlandı"}</h2>
                <p>{result.completionReason === "wrong_limit" ? `${WORD_RACE_MAX_WRONG} yanlış hakkına ulaştın.` : "Tur özetin hazır."}</p>
                <div className={styles.stats}>
                  <div><strong>{result.score}</strong><span>Toplam Puan</span></div>
                  <div><strong>{result.correct}</strong><span>Toplam Doğru</span></div>
                  <div><strong>{result.wrong}</strong><span>Toplam Yanlış</span></div>
                  <div><strong>{result.successRate}%</strong><span>Başarı Oranı</span></div>
                </div>
                {saveMessage ? <p className={saveStatus === "error" ? styles.saveError : styles.saveMessage}>{saveMessage}</p> : null}
                {saveStatus === "error" ? <button type="button" className={styles.secondaryButton} onClick={retrySave}>Kaydı Yeniden Dene</button> : null}
                {completionStatus.state === "error" ? (
                  <button type="button" className={styles.secondaryButton} onClick={() => void retryTaskCompletion()}>Program İlerlemesini Yeniden Dene</button>
                ) : null}
                <button type="button" className={styles.primaryButton} onClick={startGame} disabled={saveStatus === "saving"}>Yeniden Oyna</button>
                <button type="button" className={styles.secondaryButton} onClick={returnToMenu} disabled={saveStatus === "saving"}>Ana Menüye Dön</button>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </ExerciseFullscreenShell>
  );
}

export default WordRaceGame;
