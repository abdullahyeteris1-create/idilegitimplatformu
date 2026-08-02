"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { saveExerciseResultSecure, type SecureExerciseResultInput } from "@/lib/results/secureResultStorage";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import styles from "@/components/exercises/hangman-theme.module.css";
import { HANGMAN_WORDS } from "@/lib/exercises/word-games/hangmanWords";
import { normalizeTurkishText, TURKISH_ALPHABET } from "@/lib/exercises/word-games/turkishAlphabet";

const LETTERS = [...TURKISH_ALPHABET];
const DEFAULT_MAX_WRONG_GUESSES = 6;
const WRONG_GUESS_OPTIONS = [6, 10] as const;
type MaxWrongGuesses = (typeof WRONG_GUESS_OPTIONS)[number];

function pickWord(): string {
  return HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
}

export function HangmanExerciseClient() {
  const router = useRouter();
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [
    styles.themeRoot,
    isLight ? styles.lightTheme : styles.darkTheme,
  ].join(" ");
  const [word, setWord] = useState(() => pickWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [maxWrongGuesses, setMaxWrongGuesses] = useState<MaxWrongGuesses>(DEFAULT_MAX_WRONG_GUESSES);
  const [hasStarted, setHasStarted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const hasSavedResultRef = useRef(false);

  const wrongGuesses = useMemo(() => guesses.filter((letter) => !word.includes(letter)), [guesses, word]);
  const remaining = maxWrongGuesses - wrongGuesses.length;
  const revealedWord = word
    .split("")
    .map((letter) => (guesses.includes(letter) ? letter : "_"))
    .join(" ");
  const isWon = word.split("").every((letter) => guesses.includes(letter));
  const isLost = remaining <= 0;
  const isFinished = isWon || isLost;

  function saveResult(reason: "completed" | "manual", snapshotGuesses: string[] = guesses) {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    const uniqueCorrectLetters = new Set(word.split(""));
    let correctCount = 0;

    uniqueCorrectLetters.forEach((letter) => {
      if (snapshotGuesses.includes(letter)) {
        correctCount += 1;
      }
    });

    const wrongCount = snapshotGuesses.filter((letter) => !word.includes(letter)).length;
    const won = word.split("").every((letter) => snapshotGuesses.includes(letter));
    const successRate = won ? 100 : Math.round((correctCount / uniqueCorrectLetters.size) * 100);
    const score = won ? Math.max(50, 120 - wrongCount * 10) : Math.max(0, correctCount * 8 - wrongCount * 6);

    const payload = {
      exerciseType: "hangman",
      exerciseTitle: "Adam Asmaca",
      durationSeconds: 0,
      correctCount,
      wrongCount,
      score,
      successRate,
      details: {
        category: "Kelime Oyunlari",
        reason,
        status: won ? "won" : "lost",
        maxWrongGuesses,
        remaining: maxWrongGuesses - wrongCount,
        // Sunucu tarafi details semasi yalniz skaler deger kabul eder;
        // harf listesi ayni anahtar altinda birlestirilmis metin olarak saklanir.
        guessedLetters: snapshotGuesses.join(""),
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

  const guessLetter = (letter: string) => {
    const normalizedLetter = normalizeTurkishText(letter);

    if (isFinished || guesses.includes(normalizedLetter)) {
      return;
    }

    setHasStarted(true);

    setGuesses((current) => {
      const next = [...current, normalizedLetter];
      const nextWrong = next.filter((item) => !word.includes(item));
      const nextWon = word.split("").every((char) => next.includes(char));
      const nextLost = nextWrong.length >= maxWrongGuesses;

      if (nextWon || nextLost) {
        window.setTimeout(() => {
          saveResult("completed", next);
        }, 0);
      }

      return next;
    });
  };

  const startNewGame = () => {
    hasSavedResultRef.current = false;
    setWord(pickWord());
    setGuesses([]);
    setHasStarted(false);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  const finishExercise = () => {
    if (isFinished) {
      return;
    }

    setGuesses((current) => {
      const next = [...current];

      LETTERS.forEach((letter) => {
        if (!next.includes(letter) && !word.includes(letter)) {
          next.push(letter);
        }
      });

      const completed = next.slice(0, maxWrongGuesses + word.length + 6);
      saveResult("manual", completed);
      return completed;
    });
  };

  const drawingStage = Math.min(wrongGuesses.length, maxWrongGuesses);
  const showStructure = drawingStage >= 1;
  const showBeam = maxWrongGuesses === 6 ? showStructure : drawingStage >= 2;
  const showRope = maxWrongGuesses === 6 ? drawingStage >= 2 : drawingStage >= 3;
  const showHead = maxWrongGuesses === 6 ? drawingStage >= 3 : drawingStage >= 4;
  const showBody = maxWrongGuesses === 6 ? drawingStage >= 4 : drawingStage >= 5;
  const showLeftArm = maxWrongGuesses === 6 ? drawingStage >= 5 : drawingStage >= 6;
  const showRightArm = maxWrongGuesses === 6 ? drawingStage >= 5 : drawingStage >= 7;
  const showLeftLeg = maxWrongGuesses === 6 ? drawingStage >= 6 : drawingStage >= 8;
  const showRightLeg = maxWrongGuesses === 6 ? drawingStage >= 6 : drawingStage >= 9;
  const showFace = maxWrongGuesses === 6 ? showHead : drawingStage >= 10;

  return (
    <div className={themeRootClassName}>
      <FixedExerciseStage
        title="Adam Asmaca"
        subtitle={`Kelimeyi ${maxWrongGuesses} yanlış hakkı bitmeden bul`}
        topStats={<><FixedExerciseStat label="Kalan Hak" value={remaining} /><FixedExerciseStat label="Yanlış" value={wrongGuesses.length} tone="bad" /></>}
        bottomSettings={<fieldset className={`grid gap-2 text-sm ${styles.settings}`}>
          <legend className={`font-bold ${styles.settingsLegend}`}>Tahmin Hakkı</legend>
          <div className="flex flex-wrap gap-2">
            {WRONG_GUESS_OPTIONS.map((option) => (
              <label key={option} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 font-semibold ${styles.option}`}>
                <input
                  type="radio"
                  name="hangman-max-wrong-guesses"
                  value={option}
                  checked={maxWrongGuesses === option}
                  disabled={hasStarted}
                  onChange={() => setMaxWrongGuesses(option)}
                />
                {option} Yanlış Hakkı
              </label>
            ))}
          </div>
          {hasStarted ? <p className={`text-xs ${styles.settingsHint}`}>Oyun başladıktan sonra tahmin hakkı değiştirilemez.</p> : null}
        </fieldset>}
        controls={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={finishExercise} disabled={isFinished} className={`min-h-11 rounded-xl px-4 font-semibold disabled:opacity-60 ${styles.secondaryButton}`}>Egzersizi Bitir</button><button type="button" onClick={startNewGame} className={`min-h-11 rounded-xl px-4 font-semibold ${styles.primaryButton}`}>Yeni Oyun</button></div>}
        onExit={() => router.push("/egzersizler")}
      >
        <section className={`max-h-full w-full max-w-3xl overflow-auto rounded-3xl p-3 shadow-sm md:p-5 ${styles.card}`}>
          <div className="mt-2 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-4">
            <div className={`rounded-2xl p-3 ${styles.panel}`}>
              <div className={`mx-auto flex aspect-[4/5] w-full max-w-44 items-center justify-center rounded-2xl p-2 ${styles.panelInner}`}>
                <svg viewBox="0 0 240 260" role="img" aria-label="Adam Asmaca çizimi" className={styles.hangmanSvg}>
                  {showStructure ? <g className={styles.gallowsStructure}>
                    <path d="M40 230 H200" />
                    <path d="M72 230 V42" />
                  </g> : null}
                  {showBeam ? <path d="M72 42 H164" className={styles.gallowsStructure} /> : null}
                  {showRope ? <path d="M164 42 V68" className={styles.gallowsStructure} /> : null}
                  {showHead ? <circle cx="164" cy="96" r="28" className={styles.gallowsPerson} /> : null}
                  {showBody ? <path d="M164 124 V184" className={styles.gallowsPerson} /> : null}
                  {showLeftArm ? <path d="M164 142 L124 164" className={styles.gallowsPerson} /> : null}
                  {showRightArm ? <path d="M164 142 L204 164" className={styles.gallowsPerson} /> : null}
                  {showLeftLeg ? <path d="M164 184 L132 224" className={styles.gallowsPerson} /> : null}
                  {showRightLeg ? <path d="M164 184 L196 224" className={styles.gallowsPerson} /> : null}
                  {showFace ? <g className={isLost && maxWrongGuesses === 10 ? styles.sadFace : styles.happyFace}>
                    <circle cx="154" cy="92" r="3" />
                    <circle cx="174" cy="92" r="3" />
                    <path d={isLost && maxWrongGuesses === 10 ? "M153 110 Q164 101 175 110" : "M153 104 Q164 114 175 104"} />
                  </g> : null}
                </svg>
              </div>

            </div>

            <div className={`rounded-2xl p-4 ${styles.panel}`}>
              <div className={`rounded-2xl px-4 py-6 text-center ${styles.wordDisplay}`}>
                <p className={`font-mono text-3xl font-bold tracking-[0.25em] sm:text-4xl ${styles.wordText}`}>{revealedWord}</p>
              </div>

              <div className="mt-4 min-h-[36px]">
                {isWon ? <p className={`rounded-xl px-4 py-2 text-sm font-semibold ${styles.feedbackWon}`}>Kazandin!</p> : null}
                {isLost ? <p className={`rounded-xl px-4 py-2 text-sm font-semibold ${styles.feedbackLost}`}>Kaybettin! Kelime: {word}</p> : null}
                {!isFinished ? <p className={`text-sm ${styles.helperText}`}>Bir harf secerek tahmin yap.</p> : null}
              </div>

              {saveStatus !== "idle" ? (
                <p
                  role={saveStatus === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={`mt-2 text-sm font-semibold ${saveStatus === "error" ? styles.feedbackLost : styles.helperText}`}
                >
                  {saveMessage}
                </p>
              ) : null}

              <div className="mt-4">
                <p className={`text-sm font-semibold ${styles.usedLettersLabel}`}>Kullanilan Harfler</p>
                <p className={`mt-2 min-h-[28px] rounded-xl px-3 py-2 text-sm ${styles.usedLettersBox}`}>
                  {guesses.length > 0 ? guesses.join(", ") : "Henuz harf secilmedi."}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 sm:grid-cols-9">
                {LETTERS.map((letter) => {
                  const isUsed = guesses.includes(letter);

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => guessLetter(letter)}
                      disabled={isUsed || isFinished}
                      className={`min-h-[42px] rounded-xl text-sm font-bold transition ${styles.letterButton}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </FixedExerciseStage>
    </div>
  );
}
