"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import {
  CHAIN_OPERATION_ANSWER_DELAY_MS,
  CHAIN_OPERATION_DEFAULT_ROUNDS,
  CHAIN_OPERATION_LEVEL_CONFIG,
  CHAIN_OPERATION_ROUND_OPTIONS,
  CHAIN_OPERATION_SPEED_CONFIG,
  createChainOperationStats,
  formatChainOperationFlow,
  generateChainOperationRound,
  getChainOperationInitialDisplayMs,
  getChainOperationNextLabel,
  getChainOperationProgress,
  parseChainOperationAnswer,
  resolveChainOperationAnswer,
  type ChainOperationLevel,
  type ChainOperationRound,
  type ChainOperationSpeed,
  type ChainOperationStats,
} from "@/lib/exercises/chainOperation";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import styles from "./chainOperationGame.module.css";

type Props = { educationProgramLaunch?: EducationProgramExerciseLaunchProps };
type Screen = "setup" | "game" | "result";
type Phase = "start" | "operation" | "complete" | "answer";
type Feedback = { good: boolean; text: string; validation?: boolean };

const LEVEL_BY_NUMBER: ChainOperationLevel[] = ["beginner", "advanced", "master", "expert"];
const VALID_LEVELS = Object.keys(CHAIN_OPERATION_LEVEL_CONFIG) as ChainOperationLevel[];
const VALID_SPEEDS = Object.keys(CHAIN_OPERATION_SPEED_CONFIG) as ChainOperationSpeed[];

function settingString(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function settingNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function ChainOperationGameClient({ educationProgramLaunch }: Props) {
  const task = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const settings = task?.settings ?? educationProgramLaunch?.settings ?? {};
  const assignedLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
  const levelFromAssignment = LEVEL_BY_NUMBER[Math.max(0, Math.min(3, settingNumber(assignedLevel, 1) - 1))];
  const configuredLevel = settingString(settings.level, levelFromAssignment) as ChainOperationLevel;
  const initialLevel = VALID_LEVELS.includes(configuredLevel) ? configuredLevel : levelFromAssignment;
  const configuredSpeed = settingString(settings.speed, "relaxed") as ChainOperationSpeed;
  const initialSpeed = VALID_SPEEDS.includes(configuredSpeed) ? configuredSpeed : "relaxed";
  const assignmentRequested = assignmentMode || Boolean(educationProgramLaunch) || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("programTaskId"));
  const settingsReady = !assignmentRequested || Boolean(task || educationProgramLaunch);

  const [screen, setScreen] = useState<Screen>("setup");
  const [level, setLevel] = useState<ChainOperationLevel>(initialLevel);
  const [speed, setSpeed] = useState<ChainOperationSpeed>(initialSpeed);
  const [roundLimit, setRoundLimit] = useState(
    assignmentRequested
      ? Math.max(1, Math.round(settingNumber(settings.rounds, CHAIN_OPERATION_DEFAULT_ROUNDS)))
      : CHAIN_OPERATION_DEFAULT_ROUNDS,
  );
  const [roundNumber, setRoundNumber] = useState(0);
  const [round, setRound] = useState<ChainOperationRound | null>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [activeStep, setActiveStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<ChainOperationStats>(createChainOperationStats);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [answerTimes, setAnswerTimes] = useState<number[]>([]);

  const sequenceToken = useRef(0);
  const sequenceWaiter = useRef<{ timerId: number; resolve: (active: boolean) => void } | null>(null);
  const mounted = useRef(true);
  const roundResolved = useRef(false);
  const nextLocked = useRef(false);
  const finalized = useRef(false);
  const gameStartedAt = useRef(0);
  const answerStartedAt = useRef(0);
  const answerInput = useRef<HTMLInputElement | null>(null);
  const completionReason = useRef<"manual" | "natural">("natural");

  const completedRounds = stats.correct + stats.wrong;
  const successRate = completedRounds ? Math.round((stats.correct / completedRounds) * 100) : 0;
  const averageAnswerSeconds = answerTimes.length
    ? answerTimes.reduce((sum, time) => sum + time, 0) / answerTimes.length
    : 0;
  const standardRoundOption = CHAIN_OPERATION_ROUND_OPTIONS.includes(roundLimit as (typeof CHAIN_OPERATION_ROUND_OPTIONS)[number]);
  useEducationProgramExerciseRunning(screen === "game");

  const cancelSequence = useCallback(() => {
    sequenceToken.current += 1;
    if (sequenceWaiter.current) {
      const waiter = sequenceWaiter.current;
      sequenceWaiter.current = null;
      window.clearTimeout(waiter.timerId);
      waiter.resolve(false);
    }
  }, []);

  const waitForSequence = useCallback((milliseconds: number, token: number) => new Promise<boolean>((resolve) => {
    const timerId = window.setTimeout(() => {
      if (sequenceWaiter.current?.timerId === timerId) sequenceWaiter.current = null;
      resolve(mounted.current && token === sequenceToken.current);
    }, milliseconds);
    sequenceWaiter.current = { timerId, resolve };
  }), []);

  useEffect(() => {
    if (!task && !educationProgramLaunch) return;
    const nextSettings = task?.settings ?? educationProgramLaunch?.settings ?? {};
    const nextAssignedLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
    const timeoutId = window.setTimeout(() => {
      const nextLevelFromAssignment = LEVEL_BY_NUMBER[Math.max(0, Math.min(3, settingNumber(nextAssignedLevel, 1) - 1))];
      const nextConfiguredLevel = settingString(nextSettings.level, nextLevelFromAssignment) as ChainOperationLevel;
      setLevel(VALID_LEVELS.includes(nextConfiguredLevel) ? nextConfiguredLevel : nextLevelFromAssignment);
      const nextSpeed = settingString(nextSettings.speed, "relaxed") as ChainOperationSpeed;
      setSpeed(VALID_SPEEDS.includes(nextSpeed) ? nextSpeed : "relaxed");
      setRoundLimit(Math.max(1, Math.round(settingNumber(nextSettings.rounds, CHAIN_OPERATION_DEFAULT_ROUNDS))));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [task, educationProgramLaunch]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [screen]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelSequence();
    };
  }, [cancelSequence]);

  async function playSequence(nextRound: ChainOperationRound, nextSpeed: ChainOperationSpeed, token: number) {
    const startVisible = await waitForSequence(getChainOperationInitialDisplayMs(nextSpeed), token);
    if (!startVisible) return;

    for (let index = 0; index < nextRound.steps.length; index += 1) {
      if (!mounted.current || token !== sequenceToken.current) return;
      setPhase("operation");
      setActiveStep(index);
      setProgress(getChainOperationProgress(index + 1, nextRound.steps.length));
      const stepVisible = await waitForSequence(CHAIN_OPERATION_SPEED_CONFIG[nextSpeed].milliseconds, token);
      if (!stepVisible) return;
    }

    setPhase("complete");
    const completionVisible = await waitForSequence(CHAIN_OPERATION_ANSWER_DELAY_MS, token);
    if (!completionVisible) return;
    setPhase("answer");
    answerStartedAt.current = performance.now();
    window.requestAnimationFrame(() => {
      if (mounted.current && token === sequenceToken.current) answerInput.current?.focus();
    });
  }

  function beginRound(nextRoundNumber: number) {
    cancelSequence();
    const nextRound = generateChainOperationRound(level);
    const token = sequenceToken.current;
    setRoundNumber(nextRoundNumber);
    setRound(nextRound);
    setPhase("start");
    setActiveStep(-1);
    setProgress(0);
    setInput("");
    setAnswered(false);
    setFeedback(null);
    roundResolved.current = false;
    nextLocked.current = false;
    setScreen("game");
    void playSequence(nextRound, speed, token);
  }

  function startGame() {
    cancelSequence();
    setStats(createChainOperationStats());
    setAnswerTimes([]);
    setSaved(false);
    setSaving(false);
    setSaveError("");
    finalized.current = false;
    completionReason.current = "natural";
    gameStartedAt.current = performance.now();
    beginRound(1);
  }

  function updateInput(nextValue: string) {
    if (answered || phase !== "answer") return;
    setInput(nextValue.slice(0, 8));
    if (feedback?.validation) setFeedback(null);
  }

  function appendDigit(digit: number) {
    if (answered || phase !== "answer") return;
    setInput((current) => `${current}${digit}`.slice(0, 8));
    if (feedback?.validation) setFeedback(null);
  }

  function eraseDigit() {
    if (answered || phase !== "answer") return;
    setInput((current) => current.slice(0, -1));
    if (feedback?.validation) setFeedback(null);
  }

  function submitAnswer() {
    if (roundResolved.current || answered || phase !== "answer" || !round) return;
    const parsed = parseChainOperationAnswer(input);
    if (parsed.error || parsed.value === null) {
      setFeedback({ good: false, text: parsed.error ?? "Geçerli bir sayı yaz.", validation: true });
      return;
    }

    roundResolved.current = true;
    const elapsed = Math.max(0, (performance.now() - answerStartedAt.current) / 1000);
    setAnswerTimes((times) => [...times, elapsed]);
    setAnswered(true);
    const nextStats = resolveChainOperationAnswer(stats, level, round.answer, parsed.value);
    setStats(nextStats);
    setFeedback(parsed.value === round.answer
      ? { good: true, text: `Doğru! 🎉 Sonuç ${round.answer}.` }
      : { good: false, text: `Doğru sonuç ${round.answer}. Zincir: ${formatChainOperationFlow(round)}` });
  }

  const saveResult = useCallback(async (reason: "manual" | "natural") => {
    if (finalized.current || saving) return;
    finalized.current = true;
    completionReason.current = reason;
    setSaving(true);
    setSaveError("");
    try {
      await saveExerciseResultSecure({
        exerciseType: "mental-arithmetic-chain",
        exerciseTitle: "Mental Aritmetik – Zincir İşlem",
        score: stats.score,
        successRate,
        correctCount: stats.correct,
        wrongCount: stats.wrong,
        durationSeconds: Math.max(0, Math.round((performance.now() - gameStartedAt.current) / 1000)),
        completedAt: new Date().toISOString(),
        submissionKey: `mental-mental-arithmetic-chain-${gameStartedAt.current}`,
        assignmentItemId: undefined,
        programTaskId: educationProgramLaunch?.taskId,
        details: {
          level,
          totalRounds: completedRounds,
          bestStreak: stats.bestStreak,
          averageAnswerSeconds: Math.round(averageAnswerSeconds * 10) / 10,
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
  }, [saving, stats, successRate, educationProgramLaunch, level, completedRounds, averageAnswerSeconds]);

  function showResults(reason: "manual" | "natural") {
    cancelSequence();
    setScreen("result");
    void saveResult(reason);
  }

  function nextRound() {
    if (nextLocked.current || !answered) return;
    nextLocked.current = true;
    if (roundNumber >= roundLimit) showResults("natural");
    else beginRound(roundNumber + 1);
  }

  function changeSettings() {
    cancelSequence();
    setRound(null);
    setRoundNumber(0);
    setFeedback(null);
    setScreen("setup");
  }

  const activeOperation = activeStep >= 0 ? round?.steps[activeStep] : null;
  const settingDisabled = assignmentRequested;
  const topbarRound = roundNumber ? `${roundNumber}/${roundLimit}` : "-";

  return <main className={styles.page}>
    <div className={styles.app}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/egzersizler/mental-aritmetik" aria-label="Mental Aritmetik merkezine dön">
          <span className={styles.brandIcon} aria-hidden="true">🔗</span>
          <span className={styles.brandText}><strong>Zincir İşlem</strong><small>Odaklan, işlemleri takip et, sonucu bul.</small></span>
        </Link>
        <div className={styles.topbarActions}>
          {screen === "game" && <button className={styles.finishButton} type="button" onClick={() => showResults("manual")}>Bitir</button>}
          <div className={styles.liveStats} aria-label="Canlı oyun istatistikleri">
            <span>Tur <b>{topbarRound}</b></span>
            <span>Doğru <b>{stats.correct}</b></span>
            <span>Seri <b>{stats.streak}</b></span>
            <span>Puan <b>{stats.score}</b></span>
          </div>
        </div>
      </header>

      {screen === "setup" && <section className={styles.screen} aria-labelledby="chainSetupTitle">
        <form className={styles.setup} onSubmit={(event) => { event.preventDefault(); startGame(); }}>
          <h1 id="chainSetupTitle">Zinciri sonuna kadar takip et 🧠</h1>
          <p>Başlangıç sayısını aklında tut. İşlemler ekranda tek tek gösterilecek. Son işlem kaybolduğunda zincirin sonucunu yaz.</p>
          {!settingsReady && <div className={styles.loadingNotice}>Görev ayarları yükleniyor…</div>}
          <div className={styles.setupGrid}>
            <label className={styles.field}>Seviye
              <select disabled={settingDisabled} value={level} onChange={(event) => setLevel(event.target.value as ChainOperationLevel)}>
                {VALID_LEVELS.map((value) => <option key={value} value={value}>{CHAIN_OPERATION_LEVEL_CONFIG[value].label} — {CHAIN_OPERATION_LEVEL_CONFIG[value].steps} işlem</option>)}
              </select>
            </label>
            <label className={styles.field}>Tur Sayısı
              <select disabled={settingDisabled} value={roundLimit} onChange={(event) => setRoundLimit(Number(event.target.value))}>
                {!standardRoundOption && <option value={roundLimit}>{roundLimit} tur (görev)</option>}
                {CHAIN_OPERATION_ROUND_OPTIONS.map((value) => <option key={value} value={value}>{value} tur</option>)}
              </select>
            </label>
          </div>
          <fieldset className={styles.speedField} disabled={settingDisabled}>
            <legend>Gösterim Hızı</legend>
            <div className={styles.speedGrid}>
              {VALID_SPEEDS.map((value) => <label className={`${styles.speedChoice} ${speed === value ? styles.speedChoiceActive : ""}`} key={value}>
                <input type="radio" name="chain-speed" value={value} checked={speed === value} onChange={() => setSpeed(value)} />
                <strong>{CHAIN_OPERATION_SPEED_CONFIG[value].label}</strong>
                <small>{CHAIN_OPERATION_SPEED_CONFIG[value].description}</small>
              </label>)}
            </div>
          </fieldset>
          <button className={`${styles.primaryButton} ${styles.startButton}`} type="submit" disabled={!settingsReady}>Oyunu Başlat</button>
        </form>
      </section>}

      {screen === "game" && round && <section className={styles.screen} aria-labelledby="chainGameTitle">
        <div className={styles.game}>
          <div className={styles.gameHead}><h1 id="chainGameTitle">İşlem Zinciri</h1><span>{CHAIN_OPERATION_LEVEL_CONFIG[level].label}</span></div>
          <div className={styles.focusBox} aria-live="polite" aria-atomic="true">
            <div className={phase === "start" ? styles.startNumber : styles.operation} key={`${phase}-${activeStep}`}>
              {phase === "start" ? <><small>Başlangıç Sayısı</small><strong>{round.start}</strong></> : <>
                <small>{phase === "operation" ? `${activeStep + 1}. işlem / ${round.steps.length}` : "Zincir tamamlandı"}</small>
                <strong className={phase === "operation" ? "" : styles.questionMark}>{phase === "operation" && activeOperation ? `${activeOperation.operation} ${activeOperation.number}` : "?"}</strong>
              </>}
            </div>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-label="Zincir ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div style={{ width: `${progress}%` }} /></div>

          {phase === "answer" && <div className={styles.answerArea}>
            <div className={styles.prompt}>Zincirin sonucu kaç?</div>
            <div className={styles.answerRow}>
              <input ref={answerInput} value={input} disabled={answered} onChange={(event) => updateInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitAnswer(); } }} inputMode="numeric" autoComplete="off" maxLength={8} aria-label="Zincirin sonucu" placeholder="Cevabını yaz" />
              <button className={styles.checkButton} type="button" disabled={answered} onClick={submitAnswer}>Kontrol</button>
            </div>
            <div className={styles.keypad} aria-label="Ekran sayı klavyesi">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => <button type="button" key={number} disabled={answered} onClick={() => appendDigit(number)}>{number}</button>)}
              <button className={styles.keyAction} type="button" disabled={answered} onClick={() => updateInput("")}>Temizle</button>
              <button type="button" disabled={answered} onClick={() => appendDigit(0)}>0</button>
              <button className={styles.keyAction} type="button" disabled={answered} onClick={eraseDigit}>⌫ Sil</button>
            </div>
            <p className={styles.keypadNote}>Ekran tuşlarını veya fiziksel klavyeyi kullanabilirsin.</p>
            {feedback && <div className={`${styles.feedback} ${feedback.good ? styles.feedbackGood : styles.feedbackBad}`} role="status" aria-live="assertive">{feedback.text}</div>}
            {answered && <button className={`${styles.primaryButton} ${styles.nextButton}`} type="button" onClick={nextRound}>{getChainOperationNextLabel(roundNumber, roundLimit)}</button>}
          </div>}
          <p className={styles.tip}>İşlemler kaybolur; bu yüzden sırayı gözünle takip ederken zihninden de uygulamalısın.</p>
        </div>
      </section>}

      {screen === "result" && <section className={styles.screen} aria-labelledby="chainResultTitle">
        <div className={styles.result}>
          <div className={styles.resultEmoji} aria-hidden="true">🏆</div>
          <h1 id="chainResultTitle">Zincir tamamlandı!</h1>
          <p>Odak ve işlem takip performansın.</p>
          <div className={styles.resultGrid}>
            <div><strong>{stats.correct}</strong><span>Doğru</span></div>
            <div><strong>{stats.wrong}</strong><span>Yanlış</span></div>
            <div><strong>{stats.bestStreak}</strong><span>En İyi Seri</span></div>
            <div><strong>{stats.score}</strong><span>Puan</span></div>
          </div>
          {saving && <p className={styles.saveStatus}>Sonuç güvenli şekilde kaydediliyor…</p>}
          {saved && <p className={styles.saveSuccess}>Sonuç kaydedildi.</p>}
          {saveError && <div className={styles.saveError}><span>{saveError}</span><button type="button" onClick={() => void saveResult(completionReason.current)}>Tekrar dene</button></div>}
          <div className={styles.resultActions}>
            <button className={styles.primaryButton} type="button" disabled={saving} onClick={startGame}>Tekrar Oyna</button>
            <button className={styles.secondaryButton} type="button" disabled={saving} onClick={changeSettings}>Ayarları Değiştir</button>
          </div>
          {saved && <Link className={styles.platformResultLink} href="/sonuc">Platform sonuçlarına git</Link>}
        </div>
      </section>}
    </div>
  </main>;
}
