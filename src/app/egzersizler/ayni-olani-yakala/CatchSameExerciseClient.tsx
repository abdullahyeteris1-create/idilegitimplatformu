"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FixedExerciseStage, FixedExerciseStat } from "@/components/exercises/FixedExerciseStage";
import { getCurrentStudent } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";

type GameMode = "word" | "letter" | "symbol" | "number";
type GameStatus = "ready" | "running" | "paused" | "finished";
type SpeedOption = 1500 | 1000 | 750 | 500;
type DurationOption = 30 | 60 | 90;

const WORDS = ["KITAP", "KALEM", "OKUL", "MASA", "ARABA", "DENIZ", "BULUT", "CICEK", "SINIF", "HAYAL", "KURAL", "CEVAP", "DERS", "OYUN", "KEDI", "KAPI"];
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "Y", "Z"];
const SYMBOLS = ["★", "☆", "●", "○", "■", "□", "▲", "△", "◆", "◇", "♥", "♣", "♠"];
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

export function CatchSameExerciseClient() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("word");
  const [speed, setSpeed] = useState<SpeedOption>(1000);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(60);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [currentItem, setCurrentItem] = useState("Hazir");
  const [previousItem, setPreviousItem] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [missed, setMissed] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [feedback, setFeedback] = useState("Baslat butonuna bas ve ekrandaki ogeleri takip et.");
  const [itemVersion, setItemVersion] = useState(0);
  const [isChanging, setIsChanging] = useState(false);

  const clickedThisRoundRef = useRef(false);
  const previousItemRef = useRef<string | null>(null);
  const currentItemRef = useRef<string>("Hazir");
  const statusRef = useRef<GameStatus>("ready");
  const hasSavedResultRef = useRef(false);

  const itemIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const score = useMemo(() => {
    return correct * 10 - wrong * 5 - missed * 3;
  }, [correct, wrong, missed]);

  const totalActions = correct + wrong + missed;

  const successRate = useMemo(() => {
    if (totalActions === 0) return 0;
    return Math.round((correct / totalActions) * 100);
  }, [correct, totalActions]);

  function saveResult(reason: "finished" | "manual") {
    if (hasSavedResultRef.current) {
      return;
    }

    hasSavedResultRef.current = true;
    const student = getCurrentStudent();
    const durationSeconds = Math.max(1, selectedDuration - timeLeft);

    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "catch-same",
      exerciseTitle: "Ayni Olani Yakala",
      durationSeconds,
      correctCount: correct,
      wrongCount: wrong + missed,
      score,
      successRate,
      details: {
        category: "Kelime Oyunlari",
        reason,
        mode,
        speed,
        selectedDuration,
        wrong,
        missed,
        roundCount,
      },
    });
  }

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

    if (statusRef.current === "running" && oldPrevious !== null && oldCurrent === oldPrevious && !clickedThisRoundRef.current) {
      setMissed((value) => value + 1);
      setFeedback("Tekrari kacirdin.");
    }

    const pool = getPoolByMode(mode);
    let nextItem = getRandomItem(pool);
    const shouldRepeat = Math.random() < 0.28;

    if (shouldRepeat && oldCurrent && oldCurrent !== "Hazir") {
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

      previousItemRef.current = oldCurrent === "Hazir" ? null : oldCurrent;
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
          setFeedback("Sure bitti. Sonuclarini inceleyebilirsin.");
          saveResult("finished");
          return 0;
        }

        return value - 1;
      });
    }, 1000);
  }

  function resetGame(nextStatus: GameStatus = "ready") {
    clearIntervals();
    hasSavedResultRef.current = false;

    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setTimeLeft(selectedDuration);
    setCurrentItem("Hazir");
    setPreviousItem(null);
    setCorrect(0);
    setWrong(0);
    setMissed(0);
    setRoundCount(0);
    setFeedback("Baslat butonuna bas ve ekrandaki ogeleri takip et.");
    setItemVersion(0);
    setIsChanging(false);

    clickedThisRoundRef.current = false;
    previousItemRef.current = null;
    currentItemRef.current = "Hazir";
  }

  function startGame() {
    resetGame("running");

    statusRef.current = "running";
    setStatus("running");
    setFeedback("Ayni oge arka arkaya gelirse buyuk karta tikla.");

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
    setFeedback("Oyun duraklatildi. Devam etmek icin Devam Et butonuna bas.");
  }

  function resumeGame() {
    if (status !== "paused") return;

    statusRef.current = "running";
    setStatus("running");
    setFeedback("Oyun devam ediyor. Ayni oge gelirse tikla.");
    startIntervals();
  }

  function newGame() {
    resetGame("ready");
  }

  function finishExercise() {
    if (status !== "running" && status !== "paused") {
      return;
    }

    clearIntervals();
    statusRef.current = "finished";
    setStatus("finished");
    setIsChanging(false);
    setFeedback("Egzersiz sonlandirildi. Sonuclar kaydedildi.");
    saveResult("manual");
  }

  function handleCardClick() {
    if (status !== "running") return;
    if (isChanging) return;
    if (clickedThisRoundRef.current) return;

    if (!previousItemRef.current) {
      setFeedback("Ilk oge geldi. Bir sonraki ogeyi bekle.");
      return;
    }

    const isSame = currentItemRef.current === previousItemRef.current;

    if (isSame) {
      setCorrect((value) => value + 1);
      setFeedback("Dogru! Ayni olani yakaladin.");
    } else {
      setWrong((value) => value + 1);
      setFeedback("Yanlis. Bu oge bir oncekiyle ayni degildi.");
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

  const statusLabel = status === "ready" ? "Hazir" : status === "running" ? "Calisiyor" : status === "paused" ? "Duraklatildi" : "Bitti";

  return (
    <FixedExerciseStage
      title="Aynı Olanı Yakala"
      subtitle={statusLabel}
      topStats={<><FixedExerciseStat label="Süre" value={timeLeft} /><FixedExerciseStat label="Doğru" value={correct} tone="ok" /><FixedExerciseStat label="Yanlış" value={wrong} tone="bad" /><FixedExerciseStat label="Kaçırılan" value={missed} /><FixedExerciseStat label="Skor" value={score} tone="brand" /></>}
      bottomSettings={<div className="grid gap-2 min-[340px]:grid-cols-2 sm:grid-cols-3"><label className="grid gap-1 text-sm font-bold"><span>Mod</span><select value={mode} onChange={(event) => setMode(event.target.value as GameMode)} disabled={status === "running" || status === "paused"} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="word">Kelime</option><option value="letter">Harf</option><option value="symbol">Sembol</option><option value="number">Rakam</option></select></label><label className="grid gap-1 text-sm font-bold"><span>Hız</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as SpeedOption)} disabled={status === "running" || status === "paused"} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">{SPEED_OPTIONS.map((option) => <option key={option} value={option}>{formatSpeed(option)}</option>)}</select></label><label className="grid gap-1 text-sm font-bold"><span>Süre</span><select value={selectedDuration} onChange={(event) => { const value = Number(event.target.value) as DurationOption; setSelectedDuration(value); if (status === "ready") setTimeLeft(value); }} disabled={status === "running" || status === "paused"} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">{DURATION_OPTIONS.map((option) => <option key={option} value={option}>{option} saniye</option>)}</select></label></div>}
      controls={<div className="flex flex-wrap justify-center gap-2">{status === "ready" || status === "finished" ? <button type="button" onClick={startGame} className="min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white">Başlat</button> : status === "running" ? <button type="button" onClick={pauseGame} className="min-h-11 rounded-xl bg-amber-500 px-5 font-bold text-white">Duraklat</button> : <button type="button" onClick={resumeGame} className="min-h-11 rounded-xl bg-cyan-600 px-5 font-bold text-white">Devam Et</button>}<button type="button" onClick={newGame} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold">Yeni Oyun</button><button type="button" onClick={finishExercise} disabled={status === "ready" || status === "finished"} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-5 font-bold text-emerald-800 disabled:opacity-60">Bitir</button></div>}
      onExit={() => router.push("/egzersizler")}
    >
      <div className="h-full min-h-0 w-full max-w-5xl overflow-auto">
        <section className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
          <div className="hidden">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">Kelime Oyunlari</p>
            <h1 className="mt-2 text-3xl font-black">Ayni Olani Yakala</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100">
              Ekranda arka arkaya ayni oge gelirse buyuk karta tikla. Dikkat, takip ve hizli tepki becerini gelistir.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="hidden">
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mod</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as GameMode)}
                  disabled={status === "running" || status === "paused"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-cyan-500 disabled:opacity-60"
                >
                  <option value="word">Kelime</option>
                  <option value="letter">Harf</option>
                  <option value="symbol">Sembol</option>
                  <option value="number">Rakam</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hiz</span>
                <select
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value) as SpeedOption)}
                  disabled={status === "running" || status === "paused"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-cyan-500 disabled:opacity-60"
                >
                  {SPEED_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatSpeed(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sure</span>
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
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-cyan-500 disabled:opacity-60"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} saniye
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-2">
                {(status === "ready" || status === "finished") && (
                  <button
                    type="button"
                    onClick={startGame}
                    className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Baslat
                  </button>
                )}

                {status === "running" && (
                  <button
                    type="button"
                    onClick={pauseGame}
                    className="min-h-11 flex-1 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600"
                  >
                    Duraklat
                  </button>
                )}

                {status === "paused" && (
                  <button
                    type="button"
                    onClick={resumeGame}
                    className="min-h-11 flex-1 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
                  >
                    Devam Et
                  </button>
                )}

                <button
                  type="button"
                  onClick={newGame}
                  className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                >
                  Yeni Oyun
                </button>
              </div>
            </div>

            <div className="hidden">
              <button
                type="button"
                onClick={finishExercise}
                disabled={status === "ready" || status === "finished"}
                className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Egzersizi Bitir
              </button>
            </div>

            <div className="hidden">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Durum</p>
                <p className="mt-1 text-lg font-black text-cyan-700">{statusLabel}</p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Sure</p>
                <p className="mt-1 text-lg font-black text-blue-700">{timeLeft}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Dogru</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{correct}</p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Yanlis</p>
                <p className="mt-1 text-lg font-black text-red-700">{wrong}</p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Kacirilan</p>
                <p className="mt-1 text-lg font-black text-orange-700">{missed}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-500">Skor</p>
                <p className="mt-1 text-lg font-black text-slate-800">{score}</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">{feedback}</div>

            <button
              type="button"
              onClick={handleCardClick}
              disabled={status !== "running" || isChanging}
              className={`relative flex min-h-64 w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-80 ${
                isChanging ? "scale-[0.98] border-cyan-300 bg-white text-cyan-300" : "scale-100 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              <div key={itemVersion} className={`flex flex-col items-center justify-center transition-all duration-200 ${isChanging ? "scale-90 opacity-20" : "scale-100 opacity-100"}`}>
                <span className="mb-3 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-500 shadow-sm">
                  {status === "running" ? "Yeni Oge" : "Hazir"}
                </span>

                <span className="text-6xl font-black sm:text-7xl">{isChanging ? "..." : currentItem}</span>
              </div>

              {status === "running" && (
                <span
                  key={`pulse-${itemVersion}`}
                  className="pointer-events-none absolute inset-4 rounded-3xl border-4 border-cyan-300 opacity-0 animate-[ping_0.45s_ease-out_1]"
                />
              )}
            </button>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 md:col-span-2">
                <p className="font-bold">Nasil oynanir?</p>
                <p className="mt-1">
                  Ekranda gelen ogeleri takip et. Bir oge, hemen onceki ogeyle ayniysa buyuk karta tikla. Ayni degilken tiklarsan yanlis, ayniyken tiklamazsan kacirilan sayilir.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                <p>
                  <strong>Mod:</strong> {getModeLabel(mode)}
                </p>
                <p>
                  <strong>Hiz:</strong> {formatSpeed(speed)}
                </p>
                <p>
                  <strong>Tur:</strong> {roundCount}
                </p>
                <p>
                  <strong>Basari:</strong> %{successRate}
                </p>
                {previousItem ? (
                  <p>
                    <strong>Onceki:</strong> {previousItem}
                  </p>
                ) : null}
              </div>
            </div>

            {status === "finished" ? (
              <div className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-center">
                <p className="text-xl font-black text-cyan-800">Oyun Bitti</p>
                <p className="mt-2 text-sm text-slate-700">
                  Skorun: <strong>{score}</strong> | Dogru: <strong>{correct}</strong> | Yanlis: <strong>{wrong}</strong> | Kacirilan: <strong>{missed}</strong>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </FixedExerciseStage>
  );
}
