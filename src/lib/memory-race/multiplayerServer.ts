import "server-only";

import { GameRoomError, broadcastGameRoomChange, getGameRoomView, type GameRoomActor } from "@/lib/multiplayer/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { buildMemoryRaceSnapshot, type MemoryRaceSnapshotRow } from "./multiplayerSnapshot";
import type { MemoryRaceSnapshot } from "./multiplayerTypes";

const MEMORY_RACE_GAMES_TABLE = "memory_race_games";

function db() {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new GameRoomError(500, "Hafıza Yarışı servisi kullanılamıyor.");
  return client;
}

function mapMemoryRaceDatabaseError(error: { message?: string } | null): never {
  const value = error?.message ?? "";
  const messages: Record<string, [number, string]> = {
    room_not_found: [404, "Bu oda bulunamadı."],
    game_not_found: [404, "Hafıza Yarışı henüz başlatılmadı."],
    room_expired: [410, "Bu odanın süresi dolmuş."],
    forbidden: [403, "Bu işlem için yetkiniz yok."],
    player_not_in_room: [403, "Bu odanın aktif oyuncusu değilsiniz."],
    teacher_cannot_move: [403, "Öğretmen öğrenci adına kart seçemez."],
    wrong_player: [409, "Şu anda başka bir oyuncunun sırası."],
    stale_version: [409, "Oyun durumu değişti. Güncel durum yeniden alınmalı."],
    invalid_card_index: [400, "Kart seçimi geçersiz."],
    card_already_open: [409, "Bu kart zaten açık."],
    card_already_matched: [409, "Bu kart daha önce eşleştirildi."],
    phase_not_accepting_move: [409, "Oyun şu anda kart seçimi kabul etmiyor."],
    room_not_playing: [409, "Oda aktif bir oyun durumunda değil."],
    game_closed: [409, "Oyun odası kapatılmış."],
  };
  const match = Object.entries(messages).find(([key]) => value.includes(key));
  throw new GameRoomError(match?.[1][0] ?? 500, match?.[1][1] ?? "Hafıza Yarışı işlemi tamamlanamadı.");
}

export async function getMemoryRaceSnapshot(actor: GameRoomActor, roomId: string): Promise<MemoryRaceSnapshot> {
  const room = await getGameRoomView(actor, roomId);
  const { data, error } = await db()
    .from(MEMORY_RACE_GAMES_TABLE)
    .select("room_id,level,board,phase,current_player_id,first_card_index,second_card_index,matched_card_indices,scores,version,phase_ends_at")
    .eq("room_id", roomId)
    .maybeSingle();
  if (error) mapMemoryRaceDatabaseError(error);
  if (!data) throw new GameRoomError(404, "Hafıza Yarışı henüz başlatılmadı.");

  try {
    const playerIds = room.players.map((player) => player.id);
    const eligibleWinnerIds = room.players
      .filter((player) => player.memberStatus === "active")
      .map((player) => player.id);
    return buildMemoryRaceSnapshot(data as MemoryRaceSnapshotRow, playerIds, eligibleWinnerIds);
  } catch {
    throw new GameRoomError(500, "Hafıza Yarışı durumu okunamadı.");
  }
}

export async function submitMemoryRaceMove(
  actor: GameRoomActor,
  roomId: string,
  cardIndex: number,
  expectedVersion: number,
) {
  if (actor.role !== "student") throw new GameRoomError(403, "Öğretmen öğrenci adına kart seçemez.");
  const { data, error } = await db().rpc("submit_memory_race_move_v1", {
    p_room_id: roomId,
    p_student_id: actor.studentId,
    p_card_index: cardIndex,
    p_expected_version: expectedVersion,
  });
  if (error) mapMemoryRaceDatabaseError(error);
  await broadcastInvalidation(roomId, "memory_race_move");
  return data;
}

export async function transitionMemoryRace(actor: GameRoomActor, roomId: string) {
  const { data, error } = await db().rpc("transition_memory_race_game_v1", {
    p_room_id: roomId,
    p_student_id: actor.role === "student" ? actor.studentId : null,
    p_host_session_hash: actor.role === "teacher" ? actor.ownerHash : null,
  });
  if (error) mapMemoryRaceDatabaseError(error);
  const result = data as { changed?: boolean } | null;
  if (result?.changed) await broadcastInvalidation(roomId, "memory_race_transition");
  return data;
}

async function broadcastInvalidation(roomId: string, action: string) {
  try {
    await broadcastGameRoomChange(roomId, action);
  } catch (error) {
    console.error("Memory Race Realtime notification failed", error);
  }
}
