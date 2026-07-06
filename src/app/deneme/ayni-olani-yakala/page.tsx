"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GameMode = "word" | "letter" | "symbol" | "number";
type GameStatus = "ready" | "running" | "paused" | "finished";
type SpeedOption = 1500 | 1000 | 750 | 500;
type DurationOption = 30 | 60 | 90;

const WORDS = [
  "KITAP",
  "KALEM",
  "OKUL",
  "MASA",
  "ARABA",
  "DENIZ",
  "BULUT",
  "CICEK",
  "SINIF",
  "HAYAL",
  "KURAL",
  "CEVAP",
  "DERS",
  "OYUN",
  "KEDI",
  "KAPI",
];

const LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "R",
  "S",
  "T",
  "U",
  "V",
  "Y",
  "Z",
];

const SYMBOLS = [
  "★",
  "☆",
  "●",
  "○",
  "■",
  "□",
  "▲",
  "△",
  "◆",
  "◇",
  "♥",
  "♣",
  "♠",
];

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const SPEED_OPTIONS: SpeedOption[] = [1500, 1000, 750, 500];
const DURATION_OPTIONS: DurationOption[] = [30, 60, 90];

function getRandomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getPoolByMode(mode: GameMode) {
  if (mode === "word") return WORDS;
  if (mode === "letter") return LETTERS;
  if (mode === "symbol") return SYMBOLS;
  return NUMBERS;
}

function getModeLabel(mode: GameMode) {
  if (mode === "word") return "Kelime";
  if (mode === "letter") return "Harf";
  if (mode === "symbol") return "Sembol";
  return "Rakam";
}

function formatSpeed(speed: SpeedOption) {
  if (speed === 1500) return "1.5 sn";
  if (speed === 1000) return "1 sn";
  if (speed === 750) return "0.75 sn";
  return "0.5 sn";
}

export default function AyniOlaniYakalaPage() {
  const [mode, setMode] = useState<GameMode>("word");
  const [speed, setSpeed] = useState<SpeedOption>(1000);
  const [selectedDuration, setSelectedDuration] =
    useState<DurationOption>(60);

  const [status, setStatus] = useState<GameStatus>("ready");
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [currentItem, setCurrentItem] = useState("Hazır");
  const [previousItem, setPreviousItem] = useState<string | null>(null);

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [missed, setMissed] = useState(0);
  const [roundCount, setRoundCount] = useState(0);

  const [feedback, setFeedback] = useState(
    "Başlat butonuna bas ve ekrandaki öğeleri takip et."
  );

  const [itemVersion, setItemVersion] = useState(0);
  const [isChanging, setIsChanging] = useState(false);

  const clickedThisRoundRef = useRef(false);
  const previousItemRef = useRef<string | null>(null);
  const currentItemRef = useRef<string>("Hazır");
  const statusRef = useRef<GameStatus>("ready");

  const itemIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const score = useMemo(() => {
    return correct * 10 - wrong * 5 - missed * 3;
  }, [correct, wrong, missed]);

  const totalActions = correct + wrong + missed;

  const successRate = useMemo(() => {
    if (totalActions === 0) return 0;
    return Math.round((correct / totalActions) * 100);
  }, [correct, totalActions]);

  function clearIntervals() {
    if (itemIntervalRef.current) {
      clearInterval(itemIntervalRef.current);
      itemIntervalRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }

  function makeNextItem() {
    const oldPrevious = previousItemRef.current;
    const oldCurrent = currentItemRef.current;

    if (
      statusRef.current === "running" &&
      oldPrevious !== null &&
      oldCurrent === oldPrevious &&
      !clickedThisRoundRef.current
    ) {
      setMissed((value) => value + 1);
      setFeedback("Tekrarı kaçırdın.");
    }

    const pool = getPoolByMode(mode);
    let nextItem = getRandomItem(pool);

    const shouldRepeat = Math.random() < 0.28;

    if (shouldRepeat && oldCurrent && oldCurrent !== "Hazır") {
      nextItem = oldCurrent;
    } else {
      let safety = 0;

      while (nextItem === oldCurrent && pool.length > 1 && safety < 10) {
        nextItem = getRandomItem(pool);
        safety += 1;
      }
    }

    setIsChanging(true);

    transitionTimeoutRef.current = setTimeout(() => {
      if (statusRef.current !== "running") return;

      previousItemRef.current = oldCurrent === "Hazır" ? null : oldCurrent;
      currentItemRef.current = nextItem;
      clickedThisRoundRef.current = false;

      setPreviousItem(previousItemRef.current);
      setCurrentItem(nextItem);
      setRoundCount((value) => value + 1);
      setItemVersion((value) => value + 1);
      setIsChanging(false);
    }, 140);
  }

  function startIntervals() {
    clearIntervals();

    itemIntervalRef.current = setInterval(() => {
      makeNextItem();
    }, speed);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearIntervals();
          statusRef.current = "finished";
          setStatus("finished");
          setIsChanging(false);
          setFeedback("Süre bitti. Sonuçlarını inceleyebilirsin.");
          return 0;
        }

        return value - 1;
      });
    }, 1000);
  }

  function resetGame(nextStatus: GameStatus = "ready") {
    clearIntervals();

    statusRef.current = nextStatus;
    setStatus(nextStatus);

    setTimeLeft(selectedDuration);
    setCurrentItem("Hazır");
    setPreviousItem(null);
    setCorrect(0);
    setWrong(0);
    setMissed(0);
    setRoundCount(0);
    setFeedback("Başlat butonuna bas ve ekrandaki öğeleri takip et.");
    setItemVersion(0);
    setIsChanging(false);

    clickedThisRoundRef.current = false;
    previousItemRef.current = null;
    currentItemRef.current = "Hazır";
  }

  function startGame() {
    resetGame("running");

    statusRef.current = "running";
    setStatus("running");
    setFeedback("Aynı öğe arka arkaya gelirse büyük karta tıkla.");

    startTimeoutRef.current = setTimeout(() => {
      if (statusRef.current !== "running") return;

      makeNextItem();
      startIntervals();
    }, 250);
  }

  function pauseGame() {
    if (status !== "running") return;

    clearIntervals();

    statusRef.current = "paused";
    setStatus("paused");
    setIsChanging(false);
    setFeedback("Oyun duraklatıldı. Devam etmek için Devam Et butonuna bas.");
  }

  function resumeGame() {
    if (status !== "paused") return;

    statusRef.current = "running";
    setStatus("running");
    setFeedback("Oyun devam ediyor. Aynı öğe gelirse tıkla.");
    startIntervals();
  }

  function newGame() {
    resetGame("ready");
  }

  function handleCardClick() {
    if (status !== "running") return;
    if (isChanging) return;
    if (clickedThisRoundRef.current) return;

    if (!previousItemRef.current) {
      setFeedback("İlk öğe geldi. Bir sonraki öğeyi bekle.");
      return;
    }

    const isSame = currentItemRef.current === previousItemRef.current;

    if (isSame) {
      setCorrect((value) => value + 1);
      setFeedback("Doğru! Aynı olanı yakaladın.");
    } else {
      setWrong((value) => value + 1);
      setFeedback("Yanlış. Bu öğe bir öncekiyle aynı değildi.");
    }

    clickedThisRoundRef.current = true;
  }

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      clearIntervals();
    };
  }, []);

  const statusLabel =
    status === "ready"
      ? "Hazır"
      : status === "running"
        ? "Çalışıyor"
        : status === "paused"
          ? "Duraklatıldı"
          : "Bitti";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-6 text-white sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">
              Deneme Oyunu
            </p>
            <h1 className="mt-2 text-3xl font-black">Aynı Olanı Yakala</h1>
            <p className="mt-2 max-w-2xl text-sm text-violet-100">
              Ekranda arka arkaya aynı öğe gelirse büyük karta tıkla. Dikkat,
              takip ve hızlı tepki becerini geliştir.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mod
                </span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as GameMode)}
                  disabled={status === "running" || status === "paused"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 disabled:opacity-60"
                >
                  <option value="word">Kelime</option>
                  <option value="letter">Harf</option>
                  <option value="symbol">Sembol</option>
                  <option value="number">Rakam</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hız
                </span>
                <select
                  value={speed}
                  onChange={(event) =>
                    setSpeed(Number(event.target.value) as SpeedOption)
                  }
                  disabled={status === "running" || status === "paused"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 disabled:opacity-60"
                >
                  {SPEED_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatSpeed(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Süre
                </span>
                <select
                  value={selectedDuration}
                  onChange={(event) => {
                    const nextDuration = Number(event.target.value) as DurationOption;
                    setSelectedDuration(nextDuration);
                    if (status === "ready") {
                      setTimeLeft(nextDuration);
                    }
                  }}
                  disabled={status === "running" || status === "paused"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 disabled:opacity-60"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} saniye
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-2">
                {status === "ready" || status === "finished" ? (
                  <button
                    onClick={startGame}
                    className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Başlat
                  </button>
                ) : null}

                {status === "running" ? (
                  <button
                    onClick={pauseGame}
                    className="min-h-11 flex-1 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600"
                  >
                    Duraklat
                  </button>
                ) : null}

                {status === "paused" ? (
                  <button
                    onClick={resumeGame}
                    className="min-h-11 flex-1 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    Devam Et
                  </button>
                ) : null}

                <button
                  onClick={newGame}
                  className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                >
                  Yeni Oyun
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Durum</p>
                <p className="mt-1 text-lg font-black text-violet-700">
                  {statusLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Süre</p>
                <p className="mt-1 text-lg font-black text-blue-700">
                  {timeLeft}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Doğru</p>
                <p className="mt-1 text-lg font-black text-emerald-700">
                  {correct}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Yanlış</p>
                <p className="mt-1 text-lg font-black text-red-700">{wrong}</p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  Kaçırılan
                </p>
                <p className="mt-1 text-lg font-black text-orange-700">
                  {missed}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Skor</p>
                <p className="mt-1 text-lg font-black text-slate-800">
                  {score}
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
              {feedback}
            </div>

            <button
              onClick={handleCardClick}
              disabled={status !== "running" || isChanging}
              className={`relative flex min-h-64 w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-80 ${
                isChanging
                  ? "scale-[0.98] border-violet-300 bg-white text-violet-300"
                  : "scale-100 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              }`}
            >
              <div
                key={itemVersion}
                className={`flex flex-col items-center justify-center transition-all duration-200 ${
                  isChanging ? "scale-90 opacity-20" : "scale-100 opacity-100"
                }`}
              >
                <span className="mb-3 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-violet-500 shadow-sm">
                  {status === "running" ? "Yeni Öğe" : "Hazır"}
                </span>

                <span className="text-6xl font-black sm:text-7xl">
                  {isChanging ? "..." : currentItem}
                </span>
              </div>

              {status === "running" ? (
                <span
                  key={`pulse-${itemVersion}`}
                  className="pointer-events-none absolute inset-4 rounded-3xl border-4 border-violet-300 opacity-0 animate-[ping_0.45s_ease-out_1]"
                />
              ) : null}
            </button>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 md:col-span-2">
                <p className="font-bold">Nasıl oynanır?</p>
                <p className="mt-1">
                  Ekranda gelen öğeleri takip et. Bir öğe, hemen önceki öğeyle
                  aynıysa büyük karta tıkla. Aynı değilken tıklarsan yanlış,
                  aynıyken tıklamazsan kaçırılan sayılır.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                <p>
                  <strong>Mod:</strong> {getModeLabel(mode)}
                </p>
                <p>
                  <strong>Hız:</strong> {formatSpeed(speed)}
                </p>
                <p>
                  <strong>Tur:</strong> {roundCount}
                </p>
                <p>
                  <strong>Başarı:</strong> %{successRate}
                </p>
                {previousItem ? (
                  <p>
                    <strong>Önceki:</strong> {previousItem}
                  </p>
                ) : null}
              </div>
            </div>

            {status === "finished" ? (
              <div className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 text-center">
                <p className="text-xl font-black text-violet-800">
                  Oyun Bitti
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Skorun: <strong>{score}</strong> | Doğru:{" "}
                  <strong>{correct}</strong> | Yanlış: <strong>{wrong}</strong>{" "}
                  | Kaçırılan: <strong>{missed}</strong>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}