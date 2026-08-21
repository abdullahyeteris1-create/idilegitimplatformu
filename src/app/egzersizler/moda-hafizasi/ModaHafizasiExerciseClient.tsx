"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIdilTheme } from "@/components/theme/IdilThemeProvider";
import {
  createEmptySelection,
  createFashionRound,
  evaluateFashionRound,
  FASHION_DIFFICULTIES,
  FASHION_SPEEDS,
  FASHION_TOTAL_ROUNDS,
  getFashionColor,
  getFashionDifficulty,
  getFashionSlot,
  getFashionPerformanceMessage,
  getFashionSpeed,
  summarizeFashionGame,
  type FashionDifficultyId,
  type FashionLook,
  type FashionRound,
  type FashionRoundResult,
  type FashionSelection,
  type FashionSlotId,
  type FashionSpeedId,
} from "@/lib/moda-hafizasi/gameConfig";
import { FashionCharacter } from "./FashionCharacter";
import styles from "@/components/exercises/fashion-memory-theme.module.css";

/**
 * Moda Hafizasi - gorsel hafiza ve dikkat oyunu.
 *
 * NOT: Bu ilk asamada bilincli olarak tamamen frontend'de calisan bir
 * prototiptir; sonuc kaydi (saveExerciseResultSecure) ve egitim programi /
 * XP entegrasyonu henuz baglanmamistir.
 */

type Phase = "setup" | "memorize" | "build" | "review" | "finished";

const TIMER_TICK_MS = 50;

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1).replace(".", ",");
}

export default function ModaHafizasiExerciseClient() {
  const { theme } = useIdilTheme();
  const isLight = theme === "light";
  const themeRootClassName = [styles.themeRoot, isLight ? styles.lightTheme : styles.darkTheme].join(" ");

  const [phase, setPhase] = useState<Phase>("setup");
  const [difficultyId, setDifficultyId] = useState<FashionDifficultyId>("ileri");
  const [speedId, setSpeedId] = useState<FashionSpeedId>("normal");

  const [round, setRound] = useState<FashionRound | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selection, setSelection] = useState<FashionSelection>(createEmptySelection);
  const [activeSlot, setActiveSlot] = useState<FashionSlotId>("top");
  const [results, setResults] = useState<FashionRoundResult[]>([]);
  const [lastResult, setLastResult] = useState<FashionRoundResult | null>(null);
  const [memorizeProgress, setMemorizeProgress] = useState(100);
  const [memorizeRemainingMs, setMemorizeRemainingMs] = useState(0);

  const historyRef = useRef<{ answer: FashionSelection; look: FashionLook }[]>([]);
  const buildStartedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startMemorize = useCallback(
    (nextRound: FashionRound) => {
      clearTimer();
      setRound(nextRound);
      setSelection(createEmptySelection());
      setActiveSlot(nextRound.slots[0]);
      setLastResult(null);
      setMemorizeProgress(100);
      setMemorizeRemainingMs(nextRound.memorizeMs);
      setPhase("memorize");

      const startedAt = performance.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAt;
        const remaining = Math.max(0, nextRound.memorizeMs - elapsed);
        setMemorizeRemainingMs(remaining);
        setMemorizeProgress((remaining / nextRound.memorizeMs) * 100);

        if (remaining <= 0) {
          clearTimer();
          buildStartedAtRef.current = performance.now();
          setPhase("build");
        }
      }, TIMER_TICK_MS);
    },
    [clearTimer],
  );

  const startGame = useCallback(() => {
    historyRef.current = [];
    setResults([]);
    setRoundIndex(0);
    const first = createFashionRound({ index: 0, difficultyId, speedId, history: [] });
    startMemorize(first);
  }, [difficultyId, speedId, startMemorize]);

  const selectColor = useCallback(
    (slot: FashionSlotId, colorId: string) => {
      if (phase !== "build" || !round) return;

      setSelection((current) => {
        const next = { ...current, [slot]: colorId };
        // Secim yapilinca sirada bosta kalan ilk kategoriye gec - cocuklar icin
        // akisi hizlandirir, ama istenirse sekmelerden geri donulebilir.
        const nextEmpty = round.slots.find((candidate) => !next[candidate]);
        if (nextEmpty) setActiveSlot(nextEmpty);
        return next;
      });
    },
    [phase, round],
  );

  const isComplete = useMemo(
    () => Boolean(round) && (round?.slots ?? []).every((slot) => selection[slot] !== null),
    [round, selection],
  );

  const checkAnswers = useCallback(() => {
    if (phase !== "build" || !round || !isComplete) return;

    const responseMs = Math.round(performance.now() - buildStartedAtRef.current);
    const result = evaluateFashionRound(round, selection, responseMs);

    historyRef.current = [...historyRef.current, { answer: round.answer, look: round.look }].slice(-6);
    setResults((current) => [...current, result]);
    setLastResult(result);
    setPhase("review");
  }, [isComplete, phase, round, selection]);

  const goToNextRound = useCallback(() => {
    const nextIndex = roundIndex + 1;

    if (nextIndex >= FASHION_TOTAL_ROUNDS) {
      setPhase("finished");
      return;
    }

    setRoundIndex(nextIndex);
    const nextRound = createFashionRound({
      index: nextIndex,
      difficultyId,
      speedId,
      history: historyRef.current,
    });
    startMemorize(nextRound);
  }, [difficultyId, roundIndex, speedId, startMemorize]);

  const backToSetup = useCallback(() => {
    clearTimer();
    historyRef.current = [];
    setResults([]);
    setRoundIndex(0);
    setRound(null);
    setLastResult(null);
    setSelection(createEmptySelection());
    setPhase("setup");
  }, [clearTimer]);

  const totalScore = useMemo(() => results.reduce((sum, item) => sum + item.score, 0), [results]);
  const summary = useMemo(() => summarizeFashionGame(results), [results]);
  const difficulty = getFashionDifficulty(difficultyId);
  const speed = getFashionSpeed(speedId);
  const isSettingsLocked = phase !== "setup" && phase !== "finished";

  return (
    <main
      className={`flex min-h-[100dvh] justify-center overflow-x-hidden bg-gradient-to-br from-rose-50 via-white to-violet-100 px-3 py-3 text-slate-900 sm:px-4 sm:py-5 ${styles.pageBackground} ${themeRootClassName}`}
    >
      <section
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-rose-100 bg-white/90 shadow-[0_24px_70px_-30px_rgba(147,51,234,0.55)] ${styles.panel}`}
      >
        <header className={`border-b border-rose-100/80 px-4 py-4 sm:px-7 sm:py-5 ${styles.panelHeader}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl ${styles.title}`}>
                <span aria-hidden="true">👗</span> Moda Hafızası
              </h1>
              <p className={`mt-0.5 text-xs text-slate-500 sm:text-sm ${styles.subtitle}`}>
                Karakterin kıyafet renklerini hatırla ve yeniden giydir.
              </p>
            </div>

            {phase !== "setup" && (
              <div className="flex items-center gap-2">
                <HeaderStat label="Tur" value={`${Math.min(roundIndex + 1, FASHION_TOTAL_ROUNDS)} / ${FASHION_TOTAL_ROUNDS}`} />
                <HeaderStat label="Puan" value={String(totalScore)} accent />
              </div>
            )}
          </div>

          {phase !== "setup" && (
            <div className={`mt-3 h-2 w-full overflow-hidden rounded-full bg-rose-100 ${styles.progressTrack}`}>
              <div
                className={`h-full rounded-full bg-gradient-to-r from-pink-400 to-violet-500 transition-[width] duration-500 ${styles.progressBar}`}
                style={{ width: `${((phase === "finished" ? FASHION_TOTAL_ROUNDS : roundIndex) / FASHION_TOTAL_ROUNDS) * 100}%` }}
              />
            </div>
          )}
        </header>

        <div className="flex-1 px-4 py-5 sm:px-7 sm:py-6">
          {phase === "setup" && (
            <SetupScreen
              difficultyId={difficultyId}
              speedId={speedId}
              onDifficultyChange={setDifficultyId}
              onSpeedChange={setSpeedId}
              onStart={startGame}
              locked={isSettingsLocked}
            />
          )}

          {phase === "memorize" && round && (
            <MemorizeScreen
              round={round}
              progress={memorizeProgress}
              remainingMs={memorizeRemainingMs}
            />
          )}

          {phase === "build" && round && (
            <BuildScreen
              round={round}
              selection={selection}
              activeSlot={activeSlot}
              onSlotChange={setActiveSlot}
              onSelectColor={selectColor}
              onCheck={checkAnswers}
              isComplete={isComplete}
            />
          )}

          {phase === "review" && round && lastResult && (
            <ReviewScreen
              round={round}
              selection={selection}
              result={lastResult}
              isLastRound={roundIndex + 1 >= FASHION_TOTAL_ROUNDS}
              onNext={goToNextRound}
            />
          )}

          {phase === "finished" && (
            <FinishedScreen
              summary={summary}
              difficultyLabel={difficulty.label}
              speedLabel={speed.label}
              onRestart={startGame}
              onBackToSetup={backToSetup}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function HeaderStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-1.5 text-center ${styles.headerStat} ${
        accent ? styles.headerStatAccent : ""
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-wider text-rose-400 ${styles.headerStatLabel}`}>{label}</p>
      <p className={`text-sm font-black text-slate-800 sm:text-base ${styles.headerStatValue}`}>{value}</p>
    </div>
  );
}

function CharacterStage({
  look,
  colors,
  size = "large",
  label,
}: {
  look: FashionLook;
  colors: FashionSelection;
  size?: "large" | "medium" | "small";
  label?: string;
}) {
  const heightClass =
    size === "large"
      ? "h-[42vh] max-h-[400px] min-h-[260px]"
      : size === "medium"
        ? "h-[32vh] max-h-[330px] min-h-[220px]"
        : "h-[26vh] max-h-[260px] min-h-[170px]";

  return (
    <div className={`flex items-center justify-center rounded-3xl px-3 py-3 ${styles.stage}`}>
      <FashionCharacter look={look} colors={colors} className={`${heightClass} w-auto ${styles.character}`} label={label} />
    </div>
  );
}

function SetupScreen({
  difficultyId,
  speedId,
  onDifficultyChange,
  onSpeedChange,
  onStart,
  locked,
}: {
  difficultyId: FashionDifficultyId;
  speedId: FashionSpeedId;
  onDifficultyChange: (id: FashionDifficultyId) => void;
  onSpeedChange: (id: FashionSpeedId) => void;
  onStart: () => void;
  locked: boolean;
}) {
  return (
    <div className={`mx-auto flex max-w-3xl flex-col gap-6 ${styles.fadeIn}`}>
      <div className={`rounded-3xl border border-violet-100 bg-gradient-to-br from-rose-50 to-violet-50 px-5 py-5 text-center ${styles.introCard}`}>
        <p className="text-4xl" aria-hidden="true">👗✨</p>
        <h2 className={`mt-2 text-lg font-black text-slate-800 sm:text-xl ${styles.introTitle}`}>Nasıl Oynanır?</h2>
        <ol className={`mx-auto mt-3 grid max-w-xl gap-2 text-left text-sm text-slate-600 sm:grid-cols-3 ${styles.introText}`}>
          <li className={`rounded-2xl bg-white/70 px-3 py-2 ${styles.introStep}`}>
            <b className="block text-slate-800">1. İncele</b>Karakterin renklerini aklında tut.
          </li>
          <li className={`rounded-2xl bg-white/70 px-3 py-2 ${styles.introStep}`}>
            <b className="block text-slate-800">2. Giydir</b>Hatırladığın renkleri seç.
          </li>
          <li className={`rounded-2xl bg-white/70 px-3 py-2 ${styles.introStep}`}>
            <b className="block text-slate-800">3. Kontrol Et</b>Doğru karakterle karşılaştır.
          </li>
        </ol>
      </div>

      <div>
        <p className={`mb-2 text-xs font-black uppercase tracking-wider text-slate-500 ${styles.sectionLabel}`}>Zorluk Seviyesi</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FASHION_DIFFICULTIES.map((item) => {
            const active = item.id === difficultyId;
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                aria-pressed={active}
                onClick={() => onDifficultyChange(item.id)}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition ${
                  active
                    ? `border-violet-500 bg-violet-50 shadow-sm ${styles.optionActive}`
                    : `border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 ${styles.optionIdle}`
                }`}
              >
                <span className={`block text-sm font-black text-slate-800 ${styles.optionTitle}`}>{item.label}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug text-slate-500 ${styles.optionHint}`}>
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={`mb-2 text-xs font-black uppercase tracking-wider text-slate-500 ${styles.sectionLabel}`}>
          Hız (karakterin ekranda kalma süresi)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {FASHION_SPEEDS.map((item) => {
            const active = item.id === speedId;
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                aria-pressed={active}
                onClick={() => onSpeedChange(item.id)}
                className={`rounded-2xl border-2 px-3 py-3 text-center transition ${
                  active
                    ? `border-pink-500 bg-pink-50 shadow-sm ${styles.optionActive}`
                    : `border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50 ${styles.optionIdle}`
                }`}
              >
                <span className="block text-lg" aria-hidden="true">{item.icon}</span>
                <span className={`block text-sm font-black text-slate-800 ${styles.optionTitle}`}>{item.label}</span>
                <span className={`block text-[11px] text-slate-500 ${styles.optionHint}`}>{item.baseMs / 1000} saniye</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className={`mx-auto w-full max-w-sm rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-6 py-3.5 text-base font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] ${styles.primaryButton}`}
      >
        ✨ Oyuna Başla
      </button>
    </div>
  );
}

function MemorizeScreen({
  round,
  progress,
  remainingMs,
}: {
  round: FashionRound;
  progress: number;
  remainingMs: number;
}) {
  return (
    <div className={`flex flex-col items-center gap-4 ${styles.fadeIn}`}>
      <div className={`w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center ${styles.banner}`}>
        <p className={`text-sm font-black text-amber-700 sm:text-base ${styles.bannerText}`}>
          👀 Karakteri dikkatlice incele!
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-200 ${styles.timerTrack}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
            style={{ width: `${progress}%`, transition: `width ${TIMER_TICK_MS}ms linear` }}
          />
        </div>
        <p className={`mt-1 text-center text-xs font-bold tabular-nums text-slate-500 ${styles.mutedText}`}>
          {formatSeconds(remainingMs)} sn
        </p>
      </div>

      <CharacterStage look={round.look} colors={round.answer} size="large" label="Hatırlanacak karakter" />
    </div>
  );
}

function BuildScreen({
  round,
  selection,
  activeSlot,
  onSlotChange,
  onSelectColor,
  onCheck,
  isComplete,
}: {
  round: FashionRound;
  selection: FashionSelection;
  activeSlot: FashionSlotId;
  onSlotChange: (slot: FashionSlotId) => void;
  onSelectColor: (slot: FashionSlotId, colorId: string) => void;
  onCheck: () => void;
  isComplete: boolean;
}) {
  const options = round.options[activeSlot] ?? [];
  const activeSlotMeta = getFashionSlot(activeSlot);

  return (
    <div className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6 ${styles.fadeIn}`}>
      <div className="lg:w-[38%] lg:shrink-0">
        <CharacterStage look={round.look} colors={selection} size="medium" label="Oluşturduğun karakter" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className={`text-center text-sm font-black text-slate-700 lg:text-left ${styles.promptText}`}>
          🎨 Hatırladığın renkleri seç — seçimlerin karakterde anında görünür.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {round.slots.map((slot) => {
            const meta = getFashionSlot(slot);
            const chosen = selection[slot];
            const active = slot === activeSlot;
            return (
              <button
                key={slot}
                type="button"
                aria-pressed={active}
                onClick={() => onSlotChange(slot)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-2 text-xs font-black transition ${
                  active
                    ? `border-violet-500 bg-violet-50 text-violet-700 shadow-sm ${styles.tabActive}`
                    : `border-slate-200 bg-white text-slate-600 hover:border-violet-300 ${styles.tabIdle}`
                }`}
              >
                <span aria-hidden="true">{meta.icon}</span>
                <span className="truncate">{meta.shortLabel}</span>
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 rounded-full border ${chosen ? "border-slate-300" : `border-dashed border-slate-400 ${styles.emptyDot}`}`}
                  style={chosen ? { background: getFashionColor(chosen).hex } : undefined}
                />
              </button>
            );
          })}
        </div>

        <div className={`rounded-3xl border border-slate-200 bg-slate-50/80 p-3 ${styles.controlPanel}`}>
          <p className={`mb-2 text-xs font-black uppercase tracking-wider text-slate-500 ${styles.sectionLabel}`}>
            {activeSlotMeta.label} rengi
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((colorId) => {
              const color = getFashionColor(colorId);
              const selected = selection[activeSlot] === colorId;
              return (
                <button
                  key={colorId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectColor(activeSlot, colorId)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-1.5 py-2.5 transition active:scale-95 ${
                    selected
                      ? `border-violet-500 bg-violet-50 shadow-md ${styles.colorCardSelected}`
                      : `border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm ${styles.colorCard}`
                  }`}
                >
                  <span
                    className="h-9 w-9 rounded-full border border-black/10 shadow-inner sm:h-10 sm:w-10"
                    style={{ background: color.hex }}
                    aria-hidden="true"
                  />
                  <span className={`text-[11px] font-bold leading-tight text-slate-700 ${styles.colorLabel}`}>
                    {color.label}
                  </span>
                  {selected && (
                    <span
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-black text-white"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onCheck}
          disabled={!isComplete}
          className={`w-full rounded-2xl px-6 py-3 text-base font-black text-white shadow-lg transition ${
            isComplete
              ? `bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110 active:scale-[0.98] ${styles.primaryButton}`
              : `cursor-not-allowed bg-slate-300 shadow-none ${styles.disabledButton}`
          }`}
        >
          {isComplete ? "✅ Kontrol Et" : "Tüm parçaları seç"}
        </button>
      </div>
    </div>
  );
}

function ReviewScreen({
  round,
  selection,
  result,
  isLastRound,
  onNext,
}: {
  round: FashionRound;
  selection: FashionSelection;
  result: FashionRoundResult;
  isLastRound: boolean;
  onNext: () => void;
}) {
  const perfect = result.correctCount === result.totalCount;

  return (
    <div className={`flex flex-col items-center gap-4 ${styles.fadeIn}`}>
      <div
        className={`w-full max-w-lg rounded-3xl border-2 px-4 py-3 text-center ${
          perfect
            ? `border-emerald-300 bg-emerald-50 ${styles.resultPerfect}`
            : `border-amber-300 bg-amber-50 ${styles.resultPartial}`
        }`}
      >
        <p className={`text-base font-black sm:text-lg ${perfect ? "text-emerald-700" : "text-amber-700"} ${styles.resultTitle}`}>
          {perfect
            ? "🎉 Harika! Karakteri tamamen doğru hatırladın!"
            : `${result.correctCount} / ${result.totalCount} parçayı doğru hatırladın.`}
        </p>
        <p className={`mt-0.5 text-xs font-bold text-slate-600 ${styles.mutedText}`}>
          +{result.baseScore} puan
          {result.speedBonus > 0 ? ` · +${result.speedBonus} hız bonusu` : ""} · {formatSeconds(result.responseMs)} sn
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
        <ComparePane title="Doğru Karakter" look={round.look} colors={round.answer} tone="correct" />
        <ComparePane title="Senin Karakterin" look={round.look} colors={selection} tone="student" />
      </div>

      <ul className="grid w-full max-w-lg grid-cols-2 gap-2">
        {round.slots.map((slot) => {
          const meta = getFashionSlot(slot);
          const correct = result.correctSlots.includes(slot);
          const answerColor = round.answer[slot];
          const pickedColor = selection[slot];

          return (
            <li
              key={slot}
              className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-xs ${
                correct
                  ? `border-emerald-200 bg-emerald-50 ${styles.slotResultOk}`
                  : `border-rose-200 bg-rose-50 ${styles.slotResultBad}`
              }`}
            >
              <span className={`text-sm font-black ${correct ? "text-emerald-600" : "text-rose-600"}`} aria-hidden="true">
                {correct ? "✓" : "✕"}
              </span>
              <span className={`min-w-0 flex-1 truncate font-bold text-slate-700 ${styles.slotResultLabel}`}>
                {meta.shortLabel}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {!correct && pickedColor && (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border border-black/10 opacity-60"
                      style={{ background: getFashionColor(pickedColor).hex }}
                      title={`Senin seçimin: ${getFashionColor(pickedColor).label}`}
                    />
                    <span className="text-slate-400" aria-hidden="true">→</span>
                  </>
                )}
                {answerColor && (
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: getFashionColor(answerColor).hex }}
                    title={`Doğru renk: ${getFashionColor(answerColor).label}`}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onNext}
        className={`w-full max-w-sm rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-6 py-3 text-base font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] ${styles.primaryButton}`}
      >
        {isLastRound ? "🏁 Sonuçları Gör" : "➡️ Sonraki Tur"}
      </button>
    </div>
  );
}

function ComparePane({
  title,
  look,
  colors,
  tone,
}: {
  title: string;
  look: FashionLook;
  colors: FashionSelection;
  tone: "correct" | "student";
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-3xl border-2 p-2 ${
        tone === "correct"
          ? `border-emerald-200 ${styles.compareCorrect}`
          : `border-violet-200 ${styles.compareStudent}`
      }`}
    >
      <p className={`text-[11px] font-black uppercase tracking-wide text-slate-500 sm:text-xs ${styles.compareTitle}`}>
        {title}
      </p>
      <CharacterStage look={look} colors={colors} size="small" label={title} />
    </div>
  );
}

function FinishedScreen({
  summary,
  difficultyLabel,
  speedLabel,
  onRestart,
  onBackToSetup,
}: {
  summary: ReturnType<typeof summarizeFashionGame>;
  difficultyLabel: string;
  speedLabel: string;
  onRestart: () => void;
  onBackToSetup: () => void;
}) {
  const message = getFashionPerformanceMessage(summary.successPercent);

  return (
    <div className={`mx-auto flex max-w-2xl flex-col items-center gap-5 ${styles.fadeIn}`}>
      <div className="text-center">
        <p className="text-5xl" aria-hidden="true">🏆</p>
        <h2 className={`mt-2 text-xl font-black text-slate-800 sm:text-2xl ${styles.introTitle}`}>
          Moda Hafızası Tamamlandı!
        </h2>
        <p className={`mt-1 text-sm font-bold text-violet-600 sm:text-base ${styles.performanceMessage}`}>{message}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        <SummaryCard label="Toplam Puan" value={String(summary.totalScore)} accent />
        <SummaryCard label="Başarı Yüzdesi" value={`%${summary.successPercent}`} accent />
        <SummaryCard label="Doğru Parça" value={String(summary.correctPieces)} />
        <SummaryCard label="Yanlış Parça" value={String(summary.wrongPieces)} />
        <SummaryCard label="Ort. Cevap Süresi" value={`${formatSeconds(summary.averageResponseMs)} sn`} />
        <SummaryCard label="Seviye · Hız" value={`${difficultyLabel} · ${speedLabel}`} />
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className={`flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-6 py-3 text-base font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] ${styles.primaryButton}`}
        >
          🔄 Tekrar Oyna
        </button>
        <button
          type="button"
          onClick={onBackToSetup}
          className={`flex-1 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-base font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 ${styles.ghostButton}`}
        >
          ⚙️ Ayarları Değiştir
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 text-center ${
        accent
          ? `border-violet-200 bg-violet-50 ${styles.summaryCardAccent}`
          : `border-slate-200 bg-white ${styles.summaryCard}`
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-wider text-slate-500 ${styles.summaryLabel}`}>{label}</p>
      <p className={`mt-0.5 text-sm font-black text-slate-800 sm:text-base ${styles.summaryValue}`}>{value}</p>
    </div>
  );
}
