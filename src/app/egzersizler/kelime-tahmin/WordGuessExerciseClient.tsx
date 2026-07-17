"use client";

import { useMemo, useRef, useState } from "react";
import { ExerciseNavigationControls } from "@/components/exercises/ExerciseNavigationControls";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";

const MAX_ATTEMPTS = 6;

const WORDS_BY_LENGTH: Record<number, string[]> = {
  4: ["OKUL", "KAPI", "MASA", "KEDI", "DERS", "YAZI", "KIRA", "SARI", "MAVI", "KART", "OYUN", "KASA"],
  5: [
    "KITAP",
    "KALEM",
    "OKULU",
    "DENIZ",
    "BULUT",
    "CICEK",
    "ARABA",
    "MASAL",
    "SINIF",
    "HAYAL",
    "YAZAR",
    "KURAL",
    "CEVAP",
    "DERSI",
    "OYUNC",
    "RENKI",
    "KUSAK",
    "KAPAK",
    "KURAK",
    "BAHAR",
    "SEHIR",
    "YOLCU",
    "KAVAK",
    "SABAH",
    "KIRAZ",
  ],
  6: ["KALICI", "KITABI", "OKUMAK", "YAZMAK", "BILMEK", "KOSMAK", "DOSTUM", "BAHARI", "GUNLER", "SINIFI", "BILGIN", "CEVABI"],
  7: ["OKUYUCU", "KITAPCI", "BASARIM", "CALISMA", "DERSLER", "KELIMEM", "YAZILAR", "ANLAMAK", "OGRENME", "BILGILI"],
  8: ["OKUMALAR", "KELIMELER", "BASARILI", "CALISMAM", "DERSIMIZ", "YAZILARI", "ANLAMALI", "OGRENMEK", "SORULARI", "CEVAPLAR"],
  9: ["OKUYANLAR", "CALISMALI", "BASARILAR", "KELIMECIK", "DERSLERIM", "ANLAMALAR", "SORULARIM", "CEVAPLAMA", "KITAPLARI", "OKUMAKTAN"],
};

const WORD_LENGTH_OPTIONS = [4, 5, 6, 7, 8, 9];

type GameStatus = "playing" | "won" | "lost";
type LetterState = "correct" | "present" | "absent" | "empty";

function pickWord(length: number) {
  const words = WORDS_BY_LENGTH[length] || WORDS_BY_LENGTH[5];
  return words[Math.floor(Math.random() * words.length)];
}

function normalizeInput(value: string, wordLength: number) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, wordLength);
}

function evaluateGuess(guess: string, answer: string, wordLength: number): LetterState[] {
  const states: LetterState[] = Array(wordLength).fill("absent");
  const answerLetters = answer.split("");
  const used = Array(wordLength).fill(false);

  for (let i = 0; i < wordLength; i++) {
    if (guess[i] === answer[i]) {
      states[i] = "correct";
      used[i] = true;
    }
  }

  for (let i = 0; i < wordLength; i++) {
    if (states[i] === "correct") continue;

    const foundIndex = answerLetters.findIndex((letter, index) => letter === guess[i] && !used[index]);

    if (foundIndex !== -1) {
      states[i] = "present";
      used[foundIndex] = true;
    }
  }

  return states;
}

function cellClass(state: LetterState) {
  if (state === "correct") {
    return "border-emerald-500 bg-emerald-500 text-white";
  }

  if (state === "present") {
    return "border-amber-400 bg-amber-400 text-white";
  }

  if (state === "absent") {
    return "border-slate-400 bg-slate-400 text-white";
  }

  return "border-slate-300 bg-white text-slate-900";
}

function keyClass(state?: LetterState) {
  if (state === "correct") {
    return "bg-emerald-500 text-white border-emerald-500";
  }

  if (state === "present") {
    return "bg-amber-400 text-white border-amber-400";
  }

  if (state === "absent") {
    return "bg-slate-400 text-white border-slate-400";
  }

  return "bg-white text-slate-800 border-slate-200";
}

function getScore(status: GameStatus, attemptsUsed: number) {
  if (status !== "won") return 0;

  if (attemptsUsed === 1) return 100;
  if (attemptsUsed === 2) return 90;
  if (attemptsUsed === 3) return 80;
  if (attemptsUsed === 4) return 70;
  if (attemptsUsed === 5) return 60;

  return 50;
}

export function WordGuessExerciseClient() {
  const [wordLength, setWordLength] = useState(5);
  const [answer, setAnswer] = useState(() => pickWord(5));
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [message, setMessage] = useState("5 harfli kelimeyi tahmin et.");
  const [status, setStatus] = useState<GameStatus>("playing");
  const [keyboardStates, setKeyboardStates] = useState<Record<string, LetterState>>({});
  const hasSavedResultRef = useRef(false);

  const rows = useMemo(() => {
    const result = [...guesses];

    if (status === "playing" && result.length < MAX_ATTEMPTS) {
      result.push(currentGuess);
    }

    while (result.length < MAX_ATTEMPTS) {
      result.push("");
    }

    return result;
  }, [guesses, currentGuess, status]);

  const score = getScore(status, guesses.length);

  function saveResult(finalStatus: GameStatus, attempts: string[], reason: "completed" | "manual") {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    const student = getCurrentStudent();
    const attemptsUsed = attempts.length;
    const finalScore = getScore(finalStatus, attemptsUsed);
    const successRate = finalStatus === "won" ? 100 : 0;
    const wrongCount = finalStatus === "won" ? Math.max(0, attemptsUsed - 1) : attemptsUsed;

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "word-guess",
      exerciseTitle: "Kelime Tahmin",
      durationSeconds: 0,
      correctCount: finalStatus === "won" ? 1 : 0,
      wrongCount,
      score: finalScore,
      successRate,
      details: {
        category: "Kelime Oyunlari",
        status: finalStatus,
        reason,
        wordLength,
        maxAttempts: MAX_ATTEMPTS,
        attemptsUsed,
        guessedWords: attempts,
      },
    });
  }

  function resetGame(nextLength = wordLength) {
    hasSavedResultRef.current = false;
    setWordLength(nextLength);
    setAnswer(pickWord(nextLength));
    setCurrentGuess("");
    setGuesses([]);
    setMessage(`${nextLength} harfli kelimeyi tahmin et.`);
    setStatus("playing");
    setKeyboardStates({});
  }

  function updateKeyboard(guess: string) {
    const states = evaluateGuess(guess, answer, wordLength);

    setKeyboardStates((previous) => {
      const next = { ...previous };

      guess.split("").forEach((letter, index) => {
        const newState = states[index];
        const oldState = next[letter];

        if (oldState === "correct") return;
        if (oldState === "present" && newState === "absent") return;

        next[letter] = newState;
      });

      return next;
    });
  }

  function submitGuess() {
    if (status !== "playing") return;

    const guess = normalizeInput(currentGuess, wordLength);

    if (guess.length !== wordLength) {
      setMessage(`Lutfen ${wordLength} harfli bir kelime yaz.`);
      return;
    }

    if (guesses.includes(guess)) {
      setMessage("Bu kelimeyi zaten denedin.");
      return;
    }

    const nextGuesses = [...guesses, guess];

    setGuesses(nextGuesses);
    updateKeyboard(guess);
    setCurrentGuess("");

    if (guess === answer) {
      setStatus("won");
      setMessage("Tebrikler! Kelimeyi buldun.");
      saveResult("won", nextGuesses, "completed");
      return;
    }

    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setStatus("lost");
      setMessage(`Kaybettin. Dogru kelime: ${answer}`);
      saveResult("lost", nextGuesses, "completed");
      return;
    }

    setMessage("Devam et, yeni tahmin yap.");
  }

  function handleKeyboardClick(letter: string) {
    if (status !== "playing") return;
    if (currentGuess.length >= wordLength) return;

    setCurrentGuess((prev) => normalizeInput(prev + letter, wordLength));
  }

  function deleteLetter() {
    if (status !== "playing") return;
    setCurrentGuess((prev) => prev.slice(0, -1));
  }

  function finishExercise() {
    if (status !== "playing") {
      return;
    }

    const finalGuesses = [...guesses];
    setStatus("lost");
    setMessage(`Egzersiz sonlandirildi. Dogru kelime: ${answer}`);
    saveResult("lost", finalGuesses, "manual");
  }

  const keyboardRows = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex justify-end">
          <ExerciseNavigationControls compact />
        </div>
        <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Kelime Oyunlari</p>
            <h1 className="mt-2 text-3xl font-black">Kelime Tahmin</h1>
            <p className="mt-2 text-sm text-slate-600">Gizli kelimeyi 6 denemede bulmaya calis.</p>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="text-center text-sm font-semibold sm:text-left">{message}</div>

            <div className="flex flex-wrap justify-center gap-2">
              {WORD_LENGTH_OPTIONS.map((length) => (
                <button
                  key={length}
                  type="button"
                  onClick={() => resetGame(length)}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    wordLength === length
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {length} Harf
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row, rowIndex) => {
              const isSubmitted = rowIndex < guesses.length;
              const states = isSubmitted ? evaluateGuess(row, answer, wordLength) : Array(wordLength).fill("empty");

              return (
                <div key={rowIndex} className="flex justify-center gap-1.5 sm:gap-2">
                  {Array.from({ length: wordLength }).map((_, letterIndex) => (
                    <div
                      key={letterIndex}
                      className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg font-black transition sm:h-14 sm:w-14 sm:rounded-xl sm:text-xl md:h-16 md:w-16 md:text-2xl ${cellClass(
                        states[letterIndex]
                      )}`}
                    >
                      {row[letterIndex] || ""}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={currentGuess}
              onChange={(event) => setCurrentGuess(normalizeInput(event.target.value, wordLength))}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitGuess();
              }}
              disabled={status !== "playing"}
              placeholder={`${wordLength} harfli tahmin yaz`}
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 px-4 text-center text-lg font-bold uppercase outline-none focus:border-emerald-400"
            />

            <button
              type="button"
              onClick={submitGuess}
              disabled={status !== "playing"}
              className="min-h-12 rounded-2xl bg-emerald-600 px-6 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Tahmin Et
            </button>

            <button
              type="button"
              onClick={() => resetGame(wordLength)}
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-6 font-bold text-slate-800 transition hover:bg-slate-100"
            >
              Yeni Oyun
            </button>

            <button
              type="button"
              onClick={finishExercise}
              disabled={status !== "playing"}
              className="min-h-12 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Egzersizi Bitir
            </button>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <span className="font-bold">Kategori:</span> Kelime Oyunlari
            </div>
            <div>
              <span className="font-bold">Deneme:</span> {guesses.length}/{MAX_ATTEMPTS}
            </div>
            <div>
              <span className="font-bold">Skor:</span> {score}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {keyboardRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1.5">
                {rowIndex === 2 ? (
                  <button
                    type="button"
                    onClick={deleteLetter}
                    className="rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Sil
                  </button>
                ) : null}

                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleKeyboardClick(letter)}
                    className={`flex h-10 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-bold transition ${keyClass(
                      keyboardStates[letter]
                    )}`}
                  >
                    {letter}
                  </button>
                ))}

                {rowIndex === 2 ? (
                  <button
                    type="button"
                    onClick={submitGuess}
                    disabled={status !== "playing"}
                    className="rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    Gir
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
            <p>
              <strong>Yesil:</strong> Harf dogru yerde.
            </p>
            <p>
              <strong>Sari:</strong> Harf kelimede var ama yeri yanlis.
            </p>
            <p>
              <strong>Gri:</strong> Harf kelimede yok.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
