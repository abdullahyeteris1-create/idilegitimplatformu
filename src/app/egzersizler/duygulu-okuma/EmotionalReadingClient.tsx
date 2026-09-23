"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ExerciseEndScreenActions } from "@/components/exercises/ExerciseEndScreenActions";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useExerciseExitNavigation } from "@/components/exercises/useExerciseExitNavigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  createEmotionalReadingSession,
  EMOTIONAL_READING_GRADES,
  EMOTIONS,
  getEmotionWheelRotation,
  type EmotionalReadingCharacter,
  type EmotionalReadingGrade,
  type EmotionalReadingMode,
  type EmotionalReadingSessionRound,
} from "@/lib/emotional-reading/content";
import styles from "./emotional-reading.module.css";

type Phase = "intro" | "grade" | "mode" | "wheel" | "reveal" | "challenge" | "reflection" | "transition" | "result";
type ReflectionId = "try-again" | "good" | "excellent";
type SaveStatus = "idle" | "saving" | "success" | "local";
type ReflectionCounts = Record<Exclude<ReflectionId, "try-again">, number>;

const TITLE = "Duygulu Okuma";
const RESULT_TYPE = "emotional-reading" as const;
const ROUND_COUNT = 5;
const EMOTION_WHEEL_BACKGROUND = "conic-gradient(from -22.5deg, " + EMOTIONS.map((emotion, index) => emotion.color + " " + (index * 45) + "deg " + ((index + 1) * 45) + "deg").join(", ") + ")";

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function gradeLabel(grade: EmotionalReadingGrade): string {
  return String(grade) + ". Sınıf";
}

function modeLabel(mode: EmotionalReadingMode): string {
  return mode === "acting" ? "Oyunculuk Modu" : "Duygu Görevi";
}

function reflectionLabel(id: ReflectionId): string {
  if (id === "good") return "Güzel Okudum";
  if (id === "excellent") return "Çok İyi Canlandırdım";
  return "Bir Daha Deneyeyim";
}

function Wheel({
  rotation,
  spinning,
  selectedEmotion,
}: {
  rotation: number;
  spinning: boolean;
  selectedEmotion: EmotionalReadingSessionRound["emotion"] | null;
}) {
  return (
    <div className={styles.wheelWrap}>
      <span className={styles.wheelPointer} aria-hidden="true">▼</span>
      <div
        className={styles.wheel + (spinning ? " " + styles.wheelSpinning : "")}
        style={{
          background: EMOTION_WHEEL_BACKGROUND,
          transform: "rotate(" + rotation + "deg)",
        }}
        aria-label={selectedEmotion ? "Seçilen duygu: " + selectedEmotion.label : "Sekiz duygudan oluşan duygu çarkı"}
        role="img"
      >
        <div className={styles.wheelCenter}>
          <span aria-hidden="true">{selectedEmotion?.emoji ?? "?"}</span>
          <strong>{selectedEmotion?.label ?? "Duygu Çarkı"}</strong>
        </div>
        {EMOTIONS.map((emotion, index) => (
          <span
            key={emotion.id}
            className={styles.wheelLabel}
            style={{ "--emotion-index": index } as CSSProperties}
            aria-hidden="true"
          >
            {emotion.emoji}
          </span>
        ))}
      </div>
      <p className={styles.wheelHint} aria-live="polite">
        {spinning ? "Çark dönüyor…" : selectedEmotion ? selectedEmotion.label + " seçildi." : "Hazırsan çarkı çevir."}
      </p>
    </div>
  );
}

function EmotionCard({
  emotion,
  compact = false,
}: {
  emotion: EmotionalReadingSessionRound["emotion"];
  compact?: boolean;
}) {
  return (
    <article className={styles.emotionCard + (compact ? " " + styles.compactCard : "")}>
      <span className={styles.emotionEmoji} aria-hidden="true">{emotion.emoji}</span>
      <div>
        <strong>{emotion.label}</strong>
        <p>{emotion.instruction}</p>
      </div>
    </article>
  );
}

function CharacterCard({ character }: { character: EmotionalReadingCharacter }) {
  return (
    <article className={styles.characterCard}>
      <span className={styles.characterEmoji} aria-hidden="true">{character.emoji}</span>
      <div>
        <span className={styles.cardKicker}>Karakter kartı</span>
        <strong>{character.label}</strong>
        <p>{character.instruction}</p>
      </div>
    </article>
  );
}

export function EmotionalReadingClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
}) {
  void educationProgramLaunch;
  const { navigateTo } = useExerciseExitNavigation();
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [grade, setGrade] = useState<EmotionalReadingGrade>(1);
  const [mode, setMode] = useState<EmotionalReadingMode>("emotion-task");
  const [session, setSession] = useState<EmotionalReadingSessionRound[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reflection, setReflection] = useState<ReflectionId | null>(null);
  const [reflectionCounts, setReflectionCounts] = useState<ReflectionCounts>({ good: 0, excellent: 0 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const spinTimerRef = useRef<number | null>(null);
  const sessionGenerationRef = useRef(0);
  const saveAttemptRef = useRef(false);

  const currentRound = session[roundIndex] ?? null;
  const completedRounds = phase === "result" ? ROUND_COUNT : phase === "transition" ? roundIndex + 1 : roundIndex;
  const stars = Math.min(ROUND_COUNT, completedRounds);
  const starText = Array.from({ length: ROUND_COUNT }, (_, index) => index < stars ? "⭐" : "☆").join(" ");
  const wheelLabels = useMemo(() => EMOTIONS.map((emotion) => emotion.label).join(", "), []);

  const clearSpinTimer = useCallback(() => {
    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    sessionGenerationRef.current += 1;
    clearSpinTimer();
  }, [clearSpinTimer]);

  const startSession = useCallback((nextGrade: EmotionalReadingGrade, nextMode: EmotionalReadingMode) => {
    sessionGenerationRef.current += 1;
    clearSpinTimer();
    setGrade(nextGrade);
    setMode(nextMode);
    setSession(createEmotionalReadingSession(nextGrade, nextMode));
    setRoundIndex(0);
    setWheelRotation(0);
    setIsSpinning(false);
    setReflection(null);
    setReflectionCounts({ good: 0, excellent: 0 });
    setSaveStatus("idle");
    setSaveMessage("");
    saveAttemptRef.current = false;
    setPhase("wheel");
  }, [clearSpinTimer]);

  const handleSpin = useCallback(() => {
    if (isSpinning || !currentRound) return;
    clearSpinTimer();
    const sessionGeneration = sessionGenerationRef.current;
    const duration = reducedMotion ? 140 : 1850;
    setIsSpinning(true);
    setReflection(null);
    setWheelRotation(getEmotionWheelRotation(currentRound.emotion.id, 4 + roundIndex));
    spinTimerRef.current = window.setTimeout(() => {
      if (sessionGeneration !== sessionGenerationRef.current) return;
      spinTimerRef.current = null;
      setIsSpinning(false);
      setPhase("reveal");
    }, duration);
  }, [clearSpinTimer, currentRound, isSpinning, reducedMotion, roundIndex]);

  const handleReadDone = () => {
    setPhase("reflection");
    setReflection(null);
  };

  const persistResult = useCallback(async (completedSession: EmotionalReadingSessionRound[], counts: ReflectionCounts) => {
    if (saveAttemptRef.current) return;
    saveAttemptRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor…");
    const completedAt = new Date().toISOString();
    const emotionsEncountered = completedSession.map((round) => round.emotion.id);
    const charactersEncountered = completedSession
      .map((round) => round.character?.id)
      .filter((characterId): characterId is NonNullable<EmotionalReadingSessionRound["character"]>["id"] => Boolean(characterId));
    const details = {
      grade,
      mode,
      completedRounds: ROUND_COUNT,
      starsEarned: ROUND_COUNT,
      emotionsEncountered,
      charactersEncountered,
      selfReflectionGood: counts.good,
      selfReflectionExcellent: counts.excellent,
      scoreMeaning: "Tamamlanan seslendirme görevleri; ses kalitesi ölçülmez.",
      completedAt,
    };

    try {
      await saveExerciseResultSecure({
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        score: ROUND_COUNT,
        successRate: 100,
        correctCount: ROUND_COUNT,
        wrongCount: 0,
        durationSeconds: 0,
        completedAt,
        details,
      });
      setSaveStatus("success");
      setSaveMessage("Tamamlama sonucu kaydedildi.");
    } catch {
      const student = getCurrentStudent();
      saveExerciseResult({
        studentId: student?.id ?? "no-student",
        studentName: student?.name ?? "Seçilmemiş Öğrenci",
        username: student?.username,
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        durationSeconds: 0,
        correctCount: ROUND_COUNT,
        wrongCount: 0,
        score: ROUND_COUNT,
        successRate: 100,
        details,
      });
      setSaveStatus("local");
      setSaveMessage("Sonuç bu cihazda saklandı.");
    }
  }, [grade, mode]);

  const completeReflection = (nextReflection: ReflectionId) => {
    setReflection(nextReflection);
    if (nextReflection === "try-again") {
      setPhase("challenge");
      return;
    }

    setReflectionCounts((current) => ({
      ...current,
      [nextReflection]: current[nextReflection] + 1,
    }));
    setPhase("transition");
  };

  const goToNextRound = () => {
    if (!currentRound) return;
    if (roundIndex >= ROUND_COUNT - 1) {
      void persistResult(session, reflectionCounts);
      setPhase("result");
      return;
    }

    setRoundIndex((current) => current + 1);
    setReflection(null);
    setPhase("wheel");
  };

  const handleNewSession = () => startSession(grade, mode);

  const handleExit = useCallback(() => {
    sessionGenerationRef.current += 1;
    clearSpinTimer();
    void navigateTo("/egzersizler");
  }, [clearSpinTimer, navigateTo]);

  const readingPrompt = currentRound?.prompt.sentence ?? "";
  const actingTitle = currentRound?.character
    ? currentRound.emotion.label + " bir " + currentRound.character.label.toLocaleLowerCase("tr-TR") + " gibi oku!"
    : "";

  if (phase === "intro") {
    return (
      <ExerciseStage title={TITLE} subtitle="Okuma - Anlama" onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.introPanel}>
            <div className={styles.introArt} aria-hidden="true">
              <span>🎭</span>
              <span>⭐</span>
              <span>📖</span>
            </div>
            <span className={styles.eyebrow}>Okuma - Anlama · Seslendirme oyunu</span>
            <h2>🎭 Duygulu Okuma</h2>
            <p className={styles.lead}>Çarkı çevir, gelen duyguyu keşfet ve cümleyi o duyguyla sesli oku!</p>
            <div className={styles.stepGrid}>
              {["Çarkı çevir.", "Duyguyu öğren.", "Cümleyi canlandırarak oku."].map((step, index) => (
                <div className={styles.stepCard} key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
            <p className={styles.disclaimer}>Bu oyunda sesin kaydedilmez ve okuma kaliten otomatik olarak puanlanmaz.</p>
            <button type="button" className={styles.primaryButton} onClick={() => setPhase("grade")}>Oyuna Başla</button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "grade") {
    return (
      <ExerciseStage title={TITLE} subtitle="Önce sınıfını seç" onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.setupPanel}>
            <span className={styles.eyebrow}>1 / 2 · Seviye</span>
            <h2>Hangi sınıf için oynuyorsun?</h2>
            <p>Metinler sınıfına göre seçilir; her oyunda beş farklı duygu görevi gelir.</p>
            <div className={styles.gradeGrid} role="group" aria-label="Sınıf seçimi">
              {EMOTIONAL_READING_GRADES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={styles.gradeButton + (grade === option ? " " + styles.selectedChoice : "")}
                  onClick={() => { setGrade(option); setPhase("mode"); }}
                >
                  <strong>{gradeLabel(option)}</strong>
                  <span>25 özgün cümle havuzu</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "mode") {
    return (
      <ExerciseStage title={TITLE} subtitle={gradeLabel(grade) + " · Oyun modu"} onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.setupPanel}>
            <span className={styles.eyebrow}>2 / 2 · Oyun modu</span>
            <h2>Görevini seç</h2>
            <p>İki modda da beş tur oynarsın. Hazır olduğunda çark duygunu seçer.</p>
            <div className={styles.modeGrid}>
              <button
                type="button"
                className={styles.modeCard + (mode === "emotion-task" ? " " + styles.selectedMode : "")}
                onClick={() => setMode("emotion-task")}
              >
                <span className={styles.modeIcon} aria-hidden="true">🎯</span>
                <strong>Duygu Görevi</strong>
                <span>Çarktan gelen duyguyla cümleyi oku.</span>
              </button>
              <button
                type="button"
                className={styles.modeCard + (mode === "acting" ? " " + styles.selectedMode : "")}
                onClick={() => setMode("acting")}
              >
                <span className={styles.modeIcon} aria-hidden="true">🎭</span>
                <strong>Oyunculuk Modu</strong>
                <span>Duyguyu ve karakteri birleştirerek cümleyi canlandır.</span>
              </button>
            </div>
            <button type="button" className={styles.primaryButton} onClick={() => startSession(grade, mode)}>Oyunu Başlat</button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (!currentRound) return null;

  if (phase === "wheel") {
    return (
      <ExerciseStage title={TITLE} subtitle={gradeLabel(grade) + " · " + modeLabel(mode)} onExit={handleExit} status={<span className={styles.stageStatus}>{roundIndex + 1} / {ROUND_COUNT} tur · {starText}</span>}>
        <div className={styles.page}>
          <section className={styles.gamePanel}>
            <div className={styles.gameHeader}>
              <div>
                <span className={styles.eyebrow}>Tur {roundIndex + 1} / {ROUND_COUNT}</span>
                <h2>Duygu Çarkı</h2>
                <p>Çarkın durduğu duyguyu cümlene taşı.</p>
              </div>
              <span className={styles.modeBadge}>{modeLabel(mode)}</span>
            </div>
            <Wheel rotation={wheelRotation} spinning={isSpinning} selectedEmotion={null} />
            <p className={styles.screenReaderText}>Çark seçenekleri: {wheelLabels}.</p>
            <button type="button" className={styles.primaryButton} onClick={handleSpin} disabled={isSpinning}>
              {isSpinning ? "Çark dönüyor…" : "Çarkı Çevir"}
            </button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "reveal") {
    return (
      <ExerciseStage title={TITLE} subtitle={gradeLabel(grade) + " · Duygu keşfi"} onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.gamePanel + " " + styles.revealPanel}>
            <span className={styles.eyebrow}>Duygun hazır!</span>
            <div className={styles.revealEmoji} aria-hidden="true">{currentRound.emotion.emoji}</div>
            <h2>{currentRound.emotion.label}!</h2>
            <p className={styles.revealInstruction}>{currentRound.emotion.instruction}</p>
            {mode === "acting" && currentRound.character ? <CharacterCard character={currentRound.character} /> : null}
            <button type="button" className={styles.primaryButton} onClick={() => setPhase("challenge")}>Görevi Göster</button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "challenge") {
    return (
      <ExerciseStage title={TITLE} subtitle={gradeLabel(grade) + " · Tur " + (roundIndex + 1) + " / " + ROUND_COUNT} onExit={handleExit} status={<span className={styles.stageStatus}>{starText}</span>}>
        <div className={styles.page}>
          <section className={styles.gamePanel}>
            <div className={styles.roundMeta}>
              <span>Tur {roundIndex + 1} / {ROUND_COUNT}</span>
              <span>{modeLabel(mode)}</span>
            </div>
            <div className={styles.challengeGrid}>
              <EmotionCard emotion={currentRound.emotion} />
              {mode === "acting" && currentRound.character ? <CharacterCard character={currentRound.character} /> : null}
            </div>
            {mode === "acting" ? <p className={styles.actingPrompt}>{actingTitle}</p> : null}
            <p className={styles.readingSentence}>{readingPrompt}</p>
            <p className={styles.readingHelp}>Noktalamaya dikkat et; sesini duyguna göre değiştir. Zamanlayıcı yok.</p>
            <button type="button" className={styles.primaryButton} onClick={handleReadDone}>Okudum!</button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "reflection") {
    return (
      <ExerciseStage title={TITLE} subtitle={"Tur " + (roundIndex + 1) + " · Öz değerlendirme"} onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.gamePanel}>
            <span className={styles.eyebrow}>Seslendirme görevi tamamlandı</span>
            <h2>Sence nasıl okudun?</h2>
            <p className={styles.reflectionHint}>Bu seçim yalnızca kendi düşünceni paylaşır; sistem sesini değerlendirmez.</p>
            <div className={styles.reflectionGrid}>
              {([
                ["try-again", "🔁", "Bir Daha Deneyeyim"],
                ["good", "🙂", "Güzel Okudum"],
                ["excellent", "🌟", "Çok İyi Canlandırdım"],
              ] as const).map(([id, emoji, label]) => (
                <button key={id} type="button" className={styles.reflectionButton} onClick={() => completeReflection(id)}>
                  <span aria-hidden="true">{emoji}</span>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "transition") {
    return (
      <ExerciseStage title={TITLE} subtitle="Yeni görev hazırlanıyor" onExit={handleExit}>
        <div className={styles.page}>
          <section className={styles.gamePanel}>
            <div className={styles.starCelebration} aria-hidden="true">⭐</div>
            <span className={styles.eyebrow}>Bir görev daha tamamlandı</span>
            <h2>{roundIndex + 1 === ROUND_COUNT ? "Duygu Ustası yolunda!" : "Harika, sıradaki duygu seni bekliyor!"}</h2>
            <p className={styles.starProgress} aria-live="polite">{starText}</p>
            <p className={styles.reflectionHint}>{reflection ? reflectionLabel(reflection) : ""} seçtin. Bu yıldız, tamamlanan seslendirme görevini temsil eder.</p>
            <button type="button" className={styles.primaryButton} onClick={goToNextRound}>
              {roundIndex + 1 === ROUND_COUNT ? "Sonucu Gör" : "Sonraki Tur"}
            </button>
          </section>
        </div>
      </ExerciseStage>
    );
  }

  return (
    <ExerciseStage title={TITLE} subtitle="Oyun tamamlandı" onExit={handleExit}>
      <div className={styles.page}>
        <section className={styles.gamePanel + " " + styles.resultPanel}>
          <div className={styles.finalConfetti} aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>
          <span className={styles.eyebrow}>Tamamlandı</span>
          <h2>🎉 Duygu Ustası!</h2>
          <p>5 seslendirme görevini tamamladın!</p>
          <div className={styles.finalStars} aria-label="5 tamamlanan seslendirme görevi">{starText}</div>
          <div className={styles.summaryGrid}>
            <div><span>Sınıf</span><strong>{gradeLabel(grade)}</strong></div>
            <div><span>Oyun modu</span><strong>{modeLabel(mode)}</strong></div>
            <div><span>Tamamlanan görev</span><strong>5 / 5</strong></div>
          </div>
          <div className={styles.collectionGrid}>
            <div>
              <span className={styles.sectionLabel}>Canlandırdığın Duygular</span>
              <div className={styles.collectionList}>
                {session.map((round) => <span key={round.round}>{round.emotion.emoji} {round.emotion.label}</span>)}
              </div>
            </div>
            {mode === "acting" ? (
              <div>
                <span className={styles.sectionLabel}>Canlandırdığın Karakterler</span>
                <div className={styles.collectionList}>
                  {session.map((round) => round.character ? <span key={round.round}>{round.character.emoji} {round.character.label}</span> : null)}
                </div>
              </div>
            ) : null}
          </div>
          <div className={styles.reflectionSummary}>
            <span className={styles.sectionLabel}>Öz Değerlendirme</span>
            <span>Güzel Okudum: {reflectionCounts.good}</span>
            <span>Çok İyi Canlandırdım: {reflectionCounts.excellent}</span>
          </div>
          <p className={styles.disclaimer}>Yıldızlar tamamlanan görevleri gösterir; telaffuz, akıcılık veya duygu doğruluğu ölçülmemiştir.</p>
          <div className={styles.resultPrimaryActions}>
            <button type="button" className={styles.primaryButton} onClick={handleNewSession}>🎲 Yeni Görevler</button>
            <button type="button" className={styles.secondaryButton} onClick={handleNewSession}>🔁 Tekrar Oyna</button>
          </div>
          <ExerciseEndScreenActions
            showReplay={false}
            onReplay={handleNewSession}
            backHref="/egzersizler"
            exitHref="/ogrenci"
            exitLabel="Ana Sayfaya Dön"
          />
          {saveStatus !== "idle" ? <p className={styles.saveNote} role="status">{saveMessage}</p> : null}
        </section>
      </div>
    </ExerciseStage>
  );
}
