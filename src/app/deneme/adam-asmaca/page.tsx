"use client";

import { useMemo, useState } from "react";

const WORDS = ["KODLAMA", "BILGISAYAR", "OKUL", "KALEM", "KITAP", "OYUN", "DERS", "SINIF"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_WRONG_GUESSES = 6;

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export default function HangmanTrialPage() {
  const [word, setWord] = useState(() => pickWord());
  const [guesses, setGuesses] = useState<string[]>([]);

  const wrongGuesses = useMemo(() => guesses.filter((letter) => !word.includes(letter)), [guesses, word]);
  const remaining = MAX_WRONG_GUESSES - wrongGuesses.length;
  const revealedWord = word
    .split("")
    .map((letter) => (guesses.includes(letter) ? letter : "_"))
    .join(" ");
  const isWon = word.split("").every((letter) => guesses.includes(letter));
  const isLost = remaining <= 0;
  const isFinished = isWon || isLost;

  const guessLetter = (letter: string) => {
    if (isFinished || guesses.includes(letter)) {
      return;
    }

    setGuesses((current) => [...current, letter]);
  };

  const startNewGame = () => {
    setWord(pickWord());
    setGuesses([]);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Deneme Oyunu</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Adam Asmaca</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Harf sec, kelimeyi bul, 6 yanlis hakki bitmeden oyunu kazan.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewGame}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Yeni Oyun
          </button>
        </div>

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

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Kalan Hak</p>
                <p className="mt-1 text-2xl">{remaining}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Yanlis</p>
                <p className="mt-1 text-2xl">{wrongGuesses.length}</p>
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
                    className="min-h-[42px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
