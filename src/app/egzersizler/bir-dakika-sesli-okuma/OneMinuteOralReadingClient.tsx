"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { ExerciseEndScreenActions } from "@/components/exercises/ExerciseEndScreenActions";
import { ExerciseStage } from "@/components/exercises/ExerciseStage";
import { useExerciseExitNavigation } from "@/components/exercises/useExerciseExitNavigation";
import { getCurrentStudent } from "@/lib/auth/auth";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import {
  calculateComprehensionScore,
  calculateCorrectWords,
  calculateWordsRead,
  countReadingWords,
  getRemainingSeconds,
  isTimerFinished,
  ONE_MINUTE_SECONDS,
  splitParagraphForDisplay,
  validateReadingErrors,
  type ReadingDisplayToken,
} from "@/lib/one-minute-reading/metrics";
import {
  getRandomTextForGrade,
  ONE_MINUTE_READING_GRADES,
  type OneMinuteComprehensionQuestion,
  type OneMinuteReadingGrade,
  type OneMinuteReadingText,
} from "@/lib/one-minute-reading/content";
import styles from "./one-minute-oral-reading.module.css";

type Phase = "intro" | "grade" | "ready" | "reading" | "time-up" | "marking" | "errors" | "comprehension" | "result";

type AttemptResult = {
  wordsRead: number;
  readingErrors: number;
  correctWords: number;
  comprehensionCorrect: number;
  comprehensionTotal: number;
  comprehensionScore: number;
};

type SaveStatus = "idle" | "saving" | "success" | "local";

const TITLE = "1 Dakika Sesli Okuma";
const RESULT_TYPE = "one-minute-oral-reading" as const;

function gradeLabel(grade: OneMinuteReadingGrade): string {
  return `${grade}. Sınıf`;
}

function formatTimer(seconds: number): string {
  return `00:${String(Math.max(0, seconds)).padStart(2, "0")}`;
}

export function OneMinuteOralReadingClient({
  educationProgramLaunch,
}: {
  educationProgramLaunch?: EducationProgramExerciseLaunchProps;
}) {
  void educationProgramLaunch;
  const { navigateTo } = useExerciseExitNavigation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [grade, setGrade] = useState<OneMinuteReadingGrade>(1);
  const [selectedText, setSelectedText] = useState<OneMinuteReadingText>(() => getRandomTextForGrade(1));
  const [remainingSeconds, setRemainingSeconds] = useState(ONE_MINUTE_SECONDS);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastWordIndex, setLastWordIndex] = useState<number | null>(null);
  const [readingErrors, setReadingErrors] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const savedAttemptRef = useRef(false);
  const timerFinishedRef = useRef(false);

  const totalWords = useMemo(
    () => countReadingWords(selectedText.paragraphs.join("\n")),
    [selectedText],
  );
  const displayParagraphs = useMemo(() => selectedText.paragraphs.map((paragraph, paragraphIndex) => {
    const wordIndex = selectedText.paragraphs.slice(0, paragraphIndex).reduce((total, item) => total + countReadingWords(item), 0);
    return splitParagraphForDisplay(paragraph, wordIndex);
  }), [selectedText]);
  const wordsRead = calculateWordsRead(lastWordIndex, totalWords);

  const resetAttemptState = useCallback(() => {
    setRemainingSeconds(ONE_MINUTE_SECONDS);
    setStartedAt(null);
    setLastWordIndex(null);
    setReadingErrors(0);
    setAnswers({});
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage("");
    savedAttemptRef.current = false;
    timerFinishedRef.current = false;
  }, []);

  const handleGradeSelect = (nextGrade: OneMinuteReadingGrade) => {
    setGrade(nextGrade);
    setSelectedText(getRandomTextForGrade(nextGrade));
    resetAttemptState();
    setPhase("ready");
  };

  const handleNewText = () => {
    setSelectedText(getRandomTextForGrade(grade, selectedText.id));
    resetAttemptState();
    setPhase("ready");
  };

  const handleStartReading = () => {
    setRemainingSeconds(ONE_MINUTE_SECONDS);
    timerFinishedRef.current = false;
    setStartedAt(Date.now());
    setPhase("reading");
  };

  useEffect(() => {
    if (phase !== "reading" || startedAt === null) return;

    const updateTimer = () => {
      if (timerFinishedRef.current) return;
      const now = Date.now();
      setRemainingSeconds(getRemainingSeconds(startedAt, now));
      if (isTimerFinished(startedAt, now)) {
        timerFinishedRef.current = true;
        setRemainingSeconds(0);
        setStartedAt(null);
        setPhase("time-up");
      }
    };

    const intervalId = window.setInterval(updateTimer, 200);
    document.addEventListener("visibilitychange", updateTimer);
    updateTimer();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateTimer);
    };
  }, [phase, startedAt]);

  const persistResult = useCallback(async (attempt: AttemptResult) => {
    if (savedAttemptRef.current) return;
    savedAttemptRef.current = true;
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");

    const completedAt = new Date().toISOString();
    const details = {
      textId: selectedText.id,
      textTitle: selectedText.title,
      grade,
      wordCount: totalWords,
      wordsRead: attempt.wordsRead,
      readingErrors: attempt.readingErrors,
      correctWords: attempt.correctWords,
      totalQuestions: attempt.comprehensionTotal,
      comprehensionCorrect: attempt.comprehensionCorrect,
      comprehensionWrong: attempt.comprehensionTotal - attempt.comprehensionCorrect,
      comprehensionScore: attempt.comprehensionScore,
      completedAt,
    };

    try {
      await saveExerciseResultSecure({
        exerciseType: RESULT_TYPE,
        exerciseTitle: TITLE,
        score: attempt.correctWords,
        successRate: attempt.comprehensionScore,
        correctCount: attempt.correctWords,
        wrongCount: attempt.readingErrors,
        durationSeconds: ONE_MINUTE_SECONDS,
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
        durationSeconds: ONE_MINUTE_SECONDS,
        correctCount: attempt.correctWords,
        wrongCount: attempt.readingErrors,
        score: attempt.correctWords,
        successRate: attempt.comprehensionScore,
        details,
      });
      setSaveStatus("local");
      setSaveMessage("Sonuç bu cihazda saklandı.");
    }
  }, [grade, selectedText, totalWords]);


  const handleLastWordSelect = (wordIndex: number) => {
    setLastWordIndex(wordIndex);
  };

  const handleContinueFromMarking = () => {
    if (lastWordIndex === null) return;
    setReadingErrors(0);
    setPhase("errors");
  };

  const handleFinishReadingMeasurement = () => {
    if (lastWordIndex === null) return;
    setReadingErrors(validateReadingErrors(readingErrors, wordsRead));
    setPhase("comprehension");
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const handleFinishComprehension = () => {
    if (selectedText.comprehensionQuestions.some((question) => answers[question.id] === undefined)) return;

    const comprehensionCorrect = selectedText.comprehensionQuestions.filter(
      (question) => answers[question.id] === question.correctAnswer,
    ).length;
    const comprehensionTotal = selectedText.comprehensionQuestions.length;
    const nextResult: AttemptResult = {
      wordsRead,
      readingErrors: validateReadingErrors(readingErrors, wordsRead),
      correctWords: calculateCorrectWords(wordsRead, readingErrors),
      comprehensionCorrect,
      comprehensionTotal,
      comprehensionScore: calculateComprehensionScore(comprehensionCorrect, comprehensionTotal),
    };
    setResult(nextResult);
    void persistResult(nextResult);
    setPhase("result");
  };

  const handleExit = useCallback(() => {
    if (phase === "reading" && !window.confirm("Okuma sürüyor. Egzersizden çıkmak istediğine emin misin?")) return;
    void navigateTo("/egzersizler");
  }, [navigateTo, phase]);

  const renderPassage = (isMarking: boolean) => (
    <article className={styles.readingSurface} aria-label={`${selectedText.title} metni`}>
      <h2>{selectedText.title}</h2>
      {displayParagraphs.map((tokens, paragraphIndex) => (
        <p key={`${selectedText.id}-${paragraphIndex}`}>
          {tokens.map((token, tokenIndex) => {
            if (token.wordIndex === null) {
              return <span key={`${paragraphIndex}-${tokenIndex}`}>{token.display}</span>;
            }

            const isReached = isMarking && lastWordIndex !== null && token.wordIndex <= lastWordIndex;
            const isSelected = isMarking && token.wordIndex === lastWordIndex;
            const wordToken = token as ReadingDisplayToken;
            return (
              <span key={`${paragraphIndex}-${tokenIndex}`} className={isReached ? styles.reachedWord : undefined}>
                {isMarking ? (
                  <button
                    type="button"
                    className={`${styles.wordButton} ${isSelected ? styles.selectedWord : ""}`}
                    aria-label={`${wordToken.display} kelime ${wordToken.wordIndex + 1}`}
                    aria-pressed={isSelected}
                    onClick={() => handleLastWordSelect(wordToken.wordIndex)}
                  >
                    {wordToken.display}
                  </button>
                ) : wordToken.display}
              </span>
            );
          })}
        </p>
      ))}
    </article>
  );

  const answeredCount = Object.keys(answers).length;
  const timerStats = phase === "reading" ? (
    <FixedExerciseStat
      label="Kalan süre"
      value={<span aria-live={remainingSeconds <= 5 ? "assertive" : "off"}>{formatTimer(remainingSeconds)}</span>}
      tone={remainingSeconds <= 10 ? "bad" : "brand"}
    />
  ) : null;

  if (phase === "intro") {
    return (
      <ExerciseStage title={TITLE} subtitle="Okuma - Anlama" onExit={handleExit} status={<FixedExerciseStat label="Süre" value="60 saniye" tone="brand" />}>
        <div className={styles.centerPanel}>
          <span className={styles.eyebrow}>Okuma - Anlama</span>
          <h2>1 Dakika Sesli Okuma</h2>
          <p>Metni sesli oku. Süre dolduğunda kaldığın son kelimeyi işaretle.</p>
          <p className={styles.supportiveText}>Okurken acele etmek yerine doğru ve anlaşılır okumaya çalış.</p>
          <button type="button" className={styles.primaryButton} onClick={() => setPhase("grade")}>Çalışmaya Başla</button>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "grade") {
    return (
      <ExerciseStage title={TITLE} subtitle="Önce sınıfını seç" onExit={handleExit}>
        <div className={styles.centerPanel}>
          <span className={styles.eyebrow}>Seviye seçimi</span>
          <h2>Hangi sınıf için okuyorsun?</h2>
          <div className={styles.gradeGrid}>
            {ONE_MINUTE_READING_GRADES.map((option) => (
              <button key={option} type="button" className={styles.gradeButton} onClick={() => handleGradeSelect(option)}>
                <strong>{option}. sınıf</strong>
                <span>{"2 özgün metin"}</span>
              </button>
            ))}
          </div>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "ready") {
    return (
      <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Hazırlık`} onExit={handleExit}>
        <div className={styles.flowPanel}>
          <div className={styles.flowHeader}><div><span className={styles.eyebrow}>Hazır olduğunda başla</span><h2>Okumaya hazır mısın?</h2></div><span className={styles.textBadge}>{gradeLabel(grade)}</span></div>
          {renderPassage(false)}
          <p className={styles.instruction}>Hazır olduğunda okumaya başla. Sayaç düğmeye bastığında çalışır.</p>
          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={handleNewText}>Başka Metin Seç</button>
            <button type="button" className={styles.primaryButton} onClick={handleStartReading}>Okumaya Başla</button>
          </div>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "reading") {
    return (
      <ExerciseStage title={TITLE} subtitle={`${gradeLabel(grade)} · Metni sesli oku`} onExit={handleExit} status={timerStats}>
        <div className={styles.flowPanel}>{renderPassage(false)}<p className={styles.readingHint}>Metne odaklan. Son kelimeyi süre bitince işaretleyeceksin.</p></div>
      </ExerciseStage>
    );
  }

  if (phase === "time-up") {
    return (
      <ExerciseStage title={TITLE} subtitle="Okuma tamamlandı" onExit={handleExit} status={<FixedExerciseStat label="Süre" value="00:00" tone="bad" />}>
        <div className={styles.centerPanel}>
          <span className={styles.completeIcon} aria-hidden="true">✓</span>
          <span className={styles.eyebrow}>Süre doldu</span>
          <h2>1 dakika tamamlandı!</h2>
          <p>Şimdi okuduğun son kelimeyi işaretle.</p>
          <button type="button" className={styles.primaryButton} onClick={() => setPhase("marking")}>Son Kelimeyi İşaretle</button>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "marking" || phase === "errors") {
    const isErrorStep = phase === "errors";
    return (
      <ExerciseStage title={TITLE} subtitle={isErrorStep ? "Okuma hatalarını gir" : "Son kelimeyi seç"} onExit={handleExit} status={<FixedExerciseStat label="Okunan kelime" value={wordsRead} tone="brand" />}>
        <div className={styles.flowPanel}>
          <div className={styles.flowHeader}><div><span className={styles.eyebrow}>{isErrorStep ? "2. adım" : "1. adım"}</span><h2>{isErrorStep ? "Okuma sırasında kaç kelimede hata yapıldı?" : "Ulaştığın son kelimeye dokun"}</h2></div><span className={styles.liveCount}>Okunan Kelime: <strong>{wordsRead}</strong></span></div>
          {renderPassage(true)}
          {isErrorStep ? (
            <div className={styles.errorEntry}>
              <label htmlFor="reading-errors">Okuma sırasında kaç kelimede hata yapıldı?</label>
              <div className={styles.numberControl}><button type="button" aria-label="Hata sayısını azalt" onClick={() => setReadingErrors((value) => Math.max(0, value - 1))}>−</button><input id="reading-errors" type="number" min={0} max={wordsRead} value={readingErrors} onChange={(event) => setReadingErrors(validateReadingErrors(Number(event.target.value), wordsRead))} /><button type="button" aria-label="Hata sayısını artır" onClick={() => setReadingErrors((value) => Math.min(wordsRead, value + 1))}>+</button></div>
              <p>Doğru Okunan Kelime: <strong>{calculateCorrectWords(wordsRead, readingErrors)}</strong></p>
              <button type="button" className={styles.primaryButton} onClick={handleFinishReadingMeasurement}>Sorulara Geç</button>
            </div>
          ) : (
            <div className={styles.actionRow}><p className={styles.instruction}>{lastWordIndex === null ? "Bir kelime seçtiğinde burada görünecek." : `Seçilen son kelime: ${displayParagraphs.flat().find((token) => token.wordIndex === lastWordIndex)?.display ?? ""}`}</p><button type="button" className={styles.primaryButton} disabled={lastWordIndex === null} onClick={handleContinueFromMarking}>Devam Et</button></div>
          )}
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "comprehension") {
    return (
      <ExerciseStage title={TITLE} subtitle="Anlama soruları" onExit={handleExit} status={<FixedExerciseStat label="Yanıtlanan" value={`${answeredCount}/${selectedText.comprehensionQuestions.length}`} tone="brand" />}>
        <div className={styles.flowPanel}>
          <div className={styles.flowHeader}><div><span className={styles.eyebrow}>Son adım</span><h2>Metni ne kadar anladın?</h2></div><span className={styles.textBadge}>{selectedText.title}</span></div>
          <div className={styles.questionList}>
            {selectedText.comprehensionQuestions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} selectedAnswer={answers[question.id]} onAnswer={handleAnswer} />)}
          </div>
          <div className={styles.actionRow}><p className={styles.instruction}>{answeredCount === selectedText.comprehensionQuestions.length ? "Tüm soruları yanıtladın." : "Devam etmek için tüm soruları yanıtla."}</p><button type="button" className={styles.primaryButton} disabled={answeredCount !== selectedText.comprehensionQuestions.length} onClick={handleFinishComprehension}>Sonucu Gör</button></div>
        </div>
      </ExerciseStage>
    );
  }

  if (phase === "result" && result) {
    return (
      <ExerciseStage title={TITLE} subtitle="Çalışma tamamlandı" onExit={handleExit}>
        <div className={styles.resultPanel}>
          <span className={styles.eyebrow}>Çalışma tamamlandı</span>
          <h2>1 Dakikalık Okuma Sonucun</h2>
          <p className={styles.supportiveText}>{saveMessage || "Sonuç hazırlanıyor..."}</p>
          <div className={styles.kpiGrid}>
            <Kpi label="Okunan Kelime" value={result.wordsRead} tone="blue" />
            <Kpi label="Okuma Hatası" value={result.readingErrors} tone="amber" />
            <Kpi label="Doğru Okunan" value={result.correctWords} tone="green" />
            <Kpi label="Anlama" value={`${result.comprehensionCorrect} / ${result.comprehensionTotal}`} tone="purple" />
          </div>
          <div className={styles.resultMeta}><span>Metin: <strong>{selectedText.title}</strong></span><span>Sınıf: <strong>{gradeLabel(grade)}</strong></span></div>
          <ExerciseEndScreenActions showReplay={false} onReplay={() => undefined} backHref="/egzersizler" exitHref="/ogrenci" exitLabel="Ana Sayfaya Dön" />
          <div className={styles.resultActions}><button type="button" className={styles.secondaryButton} onClick={handleNewText}>Yeni Metin</button><button type="button" className={styles.secondaryButton} onClick={() => { resetAttemptState(); setPhase("ready"); }}>Tekrar Çalış</button></div>
          {saveStatus === "saving" ? <p className={styles.saveNote} role="status">Sonuç kaydediliyor...</p> : null}
        </div>
      </ExerciseStage>
    );
  }

  return null;
}

function QuestionCard({ question, index, selectedAnswer, onAnswer }: { question: OneMinuteComprehensionQuestion; index: number; selectedAnswer?: number; onAnswer: (questionId: string, optionIndex: number) => void }) {
  return <fieldset className={styles.questionCard}><legend>{index + 1}. {question.question}</legend><div className={styles.optionGrid}>{question.options.map((option, optionIndex) => <button key={option} type="button" className={`${styles.optionButton} ${selectedAnswer === optionIndex ? styles.selectedOption : ""}`} aria-pressed={selectedAnswer === optionIndex} onClick={() => onAnswer(question.id, optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div></fieldset>;
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "amber" | "green" | "purple" }) {
  return <article className={`${styles.kpi} ${styles[`kpi${tone}`]}`}><span>{label}</span><strong>{value}</strong></article>;
}
