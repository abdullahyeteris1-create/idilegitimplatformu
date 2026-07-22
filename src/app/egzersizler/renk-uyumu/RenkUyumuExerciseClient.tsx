"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveExerciseResultSecure } from "@/lib/results/secureResultStorage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/color-match-theme.module.css";

type GameStatus = "idle" | "running" | "saving" | "save-error" | "finished";
type FeedbackType = "correct" | "wrong" | null;

type ColorOption = {
  id: string;
  label: string;
  value: string;
};

type Question = {
  word: ColorOption;
  inkColor: ColorOption;
  choices: ColorOption[];
};

type AnswerRecord = {
  questionNumber: number;
  selectedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
  responseTimeMs: number;
};

type FinalResultMetrics = {
  score: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  durationSeconds: number;
};

const COLORS: ColorOption[] = [
  { id: "red", label: "KIRMIZI", value: "#dc2626" },
  { id: "blue", label: "MAVİ", value: "#2563eb" },
  { id: "green", label: "YEŞİL", value: "#16a34a" },
  { id: "yellow", label: "SARI", value: "#eab308" },
  { id: "purple", label: "MOR", value: "#9333ea" },
  { id: "pink", label: "PEMBE", value: "#ec4899" },
  { id: "orange", label: "TURUNCU", value: "#ea580c" },
  { id: "black", label: "SİYAH", value: "#111827" },
];

const TOTAL_QUESTIONS = 15;
const CORRECT_SCORE = 10;
const WRONG_SCORE = 5;
const FEEDBACK_DURATION_MS = 650;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function createQuestion(choiceCount: number): Question {
  const inkColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const differentWords = COLORS.filter((color) => color.id !== inkColor.id);
  const word =
    differentWords[Math.floor(Math.random() * differentWords.length)];

  const distractors = shuffle(
    COLORS.filter((color) => color.id !== inkColor.id),
  ).slice(0, choiceCount - 1);

  return {
    word,
    inkColor,
    choices: shuffle([inkColor, ...distractors]),
  };
}

function formatMilliseconds(value: number): string {
  return `${Math.max(0, Math.round(value))} ms`;
}

export default function RenkUyumuExerciseClient() {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [
    styles.themeRoot,
    isLight ? styles.lightTheme : styles.darkTheme,
  ].join(" ");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [question, setQuestion] = useState<Question>(() => createQuestion(4));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const [answerHistory, setAnswerHistory] = useState<AnswerRecord[]>([]);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [saveError, setSaveError] = useState("");

  const questionStartedAtRef = useRef(0);
  const exerciseStartedAtRef = useRef(0);
  const pendingResultRef = useRef<FinalResultMetrics | null>(null);
  const answerLockedRef = useRef(false);
  const nextQuestionTimerRef = useRef<number | null>(null);

  const choiceCount = useMemo(() => {
    if (selectedLevel === 1) return 4;
    if (selectedLevel === 2) return 6;
    return 8;
  }, [selectedLevel]);

  const progressPercent = Math.round(
    (questionIndex / TOTAL_QUESTIONS) * 100,
  );

  const averageResponseTime = useMemo(() => {
    if (answerHistory.length === 0) return 0;

    const total = answerHistory.reduce(
      (sum, answer) => sum + answer.responseTimeMs,
      0,
    );

    return Math.round(total / answerHistory.length);
  }, [answerHistory]);

  const accuracyPercent = useMemo(() => {
    if (answerHistory.length === 0) return 0;

    return Math.round((correctCount / answerHistory.length) * 100);
  }, [answerHistory.length, correctCount]);

  const beginQuestion = useCallback(
    (nextQuestionIndex: number) => {
      setQuestion(createQuestion(choiceCount));
      setQuestionIndex(nextQuestionIndex);
      setFeedback(null);
      setLastResponseTime(null);
      answerLockedRef.current = false;
      setIsAnswerLocked(false);

      window.requestAnimationFrame((timestamp) => {
        questionStartedAtRef.current = timestamp;
      });
    },
    [choiceCount],
  );

  const persistResult = useCallback(async (metrics: FinalResultMetrics) => {
    pendingResultRef.current = metrics;
    setSaveError("");
    setStatus("saving");
    try {
      await saveExerciseResultSecure({
        exerciseType: "color-match",
        exerciseTitle: "Renk Uyumu",
        ...metrics,
      });
      setStatus("finished");
    } catch {
      setSaveError("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
      setStatus("save-error");
    }
  }, []);

  const finishExercise = useCallback((metrics: FinalResultMetrics) => {
    answerLockedRef.current = true;
    setIsAnswerLocked(true);
    setFeedback(null);
    void persistResult(metrics);
  }, [persistResult]);

  const handleAnswer = useCallback(
    (selectedChoiceIndex: number, eventTimestamp: number) => {
      if (status !== "running" || answerLockedRef.current) return;

      const selectedChoice = question.choices[selectedChoiceIndex];
      if (!selectedChoice) return;

      answerLockedRef.current = true;
      setIsAnswerLocked(true);

      const responseTimeMs = Math.max(
        0,
        eventTimestamp - questionStartedAtRef.current,
      );
      const isCorrect = selectedChoice.id === question.inkColor.id;
      const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
      const nextWrongCount = wrongCount + (isCorrect ? 0 : 1);
      const nextScore = isCorrect ? score + CORRECT_SCORE : Math.max(0, score - WRONG_SCORE);

      setLastResponseTime(responseTimeMs);
      setFeedback(isCorrect ? "correct" : "wrong");

      if (isCorrect) {
        setCorrectCount((current) => current + 1);
        setScore((current) => current + CORRECT_SCORE);
      } else {
        setWrongCount((current) => current + 1);
        setScore((current) => Math.max(0, current - WRONG_SCORE));
      }

      setAnswerHistory((current) => [
        ...current,
        {
          questionNumber: questionIndex + 1,
          selectedLabel: selectedChoice.label,
          correctLabel: question.inkColor.label,
          isCorrect,
          responseTimeMs: Math.round(responseTimeMs),
        },
      ]);

      if (questionIndex + 1 >= TOTAL_QUESTIONS) {
        const finalMetrics: FinalResultMetrics = {
          score: nextScore,
          correctCount: nextCorrectCount,
          wrongCount: nextWrongCount,
          successRate: Math.round((nextCorrectCount / TOTAL_QUESTIONS) * 100),
          durationSeconds: Math.max(0, Math.round((Date.now() - exerciseStartedAtRef.current) / 1000)),
        };
        nextQuestionTimerRef.current = window.setTimeout(() => {
          finishExercise(finalMetrics);
        }, FEEDBACK_DURATION_MS);
        return;
      }

      nextQuestionTimerRef.current = window.setTimeout(() => {
        beginQuestion(questionIndex + 1);
      }, FEEDBACK_DURATION_MS);
    },
    [beginQuestion, correctCount, finishExercise, question, questionIndex, score, status, wrongCount],
  );

  useEffect(() => {
    if (status !== "running") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;

      const pressedNumber = Number(event.key);
      if (!Number.isInteger(pressedNumber)) return;
      if (pressedNumber < 1 || pressedNumber > question.choices.length) return;

      event.preventDefault();
      handleAnswer(pressedNumber - 1, event.timeStamp);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAnswer, question.choices.length, status]);

  useEffect(() => {
    return () => {
      if (nextQuestionTimerRef.current !== null) {
        window.clearTimeout(nextQuestionTimerRef.current);
      }
    };
  }, []);

  function startExercise() {
    if (nextQuestionTimerRef.current !== null) {
      window.clearTimeout(nextQuestionTimerRef.current);
      nextQuestionTimerRef.current = null;
    }

    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerHistory([]);
    setStatus("running");
    setFeedback(null);
    setLastResponseTime(null);
    setSaveError("");
    setQuestion(createQuestion(choiceCount));
    setQuestionIndex(0);
    answerLockedRef.current = false;
    setIsAnswerLocked(false);
    pendingResultRef.current = null;
    exerciseStartedAtRef.current = Date.now();

    window.requestAnimationFrame((timestamp) => {
      questionStartedAtRef.current = timestamp;
    });
  }

  function resetExercise() {
    if (nextQuestionTimerRef.current !== null) {
      window.clearTimeout(nextQuestionTimerRef.current);
      nextQuestionTimerRef.current = null;
    }

    setStatus("idle");
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerHistory([]);
    setFeedback(null);
    setLastResponseTime(null);
    setQuestionIndex(0);
    setQuestion(createQuestion(choiceCount));
    answerLockedRef.current = false;
    setIsAnswerLocked(false);
  }

  function changeLevel(level: number) {
    if (status === "running") return;

    const nextChoiceCount = level === 1 ? 4 : level === 2 ? 6 : 8;

    setSelectedLevel(level);
    setQuestion(createQuestion(nextChoiceCount));
    setQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerHistory([]);
    setFeedback(null);
    setLastResponseTime(null);
    setSaveError("");
    setStatus("idle");
    answerLockedRef.current = false;
    setIsAnswerLocked(false);
    pendingResultRef.current = null;
  }

  return (
    <main className={`${themeRootClassName} min-h-screen px-3 py-4 sm:px-6`}>
      <section className={`mx-auto w-full max-w-5xl overflow-hidden rounded-3xl ${styles.card}`}>
        <header className={`px-5 py-5 sm:px-7 ${styles.cardHeader}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${styles.title}`}>
                Renk Uyumu
              </h1>
              <p className={`mt-1 max-w-2xl text-sm ${styles.subtitle}`}>
                Kelimenin anlamını değil, yazının rengini seç. Fareyle tıkla
                veya klavyeden seçenek numarasına bas.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Puan" value={score} />
              <StatCard label="Doğru" value={correctCount} />
              <StatCard label="Yanlış" value={wrongCount} />
            </div>
          </div>
        </header>

        <div className={`px-5 py-4 sm:px-7 ${styles.levelBar}`}>
          <p className={`mb-2 text-xs font-black uppercase tracking-wider ${styles.levelBarLabel}`}>
            Seviye seç
          </p>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((level) => {
              const levelChoiceCount = level === 1 ? 4 : level === 2 ? 6 : 8;

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => changeLevel(level)}
                  disabled={status === "running"}
                  className={[
                    "min-h-11 rounded-xl px-4 py-2 text-sm font-black transition",
                    styles.levelButton,
                    selectedLevel === level ? styles.levelButtonActive : "",
                    status === "running"
                      ? "cursor-not-allowed opacity-55"
                      : "",
                  ].join(" ")}
                >
                  {level}. Seviye · {levelChoiceCount} şık
                </button>
              );
            })}
          </div>
        </div>

        {status === "idle" && (
          <div className="px-5 py-12 text-center sm:px-7">
            <div className={`mx-auto max-w-xl rounded-3xl p-8 ${styles.introCard}`}>
              <div className="text-6xl">🎨</div>
              <h2 className={`mt-4 text-2xl font-black ${styles.introTitle}`}>
                Başlamaya hazır
              </h2>
              <p className={`mt-3 text-sm leading-6 ${styles.introBody}`}>
                Her soruda kelime farklı bir renkle yazılacak. Doğru cevap,
                kelimenin anlamı değil yazının rengidir.
              </p>
              <button
                type="button"
                onClick={startExercise}
                className={`mt-6 rounded-xl px-7 py-3 text-sm font-black transition active:scale-[0.98] ${styles.primaryButton}`}
              >
                Çalışmayı Başlat
              </button>
            </div>
          </div>
        )}

        {status === "running" && (
          <div className="px-4 py-5 sm:px-7 sm:py-7">
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-4 text-sm font-black">
                <span>
                  {questionIndex + 1} / {TOTAL_QUESTIONS}
                </span>
                <span>%{Math.min(100, progressPercent)} tamamlandı</span>
              </div>
              <div className={`h-3 overflow-hidden rounded-full ${styles.progressTrack}`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${styles.progressFill}`}
                  style={{
                    width: `${Math.min(100, progressPercent)}%`,
                  }}
                />
              </div>
            </div>

            <div className={`rounded-3xl p-5 sm:p-8 ${styles.questionCard}`}>
              <p className={`text-center text-sm font-bold ${styles.questionPrompt}`}>
                Bu kelimenin rengi ne?
              </p>

              <div className={`my-8 flex items-center justify-center ${styles.stimulusSurface}`}>
                <div
                  className="text-center text-5xl font-black tracking-wide sm:text-7xl"
                  style={{ color: question.inkColor.value }}
                >
                  {question.word.label}
                </div>
              </div>

              <div
                className={[
                  "grid gap-3",
                  choiceCount === 4
                    ? "grid-cols-2"
                    : choiceCount === 6
                      ? "grid-cols-2 sm:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-4",
                ].join(" ")}
              >
                {question.choices.map((choice, index) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={(event) =>
                      handleAnswer(index, event.timeStamp)
                    }
                    disabled={isAnswerLocked}
                    className={`group rounded-xl px-3 py-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${styles.choiceButton}`}
                  >
                    <span className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-xs ${styles.choiceIndex}`}>
                      {index + 1}
                    </span>
                    {choice.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 min-h-16">
                {feedback !== null && lastResponseTime !== null && (
                  <div
                    className={[
                      "rounded-2xl px-4 py-3 text-center",
                      feedback === "correct" ? styles.feedbackCorrect : styles.feedbackWrong,
                    ].join(" ")}
                  >
                    <p className="text-lg font-black">
                      {feedback === "correct" ? "✓ Doğru" : "✕ Yanlış"}
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      Yanıt süresi: {formatMilliseconds(lastResponseTime)}
                    </p>
                    {feedback === "wrong" && (
                      <p className="mt-1 text-xs">
                        Doğru cevap: {question.inkColor.label}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className={`mt-3 text-center text-xs ${styles.helperText}`}>
                Klavye desteği: 1–{choiceCount} tuşlarını kullanabilirsin.
              </p>
            </div>
          </div>
        )}

        {(status === "saving" || status === "save-error") && (
          <div className="px-5 py-12 text-center sm:px-7">
            <div className={`mx-auto max-w-xl rounded-3xl p-8 ${styles.introCard}`}>
              <h2 className={`text-2xl font-black ${styles.introTitle}`}>
                {status === "saving" ? "Sonuç kaydediliyor..." : "Sonuç kaydedilemedi"}
              </h2>
              {saveError && <p className={`mt-3 text-sm font-bold ${styles.errorText}`} role="alert">{saveError}</p>}
              {status === "save-error" && (
                <button
                  type="button"
                  onClick={() => { if (pendingResultRef.current) void persistResult(pendingResultRef.current); }}
                  className={`mt-6 min-h-11 rounded-xl px-7 py-3 text-sm font-black transition ${styles.retryButton}`}
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          </div>
        )}

        {status === "finished" && (
          <div className="px-5 py-7 sm:px-7">
            <div className={`rounded-3xl p-6 text-center sm:p-8 ${styles.resultCard}`}>
              <div className="text-5xl">🏆</div>
              <h2 className={`mt-3 text-2xl font-black ${styles.resultTitle}`}>
                Çalışma tamamlandı
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <ResultCard label="Toplam puan" value={score} />
                <ResultCard label="Doğru" value={correctCount} />
                <ResultCard label="Yanlış" value={wrongCount} />
                <ResultCard label="Başarı" value={`%${accuracyPercent}`} />
                <ResultCard
                  label="Ortalama yanıt"
                  value={formatMilliseconds(averageResponseTime)}
                />
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={startExercise}
                  className={`rounded-xl px-6 py-3 text-sm font-black transition ${styles.primaryButton}`}
                >
                  Yeniden Başlat
                </button>
                <button
                  type="button"
                  onClick={resetExercise}
                  className={`rounded-xl px-6 py-3 text-sm font-black transition ${styles.secondaryButton}`}
                >
                  Ayarlara Dön
                </button>
              </div>
            </div>

            <div className={`mt-6 overflow-hidden rounded-2xl ${styles.tableWrapper}`}>
              <div className={`px-4 py-3 ${styles.tableHeaderBar}`}>
                <h3 className={`font-black ${styles.tableHeaderTitle}`}>Yanıt dökümü</h3>
              </div>

              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className={`sticky top-0 text-xs uppercase ${styles.tableHead}`}>
                    <tr>
                      <th className="px-4 py-3">Soru</th>
                      <th className="px-4 py-3">Seçilen</th>
                      <th className="px-4 py-3">Doğru cevap</th>
                      <th className="px-4 py-3">Sonuç</th>
                      <th className="px-4 py-3">Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answerHistory.map((answer) => (
                      <tr
                        key={answer.questionNumber}
                        className={styles.tableRow}
                      >
                        <td className="px-4 py-3 font-bold">
                          {answer.questionNumber}
                        </td>
                        <td className="px-4 py-3">
                          {answer.selectedLabel}
                        </td>
                        <td className="px-4 py-3">
                          {answer.correctLabel}
                        </td>
                        <td
                          className={[
                            "px-4 py-3 font-black",
                            answer.isCorrect ? styles.resultCorrect : styles.resultWrong,
                          ].join(" ")}
                        >
                          {answer.isCorrect ? "Doğru" : "Yanlış"}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {formatMilliseconds(answer.responseTimeMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={`min-w-20 rounded-xl px-3 py-2 text-center ${styles.statCard}`}>
      <div className={`text-[10px] font-black uppercase tracking-wide ${styles.statLabel}`}>
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-black ${styles.statValue}`}>{value}</div>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={`rounded-2xl p-4 text-center ${styles.resultStatCard}`}>
      <div className={`text-xs font-black uppercase tracking-wide ${styles.resultStatLabel}`}>
        {label}
      </div>
      <div className={`mt-2 text-xl font-black ${styles.resultStatValue}`}>{value}</div>
    </div>
  );
}
