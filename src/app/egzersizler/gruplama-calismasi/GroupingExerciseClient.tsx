"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateCharacterCount, formatDuration, splitTextIntoWords } from "@/lib/exercise-engine/shadowReading";
import { getCurrentStudent, getResolvedCurrentUser } from "@/lib/auth/auth";
import { saveExerciseResult } from "@/lib/results/resultStorage";
import { getTextCategories, loadActiveTextLibraryItems } from "@/lib/settings/textLibraryStorage";
import {
  FullscreenExerciseIntro,
  FullscreenExerciseShell,
  FULLSCREEN_PRIMARY_BUTTON_CLASS,
  FULLSCREEN_SECONDARY_BUTTON_CLASS,
  FULLSCREEN_SELECT_CLASS,
  FULLSCREEN_TOUCH_STYLE,
} from "@/components/exercises/FullscreenExerciseShell";

type Phase = "setup" | "ready" | "running" | "result";
type GroupSize = 2 | 3 | 4 | 5;
type DisplayMode = "keep" | "fade";
type ScrollMode = "line" | "page";
type SpeedMode = "milliseconds" | "wordsPerMinute";
type FontSize = 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28;
type TextItem = { id: string; title: string; category: string; text: string };
type Result = {
  completed: boolean;
  completedGroups: number;
  totalGroups: number;
  totalWords: number;
  totalCharacters: number;
  durationSeconds: number;
  score: number;
  successRate: number;
};

const ALL = "all";
const GROUPS: GroupSize[] = [2, 3, 4, 5];
const FONTS: FontSize[] = [14, 16, 18, 20, 22, 24, 26, 28];

function groupWords(words: string[], size: GroupSize): string[][] {
  const output: string[][] = [];

  for (let i = 0; i < words.length; i += size) {
    output.push(words.slice(i, i + size));
  }

  return output;
}

export function GroupingExerciseClient() {
  const router = useRouter();
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [isTeacher, setIsTeacher] = useState(false);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [category, setCategory] = useState(ALL);
  const [textId, setTextId] = useState("");
  const [groupSize, setGroupSize] = useState<GroupSize>(2);
  const [fontSize, setFontSize] = useState<FontSize>(20);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("keep");
  const [scrollMode, setScrollMode] = useState<ScrollMode>("page");
  const [speedMode, setSpeedMode] = useState<SpeedMode>("milliseconds");
  const [customMilliseconds, setCustomMilliseconds] = useState(1000);
  const [customWordsPerMinute, setCustomWordsPerMinute] = useState(300);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    void (async () => {
      setIsTeacher(getResolvedCurrentUser()?.role === "teacher");

      const loaded = await loadActiveTextLibraryItems();
      const items = loaded.items.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        text: item.content,
      }));

      setTexts(items);
      setTextId(items[0]?.id ?? "");
      setLoadError(loaded.error);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => [ALL, ...getTextCategories()], []);

  const filtered = useMemo(() => {
    return category === ALL ? texts : texts.filter((item) => item.category === category);
  }, [category, texts]);

  const resolvedTextId = filtered.some((item) => item.id === textId) ? textId : (filtered[0]?.id ?? "");
  const selected = texts.find((item) => item.id === resolvedTextId) ?? null;

  const words = useMemo(() => {
    return selected ? splitTextIntoWords(selected.text) : [];
  }, [selected]);

  const groups = useMemo(() => groupWords(words, groupSize), [groupSize, words]);

  const totalGroups = groups.length;
  const totalWords = words.length;
  const totalCharacters = selected ? calculateCharacterCount(selected.text) : 0;

  const safeMilliseconds = Math.min(10000, Math.max(50, customMilliseconds));
  const safeWordsPerMinute = Math.min(3000, Math.max(30, customWordsPerMinute));

  const intervalMs =
    speedMode === "milliseconds"
      ? safeMilliseconds
      : Math.max(50, Math.round((60000 * groupSize) / safeWordsPerMinute));

  const estimatedSeconds = Math.max(1, Math.ceil((totalGroups * intervalMs) / 1000));
  const estimatedWpm = Math.round((totalWords / estimatedSeconds) * 60);

  const completedGroups = phase === "running" ? Math.min(index + 1, totalGroups) : 0;
  const progress = totalGroups ? Math.round((completedGroups / totalGroups) * 100) : 0;

  const reset = useCallback(() => {
    savedRef.current = true;
    startedAtRef.current = null;
    setIndex(0);
    setElapsed(0);
    setPaused(false);
    setResult(null);
    setPhase("ready");
    areaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const finish = useCallback(
    (completed: boolean) => {
      if (!selected || !totalGroups || savedRef.current) {
        return;
      }

      savedRef.current = true;

      const done = completed ? totalGroups : Math.min(index + 1, totalGroups);
      const successRate = Math.round((done / totalGroups) * 100);
      const durationSeconds = Math.max(
        1,
        startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : elapsed,
      );

      const student = getCurrentStudent();

      saveExerciseResult({
        studentId: student?.id ?? "no-student",
        studentName: student?.name ?? "Secilmemis Ogrenci",
        exerciseType: "grouping-reading",
        exerciseTitle: "Gruplama Calismasi",
        durationSeconds,
        correctCount: 0,
        wrongCount: 0,
        score: successRate,
        successRate,
        details: {
          textTitle: selected.title,
          category: selected.category,
          groupSize,
          speedMode,
          intervalMs,
          customMilliseconds: safeMilliseconds,
          customWordsPerMinute: safeWordsPerMinute,
          fontSize,
          displayMode,
          scrollMode,
          totalWords,
          totalCharacters,
          completedGroups: done,
          totalGroups,
          estimatedWordsPerMinute: estimatedWpm,
        },
      });

      setResult({
        completed,
        completedGroups: done,
        totalGroups,
        totalWords,
        totalCharacters,
        durationSeconds,
        score: successRate,
        successRate,
      });

      setPaused(false);
      setPhase("result");
    },
    [
      displayMode,
      elapsed,
      estimatedWpm,
      fontSize,
      groupSize,
      index,
      intervalMs,
      safeMilliseconds,
      safeWordsPerMinute,
      scrollMode,
      selected,
      speedMode,
      totalCharacters,
      totalGroups,
      totalWords,
    ],
  );

  useEffect(() => {
    if (phase !== "running" || paused || !totalGroups) {
      return;
    }

    const id = window.setTimeout(() => {
      setIndex((current) => {
        if (current >= totalGroups - 1) {
          finish(true);
          return current;
        }

        return current + 1;
      });
    }, intervalMs);

    return () => window.clearTimeout(id);
  }, [finish, intervalMs, paused, phase, totalGroups]);

  useEffect(() => {
    if (phase !== "running" || paused) {
      return;
    }

    const id = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [paused, phase]);

  useEffect(() => {
    if (phase === "running" && !paused) {
      activeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: scrollMode === "line" ? "nearest" : "center",
      });
    }
  }, [index, paused, phase, scrollMode]);

  const startExercise = () => {
    if (!selected || !totalGroups) {
      return;
    }

    savedRef.current = false;
    startedAtRef.current = Date.now();
    setIndex(0);
    setElapsed(0);
    setPaused(false);
    setResult(null);
    setPhase("running");
  };

  const controls = (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Kategori</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={category}
          disabled={phase === "running" && !paused}
          onChange={(event) => {
            setCategory(event.target.value);
            setTextId("");
            reset();
          }}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === ALL ? "Tumu" : item}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Metin</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={resolvedTextId}
          disabled={phase === "running" && !paused}
          onChange={(event) => {
            setTextId(event.target.value);
            reset();
          }}
        >
          {filtered.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Grup</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={groupSize}
          disabled={phase === "running" && !paused}
          onChange={(event) => {
            setGroupSize(Number(event.target.value) as GroupSize);
            reset();
          }}
        >
          {GROUPS.map((value) => (
            <option key={value} value={value}>
              {value} Kelime
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Hiz Menusu</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={speedMode}
          disabled={phase === "running" && !paused}
          onChange={(event) => {
            setSpeedMode(event.target.value as SpeedMode);
            reset();
          }}
        >
          <option value="milliseconds">Atlama Hizi</option>
          <option value="wordsPerMinute">Okuma Hizi</option>
        </select>
      </label>

      {speedMode === "milliseconds" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Milisaniye</span>
          <input
            className={FULLSCREEN_SELECT_CLASS}
            type="number"
            min={50}
            max={10000}
            value={customMilliseconds}
            disabled={phase === "running" && !paused}
            onChange={(event) => {
              setCustomMilliseconds(Number(event.target.value));
              reset();
            }}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Kelime / Dakika</span>
          <input
            className={FULLSCREEN_SELECT_CLASS}
            type="number"
            min={30}
            max={3000}
            value={customWordsPerMinute}
            disabled={phase === "running" && !paused}
            onChange={(event) => {
              setCustomWordsPerMinute(Number(event.target.value));
              reset();
            }}
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Gorunum</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={displayMode}
          disabled={phase === "running" && !paused}
          onChange={(event) => {
            setDisplayMode(event.target.value as DisplayMode);
            reset();
          }}
        >
          <option value="keep">Silinmeden</option>
          <option value="fade">Silinerek</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Kaydirma</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={scrollMode}
          disabled={phase === "running" && !paused}
          onChange={(event) => setScrollMode(event.target.value as ScrollMode)}
        >
          <option value="line">Satir Kaydir</option>
          <option value="page">Sayfa Kaydir</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Font</span>
        <select
          className={FULLSCREEN_SELECT_CLASS}
          value={fontSize}
          disabled={phase === "running" && !paused}
          onChange={(event) => setFontSize(Number(event.target.value) as FontSize)}
        >
          {FONTS.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1 grid gap-2">
        {phase === "ready" ? (
          <button
            className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} min-h-[42px]`}
            style={FULLSCREEN_TOUCH_STYLE}
            onClick={startExercise}
          >
            Baslat
          </button>
        ) : (
          <>
            <button
              className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} min-h-[42px]`}
              style={FULLSCREEN_TOUCH_STYLE}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? "Devam Et" : "Duraklat"}
            </button>
            <div className="flex gap-2">
              <button className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} min-h-[40px] flex-1`} onClick={reset}>
                Yeniden
              </button>
              <button className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} min-h-[40px] flex-1`} onClick={() => finish(false)}>
                Bitir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <FullscreenExerciseIntro
        title="Gruplama Calismasi"
        description="Kelime gruplarini tek bakista algilama ve okuma alanini gelistirme calismasi."
        buttonLabel="Egitime Basla"
        onStart={() => {
          savedRef.current = false;
          setPhase("ready");
        }}
      />
    );
  }

  if (phase === "result" && result && selected) {
    return (
      <section className="idil-card p-5 md:p-7">
        <h2 className="text-2xl font-bold">Gruplama Calismasi Sonucu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {result.completed ? "Metin tamamlandi." : "Egzersiz erken bitirildi."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Basari", `${result.successRate}%`],
            ["Grup", `${result.completedGroups}/${result.totalGroups}`],
            ["Kelime", result.totalWords],
            ["Sure", formatDuration(result.durationSeconds)],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
              <p className="text-xs uppercase text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className={FULLSCREEN_PRIMARY_BUTTON_CLASS} onClick={reset}>
            Yeniden Baslat
          </button>
          <button
            className={FULLSCREEN_PRIMARY_BUTTON_CLASS}
            onClick={() =>
              router.push(
                `/sonuc?exerciseType=grouping-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`,
              )
            }
          >
            Ortak Sonuc
          </button>
        </div>

        <Link
          href="/egzersizler"
          className="mt-3 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-red-200 bg-white font-bold text-red-800"
        >
          Egzersizlere Don
        </Link>
      </section>
    );
  }

  return (
    <FullscreenExerciseShell
      title="Gruplama Calismasi"
      subtitle={phase === "ready" ? "Hazirlik modu" : (selected?.title ?? "Calisma")}
      stats={[
        { label: "Grup", value: `${groupSize} kelime` },
        {
          label: "Hiz",
          value: speedMode === "milliseconds" ? `${intervalMs} ms` : `${safeWordsPerMinute} kelime/dk`,
        },
        { label: "Sure", value: formatDuration(elapsed) },
        { label: "Gorunum", value: displayMode === "fade" ? "Silinerek" : "Sabit" },
        { label: "Font", value: `${fontSize}px` },
      ]}
      footer={controls}
      stageClassName="exercise-stage-fit flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden rounded-[20px] border border-white/80 bg-white p-2 shadow-lg md:rounded-[28px] md:p-4"
    >
      {loading ? (
        <p className="font-bold">Metinler yukleniyor...</p>
      ) : loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-900">{loadError}</p>
      ) : !texts.length ? (
        <div className="text-center">
          <p className="font-bold">Aktif metin bulunamadi.</p>
          {isTeacher ? (
            <Link
              href="/ogretmen/icerik-yonetimi/metin-kutuphanesi"
              className="mt-3 inline-flex rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-white"
            >
              Metin Ekle
            </Link>
          ) : null}
        </div>
      ) : phase === "ready" ? (
        <div className="text-center">
          <h2 className="text-xl font-black md:text-3xl">Ayarlarini sec, hazir oldugunda baslat.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            Aktif grubun orta noktasina odaklan. Golge kalktikca kelimeleri tek bakista gormeye calis.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs font-bold sm:grid-cols-4 md:text-sm">
            <span>Kelime: {totalWords}</span>
            <span>Grup: {totalGroups}</span>
            <span>Tahmini: {formatDuration(estimatedSeconds)}</span>
            <span>Hiz: {estimatedWpm} kelime/dk</span>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 w-full max-w-6xl flex-col gap-1.5 md:gap-3">
          <div
            ref={areaRef}
            className="min-h-0 flex-1 overflow-y-auto rounded-[18px] border border-red-100 bg-white p-2 md:rounded-[24px] md:p-4"
            style={{ fontSize: `${fontSize}px`, lineHeight: 2 }}
          >
            {groups.map((group, groupIndex) => {
              const active = groupIndex === index;
              const past = groupIndex < index;

              return (
                <span
                  key={`${group.join("-")}-${groupIndex}`}
                  ref={active ? activeRef : null}
                  className={`relative mr-2 mb-2 inline-flex rounded-lg px-2 py-1 transition ${
                    active
                      ? "bg-white text-slate-950 shadow-[0_0_0_2px_rgba(220,38,38,0.5)]"
                      : displayMode === "fade" && past
                        ? "text-slate-300 opacity-25"
                        : "bg-slate-900/75 text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.65)]"
                  }`}
                >
                  {group.join(" ")}
                </span>
              );
            })}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs font-bold md:text-sm">
              <span>{progress}% tamamlandi</span>
              <span>
                {completedGroups}/{totalGroups}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </FullscreenExerciseShell>
  );
}
