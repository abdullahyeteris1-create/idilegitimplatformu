"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import styles from "./TatliDukkaniExerciseClient.module.css";

type Item = { id: string; emoji: string; name: string };
type Phase = "intro" | "order" | "selection" | "feedback" | "gameover";
type Feedback = { good: boolean; perfect: boolean; missing: Item[]; wrong: Item[] };

const TITLE = "Tatlı Dükkanı";
const RESULT_TYPE = "tatli-dukkani";
const ITEMS: Item[] = [
  { id: "cherry-cake", emoji: "🍰", name: "Çilekli Pasta" }, { id: "raspberry-cake", emoji: "🍰", name: "Frambuazlı Pasta" },
  { id: "chocolate-cake", emoji: "🎂", name: "Çikolatalı Pasta" }, { id: "cheesecake", emoji: "🧁", name: "Cheesecake" },
  { id: "lemonade", emoji: "🍋", name: "Limonata" }, { id: "orange-juice", emoji: "🍊", name: "Portakal Suyu" },
  { id: "cookie", emoji: "🍪", name: "Kurabiye" }, { id: "donut", emoji: "🍩", name: "Donut" },
  { id: "croissant", emoji: "🥐", name: "Kruvasan" }, { id: "pudding", emoji: "🍮", name: "Puding" },
  { id: "chocolate", emoji: "🍫", name: "Çikolata" }, { id: "coffee", emoji: "☕", name: "Kahve" },
  { id: "tea", emoji: "🍵", name: "Çay" }, { id: "juice", emoji: "🧃", name: "Meyve Suyu" },
  { id: "ayran", emoji: "🥛", name: "Ayran" }, { id: "icecream", emoji: "🍨", name: "Dondurma" },
  { id: "waffle", emoji: "🧇", name: "Waffle" }, { id: "muffin", emoji: "🧁", name: "Muffin" },
  { id: "strawberry", emoji: "🍓", name: "Çilekli Tatlı" }, { id: "watermelon", emoji: "🍉", name: "Karpuz Suyu" },
  { id: "blueberry", emoji: "🫐", name: "Yaban Mersinli Pasta" }, { id: "candy", emoji: "🍬", name: "Şeker" },
  { id: "pie", emoji: "🥧", name: "Pasta Dilimi" }, { id: "crepe", emoji: "🫓", name: "Crepe" },
];
const LEVELS = [
  { items: 2, time: 1000, decoys: 4 }, { items: 3, time: 900, decoys: 5 }, { items: 3, time: 750, decoys: 6 },
  { items: 4, time: 650, decoys: 7 }, { items: 4, time: 550, decoys: 8 }, { items: 5, time: 450, decoys: 9 },
  { items: 5, time: 380, decoys: 10 }, { items: 6, time: 340, decoys: 11 }, { items: 6, time: 310, decoys: 12 },
  { items: 7, time: 300, decoys: 13 },
];

function shuffle<T>(values: T[]): T[] { const result = [...values]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function getLevelConfig(level: number) {
  const base = LEVELS[Math.min(level, 10) - 1];
  const items = level >= 7 && level % 2 === 0 ? Math.min(base.items + 1, 7) : base.items;
  const time = level >= 9 ? 300 + Math.random() * 60 : level >= 7 ? base.time + Math.random() * 40 - 20 : base.time;
  return { items, time: Math.max(300, Math.min(Math.round(time), 1000)), decoys: base.decoys };
}
function multiplier(combo: number): number { return combo >= 10 ? 4 : combo >= 7 ? 3 : combo >= 5 ? 2.5 : combo >= 3 ? 2 : 1; }

export function TatliDukkaniExerciseClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps } = {}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1); const [score, setScore] = useState(0); const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0); const [maxCombo, setMaxCombo] = useState(0); const [correct, setCorrect] = useState(0); const [rounds, setRounds] = useState(0); const [roundInLevel, setRoundInLevel] = useState(0);
  const [order, setOrder] = useState<Item[]>([]); const [options, setOptions] = useState<Item[]>([]); const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null); const [orderProgress, setOrderProgress] = useState(100); const [startedAt, setStartedAt] = useState<number | null>(null);
  const [saved, setSaved] = useState(false); const timerRef = useRef<number | null>(null); const saveRef = useRef(false);
  useEducationProgramExerciseRunning(Boolean(educationProgramLaunch) && phase !== "intro" && phase !== "gameover");
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(educationProgramLaunch?.taskId, RESULT_TYPE);

  const startRound = useCallback((nextLevel = level) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    const config = getLevelConfig(nextLevel);
    const picked = shuffle(ITEMS).slice(0, config.items);
    const decoys = shuffle(ITEMS.filter((item) => !picked.some((candidate) => candidate.id === item.id))).slice(0, config.decoys);
    setOrder(picked); setOptions([]); setSelected([]); setOrderProgress(100); setPhase("order");
    const started = performance.now();
    timerRef.current = window.setInterval(() => {
      const progress = Math.max(0, 100 - ((performance.now() - started) / config.time) * 100);
      setOrderProgress(progress);
      if (progress <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setOptions(shuffle([...picked, ...decoys])); setPhase("selection");
      }
    }, 20);
  }, [level]);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const startGame = () => { setLevel(1); setScore(0); setLives(3); setCombo(0); setMaxCombo(0); setCorrect(0); setRounds(0); setRoundInLevel(0); setSaved(false); saveRef.current = false; setStartedAt(Date.now()); startRound(1); };
  const saveResult = useCallback(async (finalLevel: number, finalScore: number, finalLives: number, finalCorrect: number, finalRounds: number, finalCombo: number) => {
    if (saveRef.current || finalRounds <= 0) return; saveRef.current = true; setSaved(true);
    const durationSeconds = Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000));
    try {
      await saveExerciseResultSecure({ exerciseType: RESULT_TYPE, exerciseTitle: TITLE, score: finalScore, successRate: Math.round((finalCorrect / finalRounds) * 100), correctCount: finalCorrect, wrongCount: finalRounds - finalCorrect, durationSeconds, details: { reachedLevel: finalLevel, totalRounds: finalRounds, totalCorrect: finalCorrect, maxCombo: Math.max(finalCombo, maxCombo), livesRemaining: finalLives, completionReason: "game-over" } });
      await completeTaskAfterResultSave();
    } catch { setSaved(false); }
  }, [completeTaskAfterResultSave, maxCombo, startedAt]);

  const submit = () => {
    if (phase !== "selection") return;
    const selectedSet = new Set(selected); const correctIds = new Set(order.map((item) => item.id));
    const good = selected.length === correctIds.size && selected.every((id) => correctIds.has(id));
    const nextRounds = rounds + 1;
    setRounds(nextRounds);
    if (good) {
      const nextCombo = combo + 1; const nextCorrect = correct + 1; const nextScore = score + Math.round(100 * multiplier(nextCombo));
      const nextRoundInLevel = roundInLevel + 1; const roundsToLevelUp = Math.min(3 + Math.floor(level / 3), 6);
      const nextLevel = nextRoundInLevel >= roundsToLevelUp ? Math.min(10, level + 1) : level;
      setRoundInLevel(nextRoundInLevel >= roundsToLevelUp ? 0 : nextRoundInLevel); setCombo(nextCombo); setMaxCombo((current) => Math.max(current, nextCombo)); setCorrect(nextCorrect); setScore(nextScore); setLevel(nextLevel);
      setFeedback({ good: true, perfect: true, missing: [], wrong: [] }); setPhase("feedback");
    } else {
      const nextLives = lives - 1; const wrong = options.filter((item) => selectedSet.has(item.id) && !correctIds.has(item.id)); const missing = order.filter((item) => !selectedSet.has(item.id));
      setCombo(0); setLives(nextLives);
      if (nextLives <= 0) { setPhase("gameover"); void saveResult(level, score, nextLives, correct, nextRounds, maxCombo); }
      else { setFeedback({ good: false, perfect: false, missing, wrong }); setPhase("feedback"); }
    }
  };

  const titleStats = useMemo(() => `Tur ${rounds + 1} / Seviye ${level}`, [level, rounds]);
  if (phase === "intro") return <main className={styles.page}><section className={styles.intro}><div className={styles.bigEmoji}>🧁</div><h1>Tatlı Dükkanı</h1><p>Müşterilerin siparişlerini hafızanda tut, tatlıları hazırla!</p><div className={styles.howTo}><h2>Nasıl Oynanır?</h2><ul><li>Müşterinin siparişi kısa süre gösterilir.</li><li>Sipariş kaybolmadan dikkat et.</li><li>Doğru ürünleri seçip siparişi hazırla.</li><li>Ardışık doğru cevaplarla bonus kazan.</li></ul></div><button className={styles.primary} onClick={startGame}>🍬 Oyuna Başla!</button></section></main>;
  if (phase === "gameover") return <main className={styles.page}><section className={styles.gameover}><div className={styles.bigEmoji}>😢</div><h1>Oyun Bitti!</h1><p>Dükkanın kapısına “Kapalı” tabelası asıldı...</p><div className={styles.finalStats}><span>Seviye <b>{level}</b></span><span>Toplam Puan <b>⭐ {score}</b></span><span>Doğru Cevap <b>✅ {correct}</b></span><span>Tam Seri <b>🔥 {maxCombo}x</b></span><span>Toplam Tur <b>{rounds}</b></span></div><p className={styles.saveStatus}>{saved ? "Sonuç kaydedildi." : "Sonuç kaydediliyor..."}</p><button className={styles.gold} onClick={startGame}>🔄 Yeniden Oyna!</button></section></main>;
  return <main className={styles.page}><div className={styles.game}><header><h1>🧁 Tatlı Dükkanı</h1><div className={styles.stats}><span>📊 Seviye {level}</span><span>⭐ Puan: {score}</span>{combo >= 2 && <span className={styles.combo}>🔥 Seri: {combo}x</span>}<span>❤️ {lives}</span></div><div className={styles.progress}><i style={{ width: `${(roundInLevel / 3) * 100}%` }} /></div><small>{titleStats}</small></header><section className={styles.phase}>
    {phase === "order" && <div className={styles.order}><div className={styles.bigEmoji}>🧑‍🍳</div><strong>MÜŞTERİ SİPARİŞİ</strong><div className={styles.timer}><i style={{ width: `${orderProgress}%` }} /></div><div className={styles.orderItems}>{order.map((item) => <span key={item.id}>{item.emoji} {item.name}</span>)}</div></div>}
    {phase === "selection" && <div className={styles.selection}><h2>📋 Doğru Ürünleri Seç!</h2><p>Hafızandaki siparişi hatırla ve işaretle</p><div className={styles.grid}>{options.map((item) => <button type="button" className={`${styles.item} ${selected.includes(item.id) ? styles.selected : ""}`} key={item.id} onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><span>{item.emoji}</span><b>{item.name}</b></button>)}</div><button className={styles.primary} onClick={submit}>🍽️ Siparişi Hazırla</button></div>}
    {phase === "feedback" && feedback && <div className={`${styles.result} ${feedback.good ? styles.good : styles.bad}`}><div className={styles.bigEmoji}>{feedback.good ? "🎉" : "😅"}</div><h2>{feedback.good ? "✅ Mükemmel!" : "❌ Yanlış Sipariş!"}</h2><p>{feedback.good ? `+${Math.round(100 * multiplier(combo))} puan` : `${lives} can kaldı`}</p>{!feedback.good && <div>{feedback.missing.map((item) => <p key={`m-${item.id}`}>⚠️ Eksik: {item.emoji} {item.name}</p>)}{feedback.wrong.map((item) => <p key={`w-${item.id}`}>❌ Yanlış: {item.emoji} {item.name}</p>)}</div>}<button className={styles.secondary} onClick={() => startRound(level)}>➡️ Sonraki Müşteri</button></div>}
  </section></div></main>;
}
