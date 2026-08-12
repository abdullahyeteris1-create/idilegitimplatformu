import "server-only";

import type { NextRequest } from "next/server";
import { getAdminSessionFromCookies, isAdminSessionValid } from "@/lib/auth/adminSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getStudentProfileById } from "@/lib/students/studentProfile";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { MEMORY_RACE_GAME_TYPE, createMemoryRaceBoard, isMemoryRaceLevel, isValidMemoryRaceBoard } from "@/lib/memory-race/multiplayerConfig";
import type { GameRoomRole, GameRoomStatus, GameRoomView } from "./types";

const GAME_ROOMS_TABLE = "game_rooms";
const GAME_ROOM_PLAYERS_TABLE = "game_room_players";

export type GameRoomActor =
  | { role: "teacher"; ownerHash: string; displayName: string }
  | { role: "student"; studentId: string; displayName: string; avatarUrl: string | null };

export class GameRoomError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isGameRoomId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resolveGameRoomActor(request: NextRequest): Promise<GameRoomActor> {
  if (isAdminSessionValid(request)) {
    const token = getAdminSessionFromCookies(request) ?? "";
    return {
      role: "teacher",
      ownerHash: await sha256(`game-room:${token}`),
      displayName: process.env.ADMIN_USERNAME?.trim() || "Öğretmen",
    };
  }

  const access = await verifyStudentAccess(request);
  if (!access.ok) throw new GameRoomError(access.status, access.message);
  const profile = await getStudentProfileById(access.studentId);
  const displayName = profile?.name?.trim();
  if (!profile || profile.id !== access.studentId || !displayName) {
    throw new GameRoomError(403, "Öğrenci profili doğrulanamadı.");
  }

  return {
    role: "student",
    studentId: access.studentId,
    displayName,
    avatarUrl: profile.profile_image_url?.trim() || null,
  };
}

function db() {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new GameRoomError(500, "Oyun odası servisi kullanılamıyor.");
  return client;
}

function mapDatabaseError(error: { message?: string } | null): never {
  const value = error?.message ?? "";
  const messages: Record<string, [number, string]> = {
    room_not_found: [404, "Bu oda bulunamadı."],
    room_expired: [410, "Bu odanın süresi dolmuş."],
    game_already_started: [409, "Oyun zaten başlamış."],
    room_not_waiting: [409, "Bu oda artık katılıma açık değil."],
    room_full: [409, "Oda maksimum oyuncu sayısına ulaştı."],
    player_kicked: [403, "Bu odadan çıkarıldınız."],
    player_not_in_room: [403, "Bu odanın aktif oyuncusu değilsiniz."],
    forbidden: [403, "Bu işlem için yetkiniz yok."],
    room_code_collision: [503, "Oda kodu üretilemedi. Lütfen tekrar deneyin."],
    invalid_max_players: [400, "Oyuncu sınırı geçersiz."],
    invalid_action: [400, "Oda işlemi geçersiz."],
    invalid_ready: [400, "Hazır durumu geçersiz."],
    wrong_game_type: [409, "Oda Hafıza Yarışı için oluşturulmamış."],
    invalid_level: [400, "Hafıza Yarışı seviyesi geçersiz."],
    invalid_board: [500, "Hafıza Yarışı kartları oluşturulamadı."],
    not_enough_players: [409, "Hafıza Yarışı için en az 2 aktif oyuncu gerekli."],
    too_many_players: [409, "Hafıza Yarışı en fazla 4 aktif oyuncuyla oynanabilir."],
  };
  const match = Object.entries(messages).find(([key]) => value.includes(key));
  throw new GameRoomError(match?.[1][0] ?? 500, match?.[1][1] ?? "Oyun odası işlemi tamamlanamadı.");
}

export async function createGameRoom(
  actor: GameRoomActor,
  maxPlayers: number,
  gameType: string | null = null,
  settings: Record<string, unknown> = {},
) {
  if (actor.role !== "teacher") throw new GameRoomError(403, "Yalnızca öğretmen oda oluşturabilir.");
  const { data, error } = await db().rpc("create_game_room_v1", {
    p_host_session_hash: actor.ownerHash,
    p_host_display_name: actor.displayName,
    p_max_players: maxPlayers,
    p_game_type: gameType,
    p_settings: settings,
  });
  if (error || !data) mapDatabaseError(error);
  return data as { roomId: string; roomCode: string };
}

export async function joinGameRoom(actor: GameRoomActor, roomCode: string) {
  if (actor.role !== "student") throw new GameRoomError(403, "Yalnızca öğrenciler oda koduyla katılabilir.");
  const { data, error } = await db().rpc("join_game_room_v1", {
    p_room_code: roomCode,
    p_student_id: actor.studentId,
    p_display_name: actor.displayName,
    p_avatar_url: actor.avatarUrl,
  });
  if (error || !data) mapDatabaseError(error);
  await notifyGameRoomChange(String((data as { roomId: string }).roomId), "join");
  return data as { roomId: string; playerId: string; reused: boolean };
}

export async function getGameRoomView(actor: GameRoomActor, roomId: string): Promise<GameRoomView> {
  const client = db();
  const { data: room, error: roomError } = await client
    .from(GAME_ROOMS_TABLE)
    .select("id,room_code,host_session_hash,host_display_name,status,game_type,max_players,expires_at,settings")
    .eq("id", roomId)
    .maybeSingle();
  if (roomError || !room) throw new GameRoomError(404, "Bu oda bulunamadı.");
  if (new Date(String(room.expires_at)).getTime() <= Date.now()) {
    throw new GameRoomError(410, "Bu odanın süresi dolmuş.");
  }

  const { data: players, error: playersError } = await client
    .from(GAME_ROOM_PLAYERS_TABLE)
    .select("id,student_id,display_name,avatar_url,is_ready,member_status,joined_at")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (playersError) throw new GameRoomError(500, "Oyuncu listesi yüklenemedi.");

  if (actor.role === "teacher") {
    if (room.host_session_hash !== actor.ownerHash) throw new GameRoomError(403, "Bu oda başka bir öğretmene ait.");
  } else {
    const membership = players?.find((player) => String(player.student_id) === actor.studentId);
    if (!membership || membership.member_status === "left") throw new GameRoomError(403, "Bu odanın aktif oyuncusu değilsiniz.");
    if (membership.member_status === "kicked") throw new GameRoomError(403, "Bu odadan çıkarıldınız.");
  }

  return {
    id: String(room.id),
    roomCode: String(room.room_code),
    hostDisplayName: String(room.host_display_name),
    status: room.status as GameRoomStatus,
    gameType: typeof room.game_type === "string" ? room.game_type : null,
    memoryRaceLevel:
      room.game_type === MEMORY_RACE_GAME_TYPE && room.settings && typeof room.settings === "object"
        && isMemoryRaceLevel((room.settings as Record<string, unknown>).level)
        ? (room.settings as Record<string, unknown>).level as number
        : null,
    maxPlayers: Number(room.max_players),
    expiresAt: String(room.expires_at),
    role: actor.role as GameRoomRole,
    players: (players ?? []).map((player) => ({
      id: String(player.id),
      displayName: String(player.display_name),
      avatarUrl: typeof player.avatar_url === "string" ? player.avatar_url : null,
      isReady: player.is_ready === true,
      isSelf: actor.role === "student" && String(player.student_id) === actor.studentId,
      memberStatus: player.member_status as "active" | "left" | "kicked",
    })),
  };
}

export async function runGameRoomAction(actor: GameRoomActor, roomId: string, action: string, playerId?: string, desiredReady?: boolean) {
  const client = db();
  let result;
  if (action === "ready") {
    if (actor.role !== "student") throw new GameRoomError(403, "Yalnızca öğrenciler hazır durumunu değiştirebilir.");
    if (typeof desiredReady !== "boolean") throw new GameRoomError(400, "Hazır durumu belirtilmedi.");
    result = await client.rpc("set_game_room_ready_v1", {
      p_room_id: roomId,
      p_student_id: actor.studentId,
      p_is_ready: desiredReady,
    });
  } else if (action === "leave") {
    if (actor.role !== "student") throw new GameRoomError(403, "Öğrenci üyeliği bulunamadı.");
    result = await client.rpc("leave_game_room_v1", { p_room_id: roomId, p_student_id: actor.studentId });
  } else {
    if (actor.role !== "teacher") throw new GameRoomError(403, "Bu işlem yalnızca öğretmene açıktır.");
    if (!(["start", "close", "kick"] as const).includes(action as "start" | "close" | "kick")) {
      throw new GameRoomError(400, "Oda işlemi geçersiz.");
    }
    if (action === "kick" && !playerId) throw new GameRoomError(400, "Oyuncu seçilmedi.");
    if (action === "start") {
      const { data: room, error: roomError } = await client
        .from(GAME_ROOMS_TABLE)
        .select("game_type,settings")
        .eq("id", roomId)
        .maybeSingle();
      if (roomError || !room) throw new GameRoomError(404, "Bu oda bulunamadı.");
      if (room.game_type === MEMORY_RACE_GAME_TYPE) {
        const settings = room.settings && typeof room.settings === "object" ? room.settings as Record<string, unknown> : {};
        const level = settings.level;
        if (!isMemoryRaceLevel(level)) throw new GameRoomError(400, "Hafıza Yarışı seviyesi geçersiz.");
        const board = createMemoryRaceBoard(level);
        if (!isValidMemoryRaceBoard(level, board)) throw new GameRoomError(500, "Hafıza Yarışı kartları oluşturulamadı.");
        result = await client.rpc("start_memory_race_game_v1", {
          p_room_id: roomId,
          p_host_session_hash: actor.ownerHash,
          p_level: level,
          p_board: board,
        });
      } else {
        result = await client.rpc("manage_game_room_v1", {
          p_room_id: roomId,
          p_host_session_hash: actor.ownerHash,
          p_action: action,
          p_player_id: playerId ?? null,
        });
      }
    } else {
      result = await client.rpc("manage_game_room_v1", {
        p_room_id: roomId,
        p_host_session_hash: actor.ownerHash,
        p_action: action,
        p_player_id: playerId ?? null,
      });
    }
  }
  if (result.error) mapDatabaseError(result.error);
  await notifyGameRoomChange(roomId, action);
  return result.data;
}

async function notifyGameRoomChange(roomId: string, action: string): Promise<void> {
  try {
    await broadcastGameRoomChange(roomId, action);
  } catch (error) {
    // DB islemi tamamlandiysa gecici Realtime kesintisi API sonucunu hataya
    // cevirmemeli. Istemci kendi mutasyonundan sonra snapshot'i zaten yeniler.
    console.error("Game room Realtime notification failed", error);
  }
}

export async function broadcastGameRoomChange(roomId: string, action: string, version?: number): Promise<void> {
  const client = db();
  const channel = client.channel(`game-room:${roomId}`);
  try {
    if (typeof version === "number") {
      await channel.httpSend("room_changed", { action, version });
    } else {
      await channel.httpSend("room_changed", { action });
    }
  } finally {
    await client.removeChannel(channel);
  }
}

export async function broadcastGameRoomEvent(roomId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  const client = db();
  const channel = client.channel(`game-room:${roomId}`);
  try {
    await channel.httpSend(event, payload);
  } finally {
    await client.removeChannel(channel);
  }
}
