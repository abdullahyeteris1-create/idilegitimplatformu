"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { calculateKayipNesnePoints, createKayipNesneRound, KAYIP_NESNE_DIFFICULTIES, type KayipNesneDifficulty, type KayipNesneRound } from "@/lib/kayip-nesne/game";
import styles from "./KayipNesneExerciseClient.module.css";

type Phase = "intro" | "memory" | "transition" | "selection" | "feedback" | "levelComplete" | "gameover";
type Feedback = { correct: boolean; points: number; correctSlot: number; lives: number };
const TITLE = "Kayıp Nesne";
const RESULT_TYPE = "kayip-nesne";

export function KayipNesneExerciseClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps } = {}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<KayipNesneDifficulty>("easy");
  const [level, setLevel] = useState(1); const [score, setScore] = useState(0); const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0); const [maxStreak, setMaxStreak] = useState(0); const [correct, setCorrect] = useState(0); const [total, setTotal] = useState(0);
  const [round, setRound] = useState<KayipNesneRound | null>(null); const [memorySecondsLeft, setMemorySecondsLeft] = useState(0); const [feedback, setFeedback] = useState<Feedback | null>(null); const [selectedId, setSelectedId] = useState<string | null>(null); const [startedAt, setStartedAt] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const timerRef = useRef<number | null>(null); const transitionRef = useRef<number | null>(null); const roundStartRef = useRef(0); const saveRef = useRef(false); const audioRef = useRef<AudioContext | null>(null);
  useEducationProgramExerciseRunning(Boolean(educationProgramLaunch) && phase !== "intro" && phase !== "gameover");
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(educationProgramLaunch?.taskId, RESULT_TYPE);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); if (transitionRef.current) window.clearTimeout(transitionRef.current); audioRef.current?.close().catch(() => undefined); }, []);

  const playSound = useCallback((kind: "correct" | "wrong") => {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = audioRef.current ?? new AudioContextClass(); audioRef.current = audio; void audio.resume();
      const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.connect(gain); gain.connect(audio.destination);
      const now = audio.currentTime; oscillator.frequency.setValueAtTime(kind === "correct" ? 523 : 220, now); oscillator.frequency.setValueAtTime(kind === "correct" ? 784 : 150, now + 0.15);
      gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35); oscillator.start(now); oscillator.stop(now + 0.36);
    } catch { /* Ses desteklenmiyorsa oyun devam eder. */ }
  }, []);

  const startRound = useCallback((nextLevel: number, nextDifficulty = difficulty) => {
    if (timerRef.current) window.clearInterval(timerRef.current); if (transitionRef.current) window.clearTimeout(transitionRef.current);
    const nextRound = createKayipNesneRound(nextLevel, nextDifficulty); setRound(nextRound); setMemorySecondsLeft(nextRound.memoryTimeSeconds); setFeedback(null); setSelectedId(null); setPhase("memory");
    timerRef.current = window.setInterval(() => setMemorySecondsLeft((seconds) => {
      if (seconds <= 1) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setPhase("transition");
        transitionRef.current = window.setTimeout(() => { roundStartRef.current = performance.now(); setPhase("selection"); }, 650);
        return 0;
      }
      return seconds - 1;
    }), 1000);
  }, [difficulty]);

  const startGame = useCallback(() => { setLevel(1); setScore(0); setLives(3); setStreak(0); setMaxStreak(0); setCorrect(0); setTotal(0); setSaved(false); saveRef.current = false; setStartedAt(Date.now()); startRound(1); }, [startRound]);
  const saveResult = useCallback(async (finalLevel: number, finalScore: number, finalLives: number, finalCorrect: number, finalTotal: number, finalMaxStreak: number) => {
    if (saveRef.current || finalTotal <= 0) return; saveRef.current = true; setSaved(true);
    try { await saveExerciseResultSecure({ exerciseType: RESULT_TYPE, exerciseTitle: TITLE, score: finalScore, successRate: Math.round((finalCorrect / finalTotal) * 100), correctCount: finalCorrect, wrongCount: finalTotal - finalCorrect, durationSeconds: Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)), details: { reachedLevel: finalLevel, totalRounds: finalTotal, totalCorrect: finalCorrect, maxStreak: finalMaxStreak, livesRemaining: finalLives, completionReason: "game-over" } }); await completeTaskAfterResultSave(); } catch { setSaved(false); }
  }, [completeTaskAfterResultSave, startedAt]);

  const chooseBox = (itemId: string) => {
    if (phase !== "selection" || !round) return;
    const item = round.items.find((candidate) => candidate.id === itemId); if (!item) return;
    setSelectedId(itemId); const isCorrect = itemId === round.targetId; const nextTotal = total + 1; setTotal(nextTotal);
    if (isCorrect) { const nextStreak = streak + 1; const points = calculateKayipNesnePoints(performance.now() - roundStartRef.current, streak); setScore((value) => value + points); setStreak(nextStreak); setMaxStreak((value) => Math.max(value, nextStreak)); setCorrect((value) => value + 1); setFeedback({ correct: true, points, correctSlot: item.slot, lives }); playSound("correct"); }
    else { const nextLives = lives - 1; setLives(nextLives); setStreak(0); setFeedback({ correct: false, points: 0, correctSlot: round.items.find((candidate) => candidate.id === round.targetId)?.slot ?? 0, lives: nextLives }); playSound("wrong"); if (nextLives <= 0) { setPhase("gameover"); void saveResult(level, score, lives - 1, correct, nextTotal, maxStreak); return; } }
    setPhase("feedback");
  };

  const nextRoundOrLevel = () => { if (correct > 0 && correct % 5 === 0) { setPhase("levelComplete"); return; } startRound(level); };
  const nextLevel = () => { const next = level + 1; setLevel(next); setCorrect(0); setLives((value) => Math.min(3, value + 1)); setPhase("memory"); startRound(next); };

  if (phase === "intro") return <main className={styles.page}><section className={styles.intro}><div className={styles.heroEmoji}>🐈</div><h1>Kayıp Nesne</h1><p>Nesnelerin yerlerini hafızanda tut, sonra doğru kutucuğu bul!</p><div className={styles.howTo}><h2>Nasıl Oynanır?</h2><ul><li>Sahnedeki nesnelerin yerlerini incele.</li><li>Hedef nesneyi ve bulunduğu kutuyu hatırla.</li><li>Yanlış cevapta bir can kaybedersin.</li><li>Seri doğru cevaplar daha çok puan kazandırır.</li></ul></div><div className={styles.difficulties}>{KAYIP_NESNE_DIFFICULTIES.map((item) => <button type="button" key={item.id} className={difficulty === item.id ? styles.activeDifficulty : ""} onClick={() => setDifficulty(item.id)}>{item.label}</button>)}</div><button type="button" className={styles.primary} onClick={startGame}>🎮 Oyuna Başla</button></section></main>;
  if (phase === "gameover") return <main className={styles.page}><section className={styles.gameover}><div className={styles.heroEmoji}>😿</div><h1>Oyun Bitti!</h1><div className={styles.finalStats}><span>Ulaşılan seviye <b>{level}</b></span><span>Toplam puan <b>⭐ {score}</b></span><span>Doğru cevap <b>✅ {correct}</b></span><span>Yanlış cevap <b>{total - correct}</b></span><span>En iyi seri <b>🔥 {maxStreak}</b></span></div><p className={styles.saveStatus}>{saved ? "Sonuç kaydedildi." : "Sonuç kaydediliyor..."}</p><button type="button" className={styles.primary} onClick={startGame}>🔄 Tekrar Oyna</button></section></main>;
  const target = round?.items.find((item) => item.id === round.targetId);
  return <main className={styles.page}><div className={styles.game}><header className={styles.header}><span className={styles.level}>Seviye {level}</span><span>⭐ {score}</span><span className={styles.streak}>🔥 Seri: {streak}</span><span aria-label={`${lives} can`}>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span></header><div className={styles.progress}><i style={{ width: `${(correct % 5) * 20}%` }} /></div>{(phase === "memory" || phase === "transition") && round && <section className={styles.phase}><h2>👀 Nesnelerin Yerlerini Hatırla!</h2><div className={styles.timer}><i style={{ animationDuration: `${round.memoryTimeSeconds}s` }} /></div><Scene round={round} showItems={phase === "memory"} /><p className={styles.countdown}>{phase === "memory" ? memorySecondsLeft : "🙈 Nesneler kayboluyor..."}</p></section>}{phase === "selection" && round && target && <section className={styles.phase}><div className={styles.targetPanel}><span className={styles.targetEmoji}>{target.emoji}</span><div><strong>{target.name}</strong><span>hangi kutucuktaydı?</span></div></div><Scene round={round} showItems={false} onChoose={chooseBox} /></section>}{phase === "feedback" && feedback && round && <section className={`${styles.feedback} ${feedback.correct ? styles.good : styles.bad}`}><div className={styles.heroEmoji}>{feedback.correct ? "🎉" : "😿"}</div><h2>{feedback.correct ? "Doğru!" : "Yanlış kutu!"}</h2><p>{feedback.correct ? `+${feedback.points} puan` : `Doğru yer: ${feedback.correctSlot}. kutu`}</p><Scene round={round} showItems={false} selectedId={selectedId} revealTargetId={round.targetId} /><button type="button" className={styles.primary} onClick={nextRoundOrLevel}>Devam Et</button></section>}{phase === "levelComplete" && <section className={styles.feedback}><div className={styles.heroEmoji}>🎉</div><h2>Seviye {level} tamamlandı!</h2><p>{lives === 3 ? "⭐⭐⭐" : lives === 2 ? "⭐⭐" : "⭐"}</p><p>Toplam puan: {score}</p><button type="button" className={styles.primary} onClick={nextLevel}>Sonraki Seviye ➜</button></section>}</div></main>;
}

function Scene({ round, showItems, onChoose, selectedId, revealTargetId }: { round: KayipNesneRound; showItems: boolean; onChoose?: (id: string) => void; selectedId?: string | null; revealTargetId?: string }) {
  return <div className={`${styles.scene} ${styles[round.sceneClass]}`}><SceneDecor sceneClass={round.sceneClass} /><div className={styles.sceneItems}>{round.items.map((item) => showItems ? <span className={styles.object} style={{ left: `${item.x}%`, top: `${item.y}%` }} key={item.id}>{item.emoji}</span> : <button type="button" className={`${styles.box} ${selectedId === item.id ? (item.id === revealTargetId ? styles.correctBox : styles.wrongBox) : ""} ${revealTargetId === item.id ? styles.revealBox : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-label={`Kutu ${item.slot}`} onClick={() => onChoose?.(item.id)} key={item.id}>{item.slot}</button>)}</div><span className={styles.sceneLabel}>{round.sceneName}</span></div>;
}

function SceneDecor({ sceneClass }: { sceneClass: string }) {
  if (sceneClass === "garden" || sceneClass === "park") return <><span className={styles.sun} /><span className={styles.ground} /><span className={styles.decorTree}><i /><b /></span><span className={styles.decorBench} /></>;
  if (sceneClass === "classroom") return <><span className={styles.wallPanel} /><span className={styles.blackboard} /><span className={styles.decorDesk} /><span className={styles.decorDeskTwo} /><span className={styles.decorShelf} /></>;
  return <><span className={styles.wallPanel} /><span className={styles.decorWindow} /><span className={styles.decorSofa} /><span className={styles.decorTable} /><span className={styles.decorShelf} /><span className={styles.decorPlant}><i /><b /></span><span className={styles.decorLamp} /></>;
}
