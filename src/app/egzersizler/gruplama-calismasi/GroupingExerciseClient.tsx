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
type Result = { completed: boolean; completedGroups: number; totalGroups: number; totalWords: number; totalCharacters: number; durationSeconds: number; score: number; successRate: number };

const ALL = "all";
const GROUPS: GroupSize[] = [2, 3, 4, 5];
const FONTS: FontSize[] = [14, 16, 18, 20, 22, 24, 26, 28];

function groupWords(words: string[], size: GroupSize): string[][] {
  const output: string[][] = [];
  for (let i = 0; i < words.length; i += size) output.push(words.slice(i, i + size));
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
      const items = loaded.items.map((item) => ({ id: item.id, title: item.title, category: item.category, text: item.content }));
      setTexts(items);
      setTextId(items[0]?.id ?? "");
      setLoadError(loaded.error);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => [ALL, ...getTextCategories()], []);
  const filtered = useMemo(() => category === ALL ? texts : texts.filter((item) => item.category === category), [category, texts]);
  const resolvedTextId = filtered.some((item) => item.id === textId) ? textId : (filtered[0]?.id ?? "");
  const selected = texts.find((item) => item.id === resolvedTextId) ?? null;
  const words = useMemo(() => selected ? splitTextIntoWords(selected.text) : [], [selected]);
  const groups = useMemo(() => groupWords(words, groupSize), [groupSize, words]);
  const totalGroups = groups.length;
  const totalWords = words.length;
  const totalCharacters = selected ? calculateCharacterCount(selected.text) : 0;
  const safeMilliseconds = Math.min(
    10000,
    Math.max(50, customMilliseconds),
  );

  const safeWordsPerMinute = Math.min(
    3000,
    Math.max(30, customWordsPerMinute),
  );

  const intervalMs =
    speedMode === "milliseconds"
      ? safeMilliseconds
      : Math.max(
          50,
          Math.round((60000 * groupSize) / safeWordsPerMinute),
        );
  const estimatedSeconds = Math.max(1, Math.ceil(totalGroups * intervalMs / 1000));
  const estimatedWpm = Math.round(totalWords / estimatedSeconds * 60);
  const completedGroups = phase === "running" ? Math.min(index + 1, totalGroups) : 0;
  const progress = totalGroups ? Math.round(completedGroups / totalGroups * 100) : 0;

  const reset = useCallback(() => {
    savedRef.current = true;
    startedAtRef.current = null;
    setIndex(0); setElapsed(0); setPaused(false); setResult(null); setPhase("ready");
    areaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const finish = useCallback((completed: boolean) => {
    if (!selected || !totalGroups || savedRef.current) return;
    savedRef.current = true;
    const done = completed ? totalGroups : Math.min(index + 1, totalGroups);
    const successRate = Math.round(done / totalGroups * 100);
    const durationSeconds = Math.max(1, startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : elapsed);
    const student = getCurrentStudent();
    saveExerciseResult({
      studentId: student?.id ?? "no-student",
      studentName: student?.name ?? "Secilmemis Ogrenci",
      exerciseType: "grouping-reading",
      exerciseTitle: "Gruplama Calismasi",
      durationSeconds, correctCount: 0, wrongCount: 0, score: successRate, successRate,
      details: { textTitle: selected.title, category: selected.category, groupSize, speedMode, intervalMs, customMilliseconds: safeMilliseconds, customWordsPerMinute: safeWordsPerMinute, fontSize, displayMode, scrollMode, totalWords, totalCharacters, completedGroups: done, totalGroups, estimatedWordsPerMinute: estimatedWpm },
    });
    setResult({ completed, completedGroups: done, totalGroups, totalWords, totalCharacters, durationSeconds, score: successRate, successRate });
    setPaused(false); setPhase("result");
  }, [displayMode, elapsed, estimatedWpm, fontSize, groupSize, index, intervalMs, safeMilliseconds, safeWordsPerMinute, scrollMode, selected, speedMode, totalCharacters, totalGroups, totalWords]);

  useEffect(() => {
    if (phase !== "running" || paused || !totalGroups) return;
    const id = window.setTimeout(() => setIndex((current) => {
      if (current >= totalGroups - 1) { finish(true); return current; }
      return current + 1;
    }), intervalMs);
    return () => window.clearTimeout(id);
  }, [finish, index, intervalMs, paused, phase, totalGroups]);

  useEffect(() => {
    if (phase !== "running" || paused) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused, phase]);

  useEffect(() => {
    if (phase === "running" && !paused) activeRef.current?.scrollIntoView({ behavior: "smooth", block: scrollMode === "line" ? "nearest" : "center" });
  }, [index, paused, phase, scrollMode]);

  const controls = (
    <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[42dvh] w-full overflow-y-auto border-t border-red-100 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:max-h-[34dvh]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-9">
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Kategori</span><select className={FULLSCREEN_SELECT_CLASS} value={category} onChange={(e) => { setCategory(e.target.value); setTextId(""); reset(); }}>{categories.map((item) => <option key={item} value={item}>{item === ALL ? "Tümü" : item}</option>)}</select></label>
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Metin</span><select className={FULLSCREEN_SELECT_CLASS} value={resolvedTextId} onChange={(e) => { setTextId(e.target.value); reset(); }}>{filtered.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Grup</span><select className={FULLSCREEN_SELECT_CLASS} value={groupSize} onChange={(e) => { setGroupSize(Number(e.target.value) as GroupSize); reset(); }}>{GROUPS.map((v) => <option key={v} value={v}>{v} Kelime</option>)}</select></label>
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Hız Menüsü</span><select className={FULLSCREEN_SELECT_CLASS} value={speedMode} onChange={(e) => { setSpeedMode(e.target.value as SpeedMode); reset(); }}><option value="milliseconds">Atlama Hızı</option><option value="wordsPerMinute">Okuma Hızı</option></select></label>
      {speedMode === "milliseconds" ? (
        <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Milisaniye</span><input className={FULLSCREEN_SELECT_CLASS} type="number" min={50} max={10000} value={customMilliseconds} onChange={(e) => { setCustomMilliseconds(Number(e.target.value)); reset(); }} /></label>
      ) : (
        <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Kelime / Dakika</span><input className={FULLSCREEN_SELECT_CLASS} type="number" min={30} max={3000} value={customWordsPerMinute} onChange={(e) => { setCustomWordsPerMinute(Number(e.target.value)); reset(); }} /></label>
      )}
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Görünüm</span><select className={FULLSCREEN_SELECT_CLASS} value={displayMode} onChange={(e) => { setDisplayMode(e.target.value as DisplayMode); reset(); }}><option value="keep">Silinmeden</option><option value="fade">Silinerek</option></select></label>
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Kaydırma</span><select className={FULLSCREEN_SELECT_CLASS} value={scrollMode} onChange={(e) => setScrollMode(e.target.value as ScrollMode)}><option value="line">Satır Kaydır</option><option value="page">Sayfa Kaydır</option></select></label>
      <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase text-slate-500">Font</span><select className={FULLSCREEN_SELECT_CLASS} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value) as FontSize)}>{FONTS.map((v) => <option key={v} value={v}>{v}px</option>)}</select></label>
        <div className="col-span-2 grid gap-2 md:col-span-1">{phase === "ready" ? <button className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} min-h-[44px]`} style={FULLSCREEN_TOUCH_STYLE} onClick={() => { if (!selected || !totalGroups) return; savedRef.current = false; startedAtRef.current = Date.now(); setIndex(0); setElapsed(0); setPaused(false); setResult(null); setPhase("running"); }}>Başlat</button> : <><button className={`${FULLSCREEN_PRIMARY_BUTTON_CLASS} min-h-[44px]`} style={FULLSCREEN_TOUCH_STYLE} onClick={() => setPaused((v) => !v)}>{paused ? "Devam Et" : "Duraklat"}</button><div className="flex gap-2"><button className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} min-h-[44px] flex-1`} onClick={reset}>Yeniden Başlat</button><button className={`${FULLSCREEN_SECONDARY_BUTTON_CLASS} min-h-[44px] flex-1`} onClick={() => finish(false)}>Bitir</button></div></>}</div>
      </div>
    </div>
  );

  if (phase === "setup") return <FullscreenExerciseIntro title="Gruplama Çalışması" description="Kelime gruplarını tek bakışta algılama ve okuma alanını geliştirme çalışması." buttonLabel="Eğitime Başla" onStart={() => { savedRef.current = false; setPhase("ready"); }} />;

  if (phase === "result" && result && selected) return <section className="idil-card p-5 md:p-7"><h2 className="text-2xl font-bold">Gruplama Çalışması Sonucu</h2><p className="mt-1 text-sm text-[var(--muted)]">{result.completed ? "Metin tamamlandı." : "Egzersiz erken bitirildi."}</p><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Başarı", `${result.successRate}%`], ["Grup", `${result.completedGroups}/${result.totalGroups}`], ["Kelime", result.totalWords], ["Süre", formatDuration(result.durationSeconds)]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p></article>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button className={FULLSCREEN_PRIMARY_BUTTON_CLASS} onClick={reset}>Yeniden Başlat</button><button className={FULLSCREEN_PRIMARY_BUTTON_CLASS} onClick={() => router.push(`/sonuc?exerciseType=grouping-reading&correct=0&wrong=0&successRate=${result.successRate}&score=${result.score}`)}>Ortak Sonuç</button></div><Link href="/egzersizler" className="mt-3 inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-red-200 bg-white font-bold text-red-800">Egzersizlere Dön</Link></section>;

  return <FullscreenExerciseShell title="Gruplama Çalışması" subtitle={phase === "ready" ? "Hazırlık modu" : (selected?.title ?? "Çalışma")} stats={[ { label: "Grup", value: `${groupSize} kelime` }, { label: "Hız", value: speedMode === "milliseconds" ? `${intervalMs} ms` : `${safeWordsPerMinute} kelime/dk` }, { label: "Süre", value: formatDuration(elapsed) }]} footer={controls} mainClassName="flex items-center justify-center px-2 pt-3 pb-[42dvh] md:px-4 md:pt-4 md:pb-[34dvh] lg:pb-32" stageClassName="mt-3 flex min-h-[54vh] max-h-[calc(100dvh-180px)] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/80 bg-white px-3 py-4 shadow-lg md:px-6 md:py-6">
    {loading ? <p className="font-bold">Metinler yükleniyor...</p> : loadError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-900">{loadError}</p> : !texts.length ? <div className="text-center"><p className="font-bold">Aktif metin bulunamadı.</p>{isTeacher ? <Link href="/ogretmen/icerik-yonetimi/metin-kutuphanesi" className="mt-3 inline-flex rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-white">Metin Ekle</Link> : null}</div> : phase === "ready" ? <div className="text-center"><h2 className="text-3xl font-black md:text-5xl">Ayarlarını seç, hazır olduğunda başlat.</h2><p className="mx-auto mt-4 max-w-2xl text-slate-500">Aktif grubun orta noktasına odaklan. Gölge kalktıkça kelimeleri tek bakışta görmeye çalış.</p><div className="mt-5 grid gap-2 text-sm font-bold sm:grid-cols-4"><span>Kelime: {totalWords}</span><span>Grup: {totalGroups}</span><span>Tahmini: {formatDuration(estimatedSeconds)}</span><span>Hız: {estimatedWpm} kelime/dk</span></div></div> : <div className="flex min-h-0 w-full max-w-6xl flex-col gap-4"><div ref={areaRef} className="min-h-0 max-h-[calc(100dvh-220px)] flex-1 overflow-y-auto rounded-[26px] border border-red-100 bg-white p-4 pb-44 md:pb-32" style={{ fontSize: `${fontSize}px`, lineHeight: 2 }}>{groups.map((group, i) => { const active = i === index; const past = i < index; return <span key={`${group.join("-")}-${i}`} ref={active ? activeRef : null} className={`relative mr-2 mb-2 inline-flex rounded-lg px-2 py-1 transition ${active ? "bg-white text-slate-950 shadow-[0_0_0_2px_rgba(220,38,38,0.5)]" : displayMode === "fade" && past ? "text-slate-300 opacity-25" : "bg-slate-900/75 text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.65)]"}`}>{group.join(" ")}</span>})}</div><div><div className="mb-2 flex justify-between font-bold"><span>{progress}% tamamlandı</span><span>{completedGroups}/{totalGroups}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${progress}%` }} /></div></div>{paused ? <p className="text-center font-semibold text-red-700">Duraklatıldı.</p> : null}</div>}
  </FullscreenExerciseShell>;
}


