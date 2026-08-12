import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const client = await read("src/components/memory-race/MemoryRaceMultiplayerClient.tsx");
const server = await read("src/lib/memory-race/multiplayerServer.ts");
const transport = await read("src/lib/multiplayer/server.ts");

test("server move emits safe reveal events only after authoritative snapshot", () => {
  assert.match(server, /const snapshot = await getMemoryRaceSnapshot\(actor, roomId\);\s*await broadcastReveal\(roomId, cardIndex, snapshot\);/);
  assert.match(server, /memory_race_card_revealed/);
  assert.match(server, /memory_race_pair_resolved/);
  assert.match(server, /memory_race_transitioned/);
  assert.match(server, /cards: snapshot\.phase === "awaiting_second"/);
  assert.doesNotMatch(server, /broadcastGameRoomEvent\([^\n]*(?:board|pairId|studentId|scores)/i);
  assert.match(transport, /export async function broadcastGameRoomEvent/);
});

test("client applies reveal events ephemerally and keeps snapshot authoritative", () => {
  assert.match(client, /transientReveals/);
  assert.match(client, /highestRevealEventVersionRef/);
  assert.match(client, /version < authoritativeVersionRef\.current/);
  assert.match(client, /version < highestRevealEventVersionRef\.current/);
  assert.match(client, /memory_race_card_revealed/);
  assert.match(client, /memory_race_pair_resolved/);
  assert.match(client, /memory_race_transitioned|memory_race_pair_resolved/);
  assert.match(client, /void requestRefresh\(\)/);
  assert.match(client, /card\.emoji \?\? transient\?\.emoji/);
  assert.doesNotMatch(client, /setGame\([^)]*event|setAuthoritativeGame\([^)]*event/);
});

test("reveal minimum holds are bounded by server deadline", () => {
  assert.match(client, /revealing_match: 550/);
  assert.match(client, /revealing_mismatch: 850/);
  assert.match(client, /Math\.min\(\s*Date\.now\(\) \+/);
});

test("reveal payload does not contain hidden-card or identity data", () => {
  const revealBlock = server.slice(server.indexOf("async function broadcastReveal"));
  assert.doesNotMatch(revealBlock, /pairId|studentId|rawBoard|board|scores/);
  assert.match(revealBlock, /index: card\.index, emoji: card\.emoji/);
});
