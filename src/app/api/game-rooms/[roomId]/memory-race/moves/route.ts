import { NextRequest, NextResponse } from "next/server";
import { submitMemoryRaceMove } from "@/lib/memory-race/multiplayerServer";
import { GameRoomError, isGameRoomId, resolveGameRoomActor } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";

type Context = { params: Promise<{ roomId: string }> };
type MoveBody = { cardIndex?: unknown; expectedVersion?: unknown };

export async function POST(request: NextRequest, context: Context) {
  try {
    if (!allowMultiplayerRequest(request, "action")) {
      return NextResponse.json({ ok: false, message: "Çok fazla oyun hamlesi. Lütfen biraz bekleyin." }, { status: 429 });
    }
    const actor = await resolveGameRoomActor(request);
    const { roomId } = await context.params;
    if (!isGameRoomId(roomId)) throw new GameRoomError(400, "Oda kimliği geçersiz.");
    const body = await request.json().catch(() => ({})) as MoveBody;
    if (typeof body.cardIndex !== "number" || !Number.isInteger(body.cardIndex) || body.cardIndex < 0) {
      throw new GameRoomError(400, "Kart seçimi geçersiz.");
    }
    if (typeof body.expectedVersion !== "number" || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) {
      throw new GameRoomError(400, "Oyun sürümü geçersiz.");
    }
    const result = await submitMemoryRaceMove(actor, roomId, body.cardIndex, body.expectedVersion);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Hafıza Yarışı hamlesi tamamlanamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
