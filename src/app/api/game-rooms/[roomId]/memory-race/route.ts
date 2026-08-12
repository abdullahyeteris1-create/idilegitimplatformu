import { NextRequest, NextResponse } from "next/server";
import { getMemoryRaceSnapshot } from "@/lib/memory-race/multiplayerServer";
import { GameRoomError, isGameRoomId, resolveGameRoomActor } from "@/lib/multiplayer/server";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await resolveGameRoomActor(request);
    const { roomId } = await context.params;
    if (!isGameRoomId(roomId)) throw new GameRoomError(400, "Oda kimliği geçersiz.");
    const game = await getMemoryRaceSnapshot(actor, roomId);
    return NextResponse.json({ ok: true, game }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Hafıza Yarışı yüklenemedi.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
