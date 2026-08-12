import { NextRequest, NextResponse } from "next/server";
import { GameRoomError, isGameRoomId, resolveGameRoomActor, runGameRoomAction } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";

type Context = { params: Promise<{ roomId: string }> };
type ActionBody = { action?: unknown; playerId?: unknown; isReady?: unknown };

export async function POST(request: NextRequest, context: Context) {
  try {
    if (!allowMultiplayerRequest(request, "action")) return NextResponse.json({ ok: false, message: "Çok fazla işlem isteği. Lütfen biraz bekleyin." }, { status: 429 });
    const actor = await resolveGameRoomActor(request);
    const { roomId } = await context.params;
    if (!isGameRoomId(roomId)) throw new GameRoomError(400, "Oda kimliği geçersiz.");
    const body = await request.json().catch(() => ({})) as ActionBody;
    const action = typeof body.action === "string" ? body.action : "";
    const playerId = typeof body.playerId === "string" ? body.playerId : undefined;
    const desiredReady = typeof body.isReady === "boolean" ? body.isReady : undefined;
    const result = await runGameRoomAction(actor, roomId, action, playerId, desiredReady);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Oda işlemi tamamlanamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
