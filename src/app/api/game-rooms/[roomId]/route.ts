import { NextRequest, NextResponse } from "next/server";
import { GameRoomError, getGameRoomView, isGameRoomId, resolveGameRoomActor } from "@/lib/multiplayer/server";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await resolveGameRoomActor(request);
    const { roomId } = await context.params;
    if (!isGameRoomId(roomId)) throw new GameRoomError(400, "Oda kimliği geçersiz.");
    const room = await getGameRoomView(actor, roomId);
    return NextResponse.json({ ok: true, room }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Oyun odası yüklenemedi.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
