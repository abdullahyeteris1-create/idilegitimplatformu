"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import {
  CASH_REGISTER_LEVEL_CONFIG,
  CASH_REGISTER_TOTAL_ROUNDS,
  cashRegisterSelectionCorrect,
  createCashRegisterRound,
  getCashRegisterBasketTotal,
  getCashRegisterPrompt,
  type CashRegisterLevel,
  type CashRegisterMode,
  type CashRegisterRound,
} from "@/lib/exercises/cashRegister";
import { clampPercent } from "@/lib/exercises/mentalArithmetic";
import styles from "./cashRegisterGame.module.css";

type Props = { educationProgramLaunch?: EducationProgramExerciseLaunchProps };
type Screen = "setup" | "game" | "result";
type Feedback = { good: boolean; title: string; text: string };
type ConfettiPiece = { id: number; left: string; color: string; delay: string; drift: string; spin: string };

const LEVELS: CashRegisterLevel[] = ["beginner", "advanced", "master", "expert"];
const MODES: { value: CashRegisterMode; icon: string; title: string; text: string }[] = [
  { value: "shopping", icon: "🧺", title: "Listeyi Tamamla", text: "İstenen ürünleri seç ve toplam fiyatı bul." },
  { value: "change", icon: "💵", title: "Para Üstü", text: "Sepetin toplamını incele, para üstünü hesapla." },
  { value: "budget", icon: "🎯", title: "Bütçeyi Yakala", text: "Verilen bütçeyi aşmadan doğru ürünleri seç." },
];
const CONFETTI_COLORS = ["#5b4ae8", "#2878e8", "#10b981", "#ffc857", "#f06a85"];

function settingString(value: unknown, fallback: string): string { return typeof value === "string" && value ? value : fallback; }
function settingNumber(value: unknown, fallback: number): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function BookIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M9 7h6M9 11h4" /></svg>; }
function ChevronIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>; }

export function CashRegisterGameClient({ educationProgramLaunch }: Props) {
  const task = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const settings = task?.settings ?? educationProgramLaunch?.settings ?? {};
  const assignedLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
  const fallbackLevel = LEVELS[Math.max(0, Math.min(3, settingNumber(assignedLevel, 1) - 1))];
  const configuredLevel = settingString(settings.level, fallbackLevel) as CashRegisterLevel;
  const initialLevel = LEVELS.includes(configuredLevel) ? configuredLevel : fallbackLevel;
  const configuredMode = settingString(settings.mode, "shopping") as CashRegisterMode;
  const initialMode: CashRegisterMode = ["shopping", "change", "budget"].includes(configuredMode) ? configuredMode : "shopping";
  const assignmentRequested = assignmentMode || Boolean(educationProgramLaunch) || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("programTaskId"));
  const settingsReady = !assignmentRequested || Boolean(task || educationProgramLaunch);

  const [screen, setScreen] = useState<Screen>("setup");
  const [level, setLevel] = useState<CashRegisterLevel>(initialLevel);
  const [roundLimit, setRoundLimit] = useState(assignmentRequested ? Math.max(1, Math.round(settingNumber(settings.rounds, CASH_REGISTER_TOTAL_ROUNDS))) : CASH_REGISTER_TOTAL_ROUNDS);
  const [mode, setMode] = useState<CashRegisterMode>(initialMode);
  const [roundNumber, setRoundNumber] = useState(0);
  const [current, setCurrent] = useState<CashRegisterRound | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const roundStartedAt = useRef(0);
  const gameStartedAt = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const confettiTimer = useRef<number | null>(null);
  const finalized = useRef(false);
  const roundResolved = useRef(false);
  const completionReason = useRef<"manual" | "natural">("natural");

  const prompt = current ? getCashRegisterPrompt(current) : null;
  const totalAnswered = correct + wrong;
  const successRate = totalAnswered ? clampPercent(correct / totalAnswered * 100) : 0;
  useEducationProgramExerciseRunning(screen === "game" && !answered);

  useEffect(() => {
    if (!task && !educationProgramLaunch) return;
    const nextSettings = task?.settings ?? educationProgramLaunch?.settings ?? {};
    const nextLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
    const timeoutId = window.setTimeout(() => {
      const assigned = LEVELS[Math.max(0, Math.min(3, settingNumber(nextLevel, 1) - 1))];
      const configured = settingString(nextSettings.level, assigned) as CashRegisterLevel;
      setLevel(LEVELS.includes(configured) ? configured : assigned);
      const nextMode = settingString(nextSettings.mode, "shopping") as CashRegisterMode;
      if (["shopping", "change", "budget"].includes(nextMode)) setMode(nextMode);
      setRoundLimit(Math.max(1, Math.round(settingNumber(nextSettings.rounds, CASH_REGISTER_TOTAL_ROUNDS))));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [task, educationProgramLaunch]);

  useEffect(() => () => { if (confettiTimer.current) window.clearTimeout(confettiTimer.current); void audioContext.current?.close(); }, []);

  const playTone = useCallback((frequency: number, duration: number, volume: number) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext.current ??= new AudioContextClass();
      if (audioContext.current.state === "suspended") void audioContext.current.resume();
      const oscillator = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.current.destination); oscillator.start(); oscillator.stop(audioContext.current.currentTime + duration);
    } catch { setSoundEnabled(false); }
  }, [soundEnabled]);

  const launchConfetti = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pieces = Array.from({ length: 24 }, (_, index) => ({ id: Date.now() + index, left: `${8 + Math.floor(Math.random() * 85)}%`, color: CONFETTI_COLORS[index % CONFETTI_COLORS.length], delay: `${Math.random() * .18}s`, drift: `${-90 + Math.floor(Math.random() * 181)}px`, spin: `${260 + Math.floor(Math.random() * 501)}deg` }));
    setConfetti(pieces);
    if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => setConfetti([]), 1500);
  }, []);

  function beginRound(nextRoundNumber: number) {
    const next = createCashRegisterRound(level, mode);
    setRoundNumber(nextRoundNumber); setCurrent(next); setSelectedIds(mode === "change" ? next.targetIds : []); setInput(""); setAnswered(false); setFeedback(null); roundResolved.current = false; roundStartedAt.current = performance.now(); setScreen("game");
  }

  function startGame() {
    setCorrect(0); setWrong(0); setScore(0); setSaved(false); setSaving(false); setSaveError(""); finalized.current = false; gameStartedAt.current = performance.now(); beginRound(1);
  }

  const saveResult = useCallback(async (reason: "manual" | "natural") => {
    if (finalized.current || saving) return;
    finalized.current = true; completionReason.current = reason; setSaving(true); setSaveError("");
    try {
      await saveExerciseResultSecure({ exerciseType: "mental-arithmetic-market", exerciseTitle: "Mental Aritmetik – Para Kasası", score, successRate, correctCount: correct, wrongCount: wrong, durationSeconds: Math.max(0, Math.round((performance.now() - gameStartedAt.current) / 1000)), completedAt: new Date().toISOString(), submissionKey: `mental-mental-arithmetic-market-${gameStartedAt.current}`, assignmentItemId: undefined, programTaskId: educationProgramLaunch?.taskId, details: { level, mode, totalRounds: correct + wrong, completionReason: reason } });
      setSaved(true);
    } catch { finalized.current = false; setSaveError("Sonuç kaydedilemedi. Lütfen tekrar dene."); }
    finally { setSaving(false); }
  }, [saving, score, successRate, correct, wrong, educationProgramLaunch, level, mode]);

  const submitAnswer = useCallback(() => {
    if (roundResolved.current || answered || !current) return;
    const raw = input.trim();
    if (!raw) { setFeedback({ good: false, title: "Cevap eksik", text: "Önce cevabını yazmalısın." }); return; }
    const value = Number(raw);
    if (!Number.isFinite(value)) { setFeedback({ good: false, title: "Geçersiz cevap", text: "Geçerli bir sayı yaz." }); return; }
    roundResolved.current = true;
    const selectionCorrect = mode === "change" || cashRegisterSelectionCorrect(selectedIds, current.targetIds);
    const basket = getCashRegisterBasketTotal(current.items, selectedIds);
    const isCorrect = mode === "shopping" ? selectionCorrect && value === current.answer : mode === "change" ? value === current.answer : selectionCorrect && basket <= (current.budget ?? Infinity) && value === current.answer;
    setAnswered(true);
    if (isCorrect) { setCorrect((count) => count + 1); setScore((points) => points + 100); setFeedback({ good: true, title: "Harika! 🎉", text: mode === "budget" ? `Doğru sepet toplamı ${current.answer} TL; bütçeden ${(current.budget ?? 0) - current.answer} TL kaldı.` : mode === "change" ? `Doğru para üstü: ${current.answer} TL.` : `Ürünler doğru. Doğru toplam ${current.answer} TL.` }); launchConfetti(); playTone(660, .16, .045); }
    else { setWrong((count) => count + 1); const detail = mode === "shopping" ? (selectionCorrect ? `Doğru toplam ${current.answer} TL.` : `Alışveriş listesindeki ürünleri de doğru seçmelisin. Doğru toplam ${current.answer} TL.`) : mode === "change" ? `Doğru para üstü: ${current.answer} TL.` : (selectionCorrect ? `Doğru sepet toplamı ${current.answer} TL; bütçeden ${(current.budget ?? 0) - current.answer} TL kaldı.` : `İstenen ürünlerin tamamını ve yalnızca onları seçmelisin. Doğru toplam ${current.answer} TL.`); setFeedback({ good: false, title: "Bu tur olmadı.", text: detail }); playTone(230, .16, .045); }
  }, [answered, current, input, mode, selectedIds, launchConfetti, playTone]);

  function showResults(reason: "manual" | "natural") { setScreen("result"); void saveResult(reason); }
  function nextRound() { if (roundNumber >= roundLimit) showResults("natural"); else beginRound(roundNumber + 1); }
  function changeSettings() { setScreen("setup"); setCurrent(null); setSelectedIds([]); setFeedback(null); }
  function pressKey(key: string) { if (answered) return; setInput((value) => `${value}${key}`.slice(0, 8)); }

  const settingDisabled = assignmentRequested;
  return <main className={styles.page}>
    <span className={`${styles.backgroundShape} ${styles.shapeOne}`} aria-hidden="true" /><span className={`${styles.backgroundShape} ${styles.shapeTwo}`} aria-hidden="true" />
    <div className={styles.appShell}>
      <header className={styles.brandBar}><Link href="/egzersizler/mental-aritmetik" className={styles.brand}><span className={styles.brandMark}><BookIcon /></span><span>İdil Eğitim</span></Link><div className={styles.brandActions}>{screen === "game" && <button className={styles.finishButton} type="button" disabled={saving} onClick={() => showResults("manual")}>Bitir</button>}<button className={styles.soundButton} type="button" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-label={soundEnabled ? "Ses efektlerini kapat" : "Ses efektlerini aç"}>{soundEnabled ? "🔊" : "🔇"}</button></div></header>
      {screen === "setup" && <section className={styles.setupCard}><div className={styles.setupHero}><div className={styles.eyebrow}>Mental aritmetik oyunu</div><h1>Para<br />Kasası</h1><p>Market alışverişiyle zihinden işlem</p><div className={styles.cartDemo}>🛒 <span>7 TL</span><b>+</b><span>12 TL</span></div><small>Ürünleri seç, toplamı hesapla ve kasada doğru işlemi yap.</small></div><form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); startGame(); }}><h2>Market alışverişine hazır mısın? 🛍️</h2><p>Ürünleri seç, toplamı hesapla ve kasada doğru işlemi yap. Her tur yeni bir alışveriş görevi gelir.</p>{!settingsReady && <div className={styles.loadingNotice}>Görev ayarları yükleniyor…</div>}<fieldset disabled={settingDisabled}><legend>Seviye</legend><div className={styles.choiceGrid}>{LEVELS.map((value) => <label key={value} className={`${styles.settingChoice} ${level === value ? styles.activeChoice : ""}`}><input type="radio" name="level" checked={level === value} onChange={() => setLevel(value)} /><span>{CASH_REGISTER_LEVEL_CONFIG[value].label}</span></label>)}</div></fieldset><label className={styles.fieldLabel}>Tur Sayısı<select disabled={settingDisabled} value={roundLimit} onChange={(event) => setRoundLimit(Number(event.target.value))}><option value="5">5 tur</option><option value="10">10 tur</option><option value="15">15 tur</option></select></label><fieldset disabled={settingDisabled}><legend>Oyun Türü</legend><div className={styles.modeGrid}>{MODES.map((item) => <button type="button" key={item.value} className={`${styles.modeCard} ${mode === item.value ? styles.activeMode : ""}`} onClick={() => setMode(item.value)}><strong>{item.icon}</strong><b>{item.title}</b><small>{item.text}</small></button>)}</div></fieldset><button className={styles.primaryButton} disabled={!settingsReady} type="submit">Oyunu Başlat <ChevronIcon /></button></form></section>}
      {screen === "game" && current && prompt && <section className={styles.gameScreen}><div className={styles.gameTopbar}><span>Tur <b>{roundNumber} / {roundLimit}</b></span><div className={styles.progressTrack}><div style={{ width: `${roundLimit ? roundNumber / roundLimit * 100 : 0}%` }} /></div><span>Doğru <b>{correct}</b></span><span>Puan <b>{score}</b></span></div><div className={styles.gameLayout}><section className={styles.marketPanel}><div className={styles.sectionHead}><h2>🏪 Market Rafı</h2><span>Ürüne dokunarak seç</span></div><div className={styles.productGrid}>{current.items.map((item) => <button type="button" key={item.id} disabled={answered || mode === "change"} className={`${styles.productCard} ${selectedIds.includes(item.id) ? styles.selectedProduct : ""}`} onClick={() => { setSelectedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]); playTone(selectedIds.includes(item.id) ? 360 : 520, .05, .025); }}><i>✓</i><span className={styles.productEmoji}>{item.emoji}</span><b>{item.name}</b><small>{item.price} TL</small></button>)}</div><p className={styles.footerTip}>İpucu: Seçtiğin ürüne tekrar dokunursan sepetten çıkar.</p></section><aside className={styles.registerPanel}><div className={styles.challenge}><small>GÖREV</small><h2>{prompt.title}</h2><p>{prompt.text}</p></div><div className={styles.receipt}><strong>🧾 Fiş</strong>{selectedIds.length ? selectedIds.map((id) => { const item = current.items.find((product) => product.id === id); return item ? <div className={styles.receiptRow} key={id}><span>{item.emoji} {item.name}</span><b>{item.price} TL</b></div> : null; }) : <span className={styles.emptyReceipt}>Sepet henüz boş</span>}<hr /><div className={styles.receiptTotal}><span>Sepet Toplamı</span><b>Sen hesapla 🧠</b></div></div><div className={styles.answerBox}><label htmlFor="cash-answer">{prompt.answerLabel}</label><div className={styles.answerRow}><input id="cash-answer" inputMode="numeric" autoComplete="off" disabled={answered} value={input} placeholder="0" onChange={(event) => setInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} onKeyDown={(event) => { if (event.key === "Enter") submitAnswer(); }} /><button type="button" disabled={answered} onClick={submitAnswer}>Kontrol</button></div><div className={styles.keypad}>{["1","2","3","4","5","6","7","8","9"].map((key) => <button type="button" key={key} disabled={answered} onClick={() => pressKey(key)}>{key}</button>)}<button type="button" disabled={answered} onClick={() => setInput("")}>Temizle</button><button type="button" disabled={answered} onClick={() => pressKey("0")}>0</button><button type="button" disabled={answered} onClick={() => setInput((value) => value.slice(0, -1))}>⌫ Sil</button></div><small className={styles.keypadNote}>İstersen sayı tuşlarına dokun, istersen klavyeden yaz.</small></div>{feedback && <div role="status" className={`${styles.feedback} ${feedback.good ? styles.feedbackGood : styles.feedbackBad}`}><strong>{feedback.title}</strong><span>{feedback.text}</span>{!feedback.good && <small>Doğru cevap: {current.answer} TL</small>}</div>}{answered && <button className={styles.nextButton} type="button" disabled={saving} onClick={nextRound}>{roundNumber >= roundLimit ? "Sonuçları Gör →" : "Sonraki Tur →"}</button>}</aside></div></section>}
      {screen === "result" && <section className={styles.resultCard}><div className={styles.resultBadge}>🏆</div><h1>Alışveriş tamamlandı!</h1><p>Kasadaki performansın aşağıda.</p><div className={styles.scoreRing} style={{ "--score-angle": `${successRate * 3.6}deg` } as CSSProperties}><strong>{successRate}%</strong><span>Başarı</span></div><div className={styles.statsGrid}><div><b>{correct}</b><span>Doğru</span></div><div><b>{wrong}</b><span>Yanlış</span></div><div><b>{score}</b><span>Puan</span></div></div>{saving && <p className={styles.saveStatus}>Sonuç güvenli şekilde kaydediliyor…</p>}{saved && <p className={styles.saveSuccess}>Sonuç kaydedildi.</p>}{saveError && <div className={styles.saveError}>{saveError}<button type="button" onClick={() => void saveResult(completionReason.current)}>Tekrar dene</button></div>}<div className={styles.resultActions}><button type="button" className={styles.secondaryButton} disabled={saving} onClick={changeSettings}>Ayarları Değiştir</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={startGame}>Tekrar Oyna <ChevronIcon /></button></div>{saved && <Link href="/sonuc" className={styles.platformResultLink}>Platform sonuçlarına git</Link>}</section>}
    </div><div className={styles.confettiLayer} aria-hidden="true">{confetti.map((piece) => <span key={piece.id} style={{ left: piece.left, background: piece.color, animationDelay: piece.delay, "--drift": piece.drift, "--spin": piece.spin } as CSSProperties} />)}</div>
  </main>;
}
