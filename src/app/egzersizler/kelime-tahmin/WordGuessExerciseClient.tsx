"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/word-guess-theme.module.css";
import { normalizeTurkishText, TURKISH_ALPHABET } from "@/lib/exercises/word-games/turkishAlphabet";
import { WORD_GUESS_WORDS_BY_LENGTH } from "@/lib/exercises/word-games/wordGuessWords";

const MAX_ATTEMPTS = 6;

const WORDS_BY_LENGTH = WORD_GUESS_WORDS_BY_LENGTH;

const WORD_LENGTH_OPTIONS = [4, 5, 6, 7, 8, 9];

type GameStatus = "playing" | "won" | "lost";
type LetterState = "correct" | "present" | "absent" | "empty";

function pickWord(length: number) {
  const words = WORDS_BY_LENGTH[length] || WORDS_BY_LENGTH[5];
  return words[Math.floor(Math.random() * words.length)];
}

function normalizeInput(value: string, wordLength: number) {
  return normalizeTurkishText(value)
    .replace(/[^ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]/gu, "")
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
    return styles.cellCorrect;
  }

  if (state === "present") {
    return styles.cellPresent;
  }

  if (state === "absent") {
    return styles.cellAbsent;
  }

  return styles.cellEmpty;
}

function keyClass(state?: LetterState) {
  if (state === "correct") {
    return styles.keyCorrect;
  }

  if (state === "present") {
    return styles.keyPresent;
  }

  if (state === "absent") {
    return styles.keyAbsent;
  }

  return styles.keyDefault;
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
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [
    styles.themeRoot,
    isLight ? styles.lightTheme : styles.darkTheme,
  ].join(" ");
  const [wordLength, setWordLength] = useState(5);
  const [answer, setAnswer] = useState(() => normalizeTurkishText(pickWord(5)));
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [message, setMessage] = useState("5 harfli kelimeyi tahmin et.");
  const [status, setStatus] = useState<GameStatus>("playing");
  const [keyboardStates, setKeyboardStates] = useState<Record<string, LetterState>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
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
    const attemptsUsed = attempts.length;
    const finalScore = getScore(finalStatus, attemptsUsed);
    const successRate = finalStatus === "won" ? 100 : 0;
    const wrongCount = finalStatus === "won" ? Math.max(0, attemptsUsed - 1) : attemptsUsed;

    const payload = {
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
        // Sunucu tarafi details semasi yalniz skaler deger kabul eder;
        // tahmin listesi ayni anahtar altinda virgulle birlestirilir.
        guessedWords: attempts.join(","),
      },
    } satisfies SecureExerciseResultInput;

    void persistResult(payload);
  }

  async function persistResult(payload: SecureExerciseResultInput) {
    setSaveStatus("saving");
    setSaveMessage("Sonuç kaydediliyor...");
    try {
      const saved = await saveExerciseResultSecure(payload);
      setSaveStatus("success");
      setSaveMessage(saved.assignmentCompletionStatus === "failed"
        ? "Sonuç kaydedildi ancak görev tamamlanamadı."
        : "Sonuç başarıyla kaydedildi.");
    } catch {
      setSaveStatus("error");
      setSaveMessage("Sonuç kaydedilemedi. Lütfen tekrar deneyin.");
    }
  }

  function resetGame(nextLength = wordLength) {
    hasSavedResultRef.current = false;
    setWordLength(nextLength);
    setAnswer(normalizeTurkishText(pickWord(nextLength)));
    setCurrentGuess("");
    setGuesses([]);
    setMessage(`${nextLength} harfli kelimeyi tahmin et.`);
    setStatus("playing");
    setKeyboardStates({});
    setSaveStatus("idle");
    setSaveMessage("");
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

  const keyboardRows = [
    TURKISH_ALPHABET.slice(0, 10),
    TURKISH_ALPHABET.slice(10, 20),
    TURKISH_ALPHABET.slice(20),
  ];

  return (
    <div className={themeRootClassName}>
      <FixedExerciseStage
        title="Kelime Tahmin"
        subtitle={message}
        topStats={<><FixedExerciseStat label="Deneme" value={`${guesses.length}/${MAX_ATTEMPTS}`} /><FixedExerciseStat label="Skor" value={score} tone="brand" /></>}
        bottomSettings={<label className="grid gap-1 text-sm font-bold"><span>Kelime uzunluğu</span><select value={wordLength} onChange={(event) => resetGame(Number(event.target.value))} className={`min-h-11 rounded-xl px-3 ${styles.select}`}>{WORD_LENGTH_OPTIONS.map((length) => <option key={length} value={length}>{length} harf</option>)}</select></label>}
        controls={<div className="mx-auto grid w-full max-w-4xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><input value={currentGuess} onChange={(event) => setCurrentGuess(normalizeInput(event.target.value, wordLength))} onKeyDown={(event) => { if (event.key === "Enter") submitGuess(); }} disabled={status !== "playing"} placeholder={`${wordLength} harfli tahmin yaz`} className={`min-h-11 rounded-xl px-3 text-center font-bold uppercase ${styles.textInput}`} /><button type="button" onClick={submitGuess} disabled={status !== "playing"} className={`min-h-11 rounded-xl px-4 font-bold ${styles.primaryButton}`}>Tahmin Et</button><button type="button" onClick={() => resetGame(wordLength)} className={`min-h-11 rounded-xl px-4 font-bold ${styles.secondaryButton}`}>Yeni Oyun</button><button type="button" onClick={finishExercise} disabled={status !== "playing"} className={`min-h-11 rounded-xl px-4 font-bold ${styles.finishButton}`}>Bitir</button></div>}
        onExit={() => router.push("/egzersizler")}
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-y-auto px-1 py-1 md:gap-2">
          {saveStatus !== "idle" ? (
            <p
              role={saveStatus === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`w-full max-w-3xl rounded-xl px-3 py-1.5 text-center text-sm font-semibold ${styles.infoBar} ${saveStatus === "error" ? "text-rose-500" : ""}`}
            >
              {saveMessage}
            </p>
          ) : null}
          {/* Oyun tahtasi - viewport'a sığacak şekilde */}
          <section className={`flex max-h-full w-full max-w-3xl flex-col items-center gap-1 overflow-y-auto rounded-2xl px-2 py-2 md:gap-1.5 md:rounded-3xl md:px-4 md:py-2 ${styles.card}`}>
          {/* Tahmin kutulari */}
          <div className={styles.guessGrid}>
            {rows.map((row, rowIndex) => {
              const isSubmitted = rowIndex < guesses.length;
              const states = isSubmitted ? evaluateGuess(row, answer, wordLength) : Array(wordLength).fill("empty");

              return (
                <div key={rowIndex} className={styles.guessRow}>
                  {Array.from({ length: wordLength }).map((_, letterIndex) => (
                    <div
                      key={letterIndex}
                      className={`${styles.guessCell} flex aspect-square items-center justify-center rounded-lg border-2 text-sm font-black transition sm:text-base md:text-lg lg:text-xl ${cellClass(
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
          <div className={styles.keyboard}>
            {keyboardRows.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.keyboardRow}>
                {rowIndex === 2 ? (
                  <button
                    type="button"
                    onClick={deleteLetter}
                    className={`flex min-h-9 items-center justify-center rounded-lg px-1.5 text-[9px] font-bold transition md:min-h-10 md:px-2.5 md:text-xs ${styles.keyActionButton}`}
                  >
                    Sil
                  </button>
                ) : null}

                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleKeyboardClick(letter)}
                    className={`flex min-h-9 min-w-0 items-center justify-center rounded-lg border text-[9px] font-bold transition md:min-h-10 md:text-xs lg:text-sm ${keyClass(
                      keyboardStates[letter]
                    )}`}
                  >
                    {letter}
                  </button>
                ))}

              </div>
            ))}
            <button
              type="button"
              onClick={submitGuess}
              disabled={status !== "playing"}
              className={`min-h-9 w-full max-w-28 rounded-lg px-3 text-[10px] font-bold transition md:min-h-10 md:text-xs ${styles.keySubmitButton}`}
            >
              Gir
            </button>
          </div>

          {/* Bilgi satiri */}
          <div className={`flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1 text-[9px] md:gap-3 md:px-3 md:py-1.5 md:text-xs ${styles.infoBar}`}>
            <span><strong>Deneme:</strong> {guesses.length}/{MAX_ATTEMPTS}</span>
            <span><strong>Skor:</strong> {score}</span>
            <span className="hidden sm:inline"><strong>Kategori:</strong> Kelime Oyunlari</span>
          </div>

          {/* Aciklama - sadece genis ekranda */}
          <div className={`hidden rounded-xl px-3 py-1 text-[10px] lg:block ${styles.legendBar}`}>
            <strong>Yeşil:</strong> Doğru yer &nbsp;·&nbsp; <strong>Sarı:</strong> Var, yanlış yer &nbsp;·&nbsp; <strong>Gri:</strong> Yok
          </div>
          </section>
        </div>
      </FixedExerciseStage>
    </div>
  );
}
