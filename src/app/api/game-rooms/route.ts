import { NextRequest, NextResponse } from "next/server";
import { createGameRoom, GameRoomError, resolveGameRoomActor } from "@/lib/multiplayer/server";
import { allowMultiplayerRequest } from "@/lib/security/multiplayerRateLimit";
import { MEMORY_RACE_GAME_TYPE, isMemoryRaceLevel } from "@/lib/memory-race/multiplayerConfig";

export async function POST(request: NextRequest) {
  try {
    if (!allowMultiplayerRequest(request, "create")) return NextResponse.json({ ok: false, message: "Çok fazla oda oluşturma isteği. Lütfen biraz bekleyin." }, { status: 429 });
    const actor = await resolveGameRoomActor(request);
    const body = await request.json().catch(() => ({})) as { maxPlayers?: unknown; gameType?: unknown; settings?: unknown };
    const maxPlayers = typeof body.maxPlayers === "number" && Number.isInteger(body.maxPlayers) ? body.maxPlayers : 8;
    const gameType = body.gameType === undefined || body.gameType === null ? null : body.gameType;
    if (gameType !== null && gameType !== MEMORY_RACE_GAME_TYPE) throw new GameRoomError(400, "Oyun türü geçersiz.");
    const rawSettings = body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? body.settings as Record<string, unknown>
      : {};
    const settings = gameType === MEMORY_RACE_GAME_TYPE ? { level: rawSettings.level } : {};
    if (gameType === MEMORY_RACE_GAME_TYPE) {
      if (!isMemoryRaceLevel(settings.level)) throw new GameRoomError(400, "Hafıza Yarışı seviyesi geçersiz.");
      if (maxPlayers < 2 || maxPlayers > 4) throw new GameRoomError(400, "Hafıza Yarışı 2-4 oyuncuyla oynanabilir.");
    }
    const room = await createGameRoom(actor, maxPlayers, gameType, settings);
    return NextResponse.json({ ok: true, ...room }, { status: 201 });
  } catch (error) {
    const failure = error instanceof GameRoomError ? error : new GameRoomError(500, "Oyun odası oluşturulamadı.");
    return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
