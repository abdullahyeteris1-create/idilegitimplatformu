"use client";
/* eslint-disable react-hooks/purity -- timer/audio/input refs are intentionally event-driven. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useAssignmentTask, useIsAssignmentMode } from "@/components/assignments/AssignmentTaskProvider";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { clampPercent } from "@/lib/exercises/mentalArithmetic";
import { getVaultProgress, getVaultSpeedScore, generateVaultQuestion, VAULT_DIGITS, VAULT_LEVEL_CONFIG, VAULT_TOTAL_ROUNDS, VAULT_TIMES, type VaultLevel, type VaultMode, type VaultQuestion, type VaultTime } from "@/lib/exercises/vault";
import styles from "./vaultGame.module.css";

type Props = { educationProgramLaunch?: EducationProgramExerciseLaunchProps };
type Feedback = { good: boolean; title: string; text: string };
type Screen = "game" | "result";
type Particle = { id: number; x: number; y: number; color: string; dx: string; dy: string; rot: string };
type Coin = { id: number; symbol: string; left: string; rx: string; ry: string; rr: string; delay: string };
type Smoke = { id: number; left: string; sx: string; delay: string };

const LEVELS: VaultLevel[] = ["easy", "medium", "hard", "master"];
const MODES: { value: VaultMode; label: string }[] = [{ value: "mixed", label: "Karışık İşlem" }, { value: "logic", label: "Mantık Şifresi" }];
const COLORS = ["#ffd45a", "#ffb72b", "#50e09a", "#4db6ff", "#fff1b8"];

function settingString(value: unknown, fallback: string): string { return typeof value === "string" && value ? value : fallback; }
function settingNumber(value: unknown, fallback: number): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function normalizeLevel(value: unknown): VaultLevel { const text = settingString(value, "easy") as VaultLevel; return LEVELS.includes(text) ? text : LEVELS[Math.max(0, Math.min(3, settingNumber(value, 1) - 1))]; }

export function VaultGameClient({ educationProgramLaunch }: Props) {
  const task = useAssignmentTask();
  const assignmentMode = useIsAssignmentMode();
  const settings = task?.settings ?? educationProgramLaunch?.settings ?? {};
  const assignedLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
  const fallbackLevel = LEVELS[Math.max(0, Math.min(3, settingNumber(assignedLevel, 1) - 1))];
  const assignmentRequested = assignmentMode || Boolean(educationProgramLaunch) || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("programTaskId"));
  const settingsReady = !assignmentRequested || Boolean(task || educationProgramLaunch);
  const [level, setLevel] = useState<VaultLevel>(normalizeLevel(settings.level ?? fallbackLevel));
  const [digits, setDigits] = useState<number>(VAULT_DIGITS.includes(settingNumber(settings.digits, 2) as 2 | 3 | 4) ? settingNumber(settings.digits, 2) : 2);
  const [time, setTime] = useState<VaultTime>(VAULT_TIMES.includes(settingNumber(settings.time ?? settings.seconds, 20) as VaultTime) ? settingNumber(settings.time ?? settings.seconds, 20) as VaultTime : 20);
  const [roundLimit, setRoundLimit] = useState(assignmentRequested ? Math.max(1, Math.round(settingNumber(settings.rounds, VAULT_TOTAL_ROUNDS))) : VAULT_TOTAL_ROUNDS);
  const [mode, setMode] = useState<VaultMode>(["mixed", "logic"].includes(settingString(settings.mode, "mixed")) ? settingString(settings.mode, "mixed") as VaultMode : "mixed");
  const [screen, setScreen] = useState<Screen>("game");
  const [playing, setPlaying] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [question, setQuestion] = useState<VaultQuestion | null>(null);
  const [inputs, setInputs] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [vaultState, setVaultState] = useState<"closed" | "unlocking" | "open" | "correct" | "wrong" | "timeout">("closed");
  const [coinRain, setCoinRain] = useState<Coin[]>([]);
  const [smoke, setSmoke] = useState<Smoke[]>([]);
  const [feedback, setFeedback] = useState<Feedback>({ good: false, title: "", text: "Ayarlarını seç ve oyunu başlat." });
  const [speedBadge, setSpeedBadge] = useState("⚡ Hız bonusu aktif");
  const [soundOn, setSoundOn] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatScore, setFloatScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [progress, setProgress] = useState(0);
  const gameStartedAt = useRef(0);
  const roundStartedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const nextTimer = useRef<number | null>(null);
  const token = useRef(0);
  const roundResolved = useRef(false);
  const finalized = useRef(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const particleTimer = useRef<number | null>(null);
  const scoreTimer = useRef<number | null>(null);
  const completionReason = useRef<"manual" | "natural">("natural");
  const prepareRoundRef = useRef<(number: number) => void>(() => undefined);

  useEducationProgramExerciseRunning(playing && !answered);

  useEffect(() => {
    if (!task && !educationProgramLaunch) return;
    const nextSettings = task?.settings ?? educationProgramLaunch?.settings ?? {};
    const nextLevel = educationProgramLaunch?.initialLevel ?? task?.currentLevel;
    const timeoutId = window.setTimeout(() => {
      const assigned = LEVELS[Math.max(0, Math.min(3, settingNumber(nextLevel, 1) - 1))];
      setLevel(normalizeLevel(nextSettings.level ?? assigned));
      const nextDigits = settingNumber(nextSettings.digits, 2); setDigits(VAULT_DIGITS.includes(nextDigits as 2 | 3 | 4) ? nextDigits : 2);
      const nextTime = settingNumber(nextSettings.time ?? nextSettings.seconds, 20); setTime(VAULT_TIMES.includes(nextTime as VaultTime) ? nextTime as VaultTime : 20);
      const nextMode = settingString(nextSettings.mode, "mixed"); if (["mixed", "logic"].includes(nextMode)) setMode(nextMode as VaultMode);
      setRoundLimit(Math.max(1, Math.round(settingNumber(nextSettings.rounds, VAULT_TOTAL_ROUNDS))));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [task, educationProgramLaunch]);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); if (nextTimer.current) window.clearTimeout(nextTimer.current); if (particleTimer.current) window.clearTimeout(particleTimer.current); if (scoreTimer.current) window.clearTimeout(scoreTimer.current); void audioContext.current?.close(); }, []);

  const playTone = useCallback((frequency: number, start: number, duration: number, type: OscillatorType, gainValue: number) => {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioContextClass) return;
      audioContext.current ??= new AudioContextClass(); const ctx = audioContext.current; if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start); gain.gain.setValueAtTime(0, ctx.currentTime + start); gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + start + .015); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + start + duration); oscillator.connect(gain).connect(ctx.destination); oscillator.start(ctx.currentTime + start); oscillator.stop(ctx.currentTime + start + duration + .02);
    } catch { setSoundOn(false); }
  }, [soundOn]);

  const playSuccess = useCallback(() => { playTone(523, 0, .17, "sine", .055); playTone(659, .1, .18, "sine", .055); playTone(784, .2, .22, "triangle", .05); playTone(1047, .31, .28, "sine", .035); }, [playTone]);
  const playFailure = useCallback(() => { playTone(220, 0, .18, "sawtooth", .035); playTone(165, .11, .24, "square", .025); }, [playTone]);

  function burst() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const created = Array.from({ length: 30 }, (_, index) => { const angle = Math.PI * 2 * index / 30 + Math.random() * .28; const distance = 70 + Math.random() * 150; return { id: Date.now() + index, x: 50, y: 48, color: COLORS[index % COLORS.length], dx: `${Math.cos(angle) * distance}px`, dy: `${Math.sin(angle) * distance}px`, rot: `${Math.random() * 540 - 270}deg` }; });
    setParticles(created); if (particleTimer.current) window.clearTimeout(particleTimer.current); particleTimer.current = window.setTimeout(() => setParticles([]), 950);
  }

  function prepareRound(number: number) {
    const nextToken = token.current + 1; token.current = nextToken; if (timer.current) window.clearInterval(timer.current); if (nextTimer.current) window.clearTimeout(nextTimer.current);
    const nextQuestion = generateVaultQuestion(level, digits, mode); setQuestion(nextQuestion); setRoundNumber(number); setInputs(Array.from({ length: digits }, () => "")); setActiveInput(0); setAnswered(false); roundResolved.current = false; setVaultState("closed"); setCoinRain([]); setSmoke([]); setParticles([]); setFloatScore(""); setFeedback({ good: false, title: "", text: "Şifreyi çöz ve kasayı aç!" }); setTimeLeft(time * 10); setProgress(getVaultProgress(number, roundLimit)); setSpeedBadge(time === 0 ? "⭐ Rahat mod: sabit hız bonusu" : `⚡ ${time} sn içinde ne kadar hızlı, o kadar çok puan!`); roundStartedAt.current = performance.now(); setPlaying(true); window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    if (time) { timer.current = window.setInterval(() => { if (token.current !== nextToken || roundResolved.current) return; setTimeLeft((left) => { const next = Math.max(0, left - 1); if (next === 0) resolveAnswer(true); return next; }); }, 100); }
  }

  function startGame() { token.current += 1; setScreen("game"); setCorrect(0); setWrong(0); setScore(0); setStreak(0); setBestStreak(0); setSaved(false); setSaveError(""); setProgress(0); finalized.current = false; gameStartedAt.current = performance.now(); prepareRound(1); }

  const showResults = useCallback(async (reason: "manual" | "natural") => {
    if (timer.current) window.clearInterval(timer.current); if (nextTimer.current) window.clearTimeout(nextTimer.current); token.current += 1; setPlaying(false); setProgress(100); setScreen("result"); completionReason.current = reason;
    if (finalized.current || saving) return; finalized.current = true; setSaving(true); setSaveError("");
    try { await saveExerciseResultSecure({ exerciseType: "mental-arithmetic-vault", exerciseTitle: "Mental Aritmetik – Hazine Kasası", score, successRate: (correct + wrong) ? clampPercent(correct / (correct + wrong) * 100) : 0, correctCount: correct, wrongCount: wrong, durationSeconds: Math.max(0, Math.round((performance.now() - gameStartedAt.current) / 1000)), completedAt: new Date().toISOString(), submissionKey: `mental-mental-arithmetic-vault-${gameStartedAt.current}`, assignmentItemId: undefined, programTaskId: educationProgramLaunch?.taskId, details: { level, mode, digits, time, totalRounds: correct + wrong, bestStreak, completionReason: reason } }); setSaved(true); }
    catch { finalized.current = false; setSaveError("Sonuç kaydedilemedi. Lütfen tekrar dene."); } finally { setSaving(false); }
  }, [saving, score, correct, wrong, educationProgramLaunch, level, mode, digits, time, bestStreak]);

  const scheduleNext = useCallback((number: number, currentToken: number, delay = 1500) => { nextTimer.current = window.setTimeout(() => { if (token.current !== currentToken) return; if (number >= roundLimit) void showResults("natural"); else prepareRoundRef.current(number + 1); }, delay); }, [roundLimit, showResults]);

  function resolveAnswer(timedOut = false) {
    if (roundResolved.current || !question || !playing) return; const value = inputs.join(""); if (!timedOut && value.length !== digits) { setFeedback({ good: false, title: "⚠️ Şifrenin tüm hanelerini doldur.", text: "Her haneye bir rakam gir." }); return; } roundResolved.current = true; if (timer.current) window.clearInterval(timer.current); const isCorrect = !timedOut && value === question.answer; const elapsed = (performance.now() - roundStartedAt.current) / 1000; setAnswered(true); setPlaying(false);
    if (isCorrect) { const nextStreak = streak + 1; const earned = getVaultSpeedScore(level, time, timeLeft, nextStreak); setCorrect((count) => count + 1); setScore((points) => points + earned.total); setStreak(nextStreak); setBestStreak((best) => Math.max(best, nextStreak)); setVaultState("unlocking"); setFeedback({ good: true, title: `✅ ${earned.label}! Kasa açıldı!`, text: `+${earned.total} puan${time ? ` • ${elapsed.toFixed(1)} sn` : ""}${earned.streak ? ` • Seri +${earned.streak}` : ""}` }); setSpeedBadge(`🏅 Hız bonusu: +${earned.speed} puan`); setFloatScore(`+${earned.total} ${earned.label}`); if (scoreTimer.current) window.clearTimeout(scoreTimer.current); scoreTimer.current = window.setTimeout(() => setFloatScore(""), 1100); burst(); playSuccess(); window.setTimeout(() => { setVaultState("open"); setCoinRain(Array.from({ length: 36 }, (_, index) => ({ id: Date.now() + index, symbol: index % 6 === 0 ? "💎" : "🪙", left: `${35 + Math.random() * 30}%`, rx: `${Math.random() * 320 - 160}px`, ry: `${50 + Math.random() * 140}px`, rr: `${Math.random() * 720 - 360}deg`, delay: `${.95 + Math.random() * .7}s` }))); }, 560); }
    else { setWrong((count) => count + 1); setStreak(0); setVaultState(timedOut ? "timeout" : "wrong"); setSmoke(Array.from({ length: 8 }, (_, index) => ({ id: Date.now() + index, left: `${20 + Math.random() * 60}%`, sx: `${Math.random() * 100 - 50}px`, delay: `${Math.random() * .12}s` }))); setFeedback(timedOut ? { good: false, title: `⏰ Süre doldu! Doğru şifre: ${question.answer}`, text: "Hız bonusu kaçtı." } : { good: false, title: `❌ Yanlış şifre. Doğru cevap: ${question.answer}`, text: "Sonraki kasada daha dikkatli ol!" }); setSpeedBadge(timedOut ? "⏱️ Süre bonusu kaçtı!" : "💡 Sonraki kasada daha dikkatli ol!"); playFailure(); }
    scheduleNext(roundNumber, token.current, timedOut ? 1500 : 3400);
  }

  function updateDigit(index: number, value: string) { if (answered) return; const digit = value.replace(/\D/g, "").slice(-1); setInputs((current) => current.map((item, position) => position === index ? digit : item)); if (digit && index < digits - 1) { setActiveInput(index + 1); window.setTimeout(() => inputRefs.current[index + 1]?.focus(), 0); } }
  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) { if (event.key === "Enter") { event.preventDefault(); resolveAnswer(); } if (event.key === "Backspace" && !inputs[index] && index > 0) { event.preventDefault(); setInputs((current) => current.map((item, position) => position === index - 1 ? "" : item)); setActiveInput(index - 1); inputRefs.current[index - 1]?.focus(); } }
  function keyPress(key: string) { if (answered) return; if (key === "clear") { setInputs(Array.from({ length: digits }, () => "")); setActiveInput(0); inputRefs.current[0]?.focus(); return; } if (key === "back") { const index = inputs[activeInput] ? activeInput : Math.max(0, activeInput - 1); setInputs((current) => current.map((item, position) => position === index ? "" : item)); setActiveInput(index); inputRefs.current[index]?.focus(); return; } updateDigit(activeInput, key); }

  useEffect(() => { prepareRoundRef.current = prepareRound; });

  const settingDisabled = assignmentRequested;
  const successRate = (correct + wrong) ? Math.round(correct / (correct + wrong) * 100) : 0;
  return <main className={styles.page}><div className={styles.app}>
    <header className={styles.topbar}><Link href="/egzersizler/mental-aritmetik" className={styles.brand}><span className={styles.logo}>🔐</span><span><strong>Hazine Kasası</strong><small>İpuçlarını çöz, gizli şifreyi bul ve kasayı aç!</small></span></Link><button className={styles.soundButton} type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Ses efektlerini kapat" : "Ses efektlerini aç"}>{soundOn ? "🔊" : "🔇"}</button></header>
    {screen === "game" && <div className={styles.layout}><section className={styles.gameCard}><div className={styles.stats}>{[[roundNumber + "/" + roundLimit, "Tur"], [correct, "Doğru"], [score, "Puan"], [streak + "🔥", "Seri"]].map(([value, label]) => <div className={styles.stat} key={String(label)}><span>{label}</span><b>{value}</b></div>)}</div><div className={`${styles.vault} ${vaultState === "open" ? styles.vaultOpen : ""} ${vaultState === "unlocking" ? styles.unlocking : ""} ${vaultState === "open" ? styles.correctFlash : ""} ${vaultState === "wrong" || vaultState === "timeout" ? styles.wrongState : ""}`}><div className={styles.treasureGlow}/><div className={styles.v6Ring}/><div className={styles.v6Banner}>🎉 DOĞRU! KASA AÇILDI</div><div className={styles.treasureChest}><div className={styles.chestLid}><div className={`${styles.lidBand} ${styles.lidBandLeft}`}/><div className={`${styles.lidBand} ${styles.lidBandRight}`}/><div className={styles.lidLock}>🔒</div></div><div className={styles.treasureInside}><div className={styles.treasureRays}/><span className={`${styles.loot} ${styles.lootCrown}`}>👑</span><span className={`${styles.loot} ${styles.lootDiamond}`}>💎</span><span className={`${styles.loot} ${styles.lootGem1}`}>💍</span><span className={`${styles.loot} ${styles.lootGem2}`}>🔮</span><span className={`${styles.loot} ${styles.lootGold1}`}>🪙</span><span className={`${styles.loot} ${styles.lootGold2}`}>🪙</span><span className={`${styles.loot} ${styles.lootGold3}`}>🪙</span><span className={`${styles.loot} ${styles.lootGold4}`}>🪙</span><span className={`${styles.loot} ${styles.lootNecklace}`}>📿</span><span className={`${styles.loot} ${styles.lootCup}`}>🏆</span><span className={`${styles.loot} ${styles.lootGem3}`}>💠</span></div><div className={styles.chestBody}><div className={`${styles.bodyBand} ${styles.bodyBandLeft}`}/><div className={`${styles.bodyBand} ${styles.bodyBandRight}`}/><div className={styles.chestKeyhole}>◆</div><div className={styles.goldPile}><span>🪙</span><span>🪙</span><span>🪙</span><span>🪙</span><span>🪙</span></div></div></div><div className={styles.unlockStatus}><span className={styles.unlockIcon}>{vaultState === "open" ? "🔓" : vaultState === "wrong" ? "🔒" : vaultState === "timeout" ? "⏱️" : "🔐"}</span><span>{vaultState === "unlocking" ? "KİLİT ÇÖZÜLÜYOR..." : vaultState === "open" ? "KASA AÇILDI!" : vaultState === "wrong" ? "ŞİFRE HATALI" : vaultState === "timeout" ? "SÜRE DOLDU" : "ŞİFREYİ ÇÖZ"}</span></div><div className={styles.coinRain}>{coinRain.map((coin)=><span className={styles.rainCoin} key={coin.id} style={{left:coin.left,animationDelay:coin.delay,"--rx":coin.rx,"--ry":coin.ry,"--rr":coin.rr} as CSSProperties}>{coin.symbol}</span>)}</div><div className={styles.smokeWrap}>{smoke.map((item)=><span className={styles.smoke} key={item.id} style={{left:item.left,animationDelay:item.delay,"--sx":item.sx} as CSSProperties}/>)}</div><div className={styles.vaultTitle}>{vaultState === "open" ? "✨ HAZİNE ORTAYA ÇIKTI! ✨" : vaultState === "wrong" ? "🔒 KASA AÇILMADI" : vaultState === "timeout" ? "🔒 SÜRE DOLDU" : "GİZLİ KASA ŞİFRESİ"}</div><div className={styles.codeDisplay}>{inputs.map((value,index)=><div className={styles.codeBox} key={index}>{value||"?"}</div>)}</div></div><div className={styles.mission}><div className={styles.missionLabel}>🧩 Şifre İpucu</div><div className={styles.question}>{question?.question ?? "Başlamak için sağdaki ayarları seç."}</div><div className={styles.hint}>{question?.hint ?? "Doğru sonucu bul ve rakamlarla kasaya gir."}</div><div className={styles.timer}><div style={{ width: `${time ? Math.max(0, timeLeft / (time * 10) * 100) : 100}%`, opacity: time ? 1 : .25 }} /></div><div className={styles.speedBadge}>{speedBadge}</div></div><div className={styles.answerTitle}>ŞİFREYİ GİR</div><div className={styles.answer}>{inputs.map((value, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element; }} className={styles.digit} value={value} maxLength={1} inputMode="numeric" disabled={answered} onFocus={() => setActiveInput(index)} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} aria-label={`${index + 1}. şifre hanesi`} />)}</div><div className={styles.keypad}>{["1","2","3","4","5","6","7","8","9"].map((key) => <button type="button" key={key} disabled={answered} onClick={() => keyPress(key)}>{key}</button>)}<button type="button" disabled={answered} onClick={() => keyPress("clear")}>Temizle</button><button type="button" disabled={answered} onClick={() => keyPress("0")}>0</button><button type="button" disabled={answered} onClick={() => keyPress("back")}>⌫</button></div><button className={styles.openButton} type="button" disabled={answered} onClick={() => resolveAnswer()}>🔓 KASAYI AÇ</button><div className={`${styles.message} ${feedback.good ? styles.messageGood : feedback.title ? styles.messageBad : ""}`} role="status"><strong>{feedback.title || feedback.text}</strong>{feedback.title && <span>{feedback.text}</span>}</div><div className={styles.progressWrap}><div className={styles.progressHead}><span>Hazine Yolculuğu</span><span>{progress}%</span></div><div className={styles.progress}><div style={{ width: `${progress}%` }} /></div></div>{floatScore && <div className={styles.scoreFloat}>{floatScore}</div>}{particles.map((particle) => <span className={styles.particle} key={particle.id} style={{ left: `${particle.x}%`, top: `${particle.y}%`, background: particle.color, "--dx": particle.dx, "--dy": particle.dy, "--rot": particle.rot } as CSSProperties} />)}</section><aside className={styles.sideCard}><h2>⚙️ Oyun Ayarları</h2><SettingGroup label="SEVİYE" disabled={settingDisabled} values={LEVELS} value={level} labels={LEVELS.map((item) => VAULT_LEVEL_CONFIG[item].label)} onChange={(value) => setLevel(value as VaultLevel)} columns="four" /><SettingGroup label="ŞİFRE UZUNLUĞU" disabled={settingDisabled} values={[2,3,4]} value={digits} labels={["2 Hane","3 Hane","4 Hane"]} onChange={(value) => setDigits(Number(value))} /><SettingGroup label="SÜRE" disabled={settingDisabled} values={VAULT_TIMES} value={time} labels={["Rahat","20 sn","10 sn"]} onChange={(value) => setTime(Number(value) as VaultTime)} /><SettingGroup label="TUR SAYISI" disabled={settingDisabled} values={[5,10,15]} value={roundLimit} labels={["5 Tur","10 Tur","15 Tur"]} onChange={(value) => setRoundLimit(Number(value))} /><SettingGroup label="OYUN TÜRÜ" disabled={settingDisabled} values={MODES.map((item) => item.value)} value={mode} labels={MODES.map((item) => item.label)} onChange={(value) => setMode(value as VaultMode)} two /><button className={styles.startButton} type="button" disabled={!settingsReady} onClick={startGame}>▶ YENİ OYUNU BAŞLAT</button>{playing && <button className={styles.finishButton} type="button" disabled={saving} onClick={() => void showResults("manual")}>Bitir</button>}</aside></div>}
    {screen === "result" && <section className={styles.resultOverlay}><div className={styles.resultCard}><div className={styles.treasure}>🏆</div><h1>Hazine Bulundu!</h1><p>Kasaları açtın ve görevi tamamladın.</p><div className={styles.resultGrid}><div><span>Doğru</span><b>{correct}/{roundLimit}</b></div><div><span>Başarı</span><b>%{successRate}</b></div><div><span>Puan</span><b>{score}</b></div><div><span>En İyi Seri</span><b>{bestStreak}</b></div></div>{saving && <small>Sonuç güvenli şekilde kaydediliyor…</small>}{saved && <small className={styles.saved}>Sonuç kaydedildi.</small>}{saveError && <div className={styles.saveError}>{saveError}<button type="button" onClick={() => void showResults(completionReason.current)}>Tekrar dene</button></div>}<button className={styles.againButton} type="button" disabled={saving} onClick={startGame}>🔁 TEKRAR OYNA</button>{saved && <Link href="/sonuc" className={styles.resultLink}>Platform sonuçlarına git</Link>}</div></section>}
  </div></main>;
}

function SettingGroup({ label, values, value, labels, disabled, onChange, columns, two }: { label: string; values: readonly (string | number)[]; value: string | number; labels: string[]; disabled: boolean; onChange: (value: string | number) => void; columns?: string; two?: boolean }) {
  return <div className={styles.setting}><label>{label}</label><div className={`${styles.segment} ${columns === "four" ? styles.four : ""} ${two ? styles.two : ""}`}>{values.map((item, index) => <button type="button" key={String(item)} disabled={disabled} className={`${styles.option} ${item === value ? styles.optionActive : ""}`} onClick={() => onChange(item)}>{labels[index]}</button>)}</div></div>;
}
