"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GameStatus = "idle" | "running" | "finished";
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

  const questionStartedAtRef = useRef(0);
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

  const finishExercise = useCallback(() => {
    answerLockedRef.current = true;
    setIsAnswerLocked(true);
    setStatus("finished");
    setFeedback(null);
  }, []);

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
        nextQuestionTimerRef.current = window.setTimeout(() => {
          finishExercise();
        }, FEEDBACK_DURATION_MS);
        return;
      }

      nextQuestionTimerRef.current = window.setTimeout(() => {
        beginQuestion(questionIndex + 1);
      }, FEEDBACK_DURATION_MS);
    },
    [beginQuestion, finishExercise, question, questionIndex, status],
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
    setQuestion(createQuestion(choiceCount));
    setQuestionIndex(0);
    answerLockedRef.current = false;
    setIsAnswerLocked(false);

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
    setStatus("idle");
    answerLockedRef.current = false;
    setIsAnswerLocked(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 px-3 py-4 text-slate-900 sm:px-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Renk Uyumu
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
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

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-7">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
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
                    "rounded-xl border px-4 py-2 text-sm font-black transition",
                    selectedLevel === level
                      ? "border-violet-600 bg-violet-600 text-white shadow"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50",
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
            <div className="mx-auto max-w-xl rounded-3xl border border-violet-200 bg-violet-50 p-8">
              <div className="text-6xl">🎨</div>
              <h2 className="mt-4 text-2xl font-black text-violet-900">
                Başlamaya hazır
              </h2>
              <p className="mt-3 text-sm leading-6 text-violet-700">
                Her soruda kelime farklı bir renkle yazılacak. Doğru cevap,
                kelimenin anlamı değil yazının rengidir.
              </p>
              <button
                type="button"
                onClick={startExercise}
                className="mt-6 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.98]"
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
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
                  style={{
                    width: `${Math.min(100, progressPercent)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="text-center text-sm font-bold text-slate-500">
                Bu kelimenin rengi ne?
              </p>

              <div
                className="my-8 text-center text-5xl font-black tracking-wide sm:text-7xl"
                style={{ color: question.inkColor.value }}
              >
                {question.word.label}
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
                    className="group rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-black shadow-sm transition hover:border-violet-400 hover:bg-violet-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700">
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
                      "rounded-2xl border px-4 py-3 text-center",
                      feedback === "correct"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
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

              <p className="mt-3 text-center text-xs text-slate-400">
                Klavye desteği: 1–{choiceCount} tuşlarını kullanabilirsin.
              </p>
            </div>
          </div>
        )}

        {status === "finished" && (
          <div className="px-5 py-7 sm:px-7">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
              <div className="text-5xl">🏆</div>
              <h2 className="mt-3 text-2xl font-black text-emerald-900">
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
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow transition hover:bg-emerald-700"
                >
                  Yeniden Başlat
                </button>
                <button
                  type="button"
                  onClick={resetExercise}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Ayarlara Dön
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="font-black text-slate-800">Yanıt dökümü</h3>
              </div>

              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="sticky top-0 bg-white text-xs uppercase text-slate-500">
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
                        className="border-t border-slate-100"
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
                            answer.isCorrect
                              ? "text-emerald-600"
                              : "text-rose-600",
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
    <div className="min-w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black text-slate-900">{value}</div>
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
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-emerald-700">{value}</div>
    </div>
  );
}
