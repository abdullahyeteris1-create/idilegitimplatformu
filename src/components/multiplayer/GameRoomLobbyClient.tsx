"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GameRoomApiResponse, GameRoomRole, GameRoomView } from "@/lib/multiplayer/types";

class GameRoomFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchGameRoom(roomId: string): Promise<GameRoomView> {
  const response = await fetch(`/api/game-rooms/${roomId}`, { credentials: "same-origin", cache: "no-store" });
  const result = await response.json() as GameRoomApiResponse;
  if (!response.ok || !result.ok || !result.room) throw new GameRoomFetchError(response.status, result.message || "Oyun odası yüklenemedi.");
  return result.room;
}

export function GameRoomLobbyClient({ roomId, role }: { roomId: string; role: GameRoomRole }) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoomView | null>(null);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);

  const loadRoom = useCallback(async () => {
    try {
      const nextRoom = await fetchGameRoom(roomId);
      setRoom(nextRoom);
      setMessage("");
    } catch (error) {
      if (error instanceof GameRoomFetchError && (error.status === 403 || error.status === 410)) {
        setRoom(null);
        setMessage(error.message);
      } else if (error instanceof Error) {
        setMessage("Lobi güncellenemedi. Son alınan oda durumu korunuyor.");
      }
      throw error;
    }
  }, [roomId]);

  const requestRoomRefresh = useCallback(() => {
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return refreshInFlight.current;
    }

    const refresh = (async () => {
      do {
        refreshQueued.current = false;
        try {
          await loadRoom();
        } catch {
          // loadRoom keeps the last successful snapshot for transient failures.
        }
      } while (refreshQueued.current);
    })().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = refresh;
    return refresh;
  }, [loadRoom]);

  useEffect(() => {
    let cancelled = false;
    void fetchGameRoom(roomId).then((nextRoom) => {
      if (!cancelled) setRoom(nextRoom);
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Oyun odası yüklenemedi.");
    });
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    if (!room?.id) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`game-room:${roomId}`);

    channel
      .on("broadcast", { event: "room_changed" }, () => {
        void requestRoomRefresh().catch(() => undefined);
      })
      .subscribe((status) => {
        setRealtimeStatus(status);
        if (status === "SUBSCRIBED") void requestRoomRefresh().catch(() => undefined);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setMessage("Canlı güncelleme bağlantısı kurulamadı. Oda durumu son alınan haliyle gösteriliyor.");
        }
        if (status === "CLOSED") setMessage("Canlı güncelleme bağlantısı kapandı. Sayfayı yenileyerek tekrar bağlanabilirsiniz.");
      });

    return () => { void client.removeChannel(channel); };
  }, [requestRoomRefresh, room?.id, roomId]);

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible") void requestRoomRefresh().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, [requestRoomRefresh]);

  useEffect(() => {
    if (!room?.expiresAt) return;
    const delay = Math.max(0, new Date(room.expiresAt).getTime() - Date.now()) + 50;
    const timer = window.setTimeout(() => void requestRoomRefresh().catch(() => undefined), delay);
    return () => window.clearTimeout(timer);
  }, [requestRoomRefresh, room?.expiresAt]);

  useEffect(() => {
    if (room?.status !== "playing" || room.gameType !== "memory-race") return;
    const base = role === "teacher"
      ? "/ogretmen/idil-panel/oyun-odalari"
      : "/ogrenci/oyun-odalari";
    router.replace(`${base}/${roomId}/hafiza-yarisi`);
  }, [role, room?.gameType, room?.status, roomId, router]);

  const activePlayers = useMemo(() => room?.players.filter((player) => player.memberStatus === "active") ?? [], [room]);

  const act = async (action: "ready" | "start" | "kick" | "leave" | "close", playerId?: string) => {
    if (busyAction) return;
    setBusyAction(action);
    setMessage("");
    try {
      const currentPlayer = activePlayers.find((player) => player.isSelf);
      const desiredReady = action === "ready" ? !(currentPlayer?.isReady === true) : undefined;
      const response = await fetch(`/api/game-rooms/${roomId}/actions`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId, ...(desiredReady === undefined ? {} : { isReady: desiredReady }) }),
      });
      const result = await response.json() as GameRoomApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.message || "İşlem tamamlanamadı.");
      if (action === "leave" || action === "close") {
        router.replace(role === "teacher" ? "/ogretmen/idil-panel/oyun-odalari" : "/ogrenci/oyun-odalari");
        return;
      }
      await loadRoom();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusyAction("");
    }
  };

  if (!room) return <div className="mx-auto max-w-4xl rounded-3xl border border-violet-200 bg-white p-8 text-center font-bold text-slate-700">{message || "Lobi yükleniyor..."}</div>;
  if (room.status === "starting") {
    return <section className="mx-auto max-w-4xl rounded-[30px] border border-fuchsia-400/40 bg-gradient-to-br from-violet-950 to-fuchsia-900 p-10 text-center text-white shadow-2xl"><div className="text-7xl">🚀</div><h1 className="mt-5 text-3xl font-black">Oyun başlatılıyor...</h1><p className="mt-3 text-violet-100">Realtime oda durumu alındı. Bu geçici ekran ileride gerçek oyun route’una bağlanacak.</p></section>;
  }
  if (room.status === "closed" || room.status === "finished") {
    return <section className="mx-auto max-w-4xl rounded-[30px] border border-slate-300 bg-white p-10 text-center text-slate-900 shadow-xl [data-idil-theme=dark]:border-slate-700 [data-idil-theme=dark]:bg-slate-900 [data-idil-theme=dark]:text-white"><div className="text-6xl" aria-hidden="true">🏁</div><h1 className="mt-5 text-3xl font-black">Oyun odası kapandı</h1><p className="mt-3 text-slate-600 [data-idil-theme=dark]:text-slate-300">Yeni bir odaya katılmak için oda listesine dönebilirsin.</p><button type="button" onClick={() => router.replace(role === "teacher" ? "/ogretmen/idil-panel/oyun-odalari" : "/ogrenci/oyun-odalari")} className="mt-6 min-h-12 rounded-2xl bg-violet-700 px-5 font-black text-white">Oyun Odalarına Dön</button></section>;
  }

  return (
    <section className="mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-violet-400/30 bg-[radial-gradient(circle_at_top,rgba(217,70,239,.2),transparent_35%),linear-gradient(145deg,#111827,#1e1b4b)] p-4 text-white shadow-2xl md:p-8">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[.24em] text-fuchsia-300">🎮 Oyun Odası</p>
        <p className="mt-5 text-sm font-bold text-violet-200">ODA KODU</p>
        <h1 className="mt-1 text-5xl font-black tracking-[.16em] md:text-7xl">{room.roomCode}</h1>
      <p className="mt-3 text-sm text-violet-200">Kodu öğrencilerinle paylaş · Öğretmen: {room.hostDisplayName}</p>
      <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm font-black">
        <span className="rounded-full bg-fuchsia-400/20 px-3 py-1 text-fuchsia-100">{room.gameType === "memory-race" ? "Hafıza Yarışı" : "Genel Oyun Odası"}</span>
        {room.gameType === "memory-race" ? <span className="rounded-full bg-violet-400/20 px-3 py-1 text-violet-100">Seviye {room.memoryRaceLevel}</span> : null}
        <span className="rounded-full bg-white/10 px-3 py-1 text-violet-100">{activePlayers.length} / {room.maxPlayers} oyuncu</span>
      </div>
      </header>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3">
        {activePlayers.map((player) => {
          return <article key={player.id} className="flex min-h-16 flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-500/40 text-xl">{player.avatarUrl ? <Image src={player.avatarUrl} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover"/> : "👤"}</span>
            <div className="min-w-0 flex-1"><strong className="block truncate">{player.displayName}{player.isSelf ? " (Sen)" : ""}</strong><small className="text-slate-300">Odada kayıtlı</small></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${player.isReady ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-300/15 text-amber-200"}`}>{player.isReady ? "HAZIR ✓" : "BEKLİYOR"}</span>
            {role === "teacher" ? <button type="button" disabled={Boolean(busyAction)} onClick={() => void act("kick", player.id)} className="min-h-10 rounded-xl border border-red-300/30 bg-red-500/20 px-3 text-xs font-bold text-red-100 hover:bg-red-500/30">Çıkar</button> : null}
          </article>;
        })}
        {!activePlayers.length ? <p className="rounded-2xl border border-dashed border-violet-300/30 p-6 text-center text-violet-200">Öğrenciler bekleniyor...</p> : null}
      </div>

      <div className="mt-7 text-center"><strong className="text-lg">👥 {activePlayers.length} Oyuncu</strong><span className="ml-2 text-sm text-violet-300">/ {room.maxPlayers}</span></div>
      {message ? <p className="mx-auto mt-4 max-w-2xl rounded-xl border border-red-300/30 bg-red-500/20 p-3 text-center text-sm font-bold text-red-100" role="alert">{message}</p> : null}
      <p className="mt-3 text-center text-xs text-violet-300" aria-live="polite">Canlı güncelleme: {realtimeStatus === "SUBSCRIBED" ? "bağlı" : realtimeStatus === "CONNECTING" ? "bağlanıyor" : "beklemede"}</p>

      <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
        {role === "teacher" ? <><button type="button" disabled={Boolean(busyAction)} onClick={() => void act("start")} className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 font-black shadow-lg hover:brightness-110">🚀 Oyunu Başlat</button><button type="button" disabled={Boolean(busyAction)} onClick={() => void act("close")} className="min-h-12 rounded-2xl border border-red-300/30 bg-red-500/20 px-5 font-bold text-red-100">Odayı Kapat</button></> : <><button type="button" disabled={Boolean(busyAction)} onClick={() => void act("ready")} className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 font-black text-slate-950 shadow-lg">{activePlayers.find((player) => player.isSelf)?.isReady ? "Hazır Durumunu Kaldır" : "Hazırım"}</button><button type="button" disabled={Boolean(busyAction)} onClick={() => void act("leave")} className="min-h-12 rounded-2xl border border-white/20 bg-white/10 px-5 font-bold">Odadan Ayrıl</button></>}
      </div>
    </section>
  );
}
