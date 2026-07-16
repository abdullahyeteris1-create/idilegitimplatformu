"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
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
  const router = useRouter();
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
    <FixedExerciseStage
      title="Kelime Tahmin"
      subtitle={message}
      topStats={<><FixedExerciseStat label="Deneme" value={`${guesses.length}/${MAX_ATTEMPTS}`} /><FixedExerciseStat label="Skor" value={score} tone="brand" /></>}
      bottomSettings={<label className="grid gap-1 text-sm font-bold"><span>Kelime uzunluğu</span><select value={wordLength} onChange={(event) => resetGame(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">{WORD_LENGTH_OPTIONS.map((length) => <option key={length} value={length}>{length} harf</option>)}</select></label>}
      controls={<div className="mx-auto grid w-full max-w-4xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><input value={currentGuess} onChange={(event) => setCurrentGuess(normalizeInput(event.target.value, wordLength))} onKeyDown={(event) => { if (event.key === "Enter") submitGuess(); }} disabled={status !== "playing"} placeholder={`${wordLength} harfli tahmin yaz`} className="min-h-11 rounded-xl border border-slate-300 px-3 text-center font-bold uppercase" /><button type="button" onClick={submitGuess} disabled={status !== "playing"} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-50">Tahmin Et</button><button type="button" onClick={() => resetGame(wordLength)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-bold">Yeni Oyun</button><button type="button" onClick={finishExercise} disabled={status !== "playing"} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-bold text-emerald-800 disabled:opacity-50">Bitir</button></div>}
      onExit={() => router.push("/egzersizler")}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-1 py-1 md:gap-2">
        {/* Oyun tahtasi - viewport'a sığacak şekilde */}
        <section className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-white px-2 py-2 shadow-sm md:rounded-3xl md:px-4 md:py-3">
          {/* Tahmin kutulari */}
          <div className="flex flex-col items-center gap-1 md:gap-1.5">
            {rows.map((row, rowIndex) => {
              const isSubmitted = rowIndex < guesses.length;
              const states = isSubmitted ? evaluateGuess(row, answer, wordLength) : Array(wordLength).fill("empty");

              return (
                <div key={rowIndex} className="flex justify-center gap-1 md:gap-1.5">
                  {Array.from({ length: wordLength }).map((_, letterIndex) => (
                    <div
                      key={letterIndex}
                      className={`flex aspect-square w-[8.5vw] max-w-[48px] items-center justify-center rounded-lg border-2 text-sm font-black transition sm:w-[9vw] sm:max-w-[54px] sm:text-base md:w-[10vw] md:max-w-[60px] md:text-lg lg:w-[11vw] lg:max-w-[66px] lg:text-xl ${cellClass(
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

          {/* Klavye */}
          <div className="mt-1 flex flex-col items-center gap-1 md:mt-2 md:gap-1.5">
            {keyboardRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-[2px] md:gap-1">
                {rowIndex === 2 ? (
                  <button
                    type="button"
                    onClick={deleteLetter}
                    className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-[9px] font-bold text-slate-700 hover:bg-slate-100 md:px-2.5 md:text-xs"
                  >
                    Sil
                  </button>
                ) : null}

                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleKeyboardClick(letter)}
                    className={`flex aspect-square w-[6.5vw] max-w-[32px] items-center justify-center rounded-lg border text-[9px] font-bold transition md:w-[7.5vw] md:max-w-[38px] md:text-xs lg:w-[8vw] lg:max-w-[42px] lg:text-sm ${keyClass(
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
                    className="flex items-center justify-center rounded-lg bg-emerald-600 px-1.5 text-[9px] font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300 md:px-2.5 md:text-xs"
                  >
                    Gir
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Bilgi satiri */}
          <div className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-2 py-1 text-[9px] text-slate-600 md:mt-2 md:gap-3 md:px-3 md:py-1.5 md:text-xs">
            <span><strong>Deneme:</strong> {guesses.length}/{MAX_ATTEMPTS}</span>
            <span><strong>Skor:</strong> {score}</span>
            <span className="hidden sm:inline"><strong>Kategori:</strong> Kelime Oyunlari</span>
          </div>

          {/* Aciklama - sadece genis ekranda */}
          <div className="mt-1 hidden rounded-xl bg-slate-100 px-3 py-1 text-[10px] text-slate-600 lg:block">
            <strong>Yeşil:</strong> Doğru yer &nbsp;·&nbsp; <strong>Sarı:</strong> Var, yanlış yer &nbsp;·&nbsp; <strong>Gri:</strong> Yok
          </div>
        </section>
      </div>
    </FixedExerciseStage>
  );
}
