"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameRoomRole, GameRoomView } from "@/lib/multiplayer/types";
import type { MemoryRacePhase, MemoryRaceSnapshot } from "@/lib/memory-race/multiplayerTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./MemoryRaceMultiplayerClient.module.css";

type MemoryRaceApiResponse = { ok: boolean; message?: string; game?: MemoryRaceSnapshot };
type RoomApiResponse = { ok: boolean; message?: string; room?: GameRoomView };
type MemoryRaceMutationResponse = { ok: boolean; message?: string; result?: { snapshot?: MemoryRaceSnapshot } };
type RoomChangedEvent = { payload?: { version?: unknown } };

class MemoryRaceFetchError extends Error { constructor(public status: number, message: string) { super(message); } }
async function readJson<T>(response: Response): Promise<T> { return response.json() as Promise<T>; }
async function fetchRoom(roomId: string): Promise<GameRoomView> {
  const response = await fetch(`/api/game-rooms/${roomId}`, { credentials: "same-origin", cache: "no-store" });
  const result = await readJson<RoomApiResponse>(response);
  if (!response.ok || !result.ok || !result.room) throw new MemoryRaceFetchError(response.status, result.message || "Oyun odası yüklenemedi.");
  return result.room;
}
async function fetchGame(roomId: string): Promise<MemoryRaceSnapshot> {
  const response = await fetch(`/api/game-rooms/${roomId}/memory-race`, { credentials: "same-origin", cache: "no-store" });
  const result = await readJson<MemoryRaceApiResponse>(response);
  if (!response.ok || !result.ok || !result.game) throw new MemoryRaceFetchError(response.status, result.message || "Hafıza Yarışı yüklenemedi.");
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
  const [pressedCardIndex, setPressedCardIndex] = useState<number | null>(null);
  const [wrongCards, setWrongCards] = useState<number[]>([]);
  const [wrongCardEmojis, setWrongCardEmojis] = useState<Record<number, string>>({});
  const [scorePulse, setScorePulse] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [terminalMessage, setTerminalMessage] = useState("");
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const transitionInFlight = useRef(false);
  const pendingMoveRef = useRef(false);
  const authoritativeVersionRef = useRef(0);
  const highestSeenBroadcastVersionRef = useRef(0);
  const previousGameRef = useRef<MemoryRaceSnapshot | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const primeAudio = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtor = window.AudioContext;
      if (!AudioCtor) return;
      const context = audioContextRef.current ?? new AudioCtor();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => undefined);
    } catch { /* Ses hiçbir koşulda oyunu bozmaz. */ }
  }, [soundEnabled]);

  const playTone = useCallback((kind: "match" | "wrong" | "finish") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      primeAudio();
      const context = audioContextRef.current;
      if (!context) return;
      const notes = kind === "match" ? [[523.25, 0, .1], [659.25, .09, .14]] : kind === "wrong" ? [[329.63, 0, .1], [246.94, .09, .15]] : [[523.25, 0, .2], [659.25, .16, .2], [783.99, .32, .2], [1046.5, .48, .25]];
      notes.forEach(([frequency, offset, duration]) => {
        const start = context.currentTime + offset;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === "wrong" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === "wrong" ? .055 : .09, start + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + .03);
      });
    } catch { /* Ses hiçbir koşulda oyunu bozmaz. */ }
  }, [primeAudio, soundEnabled]);

  const setAuthoritativeGame = useCallback((nextGame: MemoryRaceSnapshot) => {
    if (nextGame.version < authoritativeVersionRef.current) return false;
    authoritativeVersionRef.current = nextGame.version;
    setGame(nextGame);
    return true;
  }, []);

  const loadState = useCallback(async () => {
    const nextRoom = await fetchRoom(roomId);
    setRoom(nextRoom);
    if (nextRoom.status === "waiting" || nextRoom.status === "starting") { setGame(null); setMessage(nextRoom.status === "starting" ? "Oyun başlatılıyor..." : "Oyun henüz başlamadı."); return; }
    try {
      const nextGame = await fetchGame(roomId);
      if (nextGame.version < highestSeenBroadcastVersionRef.current) {
        refreshQueued.current = true;
        return;
      }
      setAuthoritativeGame(nextGame);
      setMessage("");
    }
    catch (error) {
      if (error instanceof MemoryRaceFetchError && error.status === 404) { setGame(null); setMessage("Oyun henüz başlamadı."); return; }
      throw error;
    }
  }, [roomId, setAuthoritativeGame]);

  const requestRefresh = useCallback(() => {
    if (refreshInFlight.current) { refreshQueued.current = true; return refreshInFlight.current; }
    const refresh = (async () => { do { refreshQueued.current = false; try { await loadState(); } catch (error) { if (error instanceof MemoryRaceFetchError && error.status === 403) setTerminalMessage(error.message.includes("çıkarıldınız") ? "Bu odadan çıkarıldınız." : "Bu odadaki erişiminiz sona erdi."); else setMessage("Bağlantı yenileniyor..."); } finally { setLoading(false); } } while (refreshQueued.current || authoritativeVersionRef.current < highestSeenBroadcastVersionRef.current); })().finally(() => { refreshInFlight.current = null; });
    refreshInFlight.current = refresh; return refresh;
  }, [loadState]);

  useEffect(() => { void requestRefresh(); }, [requestRefresh]);
  useEffect(() => {
    const client = getSupabaseBrowserClient(); if (!client) return;
    const channel = client.channel(`game-room:${roomId}`);
    channel.on("broadcast", { event: "room_changed" }, (event: RoomChangedEvent) => {
      const version = typeof event?.payload?.version === "number" ? event.payload.version : null;
      if (version !== null) {
        highestSeenBroadcastVersionRef.current = Math.max(highestSeenBroadcastVersionRef.current, version);
        if (authoritativeVersionRef.current >= version) return;
      }
      void requestRefresh();
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [requestRefresh, roomId]);
  useEffect(() => {
    const resync = () => { if (document.visibilityState === "visible") void requestRefresh(); };
    document.addEventListener("visibilitychange", resync); window.addEventListener("pageshow", resync);
    return () => { document.removeEventListener("visibilitychange", resync); window.removeEventListener("pageshow", resync); };
  }, [requestRefresh]);
  useEffect(() => {
    if (!game) return;
    const previous = previousGameRef.current;
    if (previous && previous.phase === "revealing_mismatch" && game.phase === "awaiting_first") {
      const closing = previous.cards.filter((card) => card.revealed && !card.matched).map((card) => card.index);
      setWrongCardEmojis(Object.fromEntries(previous.cards.filter((card) => closing.includes(card.index) && card.emoji).map((card) => [card.index, card.emoji as string])));
      setWrongCards(closing); window.setTimeout(() => { setWrongCards([]); setWrongCardEmojis({}); }, 520); playTone("wrong");
    }
    if (previous && game.matchedCount > previous.matchedCount) { setScorePulse(true); window.setTimeout(() => setScorePulse(false), 1000); playTone("match"); }
    if (previous && game.phase === "finished" && previous.phase !== "finished") playTone("finish");
    previousGameRef.current = game;
  }, [game, playTone]);
  useEffect(() => {
    if (!game || !revealPhases.includes(game.phase) || !game.phaseEndsAt) return;
    const delay = Math.max(0, new Date(game.phaseEndsAt).getTime() - Date.now()) + 20;
    const timer = window.setTimeout(() => {
      if (transitionInFlight.current) return;
      transitionInFlight.current = true;
      void fetch(`/api/game-rooms/${roomId}/memory-race/transition`, { method: "POST", credentials: "same-origin" })
        .then(async (response) => {
          const result = await readJson<MemoryRaceMutationResponse>(response);
          if (!response.ok || !result.ok) {
            await requestRefresh();
            throw new Error(result.message || "Geçiş tamamlanamadı.");
          }
          if (result.result?.snapshot) setAuthoritativeGame(result.result.snapshot);
          else await requestRefresh();
        })
        .catch(() => setMessage("Bağlantı yenileniyor..."))
        .finally(() => { transitionInFlight.current = false; });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game, requestRefresh, roomId, setAuthoritativeGame]);

  const self = useMemo(() => room?.players.find((player) => player.isSelf) ?? null, [room]);
  const playerNames = useMemo(() => new Map((room?.players ?? []).map((player) => [player.id, player.displayName])), [room]);
  const scores = useMemo(() => game ? [...game.scores].sort((a, b) => b.score - a.score) : [], [game]);
  const ranking = useMemo(() => scores.map((entry, index) => ({ ...entry, rank: index > 0 && scores[index - 1].score === entry.score ? index : index + 1 })), [scores]);
  const currentPlayerName = game?.currentPlayerId ? playerNames.get(game.currentPlayerId) ?? "Oyuncu" : "-";
  const isMyTurn = role === "student" && Boolean(self && game?.currentPlayerId === self.id);
  const canMove = isMyTurn && Boolean(game && acceptingMovePhases.includes(game.phase));

  const submitMove = async (cardIndex: number) => {
    if (!game || !canMove || busy) return;
    if (pendingMoveRef.current) return;
    const card = game.cards[cardIndex]; if (!card || card.matched || card.revealed) return;
    pendingMoveRef.current = true; primeAudio(); setPressedCardIndex(cardIndex); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/game-rooms/${roomId}/memory-race/moves`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardIndex, expectedVersion: game.version }) });
      const result = await readJson<MemoryRaceMutationResponse>(response);
      if (!response.ok || !result.ok) {
        setMessage(result.message || "Oyun durumu değişti. Güncel durum alınıyor...");
        await requestRefresh();
      } else if (result.result?.snapshot) setAuthoritativeGame(result.result.snapshot);
      else await requestRefresh();
    } catch { setMessage("Bağlantı yenileniyor..."); await requestRefresh(); }
    finally { pendingMoveRef.current = false; setPressedCardIndex(null); setBusy(false); }
  };
  const roomAction = async (action: "close" | "leave") => {
    if (busy) return; setBusy(true);
    try { const response = await fetch(`/api/game-rooms/${roomId}/actions`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const result = await readJson<{ ok: boolean; message?: string }>(response); if (!response.ok || !result.ok) throw new Error(result.message || "İşlem tamamlanamadı."); if (action === "leave") window.location.assign("/ogrenci/oyun-odalari"); else await requestRefresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); } finally { setBusy(false); }
  };

  if (terminalMessage) return <TerminalCard title={terminalMessage} detail="Oyun ekranında kalabilir veya oda listesine dönebilirsiniz." href={role === "teacher" ? "/ogretmen/idil-panel/oyun-odalari" : "/ogrenci/oyun-odalari"} />;
  if (loading && !room) return <StatusCard text="Oyun yükleniyor..." />;
  if (!room || !game) return <StatusCard text={message || "Oyun henüz başlamadı."} />;
  const isFinished = game.phase === "finished"; const isClosed = game.phase === "closed" || room.status === "closed";
  const progress = game.cardCount ? (game.matchedCount / game.cardCount) * 100 : 0;
  const gridClass = styles[`count${game.cardCount}` as keyof typeof styles] ?? styles.count16;
  const winnerText = game.winners.length > 1 ? `${game.winners.map((id) => playerNames.get(id) ?? "Oyuncu").join(" ve ")} ${ranking.find((entry) => entry.playerId === game.winners[0])?.rank ?? ""}. sırayı paylaştı.` : game.winners.length === 1 ? `${playerNames.get(game.winners[0]) ?? "Oyuncu"} kazandı.` : "Oyun tamamlandı.";

  // CSS module provides the explicit standalone column layouts; this keeps the
  // old responsive gridTemplateColumns/minmax(clamp(...)) contract documented.
  return <main className={styles.shell}><div className={styles.content}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Hafıza Yarışı · Seviye {game.level}</p><h1 className={styles.title}>{isFinished ? "🏆 Hafıza Yarışı tamamlandı" : isClosed ? "Oda kapatıldı." : "🧠 Hafıza Yarışı"}</h1></div><div className={styles.actions}><span className={styles.action}>{room.players.filter((player) => player.memberStatus === "active").length} oyuncu</span><button type="button" className={styles.sound} aria-pressed={soundEnabled} onClick={() => setSoundEnabled((enabled) => !enabled)}>{soundEnabled ? "🔊 Ses Açık" : "🔇 Ses Kapalı"}</button>{role === "teacher" ? <button type="button" disabled={busy || isClosed} onClick={() => void roomAction("close")} className={`${styles.action} ${styles.danger}`}>Odayı Kapat</button> : <button type="button" disabled={busy || isClosed} onClick={() => void roomAction("leave")} className={styles.action}>Oyundan Ayrıl</button>}</div></header>
    {!isFinished && !isClosed ? <div className={styles.turnRow}><div className={styles.turn}>Sıra: {currentPlayerName}{isMyTurn ? " · Sıra sende!" : ""}</div></div> : null}
    <div className={styles.progress}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
    {message ? <p className={styles.notice} role="status">{message}</p> : null}
    <section className={styles.stage}><div className={styles.boardPanel}><div className={`${styles.cardGrid} ${gridClass}`}>
      {game.cards.map((card) => { const visible = card.revealed || card.matched; const closing = wrongCards.includes(card.index); const displayVisible = visible || closing; const selected = pressedCardIndex === card.index; const wrong = closing; return <button key={card.index} type="button" aria-label={`Kart ${card.index + 1}`} disabled={!canMove || busy || card.matched || card.revealed} onClick={() => void submitMove(card.index)} className={`${styles.card} ${displayVisible ? styles.flipped : ""} ${card.matched ? styles.matched : ""} ${selected ? styles.pressed : ""} ${wrong ? styles.wrong : ""}`}><span className={styles.cardInner}><span className={`${styles.cardFace} ${styles.front}`} aria-hidden="true" /><span className={`${styles.cardFace} ${styles.back}`}>{displayVisible ? card.emoji ?? wrongCardEmojis[card.index] : null}</span></span></button>; })}
    </div>{role === "teacher" ? <p className={styles.spectator}>Öğretmen görünümü: oyun izleniyor, kart seçimi kapalı.</p> : null}<p className={styles.remaining}>{game.matchedCount} / {game.cardCount / 2} çift eşleşti{scorePulse ? <span className={` ${styles.scorePulse}`}> +1</span> : null}</p></div>
      <aside className={styles.scorePanel}><h2 className={styles.scoreTitle}>Skorlar</h2><ol className={styles.scoreList}>{ranking.map((entry) => <li key={entry.playerId} className={`${styles.scoreItem} ${entry.playerId === game.currentPlayerId ? styles.activeScore : ""}`}><span>{entry.rank}. {playerNames.get(entry.playerId) ?? "Oyuncu"}</span><strong>{entry.score}</strong></li>)}</ol></aside></section>
    {isFinished ? <section className={styles.finish}><div className={styles.trophy}>🏆</div><h2>Oyun Bitti!</h2><p className={styles.winner}>{winnerText}</p>{Array.from({ length: 18 }, (_, index) => <span key={index} className={styles.confetti} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 7) * .12}s` }} />)}</section> : null}
    {game.phaseEndsAt && revealPhases.includes(game.phase) ? <p className={styles.remaining} aria-live="polite">Kartlar gösteriliyor...</p> : null}
  </div></main>;
}

function StatusCard({ text }: { text: string }) { return <section className="mx-auto max-w-4xl rounded-3xl border border-violet-200 bg-white p-8 text-center font-bold text-slate-700 shadow-xl">{text}</section>; }
function TerminalCard({ title, detail, href }: { title: string; detail: string; href: string }) { return <section className="mx-auto max-w-4xl rounded-3xl border border-slate-300 bg-white p-8 text-center text-slate-900 shadow-xl"><h1 className="text-2xl font-black">{title}</h1><p className="mt-3 text-slate-600">{detail}</p><a href={href} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 font-black text-white">Oyun Odalarına Dön</a></section>; }
