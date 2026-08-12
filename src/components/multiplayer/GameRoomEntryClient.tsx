"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameRoomApiResponse, GameRoomRole } from "@/lib/multiplayer/types";

const MEMORY_RACE_GAME_TYPE = "memory-race";
const MEMORY_RACE_LEVELS = {
  1: { cards: 16 },
  2: { cards: 20 },
  3: { cards: 24 },
  4: { cards: 32 },
  5: { cards: 40 },
  6: { cards: 60 },
} as const;
type MemoryRaceLevel = keyof typeof MEMORY_RACE_LEVELS;

export function GameRoomEntryClient({ role }: { role: GameRoomRole }) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [gameType, setGameType] = useState("");
  const [level, setLevel] = useState<MemoryRaceLevel>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(role === "teacher" ? "/api/game-rooms" : "/api/game-rooms/join", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role === "teacher" ? { maxPlayers, gameType: gameType || null, settings: gameType === MEMORY_RACE_GAME_TYPE ? { level } : {} } : { roomCode }),
      });
      const result = await response.json() as GameRoomApiResponse;
      if (!response.ok || !result.ok || !result.roomId) throw new Error(result.message || "İşlem tamamlanamadı.");
      const base = role === "teacher" ? "/ogretmen/idil-panel/oyun-odalari" : "/ogrenci/oyun-odalari";
      router.push(`${base}/${result.roomId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.2),transparent_36%),linear-gradient(145deg,#ffffff,#f5f3ff)] p-5 shadow-xl [data-idil-theme=dark]:border-violet-500/30 [data-idil-theme=dark]:bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.24),transparent_36%),linear-gradient(145deg,#111827,#1e1b4b)] md:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-5xl" aria-hidden="true">🎮</span>
        <p className="mt-3 text-xs font-black uppercase tracking-[.2em] text-violet-700 [data-idil-theme=dark]:text-violet-300">Oyun Odaları</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 [data-idil-theme=dark]:text-white md:text-4xl">
          {role === "teacher" ? "Yeni bir canlı lobi oluştur" : "Oda koduyla arkadaşlarına katıl"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 [data-idil-theme=dark]:text-slate-300">
          {role === "teacher" ? "6 haneli kodu öğrencilerinle paylaş; hazır durumlarını canlı takip et." : "Öğretmeninin paylaştığı 6 haneli kodu yaz. İsmin mevcut profilinden otomatik alınır."}
        </p>

        {role === "teacher" ? (
          <div className="mx-auto mt-6 grid max-w-xl gap-4 text-left sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700 [data-idil-theme=dark]:text-slate-200">
              Oyun türü
              <select value={gameType} onChange={(event) => { const next = event.target.value; setGameType(next); setMaxPlayers(next === MEMORY_RACE_GAME_TYPE ? 2 : 8); }} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-white">
                <option value="">Genel Oyun Odası</option>
                <option value={MEMORY_RACE_GAME_TYPE}>Hafıza Yarışı</option>
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700 [data-idil-theme=dark]:text-slate-200">
              Maksimum oyuncu
              <select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 [data-idil-theme=dark]:border-slate-600 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-white">
                {(gameType === MEMORY_RACE_GAME_TYPE ? [2, 3, 4] : [2, 4, 6, 8, 12, 16, 24]).map((value) => <option key={value} value={value}>{value} oyuncu</option>)}
              </select>
            </label>
            {gameType === MEMORY_RACE_GAME_TYPE ? <label className="text-sm font-bold text-slate-700 [data-idil-theme=dark]:text-slate-200 sm:col-span-2">
              Hafıza Yarışı seviyesi
              <select value={level} onChange={(event) => setLevel(Number(event.target.value) as MemoryRaceLevel)} className="mt-2 min-h-12 w-full rounded-xl border border-violet-300 bg-white px-3 text-slate-950 [data-idil-theme=dark]:border-violet-500 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-white">
                {(Object.keys(MEMORY_RACE_LEVELS) as unknown as MemoryRaceLevel[]).map((value) => <option key={value} value={value}>Seviye {value} · {MEMORY_RACE_LEVELS[value].cards} kart</option>)}
              </select>
            </label> : null}
          </div>
        ) : (
          <label className="mx-auto mt-6 block max-w-sm text-sm font-bold text-slate-700 [data-idil-theme=dark]:text-slate-200">
            Oda kodu
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="583921"
              className="mt-2 min-h-16 w-full rounded-2xl border-2 border-violet-300 bg-white px-4 text-center text-3xl font-black tracking-[.35em] text-slate-950 outline-none focus:border-violet-600 [data-idil-theme=dark]:border-violet-500 [data-idil-theme=dark]:bg-slate-950 [data-idil-theme=dark]:text-white"
              aria-describedby="room-code-help"
            />
            <small id="room-code-help" className="mt-2 block font-medium text-slate-500 [data-idil-theme=dark]:text-slate-400">Kod tam olarak 6 rakam olmalı.</small>
          </label>
        )}

        <button type="button" disabled={busy || (role === "student" && roomCode.length !== 6)} onClick={() => void submit()} className="mt-6 inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Hazırlanıyor..." : role === "teacher" ? "Oyun Odası Oluştur" : "Odaya Katıl"}
        </button>
        {message ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{message}</p> : null}
      </div>
    </section>
  );
}
