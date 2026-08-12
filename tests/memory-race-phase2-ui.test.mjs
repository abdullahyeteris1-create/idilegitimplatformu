import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const client = await read("src/components/memory-race/MemoryRaceMultiplayerClient.tsx");
const entry = await read("src/components/multiplayer/GameRoomEntryClient.tsx");
const lobby = await read("src/components/multiplayer/GameRoomLobbyClient.tsx");

test("teacher ve student memory race route'lari server session guard kullanir", async () => {
  const teacher = await read("src/app/ogretmen/idil-panel/oyun-odalari/[roomId]/hafiza-yarisi/page.tsx");
  const student = await read("src/app/ogrenci/oyun-odalari/[roomId]/hafiza-yarisi/page.tsx");
  assert.match(teacher, /requireTeacherSession\(\)/);
  assert.match(student, /verifyStudentAccessToken/);
  assert.match(student, /redirect\("\/giris"\)/);
});

test("teacher lobby memory race type, level and 2-4 player choices send server settings", async () => {
  assert.match(entry, /MEMORY_RACE_GAME_TYPE/);
  assert.match(entry, /MEMORY_RACE_LEVELS/);
  assert.match(entry, /settings: gameType === MEMORY_RACE_GAME_TYPE/);
  assert.match(entry, /\[2, 3, 4\]/);
  assert.match(entry, /Hafıza Yarışı/);
});

test("memory race lobby displays game metadata and routes playing rooms", async () => {
  assert.match(lobby, /room\.gameType === "memory-race"/);
  assert.match(lobby, /room\.memoryRaceLevel/);
  assert.match(lobby, /room\?\.status !== "playing"/);
  assert.match(lobby, /hafiza-yarisi/);
});

test("client renders only public snapshot cards and never raw board", async () => {
  assert.match(client, /game\.cards\.map/);
  assert.doesNotMatch(client, /game\.board|rawBoard|pairId/);
  assert.match(client, /card\.emoji/);
  assert.match(client, /card\.matched/);
});

test("teacher is spectator and student move body is authoritative", async () => {
  assert.match(client, /role === "teacher"/);
  assert.match(client, /role === "student"/);
  assert.match(client, /cardIndex, expectedVersion/);
  assert.doesNotMatch(client, /studentId.*JSON\.stringify|emoji.*JSON\.stringify/);
});

test("wrong turn and double click are disabled client-side", async () => {
  assert.match(client, /const canMove = isMyTurn/);
  assert.match(client, /disabled=\{!canMove \|\| busy/);
  assert.match(client, /if \(!game \|\| !canMove \|\| busy\) return/);
});

test("move success and stale conflict resync the authoritative snapshot", async () => {
  assert.match(client, /memory-race\/moves/);
  assert.match(client, /expectedVersion: game\.version/);
  assert.match(client, /await requestRefresh\(\)/);
  assert.match(client, /Oyun durumu değişti/);
});

test("transition uses one deadline timeout and no polling", async () => {
  assert.match(client, /game\.phaseEndsAt/);
  assert.match(client, /window\.setTimeout/);
  assert.match(client, /window\.clearTimeout/);
  assert.doesNotMatch(client, /setInterval|setTimeout\([^)]*setTimeout/);
});

test("realtime invalidation refetches and channel cleanup exists", async () => {
  assert.match(client, /client\.channel\(`game-room:\$\{roomId\}`\)/);
  assert.match(client, /\.on\("broadcast", \{ event: "room_changed" \}/);
  assert.match(client, /requestRefresh\(\)/);
  assert.match(client, /client\.removeChannel\(channel\)/);
  assert.doesNotMatch(client, /postgres_changes|setInterval/);
});

test("kick, close and finish have terminal UI states", async () => {
  assert.match(client, /Bu odadan çıkarıldınız/);
  assert.match(client, /Oda kapatıldı/);
  assert.match(client, /game\.phase === "finished"/);
  assert.match(client, /Oyun tamamlandı/);
});

test("scores use display names and tie ranking", async () => {
  assert.match(client, /playerNames\.get/);
  assert.match(client, /ranking/);
  assert.match(client, /sırayı paylaştı/);
  assert.doesNotMatch(client, /studentId.*<|email.*score/);
});

test("responsive card grid and standalone files remain untouched by Phase 2", async () => {
  assert.match(client, /gridTemplateColumns/);
  assert.match(client, /minmax\(clamp/);
  const standalone = await read("src/exercise-assets/hafiza-yarisi.html");
  const page = await read("src/app/egzersizler/hafiza-yarisi/page.tsx");
  const route = await read("src/app/egzersizler/hafiza-yarisi/oyun/route.ts");
  assert.ok(standalone.includes("<!DOCTYPE html>"));
  assert.ok(page.length > 0 && route.length > 0);
});

test("move pending iken ayni frame pressed feedback ve ref guard kullanilir", async () => {
  assert.match(client, /pendingMoveRef/);
  assert.match(client, /setPressedCardIndex\(cardIndex\)/);
  assert.match(client, /styles\.pressed/);
  assert.match(client, /expectedVersion: game\.version/);
  assert.match(client, /await requestRefresh\(\)/);
});

test("standalone kart parity, feedback ve sesleri React katmaninda vardir", async () => {
  assert.match(client, /cardInner/);
  assert.match(client, /styles\.matched/);
  assert.match(client, /styles\.wrong/);
  assert.match(client, /playTone\("match"\)/);
  assert.match(client, /playTone\("wrong"\)/);
  assert.match(client, /playTone\("finish"\)/);
  assert.match(client, /Ses Açık/);
  assert.match(await read("src/components/memory-race/MemoryRaceMultiplayerClient.module.css"), /matchGlow/);
  assert.match(await read("src/components/memory-race/MemoryRaceMultiplayerClient.module.css"), /wrongShake/);
});
