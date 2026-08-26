"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import {
  generateTargetTotalRound,
  getTargetTotalPoints,
  getTargetTotalStatus,
  getTargetTotalSummary,
  TARGET_TOTAL_LEVEL_CONFIG,
  TARGET_TOTAL_SPEED_CONFIG,
  TARGET_TOTAL_TOTAL_ROUNDS,
  type TargetTotalLevel,
  type TargetTotalRound,
  type TargetTotalSpeed,
} from "@/lib/exercises/targetTotal";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import styles from "./targetTotalGame.module.css";

type Props = { educationProgramLaunch?: EducationProgramExerciseLaunchProps };
type Screen = "setup" | "game" | "result";
type Feedback = { type: "success" | "error" | "timeout"; title: string; text: string; good: boolean };
type ConfettiPiece = { id: number; left: string; color: string; delay: string; drift: string; spin: string };

const LEVEL_BY_NUMBER: TargetTotalLevel[] = ["beginner", "advanced", "master", "expert"];
const VALID_LEVELS: TargetTotalLevel[] = ["beginner", "advanced", "master", "expert"];
const VALID_SPEEDS: TargetTotalSpeed[] = ["relaxed", "normal", "fast"];
const COLORS = ["#5b4ae8", "#2878e8", "#10b981", "#ffc857", "#f06a85"];

function settingString(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function settingNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function BookIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 7h6M9 11h4"/></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>;
}

function SoundIcon({ enabled }: { enabled: boolean }) {
  return enabled
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="m23 9-6 6M17 9l6 6"/></svg>;
}

function FeedbackIcon({ type }: { type: Feedback["type"] }) {
  if (type === "timeout") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16h.01"/></svg>;
  if (type === "error") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
}

export function TargetTotalGameClient({ educationProgramLaunch }: Props) {
  const task = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const settings = task?.settings ?? educationProgramLaunch?.settings ?? {};
  const assignedLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
  const levelFromAssignment = LEVEL_BY_NUMBER[Math.max(0, Math.min(3, settingNumber(assignedLevel, 1) - 1))];
  const configuredLevel = settingString(settings.level, levelFromAssignment) as TargetTotalLevel;
  const initialLevel = VALID_LEVELS.includes(configuredLevel) ? configuredLevel : levelFromAssignment;
  const initialSpeed = settingString(settings.speed, "normal") as TargetTotalSpeed;
  const assignmentRequested = assignmentMode || Boolean(educationProgramLaunch) || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("programTaskId"));
  const settingsReady = !assignmentRequested || Boolean(task || educationProgramLaunch);

  const [screen, setScreen] = useState<Screen>("setup");
  const [level, setLevel] = useState<TargetTotalLevel>(initialLevel);
  const [speed, setSpeed] = useState<TargetTotalSpeed>(VALID_SPEEDS.includes(initialSpeed) ? initialSpeed : "normal");
  const [roundLimit, setRoundLimit] = useState(assignmentRequested ? Math.max(1, Math.round(settingNumber(settings.rounds, TARGET_TOTAL_TOTAL_ROUNDS))) : TARGET_TOTAL_TOTAL_ROUNDS);
  const [roundNumber, setRoundNumber] = useState(0);
  const [current, setCurrent] = useState<TargetTotalRound | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(TARGET_TOTAL_SPEED_CONFIG[initialSpeed]?.seconds ?? 35);
  const [timerRatio, setTimerRatio] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [elapsedTimes, setElapsedTimes] = useState<number[]>([]);

  const previousTarget = useRef<number | null>(null);
  const previousCardSignature = useRef("");
  const roundStartedAt = useRef(0);
  const gameStartedAt = useRef(0);
  const finalized = useRef(false);
  const roundResolved = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const confettiTimer = useRef<number | null>(null);
  const completionReason = useRef<"manual" | "natural">("natural");

  const selectedTotal = useMemo(() => current?.cards.reduce(
    (sum, card) => selectedIds.includes(card.id) ? sum + card.value : sum,
    0,
  ) ?? 0, [current, selectedIds]);
  const secondsLimit = TARGET_TOTAL_SPEED_CONFIG[speed].seconds;
  const summary = getTargetTotalSummary(correct, wrong, elapsedTimes);
  const isRunning = screen === "game" && !answered;
  useEducationProgramExerciseRunning(isRunning);

  useEffect(() => {
    if (!task && !educationProgramLaunch) return;
    const nextSettings = task?.settings ?? educationProgramLaunch?.settings ?? {};
    const nextLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
    const timeoutId = window.setTimeout(() => {
      const fallbackLevel = LEVEL_BY_NUMBER[Math.max(0, Math.min(3, settingNumber(nextLevel, 1) - 1))];
      const configuredNextLevel = settingString(nextSettings.level, fallbackLevel) as TargetTotalLevel;
      setLevel(VALID_LEVELS.includes(configuredNextLevel) ? configuredNextLevel : fallbackLevel);
      const nextSpeed = settingString(nextSettings.speed, "normal") as TargetTotalSpeed;
      if (VALID_SPEEDS.includes(nextSpeed)) setSpeed(nextSpeed);
      setRoundLimit(Math.max(1, Math.round(settingNumber(nextSettings.rounds, TARGET_TOTAL_TOTAL_ROUNDS))));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [task, educationProgramLaunch]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [screen]);

  useEffect(() => () => {
    if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    void audioContext.current?.close();
  }, []);

  const playTone = useCallback((frequency: number, duration: number, volume: number, force = false) => {
    if (!soundEnabled && !force) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext.current ??= new AudioContextClass();
      if (audioContext.current.state === "suspended") void audioContext.current.resume();
      const oscillator = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.current.destination);
      oscillator.start();
      oscillator.stop(audioContext.current.currentTime + duration);
    } catch {
      setSoundEnabled(false);
    }
  }, [soundEnabled]);

  const playSuccessSound = useCallback(() => {
    playTone(523, 0.12, 0.045);
    window.setTimeout(() => playTone(659, 0.12, 0.045), 90);
    window.setTimeout(() => playTone(784, 0.18, 0.05), 180);
  }, [playTone]);

  const launchConfetti = useCallback((pieceCount = 22) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pieces = Array.from({ length: pieceCount }, (_, index) => ({
      id: Date.now() + index,
      left: `${8 + Math.floor(Math.random() * 85)}%`,
      color: COLORS[index % COLORS.length],
      delay: `${Math.random() * 0.18}s`,
      drift: `${-90 + Math.floor(Math.random() * 181)}px`,
      spin: `${260 + Math.floor(Math.random() * 501)}deg`,
    }));
    setConfetti(pieces);
    if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => setConfetti([]), 1500);
  }, []);

  function beginRound(nextRoundNumber: number) {
    const next = generateTargetTotalRound({
      level,
      roundNumber: nextRoundNumber,
      previousTarget: previousTarget.current,
      previousCardSignature: previousCardSignature.current,
    });
    previousTarget.current = next.target;
    previousCardSignature.current = next.signature;
    setRoundNumber(nextRoundNumber);
    setCurrent(next);
    setSelectedIds([]);
    setAnswered(false);
    roundResolved.current = false;
    setFeedback(null);
    setRemainingSeconds(TARGET_TOTAL_SPEED_CONFIG[speed].seconds);
    setTimerRatio(1);
    roundStartedAt.current = performance.now();
    setScreen("game");
  }

  function startGame() {
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setSaved(false);
    setSaving(false);
    setSaveError("");
    setElapsedTimes([]);
    previousTarget.current = null;
    previousCardSignature.current = "";
    finalized.current = false;
    gameStartedAt.current = performance.now();
    beginRound(1);
  }

  const submitAnswer = useCallback((timedOut = false) => {
    if (roundResolved.current || answered || !current) return;
    roundResolved.current = true;
    const elapsed = Math.min(
      (performance.now() - roundStartedAt.current) / 1000,
      secondsLimit ?? Infinity,
    );
    setElapsedTimes((times) => [...times, elapsed]);
    setAnswered(true);
    const isCorrect = !timedOut && selectedTotal === current.target;
    if (isCorrect) {
      const points = getTargetTotalPoints(secondsLimit, elapsed);
      setCorrect((value) => value + 1);
      setScore((value) => value + points);
      setFeedback({ type: "success", title: "Harika, doğru toplam!", text: `Hedefi ${elapsed.toFixed(1)} saniyede buldun. +${points} puan`, good: true });
      launchConfetti();
      playSuccessSound();
    } else {
      const solutionText = current.solution.join(" + ");
      setWrong((value) => value + 1);
      setFeedback(timedOut
        ? { type: "timeout", title: "Süre doldu", text: `Doğru kombinasyon: ${solutionText} = ${current.target}`, good: false }
        : { type: "error", title: "Bu kez olmadı", text: `Doğru kombinasyon: ${solutionText} = ${current.target}`, good: false });
      playTone(timedOut ? 220 : 250, timedOut ? 0.18 : 0.16, timedOut ? 0.055 : 0.05);
    }
  }, [answered, current, secondsLimit, selectedTotal, launchConfetti, playSuccessSound, playTone]);

  useEffect(() => {
    if (screen !== "game" || answered || !secondsLimit) return;
    const tick = () => {
      const elapsed = (performance.now() - roundStartedAt.current) / 1000;
      const remaining = Math.max(0, secondsLimit - elapsed);
      setRemainingSeconds(remaining);
      setTimerRatio(remaining / secondsLimit);
      if (remaining <= 0) submitAnswer(true);
    };
    tick();
    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  }, [screen, answered, secondsLimit, submitAnswer]);

  const saveResult = useCallback(async (reason: "manual" | "natural") => {
    if (finalized.current || saving) return;
    finalized.current = true;
    completionReason.current = reason;
    setSaving(true);
    setSaveError("");
    const total = correct + wrong;
    const resultSummary = getTargetTotalSummary(correct, wrong, elapsedTimes);
    try {
      await saveExerciseResultSecure({
        exerciseType: "mental-arithmetic-target-total",
        exerciseTitle: "Mental Aritmetik – Hedef Toplam",
        score,
        successRate: resultSummary.successRate,
        correctCount: correct,
        wrongCount: wrong,
        durationSeconds: Math.max(0, Math.round((performance.now() - gameStartedAt.current) / 1000)),
        completedAt: new Date().toISOString(),
        submissionKey: `mental-mental-arithmetic-target-total-${gameStartedAt.current}`,
        assignmentItemId: undefined,
        programTaskId: educationProgramLaunch?.taskId,
        details: {
          level,
          speed,
          totalRounds: total,
          averageAnswerSeconds: Math.round(resultSummary.averageSeconds * 10) / 10,
          completionReason: reason,
        },
      });
      setSaved(true);
    } catch {
      finalized.current = false;
      setSaveError("Sonuç kaydedilemedi. Lütfen tekrar dene.");
    } finally {
      setSaving(false);
    }
  }, [saving, correct, wrong, score, educationProgramLaunch, level, speed, elapsedTimes]);

  function showResults(reason: "manual" | "natural") {
    setScreen("result");
    const resultSummary = getTargetTotalSummary(correct, wrong, elapsedTimes);
    if (resultSummary.successRate >= 90) launchConfetti(34);
    void saveResult(reason);
  }

  const toggleCard = (cardId: string) => {
    if (answered) return;
    setSelectedIds((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : [...ids, cardId]);
    playTone(selectedIds.includes(cardId) ? 390 : 520, 0.045, 0.025);
  };

  const nextRound = () => {
    if (roundNumber >= roundLimit) showResults("natural");
    else beginRound(roundNumber + 1);
  };

  const changeSettings = () => {
    setScreen("setup");
    setCurrent(null);
    setSelectedIds([]);
    setFeedback(null);
  };

  const resultMessage = summary.successRate >= 90
    ? ["Toplam ustası!", "Sayıları çok hızlı ve dikkatli bir şekilde bir araya getirdin."]
    : summary.successRate >= 70
      ? ["Çok iyi gidiyorsun!", "Toplamların çoğunu doğru buldun. Bir tur daha seni ustalığa yaklaştırır."]
      : ["Güzel çalışma!", "Her tur yeni bir fırsat. Bir sonraki oyunda daha da hızlanabilirsin."];
  const statusText = current ? getTargetTotalStatus(selectedIds.length, selectedTotal, current.target) : "Henüz kart seçmedin";
  const timerClass = timerRatio <= 0.2 ? styles.timerUrgent : timerRatio <= 0.45 ? styles.timerWarning : "";
  const settingDisabled = assignmentRequested;

  return <main className={styles.page}>
    <span className={`${styles.backgroundShape} ${styles.shapeOne}`} aria-hidden="true" />
    <span className={`${styles.backgroundShape} ${styles.shapeTwo}`} aria-hidden="true" />
    <div className={styles.appShell}>
      <header className={styles.brandBar}>
        <Link href="/egzersizler/mental-aritmetik" className={styles.brand} aria-label="İdil Eğitim Mental Aritmetik merkezi">
          <span className={styles.brandMark}><BookIcon /></span><span>İdil Eğitim</span>
        </Link>
        <div className={styles.brandActions}>
          {screen === "game" && <button className={styles.finishButton} type="button" onClick={() => showResults("manual")}>Bitir</button>}
          <button className={styles.soundButton} type="button" onClick={() => { const enabled = !soundEnabled; setSoundEnabled(enabled); if (enabled) playTone(520, 0.08, 0.03, true); }} aria-label={soundEnabled ? "Ses efektlerini kapat" : "Ses efektlerini aç"} aria-pressed={soundEnabled} title="Ses efektleri"><SoundIcon enabled={soundEnabled} /></button>
        </div>
      </header>

      {screen === "setup" && <section className={styles.screen} aria-labelledby="targetGameTitle">
        <div className={styles.startCard}>
          <div className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}><span />Mental aritmetik oyunu</div>
              <h1 id="targetGameTitle">Hedef<br />Toplam</h1>
              <p>Sayı kartlarını seç, hedef toplamı bul. On tur boyunca hem hızını hem dikkatini göster.</p>
              <div className={styles.numberDemo} aria-hidden="true"><span>8</span><b>+</b><span>12</span><b>=</b><i>20</i></div>
            </div>
            <div className={styles.heroNote}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4"/><path d="M8.3 14.7A7 7 0 1 1 15.7 14.7C14.7 15.4 14 16.3 14 17h-4c0-.7-.7-1.6-1.7-2.3Z"/></svg>Her sorunun en az bir çözümü var.</div>
          </div>
          <form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); startGame(); }}>
            <h2>Oyununu ayarla</h2><p>Sana uygun seviyeyi ve oyun hızını seç.</p>
            {!settingsReady && <div className={styles.loadingNotice}>Görev ayarları yükleniyor…</div>}
            <fieldset className={styles.settingGroup} disabled={settingDisabled}><legend>Seviye</legend><div className={styles.choiceGrid}>{(Object.keys(TARGET_TOTAL_LEVEL_CONFIG) as TargetTotalLevel[]).map((value) => <label className={`${styles.settingChoice} ${level === value ? styles.settingChoiceActive : ""}`} key={value}><input type="radio" name="level" value={value} checked={level === value} onChange={() => setLevel(value)} /><span>{TARGET_TOTAL_LEVEL_CONFIG[value].label}</span></label>)}</div></fieldset>
            <fieldset className={styles.settingGroup} disabled={settingDisabled}><legend>Hız</legend><div className={`${styles.choiceGrid} ${styles.speedGrid}`}>{VALID_SPEEDS.map((value) => <label className={`${styles.settingChoice} ${speed === value ? styles.settingChoiceActive : ""}`} key={value}><input type="radio" name="speed" value={value} checked={speed === value} onChange={() => setSpeed(value)} /><span>{TARGET_TOTAL_SPEED_CONFIG[value].label}</span></label>)}</div></fieldset>
            <div className={styles.fixedSettings} aria-label="Oyun bilgileri"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg><span><small>İşlem</small><strong>Toplama</strong></span></div><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg><span><small>Tur</small><strong>{roundLimit} soru</strong></span></div></div>
            <button className={styles.primaryButton} type="submit" disabled={!settingsReady}>Oyuna Başla <ChevronIcon /></button>
          </form>
        </div>
      </section>}

      {screen === "game" && current && <section className={styles.screen} aria-labelledby="targetRoundHeading">
        <div className={styles.gameTopbar}><div className={styles.roundLabel}>Tur <span>{roundNumber}</span>/{roundLimit}</div><div className={styles.progressTrack} aria-hidden="true"><div style={{ width: `${(roundNumber / roundLimit) * 100}%` }} /></div><div className={styles.scoreChip}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z"/></svg><span>Puan</span><strong>{score}</strong></div></div>
        <div className={styles.gameCard}>
          <div className={styles.gameCardHeader}><div className={styles.targetBlock}><small>Hedef</small><strong>{current.target}</strong></div><div className={styles.targetDivider}/><div className={styles.sumBlock}><small>Toplamın</small><div><strong>{selectedTotal}</strong><span> / {current.target}</span></div><p className={selectedTotal > current.target ? styles.sumOver : ""}>{selectedTotal > current.target && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>}<span>{statusText}</span></p></div></div>
          <div className={styles.timerStrip} aria-hidden="true"><div className={timerClass} style={{ width: `${timerRatio * 100}%` }}/></div>
          <div className={styles.playArea}><div className={styles.playHeading}><div><h2 id="targetRoundHeading">Sayılarını seç</h2><p>Seçmek veya çıkarmak için karta dokun.</p></div><div className={styles.timeChip}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>{secondsLimit ? `${Math.ceil(remainingSeconds ?? secondsLimit)} sn` : "Süre serbest"}</span></div></div>
            <div className={styles.numberGrid} aria-label="Sayı kartları">{current.cards.map((card) => { const selected = selectedIds.includes(card.id); const solution = answered && !feedback?.good && card.isSolution; const dimmed = answered && !feedback?.good && !card.isSolution; return <button className={`${styles.numberCard} ${selected ? styles.numberCardSelected : ""} ${solution ? styles.numberCardSolution : ""} ${dimmed ? styles.numberCardDimmed : ""}`} type="button" key={card.id} disabled={answered} onClick={() => toggleCard(card.id)} aria-label={`${card.value} sayısını ${selected ? "seçimden çıkar" : "seç"}`} aria-pressed={selected}>{card.value}</button>; })}</div>
            {feedback && <div className={`${styles.feedback} ${styles[`feedback${feedback.type[0].toUpperCase()}${feedback.type.slice(1)}` as keyof typeof styles]}`} role="status" aria-live="polite"><span className={styles.feedbackIcon}><FeedbackIcon type={feedback.type} /></span><span><strong>{feedback.title}</strong><small>{feedback.text}</small></span></div>}
            <div className={styles.gameActions}>{!answered ? <button className={styles.primaryButton} type="button" disabled={selectedIds.length === 0} onClick={() => submitAnswer(false)}>Cevapla <ChevronIcon /></button> : <button className={styles.primaryButton} type="button" onClick={nextRound}>{roundNumber >= roundLimit ? "Sonuçları Gör" : "Sonraki Tur"} <ChevronIcon /></button>}</div>
          </div>
        </div>
        <div className={styles.srOnly} aria-live="assertive">{feedback ? `${feedback.title}. ${feedback.text}` : `${roundNumber}. tur. Hedef ${current.target}. ${statusText}`}</div>
      </section>}

      {screen === "result" && <section className={styles.screen} aria-labelledby="targetResultTitle"><div className={styles.resultCard}><div className={styles.resultBadge}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></svg></div><h1 id="targetResultTitle">Oyun tamamlandı!</h1><p className={styles.resultSubtitle}>{correct + wrong} turun özetine göz at.</p><div className={styles.resultScore}><div className={styles.scoreRing} style={{ "--score-angle": `${summary.successRate * 3.6}deg` } as CSSProperties}><div><strong>{summary.successRate}%</strong><span>başarı</span></div></div><div className={styles.resultMessage}><strong>{resultMessage[0]}</strong><span>{resultMessage[1]}</span></div></div><div className={styles.statsGrid}><div className={styles.statCorrect}><strong>{correct}</strong><span>Doğru</span></div><div className={styles.statWrong}><strong>{wrong}</strong><span>Yanlış</span></div><div><strong>{summary.averageSeconds.toFixed(1)} sn</strong><span>Ort. süre</span></div><div><strong>{TARGET_TOTAL_LEVEL_CONFIG[level].label}</strong><span>Seviye</span></div><div><strong>{TARGET_TOTAL_SPEED_CONFIG[speed].label}</strong><span>Hız</span></div><div><strong>{score}</strong><span>Toplam puan</span></div></div>{saving && <p className={styles.saveStatus}>Sonuç güvenli şekilde kaydediliyor…</p>}{saved && <p className={styles.saveSuccess}>Sonuç kaydedildi.</p>}{saveError && <div className={styles.saveError}><span>{saveError}</span><button type="button" onClick={() => void saveResult(completionReason.current)}>Tekrar dene</button></div>}<div className={styles.resultActions}><button className={styles.secondaryButton} type="button" disabled={saving} onClick={changeSettings}>Ayarları Değiştir</button><button className={styles.primaryButton} type="button" disabled={saving} onClick={startGame}>Tekrar Oyna <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg></button></div>{saved && <Link className={styles.platformResultLink} href="/sonuc">Platform sonuçlarına git</Link>}</div></section>}
    </div>
    <div className={styles.confettiLayer} aria-hidden="true">{confetti.map((piece) => <span key={piece.id} style={{ left: piece.left, background: piece.color, animationDelay: piece.delay, "--drift": piece.drift, "--spin": piece.spin } as CSSProperties} />)}</div>
  </main>;
}
