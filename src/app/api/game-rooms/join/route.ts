import { NextRequest, NextResponse } from "next/server";
import { GameRoomError, joinGameRoom, resolveGameRoomActor } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";

export async function POST(request: NextRequest) {
  try {
    if (!allowMultiplayerRequest(request, "join")) return NextResponse.json({ ok: false, message: "Çok fazla katılım isteği. Lütfen biraz bekleyin." }, { status: 429 });
    const actor = await resolveGameRoomActor(request);
    const body = await request.json().catch(() => ({})) as { roomCode?: unknown };
    const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim() : "";
    if (!/^\d{6}$/.test(roomCode)) throw new GameRoomError(400, "6 haneli oda kodunu girin.");
    const membership = await joinGameRoom(actor, roomCode);
    return NextResponse.json({ ok: true, roomId: membership.roomId });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Odaya katılım tamamlanamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
