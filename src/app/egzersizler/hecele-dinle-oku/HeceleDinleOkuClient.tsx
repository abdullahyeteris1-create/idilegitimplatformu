"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExerciseEndScreenActions } from "@/components/exercises/ExerciseEndScreenActions";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useExerciseExitNavigation } from "@/components/exercises/useExerciseExitNavigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import {
  createHeceleSession,
  getSupportConfig,
  HECELE_GRADES,
  HECELE_SUPPORT_LEVELS,
  HECELE_TASK_COUNT,
  type HeceleGrade,
  type HeceleReadingItem,
  type HeceleSupportLevel,
  type SentenceReadingItem,
  type WordReadingItem,
} from "@/lib/hecele-dinle-oku/content";
import {
  canUseHeceleSpeech,
  chooseHeceleTurkishVoice,
  getHeceleVoiceStatus,
  type HeceleVoiceStatus,
} from "@/lib/hecele-dinle-oku/speech";
import styles from "./hecele-dinle-oku.module.css";

type Phase = "intro" | "grade" | "support" | "task" | "complete";
type ActivePart = "syllable" | "whole" | "word" | null;
type SaveStatus = "idle" | "saving" | "success" | "local";

const TITLE = "Hecele – Dinle – Oku";
const RESULT_TYPE = "hecele-dinle-oku" as const;

function subscribeToSpeechSupport() {
  return () => undefined;
}

function getServerSpeechSupport(): boolean {
  return false;
}

function gradeLabel(grade: HeceleGrade): string {
  return `${grade}. Sınıf`;
}

function supportLabel(level: HeceleSupportLevel): string {
  return getSupportConfig(level).label;
}

function LeafIcon() {
  return (
    <svg aria-hidden="true" className={styles.leafIcon} viewBox="0 0 48 48" fill="none">
      <path d="M38.8 8.9C25.1 9 13.6 14.2 10.8 25.1c-1.2 4.8.9 9.1 5.6 10.6 5.7 1.8 12.2-1.2 16.3-6.4 4.1-5.2 5.9-12.8 6.1-20.4Z" fill="currentColor" opacity=".88" />
      <path d="M9.6 39.2c5.2-8.1 11.6-13.2 22.1-19.1" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function ProgressPath({ completed, current }: { completed: number; current: number }) {
  return (
    <div className={styles.progressBlock} aria-label={`${completed} / ${HECELE_TASK_COUNT} görev tamamlandı`}>
      <div className={styles.progressTopline}>
        <span>Okuma yolu</span>
        <strong>Görev {Math.min(current + 1, HECELE_TASK_COUNT)} / {HECELE_TASK_COUNT}</strong>
      </div>
      <div className={styles.progressPath} role="list">
        {Array.from({ length: HECELE_TASK_COUNT }, (_, index) => (
          <span
            key={index}
            role="listitem"
            className={`${styles.progressDot} ${index < completed ? styles.progressDone : ""} ${index === current && completed < HECELE_TASK_COUNT ? styles.progressCurrent : ""}`}
            aria-label={`Görev ${index + 1}: ${index < completed ? "tamamlandı" : index === current ? "şimdi" : "bekliyor"}`}
          >
            {index < completed ? "✓" : index + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function SupportCard({
  level,
  selected,
  onSelect,
}: {
  level: (typeof HECELE_SUPPORT_LEVELS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`${styles.supportCard} ${selected ? styles.supportSelected : ""}`} aria-pressed={selected} onClick={onSelect}>
      <span className={styles.supportMarker} aria-hidden="true">{level.id === "very-slow" ? "1" : level.id === "slow" ? "2" : "3"}</span>
      <span className={styles.supportCopy}><strong>{level.label}</strong><span>{level.description}</span></span>
      <span className={styles.supportArrow} aria-hidden="true">→</span>
    </button>
  );
}

function WordTaskView({ item, support, activePart, activeUnit, showSyllables }: { item: WordReadingItem; support: ReturnType<typeof getSupportConfig>; activePart: ActivePart; activeUnit: number | null; showSyllables: boolean }) {
  return (
    <div className={styles.wordTask}>
      <div className={styles.wordSyllables} aria-label={`${item.text} heceleri`}>
        {showSyllables ? item.syllables.map((syllable, index) => (
          <span key={`${syllable}-${index}`} className={`${styles.wordSyllable} ${activePart === "syllable" && activeUnit === index ? styles.wordSyllableActive : ""}`}>
            {syllable}
          </span>
        )) : <span className={styles.hiddenSupportText}>Hece desteğini görmek istersen düğmeye basabilirsin.</span>}
      </div>
      {showSyllables ? <div className={styles.downArrow} aria-hidden="true">↓</div> : null}
      <div className={`${styles.wholeWord} ${activePart === "whole" || activePart === "word" ? styles.wholeWordActive : ""}`}>{item.text}</div>
      <p className={styles.modelHint}>{support.syllableSupport ? "Önce heceleri takip edeceğiz, sonra kelimeyi birlikte duyacağız." : "Kelimeleri sırayla takip edeceğiz."}</p>
    </div>
  );
}

function SentenceTaskView({ item, support, activePart, activeUnit, showSyllables }: { item: SentenceReadingItem; support: ReturnType<typeof getSupportConfig>; activePart: ActivePart; activeUnit: number | null; showSyllables: boolean }) {
  return (
    <div className={styles.sentenceTask}>
      <p className={styles.sentenceDisplay} aria-label="Okuma cümlesi">
        {item.tokens.map((token, index) => (
          <span key={`${token.text}-${index}`} className={`${styles.sentenceToken} ${activePart === "word" && activeUnit === index ? styles.sentenceTokenActive : ""}`}>
            {token.text}
          </span>
        ))}
      </p>
      {showSyllables ? (
        <div className={styles.sentenceSupport} aria-label="Cümledeki hece desteği">
          {item.tokens.map((token, index) => (
            <span key={`support-${token.text}-${index}`} className={`${styles.sentenceSupportWord} ${activePart === "word" && activeUnit === index ? styles.sentenceSupportWordActive : ""}`}>
              {token.syllables.join(" – ")}
            </span>
          ))}
        </div>
      ) : null}
      <p className={styles.modelHint}>{support.syllableSupport ? "Cümledeki kelimeleri sırayla takip edeceğiz." : "Her kelimeyi tek tek izleyip cümleye geçeceğiz."}</p>
    </div>
  );
}

export function HeceleDinleOkuClient({ educationProgramLaunch }: { educationProgramLaunch?: EducationProgramExerciseLaunchProps }) {
  void educationProgramLaunch;
  const { navigateTo } = useExerciseExitNavigation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [grade, setGrade] = useState<HeceleGrade>(1);
  const [supportLevel, setSupportLevel] = useState<HeceleSupportLevel>("very-slow");
  const [session, setSession] = useState<HeceleReadingItem[]>(() => createHeceleSession(1, "very-slow"));
  const [taskIndex, setTaskIndex] = useState(0);
  const [modelStarted, setModelStarted] = useState(false);
  const [modelComplete, setModelComplete] = useState(false);
  const [activePart, setActivePart] = useState<ActivePart>(null);
  const [activeUnit, setActiveUnit] = useState<number | null>(null);
  const [syllableReveal, setSyllableReveal] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechStatus, setSpeechStatus] = useState("Model okuması henüz başlamadı.");
  const [speechError, setSpeechError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [replayCount, setReplayCount] = useState(0);
  const [syllableRevealCount, setSyllableRevealCount] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRunRef = useRef(0);
  const timerRefs = useRef<number[]>([]);
  const savedRef = useRef(false);

  const item = session[taskIndex];
  const support = useMemo(() => getSupportConfig(supportLevel), [supportLevel]);
  const selectedVoice = useMemo(() => chooseHeceleTurkishVoice(voices) as SpeechSynthesisVoice | null, [voices]);
  const speechSupported = useSyncExternalStore(subscribeToSpeechSupport, canUseHeceleSpeech, getServerSpeechSupport);
  const voiceStatus: HeceleVoiceStatus = getHeceleVoiceStatus(speechSupported, voices);
  const completedCount = phase === "complete" ? HECELE_TASK_COUNT : taskIndex;
  const showSyllables = support.syllableSupport || syllableReveal;

  useEffect(() => {
    if (!speechSupported || !canUseHeceleSpeech()) return undefined;
    const synthesis = window.speechSynthesis;
    const updateVoices = () => setVoices(synthesis.getVoices());
    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);
    return () => synthesis.removeEventListener("voiceschanged", updateVoices);
  }, [speechSupported]);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach((timer) => window.clearTimeout(timer));
    timerRefs.current = [];
  }, []);

  const cancelSpeech = useCallback(() => {
    speechRunRef.current += 1;
    clearTimers();
    if (canUseHeceleSpeech()) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeechStatus("Model okuması durduruldu.");
  }, [clearTimers]);

  useEffect(() => () => {
    speechRunRef.current += 1;
    timerRefs.current.forEach((timer) => window.clearTimeout(timer));
    if (canUseHeceleSpeech()) window.speechSynthesis.cancel();
  }, []);

  const finishModel = useCallback((runId: number, message: string) => {
    if (speechRunRef.current !== runId) return;
    clearTimers();
    utteranceRef.current = null;
    setActivePart(null);
    setActiveUnit(null);
    setModelComplete(true);
    setSpeechStatus(message);
  }, [clearTimers]);

  const speakWholeText = useCallback((text: string, runId: number) => {
    if (!speechSupported || !canUseHeceleSpeech()) {
      finishModel(runId, "Görsel okuma takibi tamamlandı. Bu tarayıcıda sesli okuma kullanılamıyor.");
      return;
    }
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = support.modelRate;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      if (speechRunRef.current === runId) setSpeechStatus("Model okuyor; kelimeleri takip edebilirsin.");
    };
    utterance.onend = () => finishModel(runId, "Model okuması tamamlandı. Şimdi sen oku.");
    utterance.onerror = (event) => {
      if (speechRunRef.current !== runId) return;
      if (event.error === "canceled" || event.error === "interrupted") return;
      setSpeechError("Sesli okuma başlatılamadı. Görsel takip desteğiyle devam edebilirsin.");
      finishModel(runId, "Görsel okuma takibi tamamlandı. Şimdi sen oku.");
    };
    utteranceRef.current = utterance;
    synthesis.speak(utterance);
  }, [finishModel, selectedVoice, speechSupported, support.modelRate]);

  const startModelReading = useCallback(() => {
    if (!item) return;
    cancelSpeech();
    const runId = speechRunRef.current;
    setSpeechError("");
    setModelStarted(true);
    setModelComplete(false);
    setActivePart(item.type === "word" && support.syllableSupport ? "syllable" : "word");
    setActiveUnit(item.type === "word" ? 0 : 0);
    setSpeechStatus("Okuma takibi başladı.");

    if (item.type === "word") {
      const syllableCount = support.syllableSupport ? item.syllables.length : 0;
      item.syllables.forEach((_, index) => {
        if (!support.syllableSupport) return;
        const timer = window.setTimeout(() => {
          if (speechRunRef.current === runId) {
            setActivePart("syllable");
            setActiveUnit(index);
          }
        }, index * support.syllablePauseMs);
        timerRefs.current.push(timer);
      });
      const wholeTimer = window.setTimeout(() => {
        if (speechRunRef.current !== runId) return;
        setActivePart("whole");
        setActiveUnit(null);
        setSpeechStatus("Hecelemeden kelimeye geçiyoruz.");
        const speechTimer = window.setTimeout(() => speakWholeText(item.text, runId), support.wordPauseMs);
        timerRefs.current.push(speechTimer);
      }, Math.max(0, (syllableCount - 1) * support.syllablePauseMs) + support.wordPauseMs);
      timerRefs.current.push(wholeTimer);
      return;
    }

    item.tokens.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        if (speechRunRef.current === runId) {
          setActivePart("word");
          setActiveUnit(index);
        }
      }, index * support.wordPauseMs);
      timerRefs.current.push(timer);
    });
    const sentenceTimer = window.setTimeout(() => speakWholeText(item.text, runId), item.tokens.length * support.wordPauseMs);
    timerRefs.current.push(sentenceTimer);
  }, [cancelSpeech, item, speakWholeText, support]);

  const resetTask = useCallback(() => {
    cancelSpeech();
    setModelStarted(false);
    setModelComplete(false);
    setActivePart(null);
    setActiveUnit(null);
    setSyllableReveal(false);
    setSpeechError("");
    setSpeechStatus("Model okuması henüz başlamadı.");
  }, [cancelSpeech]);

  const startWithSupport = (nextLevel: HeceleSupportLevel) => {
    cancelSpeech();
    setSupportLevel(nextLevel);
    setSession(createHeceleSession(grade, nextLevel));
    setTaskIndex(0);
    setReplayCount(0);
    setSyllableRevealCount(0);
    setSaveStatus("idle");
    setSaveMessage("");
    savedRef.current = false;
    resetTask();
    setPhase("task");
  };

  const selectGrade = (nextGrade: HeceleGrade) => {
    cancelSpeech();
    setGrade(nextGrade);
    setPhase("support");
  };

  const handleReplay = () => {
    setReplayCount((current) => current + 1);
    resetTask();
  };

  const handleNewSession = () => {
    const previousIds = session.map((currentItem) => currentItem.id);
    cancelSpeech();
    setSession(createHeceleSession(grade, supportLevel, previousIds));
    setTaskIndex(0);
    setReplayCount(0);
    setSyllableRevealCount(0);
    savedRef.current = false;
    setSaveStatus("idle");
    setSaveMessage("");
    resetTask();
    setPhase("task");
  };

  const persistResult = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaveStatus("saving");
    const completedAt = new Date().toISOString();
    const details = {
      grade,
      supportLevel,
      tasksCompleted: HECELE_TASK_COUNT,
      taskTypes: session.map((currentItem) => currentItem.type).join(","),
      sessionItemIds: session.map((currentItem) => currentItem.id).join(","),
      scoreMeaning: "Görev tamamlama; okuma doğruluğu ölçülmedi.",
      replayCount,
      syllableRevealCount,
      completedAt,
    };
    try {
      await saveExerciseResultSecure({
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        score: HECELE_TASK_COUNT,
        successRate: 100,
        correctCount: HECELE_TASK_COUNT,
        wrongCount: 0,
        durationSeconds: 0,
        completedAt,
        details,
      });
      setSaveStatus("success");
      setSaveMessage("Çalışma kaydedildi.");
    } catch {
      const student = getCurrentStudent();
      saveExerciseResult({
        studentId: student?.id ?? "no-student",
        studentName: student?.name ?? "Seçilmemiş Öğrenci",
        username: student?.username,
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        durationSeconds: 0,
        correctCount: HECELE_TASK_COUNT,
        wrongCount: 0,
        score: HECELE_TASK_COUNT,
        successRate: 100,
        details,
      });
      setSaveStatus("local");
      setSaveMessage("Çalışma bu cihazda saklandı.");
    }
  }, [grade, replayCount, session, supportLevel, syllableRevealCount]);

  const completeTask = () => {
    if (!modelComplete) return;
    cancelSpeech();
    if (taskIndex >= HECELE_TASK_COUNT - 1) {
      setPhase("complete");
      void persistResult();
      return;
    }
    setTaskIndex((current) => current + 1);
    resetTask();
  };

  const handleExit = useCallback(() => {
    cancelSpeech();
    void navigateTo("/egzersizler");
  }, [cancelSpeech, navigateTo]);

  if (phase === "intro") {
    return <ExerciseStage title={TITLE} subtitle="Okuma - Anlama" onExit={handleExit}>
      <div className={styles.page}><section className={`${styles.panel} ${styles.centerPanel}`}>
        <div className={styles.brandMark}><LeafIcon /><span>Temel okuma yolculuğu</span></div>
        <h1>Hecele – Dinle – Oku</h1>
        <p className={styles.lead}>Heceleri dinle, kelimeyi birleştir ve sen oku.</p>
        <p className={styles.bodyText}>Bu çalışma, kısa ve sakin adımlarla heceden kelimeye, kelimeden cümleye ilerlemene yardımcı olur.</p>
        <div className={styles.infoRow}><span>8 küçük görev</span><span>Ses kaydı yok</span><span>İstediğin kadar tekrar</span></div>
        <button type="button" className={styles.primaryButton} onClick={() => setPhase("grade")}>Çalışmaya Başla <span aria-hidden="true">→</span></button>
      </section></div>
    </ExerciseStage>;
  }

  if (phase === "grade") {
    return <ExerciseStage title={TITLE} subtitle="Önce sınıfını seç" onExit={handleExit}>
      <div className={styles.page}><section className={`${styles.panel} ${styles.centerPanel}`}>
        <span className={styles.eyebrow}>1. adım</span><h1>Hangi sınıf için çalışıyorsun?</h1>
        <p className={styles.bodyText}>Sana uygun kelime ve cümleleri seçelim.</p>
        <div className={styles.gradeGrid}>
          {HECELE_GRADES.map((option) => <button key={option} type="button" className={`${styles.gradeCard} ${grade === option ? styles.gradeSelected : ""}`} aria-pressed={grade === option} onClick={() => selectGrade(option)}><strong>{gradeLabel(option)}</strong><span>Adım adım okuma desteği</span><b aria-hidden="true">→</b></button>)}
        </div>
      </section></div>
    </ExerciseStage>;
  }

  if (phase === "support") {
    return <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Destek seçimi`} onExit={handleExit}>
      <div className={styles.page}><section className={`${styles.panel} ${styles.centerPanel}`}>
        <span className={styles.eyebrow}>{gradeLabel(grade)}</span><h1>Nasıl çalışalım?</h1>
        <p className={styles.bodyText}>Bir destek yolu seç. Bu bir puan değil; bugün kullanacağın öğrenme desteğidir.</p>
        <div className={styles.supportGrid}>
          {HECELE_SUPPORT_LEVELS.map((level) => <SupportCard key={level.id} level={level} selected={supportLevel === level.id} onSelect={() => startWithSupport(level.id)} />)}
        </div>
      </section></div>
    </ExerciseStage>;
  }

  if (phase === "complete") {
    return <ExerciseStage title={TITLE} subtitle="Çalışma tamamlandı" onExit={handleExit}>
      <div className={styles.page}><section className={`${styles.panel} ${styles.centerPanel} ${styles.completePanel}`}>
        <div className={styles.completeBadge} aria-hidden="true">✓</div><span className={styles.eyebrow}>Okuma yolu tamamlandı</span>
        <h1>Harika! Okuma Yolunu Tamamladın</h1>
        <p className={styles.lead}>8 / 8 görev tamamlandı.</p>
        <div className={styles.summaryGrid}><div><span>Sınıf</span><strong>{gradeLabel(grade)}</strong></div><div><span>Destek</span><strong>{supportLabel(supportLevel)}</strong></div></div>
        <p className={styles.bodyText}>Bugün heceleri takip ettin, kelimeleri birleştirdin ve cümlelere doğru ilerledin.</p>
        {saveStatus !== "idle" ? <p className={styles.saveNote} role="status">{saveStatus === "saving" ? "Çalışma kaydediliyor…" : saveMessage}</p> : null}
        <div className={styles.completeActions}><button type="button" className={styles.primaryButton} onClick={handleNewSession}>Yeni Çalışma</button><button type="button" className={styles.secondaryButton} onClick={() => { setPhase("task"); setTaskIndex(0); resetTask(); }}>Tekrar Çalış</button></div>
        <ExerciseEndScreenActions showReplay={false} onReplay={handleReplay} backHref="/egzersizler" exitHref="/ogrenci" exitLabel="Ana Sayfaya Dön" />
      </section></div>
    </ExerciseStage>;
  }

  if (!item) return null;
  return <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · ${support.label}`} onExit={handleExit}>
    <div className={styles.page}><section className={styles.taskShell}>
      <ProgressPath completed={completedCount} current={taskIndex} />
      <div className={styles.taskHeader}><div><span className={styles.eyebrow}>{item.type === "word" ? "Kelime adımı" : "Cümle adımı"}</span><h1>{modelComplete ? "Şimdi Sen Oku" : "Önce Birlikte Dinle"}</h1></div><span className={styles.levelBadge}>{support.label}</span></div>
      <div className={styles.readingCard}>
        <div className={styles.trackingLabel}><span className={styles.trackingDot} aria-hidden="true" /> Okuma Takibi</div>
        {item.type === "word" ? <WordTaskView item={item} support={support} activePart={activePart} activeUnit={activeUnit} showSyllables={showSyllables} /> : <SentenceTaskView item={item} support={support} activePart={activePart} activeUnit={activeUnit} showSyllables={showSyllables} />}
      </div>
      <div className={styles.taskFooter}>
        {voiceStatus === "default" ? <p className={styles.voiceNote} role="status">Türkçe ses bulunamadı; tarayıcının varsayılan sesi kullanılacak.</p> : null}
        {voiceStatus === "loading" ? <p className={styles.voiceNote} role="status">Ses seçenekleri hazırlanıyor.</p> : null}
        <p className={styles.liveStatus} role="status" aria-live="polite">{speechError || speechStatus}</p>
        <div className={styles.taskActions}>
          {!modelComplete ? <button type="button" className={styles.primaryButton} onClick={startModelReading}>{modelStarted ? "Tekrar Dinle" : item.type === "word" ? "Heceleyerek Dinle" : "Cümleyi Dinle"}<span aria-hidden="true">⌁</span></button> : <button type="button" className={styles.primaryButton} onClick={completeTask}>Okudum <span aria-hidden="true">✓</span></button>}
          {modelComplete ? <button type="button" className={styles.secondaryButton} onClick={handleReplay}>Tekrar Dinle</button> : null}
          {supportLevel === "word-by-word" && !showSyllables ? <button type="button" className={styles.tertiaryButton} onClick={() => { setSyllableReveal(true); setSyllableRevealCount((current) => current + 1); }}>Heceyi Göster</button> : null}
        </div>
        <p className={styles.noMicrophone}>Sesin kaydedilmez. Hazır olduğunda <strong>Okudum</strong> düğmesine basabilirsin.</p>
      </div>
    </section></div>
  </ExerciseStage>;
}
