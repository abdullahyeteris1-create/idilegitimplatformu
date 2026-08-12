"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameRoomRole, GameRoomView } from "@/lib/multiplayer/types";
import type { MemoryRacePhase, MemoryRaceSnapshot } from "@/lib/memory-race/multiplayerTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type MemoryRaceApiResponse = { ok: boolean; message?: string; game?: MemoryRaceSnapshot };
type RoomApiResponse = { ok: boolean; message?: string; room?: GameRoomView };

class MemoryRaceFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function fetchRoom(roomId: string): Promise<GameRoomView> {
  const response = await fetch(`/api/game-rooms/${roomId}`, { credentials: "same-origin", cache: "no-store" });
  const result = await readJson<RoomApiResponse>(response);
  if (!response.ok || !result.ok || !result.room) {
    throw new MemoryRaceFetchError(response.status, result.message || "Oyun odası yüklenemedi.");
  }
  return result.room;
}

async function fetchGame(roomId: string): Promise<MemoryRaceSnapshot> {
  const response = await fetch(`/api/game-rooms/${roomId}/memory-race`, { credentials: "same-origin", cache: "no-store" });
  const result = await readJson<MemoryRaceApiResponse>(response);
  if (!response.ok || !result.ok || !result.game) {
    throw new MemoryRaceFetchError(response.status, result.message || "Hafıza Yarışı yüklenemedi.");
  }
  return result.game;
}

const acceptingMovePhases: MemoryRacePhase[] = ["awaiting_first", "awaiting_second"];
const revealPhases: MemoryRacePhase[] = ["revealing_match", "revealing_mismatch"];

export function MemoryRaceMultiplayerClient({ roomId, role }: { roomId: string; role: GameRoomRole }) {
  const [room, setRoom] = useState<GameRoomView | null>(null);
  const [game, setGame] = useState<MemoryRaceSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [terminalMessage, setTerminalMessage] = useState("");
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const transitionInFlight = useRef(false);

  const loadState = useCallback(async () => {
    const nextRoom = await fetchRoom(roomId);
    setRoom(nextRoom);
    if (nextRoom.status === "waiting" || nextRoom.status === "starting") {
      setGame(null);
      setMessage(nextRoom.status === "starting" ? "Oyun başlatılıyor..." : "Oyun henüz başlamadı.");
      return;
    }

    try {
      setGame(await fetchGame(roomId));
      setMessage("");
    } catch (error) {
      if (error instanceof MemoryRaceFetchError && error.status === 404) {
        setGame(null);
        setMessage("Oyun henüz başlamadı.");
        return;
      }
      throw error;
    }
  }, [roomId]);

  const requestRefresh = useCallback(() => {
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return refreshInFlight.current;
    }
    const refresh = (async () => {
      do {
        refreshQueued.current = false;
        try {
          await loadState();
        } catch (error) {
          if (error instanceof MemoryRaceFetchError && error.status === 403) {
            setTerminalMessage(error.message.includes("çıkarıldınız") ? "Bu odadan çıkarıldınız." : "Bu odadaki erişiminiz sona erdi.");
          } else {
            setMessage("Bağlantı yenileniyor...");
          }
        } finally {
          setLoading(false);
        }
      } while (refreshQueued.current);
    })().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = refresh;
    return refresh;
  }, [loadState]);

  useEffect(() => {
    void requestRefresh();
  }, [requestRefresh]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`game-room:${roomId}`);
    channel.on("broadcast", { event: "room_changed" }, () => {
      void requestRefresh();
    }).subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [requestRefresh, roomId]);

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible") void requestRefresh();
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, [requestRefresh]);

  useEffect(() => {
    if (!game || !revealPhases.includes(game.phase) || !game.phaseEndsAt) return;
    const delay = Math.max(0, new Date(game.phaseEndsAt).getTime() - Date.now()) + 20;
    const timer = window.setTimeout(() => {
      if (transitionInFlight.current) return;
      transitionInFlight.current = true;
      void fetch(`/api/game-rooms/${roomId}/memory-race/transition`, {
        method: "POST",
        credentials: "same-origin",
      }).then(() => requestRefresh()).catch(() => setMessage("Bağlantı yenileniyor..."))
        .finally(() => { transitionInFlight.current = false; });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game, requestRefresh, roomId]);

  const self = useMemo(() => room?.players.find((player) => player.isSelf) ?? null, [room]);
  const playerNames = useMemo(() => new Map((room?.players ?? []).map((player) => [player.id, player.displayName])), [room]);
  const scores = useMemo(() => {
    if (!game) return [];
    return [...game.scores].sort((a, b) => b.score - a.score);
  }, [game]);
  const ranking = useMemo(() => scores.map((entry, index) => ({
    ...entry,
    rank: index > 0 && scores[index - 1].score === entry.score ? index : index + 1,
  })), [scores]);
  const currentPlayerName = game?.currentPlayerId ? playerNames.get(game.currentPlayerId) ?? "Oyuncu" : "-";
  const isMyTurn = role === "student" && Boolean(self && game?.currentPlayerId === self.id);
  const canMove = isMyTurn && Boolean(game && acceptingMovePhases.includes(game.phase));

  const submitMove = async (cardIndex: number) => {
    if (!game || !canMove || busy) return;
    const card = game.cards[cardIndex];
    if (!card || card.matched || card.revealed) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/game-rooms/${roomId}/memory-race/moves`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIndex, expectedVersion: game.version }),
      });
      const result = await readJson<{ ok: boolean; message?: string }>(response);
      if (!response.ok || !result.ok) {
        setMessage(result.message || "Oyun durumu değişti. Güncel durum alınıyor...");
      }
      await requestRefresh();
    } catch {
      setMessage("Bağlantı yenileniyor...");
      await requestRefresh();
    } finally {
      setBusy(false);
    }
  };

  const roomAction = async (action: "close" | "leave") => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/game-rooms/${roomId}/actions`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await readJson<{ ok: boolean; message?: string }>(response);
      if (!response.ok || !result.ok) throw new Error(result.message || "İşlem tamamlanamadı.");
      if (action === "leave") window.location.assign("/ogrenci/oyun-odalari");
      else await requestRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  if (terminalMessage) {
    return <TerminalCard title={terminalMessage} detail="Oyun ekranında kalabilir veya oda listesine dönebilirsiniz." href={role === "teacher" ? "/ogretmen/idil-panel/oyun-odalari" : "/ogrenci/oyun-odalari"} />;
  }
  if (loading && !room) return <StatusCard text="Oyun yükleniyor..." />;
  if (!room || !game) return <StatusCard text={message || "Oyun henüz başlamadı."} />;

  const isFinished = game.phase === "finished";
  const isClosed = game.phase === "closed" || room.status === "closed";

  return (
    <main className="mx-auto w-full max-w-6xl rounded-[32px] border border-violet-300/40 bg-[radial-gradient(circle_at_top,rgba(217,70,239,.2),transparent_35%),linear-gradient(145deg,#111827,#1e1b4b)] p-4 text-white shadow-2xl md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-fuchsia-300">Hafıza Yarışı · Seviye {game.level}</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">{isFinished ? "🏆 Hafıza Yarışı tamamlandı" : isClosed ? "Oda kapatıldı." : "Hafıza Yarışı"}</h1>
          {!isFinished && !isClosed ? <p className="mt-2 text-violet-200">Sıra: <strong className="text-white">{currentPlayerName}</strong>{isMyTurn ? <span className="ml-2 rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-emerald-950">Sıra sende!</span> : null}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-black">
          <span className="rounded-full bg-white/10 px-3 py-2">{room.players.filter((player) => player.memberStatus === "active").length} oyuncu</span>
          {role === "teacher" ? <button type="button" disabled={busy || isClosed} onClick={() => void roomAction("close")} className="min-h-10 rounded-xl border border-red-300/30 bg-red-500/20 px-4 text-red-100 disabled:opacity-50">Odayı Kapat</button> : <button type="button" disabled={busy || isClosed} onClick={() => void roomAction("leave")} className="min-h-10 rounded-xl border border-white/20 bg-white/10 px-4 disabled:opacity-50">Oyundan Ayrıl</button>}
        </div>
      </header>

      {message ? <p className="mt-4 rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-center text-sm font-bold text-amber-100" role="status">{message}</p> : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_250px]">
        <div className="rounded-3xl border border-white/10 bg-black/15 p-3 md:p-5">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(clamp(2.7rem, 10vw, 5.6rem), 1fr))" }}>
            {game.cards.map((card) => {
              const visible = card.revealed || card.matched;
              return <button key={card.index} type="button" aria-label={`Kart ${card.index + 1}`} disabled={!canMove || busy || card.matched || card.revealed} onClick={() => void submitMove(card.index)} className={`aspect-square min-w-0 rounded-xl border text-2xl font-black shadow-lg transition-transform duration-200 sm:rounded-2xl sm:text-4xl ${card.matched ? "border-emerald-300 bg-emerald-400/25 text-white ring-2 ring-emerald-300/50" : visible ? "border-fuchsia-200 bg-fuchsia-100 text-slate-950" : "border-violet-200/30 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-transparent hover:-translate-y-1 disabled:hover:translate-y-0"} disabled:cursor-default`}><span aria-hidden={visible ? undefined : true}>{visible ? card.emoji : "?"}</span></button>;
            })}
          </div>
          {role === "teacher" ? <p className="mt-4 text-center text-xs font-bold text-violet-200">Öğretmen görünümü: oyun izleniyor, kart seçimi kapalı.</p> : null}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <h2 className="text-lg font-black">Skorlar</h2>
          <ol className="mt-3 space-y-2">
            {ranking.map((entry) => <li key={entry.playerId} className={`flex items-center justify-between rounded-xl px-3 py-2 ${entry.playerId === game.currentPlayerId ? "bg-fuchsia-400/20 ring-1 ring-fuchsia-300/50" : "bg-black/10"}`}><span className="min-w-0 truncate font-bold">{entry.rank}. {playerNames.get(entry.playerId) ?? "Oyuncu"}</span><strong>{entry.score}</strong></li>)}
          </ol>
          <p className="mt-5 text-center text-sm text-violet-200">{game.matchedCount} / {game.cardCount} kart eşleşti</p>
        </aside>
      </section>

      {isFinished ? <section className="mt-6 rounded-3xl border border-amber-200/30 bg-amber-300/10 p-5 text-center"><p className="text-2xl font-black">🏆 Sonuç</p><p className="mt-2 text-sm text-amber-100">{game.winners.length > 1 ? `${game.winners.map((id) => playerNames.get(id) ?? "Oyuncu").join(" ve ")} ${ranking.find((entry) => entry.playerId === game.winners[0])?.rank ?? ""}. sırayı paylaştı.` : game.winners.length === 1 ? `${playerNames.get(game.winners[0]) ?? "Oyuncu"} kazandı.` : "Oyun tamamlandı."}</p></section> : null}
      {game.phaseEndsAt && revealPhases.includes(game.phase) ? <p className="mt-4 text-center text-sm font-bold text-violet-200" aria-live="polite">Kartlar gösteriliyor...</p> : null}
    </main>
  );
}

function StatusCard({ text }: { text: string }) {
  return <section className="mx-auto max-w-4xl rounded-3xl border border-violet-200 bg-white p-8 text-center font-bold text-slate-700 shadow-xl">{text}</section>;
}

function TerminalCard({ title, detail, href }: { title: string; detail: string; href: string }) {
  return <section className="mx-auto max-w-4xl rounded-3xl border border-slate-300 bg-white p-8 text-center text-slate-900 shadow-xl"><h1 className="text-2xl font-black">{title}</h1><p className="mt-3 text-slate-600">{detail}</p><a href={href} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 font-black text-white">Oyun Odalarına Dön</a></section>;
}
