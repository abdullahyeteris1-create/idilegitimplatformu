"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEducationProgramExerciseRunning } from "@/components/education-programs/EducationProgramExerciseChrome";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { useEducationProgramTaskCompletion } from "@/lib/education-programs/useEducationProgramTaskCompletion";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import {
  buildSarayDedektifiDeck,
  calculateSarayDedektifiPoints,
  createSarayDedektifiQuestions,
  getSarayDedektifiMode,
  getSarayDedektifiSpeed,
  getSarayDedektifiStoryDurationMs,
  resolveSarayDedektifiRank,
  SARAY_DEDEKTIFI_MODES,
  SARAY_DEDEKTIFI_SPEEDS,
  type SarayDedektifiCase,
  type SarayDedektifiModeId,
  type SarayDedektifiQuestion,
  type SarayDedektifiSpeedId,
} from "@/lib/saray-dedektifi/game";
import styles from "./SarayDedektifiExerciseClient.module.css";

type Phase = "intro" | "story" | "question" | "finished";
const TITLE = "Saray Dedektifi";
const RESULT_TYPE = "saray-dedektifi";
const OPTION_LABELS = ["A", "B", "C", "D", "E"];

export function SarayDedektifiExerciseClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps } = {}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [modeId, setModeId] = useState<SarayDedektifiModeId>("baslangic");
  const [speedId, setSpeedId] = useState<SarayDedektifiSpeedId>("normal");
  const [deck, setDeck] = useState<SarayDedektifiCase[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questions, setQuestions] = useState<SarayDedektifiQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(getSarayDedektifiMode("baslangic").lives);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [totalPlanned, setTotalPlanned] = useState(1);
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const storyTimerRef = useRef<number | null>(null);
  const answerTimerRef = useRef<number | null>(null);
  const saveRef = useRef(false);

  const mode = getSarayDedektifiMode(modeId);
  const speed = getSarayDedektifiSpeed(speedId);
  const isRunning = Boolean(educationProgramLaunch) && phase !== "intro" && phase !== "finished";
  useEducationProgramExerciseRunning(isRunning);
  const { completeTaskAfterResultSave } = useEducationProgramTaskCompletion(educationProgramLaunch?.taskId, RESULT_TYPE);

  const clearTimers = useCallback(() => {
    if (storyTimerRef.current) window.clearTimeout(storyTimerRef.current);
    if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
    storyTimerRef.current = null;
    answerTimerRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const saveResult = useCallback(async (finalScore: number, finalCorrect: number, finalAnswered: number, finalLives: number, finalRounds: number, reason: "game-over" | "completed") => {
    if (saveRef.current || finalAnswered <= 0) return;
    saveRef.current = true;
    setSaved(true);
    try {
      await saveExerciseResultSecure({
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        score: finalScore,
        successRate: Math.round((finalCorrect / finalAnswered) * 100),
        correctCount: finalCorrect,
        wrongCount: finalAnswered - finalCorrect,
        durationSeconds: Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)),
        details: {
          mode: modeId,
          speed: speedId,
          completedCases: finalRounds,
          totalQuestions: finalAnswered,
          totalCorrect: finalCorrect,
          livesRemaining: finalLives,
          completionReason: reason,
        },
      });
      await completeTaskAfterResultSave();
    } catch {
      setSaved(false);
    }
  }, [completeTaskAfterResultSave, modeId, speedId, startedAt]);

  const showStory = useCallback((nextDeck: SarayDedektifiCase[], nextRound: number, plannedSoFar: number) => {
    const caseFile = nextDeck[nextRound];
    const nextQuestions = createSarayDedektifiQuestions(caseFile, modeId);
    // Bir dosyada mevcut soru kategorisi mod hedefinden azsa toplam plan kucultulur.
    const planned = plannedSoFar - (mode.questions - nextQuestions.length);
    setRoundIndex(nextRound);
    setQuestions(nextQuestions);
    setQuestionIndex(0);
    setChosenOption(null);
    setTotalPlanned(Math.max(1, planned));
    setPhase("story");
    storyTimerRef.current = window.setTimeout(() => setPhase("question"), getSarayDedektifiStoryDurationMs(modeId, speedId));
    return planned;
  }, [mode.questions, modeId, speedId]);

  const startGame = useCallback(() => {
    clearTimers();
    saveRef.current = false;
    const nextDeck = buildSarayDedektifiDeck(modeId);
    setDeck(nextDeck);
    setScore(0);
    setLives(mode.lives);
    setAnswered(0);
    setCorrect(0);
    setSaved(false);
    setStartedAt(Date.now());
    showStory(nextDeck, 0, nextDeck.length * mode.questions);
  }, [clearTimers, mode.lives, mode.questions, modeId, showStory]);

  const answer = (option: string) => {
    if (phase !== "question" || chosenOption) return;
    const question = questions[questionIndex];
    const isCorrect = option === question.correct;
    const nextAnswered = answered + 1;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    const nextScore = score + (isCorrect ? calculateSarayDedektifiPoints(modeId) : 0);
    const nextLives = isCorrect ? lives : lives - 1;
    setChosenOption(option);
    setAnswered(nextAnswered);
    setCorrect(nextCorrect);
    setScore(nextScore);
    setLives(nextLives);

    answerTimerRef.current = window.setTimeout(() => {
      if (nextLives <= 0) {
        setPhase("finished");
        void saveResult(nextScore, nextCorrect, nextAnswered, 0, roundIndex, "game-over");
        return;
      }
      if (questionIndex + 1 < questions.length) {
        setQuestionIndex(questionIndex + 1);
        setChosenOption(null);
        return;
      }
      if (roundIndex + 1 >= deck.length) {
        setPhase("finished");
        void saveResult(nextScore, nextCorrect, nextAnswered, nextLives, deck.length, "completed");
        return;
      }
      showStory(deck, roundIndex + 1, totalPlanned);
    }, 1150);
  };

  const header = (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>👑</div>
          <div>
            <h1>{TITLE}</h1>
            <p>Oku • Hatırla • İpuçlarını Çöz</p>
          </div>
        </div>
        <div className={styles.stats}>
          <span className={styles.pill}>⭐ <b>{score}</b></span>
          <span className={styles.pill}>🎖️ <b>{mode.name}</b></span>
          <span className={styles.pill}>⏱️ <b>{speed.name}</b></span>
          <span className={styles.pill}>❤️ <b>{Math.max(0, lives)}</b></span>
        </div>
      </header>
      <div className={styles.progress}>
        <i style={{ width: `${Math.min(100, (answered / Math.max(1, totalPlanned)) * 100)}%` }} />
      </div>
    </>
  );

  if (phase === "intro") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          {header}
          <section className={styles.panel}>
            <div className={styles.eyebrow}>🕵️ Sarayın yeni dedektifi sensin!</div>
            <div className={styles.badge}>🏰</div>
            <h2 className={styles.title}>Dedektif seviyeni seç</h2>
            <p className={styles.subtitle}>Her oyunda senaryolar karıştırılır. Aynı oyun içinde bir dosya ikinci kez gelmez; zorluk arttıkça hikâyeler uzar ve ayrıntılar birbirine daha çok benzer.</p>
            <div className={styles.modes}>
              {SARAY_DEDEKTIFI_MODES.map((item) => (
                <button type="button" key={item.id} className={`${styles.mode} ${item.id === modeId ? styles.selected : ""}`} onClick={() => { setModeId(item.id); setLives(item.lives); }}>
                  <span className={styles.icon}>{item.icon}</span>
                  <b>{item.name}</b>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
            <div className={styles.speedSection}>
              <div className={styles.speedTitle}>⏱️ Okuma Hızı</div>
              <div className={styles.speedSub}>Metnin ekranda ne kadar süre kalacağını seç. Zorluk seviyesinden bağımsızdır.</div>
              <div className={styles.speeds}>
                {SARAY_DEDEKTIFI_SPEEDS.map((item) => (
                  <button type="button" key={item.id} className={`${styles.speed} ${item.id === speedId ? styles.selected : ""}`} onClick={() => setSpeedId(item.id)}>
                    <b>{item.icon} {item.name}</b>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.features}>
              <div className={styles.feature}><i>🎲</i><b>Farklı Dosyalar</b><span>Her tur senaryolar rastgele gelir.</span></div>
              <div className={styles.feature}><i>🧠</i><b>Değişen Sorular</b><span>Kim, ne, nerede, renk, sayı, zaman, ayrıntı.</span></div>
              <div className={styles.feature}><i>🏆</i><b>5 Zorluk</b><span>Kendi seviyenden başlayıp yüksel.</span></div>
            </div>
            <button type="button" className={styles.primary} onClick={startGame}>Oyunu Başlat</button>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "finished") {
    const successPercent = answered ? Math.round((correct / answered) * 100) : 0;
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          {header}
          <section className={styles.panel}>
            <div className={styles.eyebrow}>🏆 Soruşturma Tamamlandı</div>
            <div className={styles.badge}>{successPercent >= 80 ? "👑" : "🔍"}</div>
            <h2 className={styles.title}>{resolveSarayDedektifiRank(successPercent)}</h2>
            <p className={styles.subtitle}><b>{mode.name}</b> zorluğunu <b>{speed.name}</b> okuma hızında tamamladın. Bir sonraki oyunda senaryolar yeniden karıştırılacak.</p>
            <div className={styles.resultGrid}>
              <div className={styles.resultBox}><strong>{score}</strong><span>Toplam Puan</span></div>
              <div className={styles.resultBox}><strong>{correct}/{answered}</strong><span>Doğru Cevap</span></div>
              <div className={styles.resultBox}><strong>%{successPercent}</strong><span>Başarı Oranı</span></div>
            </div>
            <p className={styles.saveStatus}>{saved ? "Sonuç kaydedildi." : "Sonuç kaydediliyor..."}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={startGame}>Yeni Dosyalarla Oyna</button>
              <button type="button" className={styles.secondary} onClick={() => { clearTimers(); setPhase("intro"); }}>Zorluk Değiştir</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const caseFile = deck[roundIndex];
  const question = questions[questionIndex];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {header}
        {phase === "story" && caseFile && (
          <section className={styles.panel}>
            <div className={styles.eyebrow}>📜 {mode.icon} {mode.name} • {speed.icon} {speed.name} • Dosya {roundIndex + 1}/{deck.length}</div>
            <div className={styles.modeBadge}>{caseFile.tier >= 4 ? "Çok ayrıntılı dosya" : caseFile.tier >= 3 ? "Dikkat: birden fazla ayrıntı" : "İpuçlarını dikkatle oku"}</div>
            <div className={styles.sceneIcons}>{caseFile.icon}</div>
            <div className={styles.caseCard}><p className={styles.story}>{caseFile.story}</p></div>
            <div className={styles.timerline}>
              ⏳ İpucu kayboluyor
              <span className={styles.timer}><i style={{ animationDuration: `${getSarayDedektifiStoryDurationMs(modeId, speedId)}ms` }} /></span>
            </div>
            <p className={styles.hint}>Metin kaybolduktan sonra tekrar gösterilmeyecek.</p>
          </section>
        )}
        {phase === "question" && question && (
          <section className={styles.panel}>
            <div className={styles.eyebrow}>🔎 Dosya {roundIndex + 1} • Soru {questionIndex + 1}/{questions.length}</div>
            <div className={styles.sceneIcons}>🕵️‍♀️ ❓</div>
            <div className={styles.question}>{question.question}</div>
            <div className={styles.answers}>
              {question.options.map((option, index) => {
                const revealed = chosenOption !== null;
                const state = !revealed ? "" : option === question.correct ? styles.correct : option === chosenOption ? styles.wrong : "";
                return (
                  <button type="button" key={option} className={`${styles.answer} ${state}`} disabled={revealed} onClick={() => answer(option)}>
                    {OPTION_LABELS[index]}. {option}
                  </button>
                );
              })}
            </div>
            <div className={`${styles.feedback} ${chosenOption === null ? "" : chosenOption === question.correct ? styles.ok : styles.no}`}>
              {chosenOption === null ? "" : chosenOption === question.correct ? "✅ Doğru! Ayrıntıyı yakaladın." : "❌ Bu ipucu kaçtı. Doğru seçenek gösterildi."}
            </div>
            <p className={styles.hint}>{mode.name} seviyesinde hafızanı ve okuduğunu anlamanı birlikte kullan.</p>
          </section>
        )}
      </div>
    </main>
  );
}
