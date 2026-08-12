import { NextRequest, NextResponse } from "next/server";
import { createGameRoom, GameRoomError, resolveGameRoomActor } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";

export async function POST(request: NextRequest) {
  try {
    if (!allowMultiplayerRequest(request, "create")) return NextResponse.json({ ok: false, message: "Çok fazla oda oluşturma isteği. Lütfen biraz bekleyin." }, { status: 429 });
    const actor = await resolveGameRoomActor(request);
    const body = await request.json().catch(() => ({})) as { maxPlayers?: unknown };
    const maxPlayers = typeof body.maxPlayers === "number" && Number.isInteger(body.maxPlayers) ? body.maxPlayers : 8;
    const room = await createGameRoom(actor, maxPlayers);
    return NextResponse.json({ ok: true, ...room }, { status: 201 });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Oyun odası oluşturulamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
