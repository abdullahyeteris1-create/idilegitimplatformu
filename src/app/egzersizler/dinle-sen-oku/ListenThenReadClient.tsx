"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExerciseEndScreenActions } from "@/components/exercises/ExerciseEndScreenActions";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useExerciseExitNavigation } from "@/components/exercises/useExerciseExitNavigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  getRandomListenThenReadPassage,
  LISTEN_THEN_READ_GRADES,
  type ListenThenReadGrade,
  type ListenThenReadPassage,
  type ListenThenReadQuestion,
} from "@/lib/listen-then-read/content";
import {
  canUseSpeechSynthesis,
  chooseTurkishSpeechVoice,
  getListenThenReadVoiceStatus,
  LISTEN_THEN_READ_SPEECH_RATES,
  LISTEN_THEN_READ_SPEECH_RATE_MODES,
  type ListenThenReadSpeechRateMode,
} from "@/lib/listen-then-read/speech";
import styles from "./listen-then-read.module.css";

type Phase = "intro" | "grade" | "listening" | "model-complete" | "student-reading" | "comprehension" | "result";
type SpeechState = "idle" | "speaking" | "paused" | "completed" | "error";
type SaveStatus = "idle" | "saving" | "success" | "local";

type AttemptResult = {
  comprehensionCorrect: number;
  comprehensionTotal: number;
  comprehensionScore: number;
};

const TITLE = "Dinle – Sen Oku";
const RESULT_TYPE = "listen-then-read" as const;

function subscribeToSpeechSupport() {
  return () => undefined;
}

function getServerSpeechSupport(): boolean {
  return false;
}

function gradeLabel(grade: ListenThenReadGrade): string {
  return `${grade}. Sınıf`;
}

function speechStateLabel(state: SpeechState): string {
  if (state === "speaking") return "Metin okunuyor";
  if (state === "paused") return "Dinleme duraklatıldı";
  if (state === "completed") return "Dinleme tamamlandı";
  if (state === "error") return "Dinleme başlatılamadı";
  return "Dinleme başlamadı";
}

function calculateScore(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function QuestionCard({
  question,
  index,
  selectedAnswer,
  onAnswer,
}: {
  question: ListenThenReadQuestion;
  index: number;
  selectedAnswer?: number;
  onAnswer: (questionId: string, optionIndex: number) => void;
}) {
  return (
    <fieldset className={styles.questionCard}>
      <legend>{index + 1}. {question.question}</legend>
      <div className={styles.optionGrid}>
        {question.options.map((option, optionIndex) => (
          <button
            key={option}
            type="button"
            className={`${styles.optionButton} ${selectedAnswer === optionIndex ? styles.selectedOption : ""}`}
            aria-pressed={selectedAnswer === optionIndex}
            onClick={() => onAnswer(question.id, optionIndex)}
          >
            <span aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "purple" | "teal" | "orange" }) {
  return <div className={`${styles.kpi} ${styles[`kpi${tone[0].toUpperCase()}${tone.slice(1)}`]}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function ListenThenReadClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
}) {
  void educationProgramLaunch;
  const { navigateTo } = useExerciseExitNavigation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [grade, setGrade] = useState<ListenThenReadGrade>(1);
  const [selectedPassage, setSelectedPassage] = useState<ListenThenReadPassage>(() => getRandomListenThenReadPassage(1));
  const [speechRateMode, setSpeechRateMode] = useState<ListenThenReadSpeechRateMode>("normal");
  const speechSupported = useSyncExternalStore(subscribeToSpeechSupport, canUseSpeechSynthesis, getServerSpeechSupport);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [speechError, setSpeechError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [readingConfirmationOpen, setReadingConfirmationOpen] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRunRef = useRef(0);
  const savedAttemptRef = useRef(false);

  const selectedVoice = useMemo(() => chooseTurkishSpeechVoice(voices) as SpeechSynthesisVoice | null, [voices]);
  const voiceStatus = getListenThenReadVoiceStatus(speechSupported, voices);
  const answeredCount = Object.keys(answers).length;
  const speechText = selectedPassage.paragraphs.join("\n\n");

  useEffect(() => {
    if (!speechSupported) return undefined;


    const synthesis = window.speechSynthesis;
    const updateVoices = () => setVoices(synthesis.getVoices());
    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);
    return () => synthesis.removeEventListener("voiceschanged", updateVoices);
  }, [speechSupported]);

  useEffect(() => () => {
    speechRunRef.current += 1;
    if (canUseSpeechSynthesis()) window.speechSynthesis.cancel();
  }, []);

  const cancelSpeech = useCallback(() => {
    speechRunRef.current += 1;
    if (canUseSpeechSynthesis()) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeechState("idle");
  }, []);

  const startSpeech = useCallback((nextRateMode: ListenThenReadSpeechRateMode = speechRateMode) => {
    if (!speechSupported || !canUseSpeechSynthesis()) {
      setSpeechError("Bu tarayıcı yerleşik sesli okumayı desteklemiyor. Metni kendin okumaya geçebilirsin veya egzersizlere dönebilirsin.");
      setSpeechState("error");
      return;
    }

    const synthesis = window.speechSynthesis;
    speechRunRef.current += 1;
    const runId = speechRunRef.current;
    synthesis.cancel();
    setSpeechError("");
    setPhase("listening");
    setSpeechState("speaking");

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "tr-TR";
    utterance.rate = LISTEN_THEN_READ_SPEECH_RATES[nextRateMode];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      if (speechRunRef.current === runId) setSpeechState("speaking");
    };
    utterance.onpause = () => {
      if (speechRunRef.current === runId) setSpeechState("paused");
    };
    utterance.onresume = () => {
      if (speechRunRef.current === runId) setSpeechState("speaking");
    };
    utterance.onend = () => {
      if (speechRunRef.current !== runId) return;
      utteranceRef.current = null;
      setSpeechState("completed");
      setPhase("model-complete");
    };
    utterance.onerror = (event) => {
      if (speechRunRef.current !== runId) return;
      utteranceRef.current = null;
      if (event.error === "canceled" || event.error === "interrupted") {
        setSpeechState("idle");
        return;
      }
      setSpeechState("error");
      setSpeechError("Sesli okuma sırasında bir sorun oluştu. Baştan Dinle ile tekrar deneyebilirsin.");
    };
    utteranceRef.current = utterance;
    synthesis.speak(utterance);
  }, [selectedVoice, speechRateMode, speechSupported, speechText]);

  const resetAttempt = useCallback(() => {
    setAnswers({});
    setReadingConfirmationOpen(false);
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage("");
    setSpeechError("");
    savedAttemptRef.current = false;
  }, []);

  const handleGradeSelect = (nextGrade: ListenThenReadGrade) => {
    cancelSpeech();
    setGrade(nextGrade);
    setSelectedPassage(getRandomListenThenReadPassage(nextGrade));
    resetAttempt();
    setPhase("listening");
  };

  const handleNewText = () => {
    cancelSpeech();
    setSelectedPassage(getRandomListenThenReadPassage(grade, selectedPassage.id));
    resetAttempt();
    setPhase("listening");
  };

  const handleRetry = () => {
    cancelSpeech();
    resetAttempt();
    setPhase("listening");
  };

  const handleRateChange = (nextMode: ListenThenReadSpeechRateMode) => {
    setSpeechRateMode(nextMode);
    if (speechState === "speaking" || speechState === "paused") startSpeech(nextMode);
  };

  const handlePause = () => {
    if (speechState !== "speaking" || !canUseSpeechSynthesis()) return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  };

  const handleResume = () => {
    if (speechState !== "paused" || !canUseSpeechSynthesis()) return;
    window.speechSynthesis.resume();
    setSpeechState("speaking");
  };

  const handleStop = () => {
    cancelSpeech();
    setSpeechError("");
    setPhase("listening");
  };

  const handleStudentReady = () => {
    cancelSpeech();
    setReadingConfirmationOpen(false);
    setPhase("student-reading");
  };

  const handleRelisten = () => {
    cancelSpeech();
    setSpeechError("");
    setPhase("listening");
  };

  const handleConfirmReading = () => {
    setReadingConfirmationOpen(false);
    setPhase("comprehension");
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const persistResult = useCallback(async (attempt: AttemptResult) => {
    if (savedAttemptRef.current) return;
    savedAttemptRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    const completedAt = new Date().toISOString();
    const details = {
      passageId: selectedPassage.id,
      passageTitle: selectedPassage.title,
      grade,
      listeningCompleted: true,
      readingCompleted: true,
      comprehensionCorrect: attempt.comprehensionCorrect,
      comprehensionTotal: attempt.comprehensionTotal,
      comprehensionWrong: attempt.comprehensionTotal - attempt.comprehensionCorrect,
      comprehensionScore: attempt.comprehensionScore,
      speechRateMode,
      completedAt,
    };

    try {
      await saveExerciseResultSecure({
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        score: attempt.comprehensionCorrect,
        successRate: attempt.comprehensionScore,
        correctCount: attempt.comprehensionCorrect,
        wrongCount: attempt.comprehensionTotal - attempt.comprehensionCorrect,
        durationSeconds: 0,
        completedAt,
        details,
      });
      setSaveStatus("success");
      setSaveMessage("Sonuç başarıyla kaydedildi.");
    } catch {
      const student = getCurrentStudent();
      saveExerciseResult({
        studentId: student?.id ?? "no-student",
        studentName: student?.name ?? "Seçilmemiş Öğrenci",
        username: student?.username,
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        durationSeconds: 0,
        correctCount: attempt.comprehensionCorrect,
        wrongCount: attempt.comprehensionTotal - attempt.comprehensionCorrect,
        score: attempt.comprehensionCorrect,
        successRate: attempt.comprehensionScore,
        details,
      });
      setSaveStatus("local");
      setSaveMessage("Sonuç bu cihazda saklandı.");
    }
  }, [grade, selectedPassage, speechRateMode]);

  const handleFinishComprehension = () => {
    if (selectedPassage.comprehensionQuestions.some((question) => answers[question.id] === undefined)) return;
    const comprehensionCorrect = selectedPassage.comprehensionQuestions.filter(
      (question) => answers[question.id] === question.correctAnswer,
    ).length;
    const attempt: AttemptResult = {
      comprehensionCorrect,
      comprehensionTotal: selectedPassage.comprehensionQuestions.length,
      comprehensionScore: calculateScore(comprehensionCorrect, selectedPassage.comprehensionQuestions.length),
    };
    setResult(attempt);
    void persistResult(attempt);
    setPhase("result");
  };

  const handleExit = useCallback(() => {
    cancelSpeech();
    void navigateTo("/egzersizler");
  }, [cancelSpeech, navigateTo]);

  const renderPassage = () => (
    <article className={styles.readingSurface} aria-label={`${selectedPassage.title} metni`}>
      <h2>{selectedPassage.title}</h2>
      {selectedPassage.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );

  const speechControls = (
    <div className={styles.speechControls} aria-label="Sesli okuma kontrolleri">
      {speechState === "speaking" ? <button type="button" className={styles.secondaryButton} onClick={handlePause}>Duraklat</button> : null}
      {speechState === "paused" ? <button type="button" className={styles.primaryButton} onClick={handleResume}>Devam Et</button> : null}
      <button type="button" className={styles.secondaryButton} onClick={() => startSpeech()} disabled={!speechSupported}>Baştan Dinle</button>
      {(speechState === "speaking" || speechState === "paused") ? <button type="button" className={styles.tertiaryButton} onClick={handleStop}>Durdur</button> : null}
    </div>
  );

  if (phase === "intro") {
    return <ExerciseStage title={TITLE} subtitle="Okuma - Anlama" onExit={handleExit}>
      <div className={styles.centerPanel}>
        <span className={styles.eyebrow}>Okuma - Anlama</span>
        <h2>Dinle – Sen Oku</h2>
        <p>Önce metni dinle, sonra aynı metni kendin sesli oku. Son adımda üç kısa soruyu yanıtla.</p>
        <p className={styles.supportiveText}>Bu çalışmada sesin kaydedilmez ve okuma hızın ya da telaffuzun değerlendirilmez.</p>
        <button type="button" className={styles.primaryButton} onClick={() => setPhase("grade")}>Çalışmaya Başla</button>
      </div>
    </ExerciseStage>;
  }

  if (phase === "grade") {
    return <ExerciseStage title={TITLE} subtitle="Önce sınıfını seç" onExit={handleExit}>
      <div className={styles.centerPanel}>
        <span className={styles.eyebrow}>Seviye seçimi</span>
        <h2>Hangi sınıf için okuyorsun?</h2>
        <div className={styles.gradeGrid}>
          {LISTEN_THEN_READ_GRADES.map((option) => <button key={option} type="button" className={styles.gradeButton} onClick={() => handleGradeSelect(option)}><strong>{option}. sınıf</strong><span>2 özgün metin</span></button>)}
        </div>
      </div>
    </ExerciseStage>;
  }

  if (phase === "listening") {
    return <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Önce Dinle`} onExit={handleExit}>
      <div className={styles.flowPanel}>
        <div className={styles.flowHeader}><div><span className={styles.eyebrow}>1. Aşama</span><h2>Önce Dinle</h2></div><span className={styles.textBadge}>{gradeLabel(grade)}</span></div>
        {renderPassage()}
        <p className={styles.instruction}>Metni dikkatle dinle. Dinleme bitince “Şimdi sıra sende!” ekranı açılacak.</p>
        <div className={styles.ratePicker} role="group" aria-label="Sesli okuma hızı">
          <span>Okuma hızı</span>
          {LISTEN_THEN_READ_SPEECH_RATE_MODES.map((mode) => <button key={mode} type="button" className={speechRateMode === mode ? styles.selectedRate : styles.rateButton} aria-pressed={speechRateMode === mode} onClick={() => handleRateChange(mode)}>{mode === "slow" ? "Yavaş" : "Normal"}</button>)}
        </div>
        {voiceStatus === "default" ? <p className={styles.voiceNote} role="status">Türkçe ses bulunamadı; tarayıcının varsayılan sesi kullanılacak.</p> : null}
        {voiceStatus === "loading" ? <p className={styles.voiceNote} role="status">Ses seçenekleri hazırlanıyor. Uygun Türkçe ses varsa kullanılacak.</p> : null}
        {!speechSupported ? <div className={styles.warningBox} role="alert"><strong>Sesli okuma desteklenmiyor.</strong><span>Bu tarayıcı yerleşik ses sentezini kullanamıyor. Metni kendin okumak için egzersizlere dönüp desteklenen bir tarayıcı deneyebilirsin.</span></div> : null}
        {speechError ? <p className={styles.errorNote} role="alert">{speechError}</p> : null}
        <p className={styles.liveStatus} role="status" aria-live="polite">{speechStateLabel(speechState)}</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={() => startSpeech()} disabled={!speechSupported}>Dinlemeyi Başlat</button>
          {speechControls}
        </div>
      </div>
    </ExerciseStage>;
  }

  if (phase === "model-complete") {
    return <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Dinleme tamamlandı`} onExit={handleExit}>
      <div className={styles.centerPanel}>
        <span className={styles.completeIcon} aria-hidden="true">✓</span>
        <span className={styles.eyebrow}>Dinleme tamamlandı</span>
        <h2>Şimdi sıra sende!</h2>
        <p>Aynı metni şimdi kendin sesli oku. Hazır olduğunda okumayı tamamladığını işaretleyebilirsin.</p>
        <button type="button" className={styles.primaryButton} onClick={handleStudentReady}>Ben Okumaya Hazırım</button>
      </div>
    </ExerciseStage>;
  }

  if (phase === "student-reading") {
    return <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Şimdi Sen Oku`} onExit={handleExit}>
      <div className={styles.flowPanel}>
        <div className={styles.flowHeader}><div><span className={styles.eyebrow}>2. Aşama</span><h2>Şimdi Sen Oku</h2></div><span className={styles.textBadge}>{selectedPassage.title}</span></div>
        {renderPassage()}
        <p className={styles.instruction}>Metnin tamamını sesli oku. Bitirdiğinde aşağıdaki düğmeye bas; bu egzersizde mikrofon veya kayıt kullanılmaz.</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={handleRelisten}>Tekrar Dinle</button>
          <button type="button" className={styles.primaryButton} onClick={() => setReadingConfirmationOpen(true)}>Okumayı Tamamladım</button>
        </div>
        {readingConfirmationOpen ? <div className={styles.confirmationBox} role="dialog" aria-modal="false" aria-labelledby="reading-confirmation-title"><h3 id="reading-confirmation-title">Metnin tamamını sesli okudun mu?</h3><p>Hazırsan anlama sorularına geçebilirsin.</p><div className={styles.confirmationActions}><button type="button" className={styles.secondaryButton} onClick={() => setReadingConfirmationOpen(false)}>Okumaya Devam Et</button><button type="button" className={styles.primaryButton} onClick={handleConfirmReading}>Evet, Tamamladım</button></div></div> : null}
      </div>
    </ExerciseStage>;
  }

  if (phase === "comprehension") {
    return <ExerciseStage title={TITLE} subtitle="Anlama soruları" onExit={handleExit} status={<span className={styles.stageStatus}>Yanıtlanan: {answeredCount}/{selectedPassage.comprehensionQuestions.length}</span>}>
      <div className={styles.flowPanel}>
        <div className={styles.flowHeader}><div><span className={styles.eyebrow}>3. Aşama</span><h2>Metni ne kadar anladın?</h2></div><span className={styles.textBadge}>{selectedPassage.title}</span></div>
        <div className={styles.questionList}>{selectedPassage.comprehensionQuestions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} selectedAnswer={answers[question.id]} onAnswer={handleAnswer} />)}</div>
        <div className={styles.actionRow}><p className={styles.instruction}>{answeredCount === selectedPassage.comprehensionQuestions.length ? "Tüm soruları yanıtladın." : "Devam etmek için tüm soruları yanıtla."}</p><button type="button" className={styles.primaryButton} disabled={answeredCount !== selectedPassage.comprehensionQuestions.length} onClick={handleFinishComprehension}>Sonucu Gör</button></div>
      </div>
    </ExerciseStage>;
  }

  if (phase === "result" && result) {
    return <ExerciseStage title={TITLE} subtitle="Çalışma tamamlandı" onExit={handleExit}>
      <div className={styles.resultPanel}>
        <span className={styles.eyebrow}>Çalışma tamamlandı</span>
        <h2>Çalışmayı Tamamladın</h2>
        <p className={styles.supportiveText}>{saveMessage || "Sonuç hazırlanıyor..."}</p>
        <div className={styles.kpiGrid}>
          <Kpi label="Metin" value={selectedPassage.title} tone="blue" />
          <Kpi label="Sınıf" value={gradeLabel(grade)} tone="orange" />
          <Kpi label="Dinleme" value="Tamamlandı" tone="green" />
          <Kpi label="Sesli Okuma" value="Tamamlandı" tone="teal" />
          <Kpi label="Anlama" value={`${result.comprehensionCorrect}/${result.comprehensionTotal}`} tone="purple" />
        </div>
        <p className={styles.resultNote}>Bu sonuç okuma akışının ve anlama sorularının tamamlandığını gösterir; akıcılık veya telaffuz puanı değildir.</p>
        <ExerciseEndScreenActions showReplay={false} onReplay={() => undefined} backHref="/egzersizler" exitHref="/ogrenci" exitLabel="Ana Sayfaya Dön" />
        <div className={styles.resultActions}><button type="button" className={styles.secondaryButton} onClick={handleNewText}>Yeni Metin</button><button type="button" className={styles.secondaryButton} onClick={handleRetry}>Tekrar Çalış</button></div>
        {saveStatus === "saving" ? <p className={styles.saveNote} role="status">Sonuç kaydediliyor...</p> : null}
      </div>
    </ExerciseStage>;
  }

  return null;
}
