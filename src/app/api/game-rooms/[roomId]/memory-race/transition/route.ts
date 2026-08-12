import { NextRequest, NextResponse } from "next/server";
import { transitionMemoryRace } from "@/lib/memory-race/multiplayerServer";
import { GameRoomError, isGameRoomId, resolveGameRoomActor } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";

type Context = { params: Promise<{ roomId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    if (!allowMultiplayerRequest(request, "action")) {
      return NextResponse.json({ ok: false, message: "Çok fazla oyun geçişi. Lütfen biraz bekleyin." }, { status: 429 });
    }
    const actor = await resolveGameRoomActor(request);
    const { roomId } = await context.params;
    if (!isGameRoomId(roomId)) throw new GameRoomError(400, "Oda kimliği geçersiz.");
    const result = await transitionMemoryRace(actor, roomId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Hafıza Yarışı geçişi tamamlanamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
