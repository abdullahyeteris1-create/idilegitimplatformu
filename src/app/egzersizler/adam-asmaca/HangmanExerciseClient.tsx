"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";

const WORDS = ["KODLAMA", "BILGISAYAR", "OKUL", "KALEM", "KITAP", "OYUN", "DERS", "SINIF"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_WRONG_GUESSES = 6;

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function HangmanExerciseClient() {
  const router = useRouter();
  const [word, setWord] = useState(() => pickWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const hasSavedResultRef = useRef(false);

  const wrongGuesses = useMemo(() => guesses.filter((letter) => !word.includes(letter)), [guesses, word]);
  const remaining = MAX_WRONG_GUESSES - wrongGuesses.length;
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
    const student = getCurrentStudent();
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

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
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
        maxWrongGuesses: MAX_WRONG_GUESSES,
        remaining: MAX_WRONG_GUESSES - wrongCount,
        guessedLetters: snapshotGuesses,
      },
    });
  }

  const guessLetter = (letter: string) => {
    if (isFinished || guesses.includes(letter)) {
      return;
    }

    setGuesses((current) => {
      const next = [...current, letter];
      const nextWrong = next.filter((item) => !word.includes(item));
      const nextWon = word.split("").every((char) => next.includes(char));
      const nextLost = nextWrong.length >= MAX_WRONG_GUESSES;

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

      const completed = next.slice(0, MAX_WRONG_GUESSES + word.length + 6);
      saveResult("manual", completed);
      return completed;
    });
  };

  return (
    <FixedExerciseStage
      title="Adam Asmaca"
      subtitle="Kelimeyi altı yanlış hakkı bitmeden bul"
      topStats={<><FixedExerciseStat label="Kalan Hak" value={remaining} /><FixedExerciseStat label="Yanlış" value={wrongGuesses.length} tone="bad" /></>}
      controls={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={finishExercise} disabled={isFinished} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-semibold text-emerald-800 disabled:opacity-60">Egzersizi Bitir</button><button type="button" onClick={startNewGame} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-semibold text-white">Yeni Oyun</button></div>}
      onExit={() => router.push("/egzersizler")}
    >
      <section className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-lime-200 bg-white p-3 shadow-sm md:p-5">
        <div className="mt-6 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mx-auto flex h-48 w-40 items-end justify-center rounded-2xl border border-slate-200 bg-white p-4">
              <div className="relative h-40 w-28">
                <div className="absolute bottom-0 left-2 h-1 w-24 rounded bg-slate-800" />
                <div className="absolute bottom-0 left-6 h-36 w-1 rounded bg-slate-800" />
                <div className="absolute left-6 top-0 h-1 w-20 rounded bg-slate-800" />
                <div className="absolute right-5 top-0 h-8 w-1 rounded bg-slate-800" />
                {wrongGuesses.length > 0 ? <div className="absolute right-1 top-8 h-10 w-10 rounded-full border-4 border-slate-800" /> : null}
                {wrongGuesses.length > 1 ? <div className="absolute right-5 top-[70px] h-12 w-1 rounded bg-slate-800" /> : null}
                {wrongGuesses.length > 2 ? <div className="absolute right-5 top-[78px] h-1 w-9 rotate-[-35deg] rounded bg-slate-800" /> : null}
                {wrongGuesses.length > 3 ? <div className="absolute right-1 top-[78px] h-1 w-9 rotate-[35deg] rounded bg-slate-800" /> : null}
                {wrongGuesses.length > 4 ? <div className="absolute right-5 top-[116px] h-1 w-9 rotate-[-45deg] rounded bg-slate-800" /> : null}
                {wrongGuesses.length > 5 ? <div className="absolute right-1 top-[116px] h-1 w-9 rotate-[45deg] rounded bg-slate-800" /> : null}
              </div>
            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="rounded-2xl bg-slate-100 px-4 py-6 text-center">
              <p className="font-mono text-3xl font-bold tracking-[0.25em] text-slate-950 sm:text-4xl">{revealedWord}</p>
            </div>

            <div className="mt-4 min-h-[36px]">
              {isWon ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Kazandin!</p> : null}
              {isLost ? <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Kaybettin! Kelime: {word}</p> : null}
              {!isFinished ? <p className="text-sm text-slate-600">Bir harf secerek tahmin yap.</p> : null}
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Kullanilan Harfler</p>
              <p className="mt-2 min-h-[28px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
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
                    className="min-h-[42px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
  );
}
