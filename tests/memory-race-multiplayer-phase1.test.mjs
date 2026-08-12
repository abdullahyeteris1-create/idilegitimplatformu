import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMemoryRaceBoard, isValidMemoryRaceBoard, MEMORY_RACE_LEVELS } from "../src/lib/memory-race/multiplayerConfig.ts";
import { buildMemoryRaceSnapshot } from "../src/lib/memory-race/multiplayerSnapshot.ts";

const ROOT = new URL("../", import.meta.url);
const MIGRATION = "supabase/migrations/20260812150000_create_memory_race_games.sql";

async function read(relativePath) {
  return readFile(new URL(relativePath, ROOT), "utf8");
}

function functionBlock(sql, name, nextName) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  const end = nextName ? sql.indexOf(`create or replace function public.${nextName}`, start) : sql.length;
  assert.notEqual(start, -1, `${name} SQL function missing`);
  return sql.slice(start, end === -1 ? sql.length : end);
}

function sampleGame(overrides = {}) {
  return {
    room_id: "room-public-id",
    level: 1,
    board: [
      { pairId: "pair-1", emoji: "🐶" },
      { pairId: "pair-2", emoji: "🐱" },
      { pairId: "pair-1", emoji: "🐶" },
      { pairId: "pair-2", emoji: "🐱" },
    ],
    phase: "awaiting_first",
    current_player_id: "member-a",
    first_card_index: null,
    second_card_index: null,
    matched_card_indices: [],
    scores: { "member-a": 0, "member-b": 0 },
    version: 1,
    phase_ends_at: null,
    ...overrides,
  };
}

test("level 1-6 kart ve cift sayilari standalone oyunla aynidir", async () => {
  const html = await read("src/exercise-assets/hafiza-yarisi.html");
  const literal = html.match(/const emojiSets = (\{[\s\S]*?\n\});/)?.[1];
  assert.ok(literal);
  const standaloneSets = Function(`"use strict"; return (${literal});`)();
  const expectedCards = [16, 20, 24, 32, 40, 60];
  for (let level = 1; level <= 6; level += 1) {
    const config = MEMORY_RACE_LEVELS[level];
    assert.equal(config.cards, expectedCards[level - 1]);
    assert.equal(config.pairs * 2, config.cards);
    assert.deepEqual([...config.emojis], standaloneSets[level]);
  }
});

test("server board generator her pair identity'den tam iki kart uretir", () => {
  for (let level = 1; level <= 6; level += 1) {
    const board = createMemoryRaceBoard(level);
    assert.equal(board.length, MEMORY_RACE_LEVELS[level].cards);
    const counts = new Map();
    for (const card of board) counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
    assert.equal(counts.size, MEMORY_RACE_LEVELS[level].pairs);
    assert.ok([...counts.values()].every((count) => count === 2));
  }
});

test("server board validation level parity, pair identity ve emoji invariantlarini dogrular", () => {
  for (let level = 1; level <= 6; level += 1) {
    const board = createMemoryRaceBoard(level);
    assert.equal(isValidMemoryRaceBoard(level, board), true);
    const badEmoji = board.map((card, index) => index === 1 ? { ...card, emoji: "❌" } : card);
    assert.equal(isValidMemoryRaceBoard(level, badEmoji), false);
    const badPair = board.map((card, index) => index === 1 ? { ...card, pairId: "pair-invalid" } : card);
    assert.equal(isValidMemoryRaceBoard(level, badPair), false);
  }
});

test("board server-only crypto shuffle ile uretilir ve create API board kabul etmez", async () => {
  const config = await read("src/lib/memory-race/multiplayerConfig.ts");
  const createRoute = await read("src/app/api/game-rooms/route.ts");
  assert.match(config, /randomInt\(index \+ 1\)/);
  assert.doesNotMatch(config, /Math\.random/);
  assert.doesNotMatch(createRoute, /body\.board|p_board/);
});

test("migration yalniz memory_race_games oyun tablosunu ekler", async () => {
  const sql = await read(MIGRATION);
  assert.match(sql, /create table if not exists public\.memory_race_games/);
  assert.doesNotMatch(sql, /create table[^;]+(?:game_sessions|game_rounds|game_scores|game_player_answers)/i);
  assert.match(sql, /room_id uuid primary key references public\.game_rooms\(id\) on delete cascade/);
  assert.match(sql, /current_player_id uuid references public\.game_room_players\(id\)/);
});

test("memory_race_games RLS/FORCE RLS ile browser rollerine tamamen kapalidir", async () => {
  const sql = await read(MIGRATION);
  assert.match(sql, /alter table public\.memory_race_games enable row level security/);
  assert.match(sql, /alter table public\.memory_race_games force row level security/);
  assert.match(sql, /revoke all on public\.memory_race_games from public, anon, authenticated/);
  for (const rpc of ["start_memory_race_game_v1", "submit_memory_race_move_v1", "transition_memory_race_game_v1"]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${rpc}[^;]+from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}[^;]+to service_role`));
  }
  assert.match(sql, /security definer/g);
  assert.match(sql, /set search_path = pg_catalog, public, pg_temp/g);
});

test("start ownership, game type, status, level ve oyuncu limitlerini DB'de dogrular", async () => {
  const sql = await read(MIGRATION);
  const start = functionBlock(sql, "start_memory_race_game_v1", "submit_memory_race_move_v1");
  assert.match(start, /for update/);
  assert.match(start, /host_session_hash <> trim\(p_host_session_hash\)/);
  assert.match(start, /game_type is distinct from 'memory-race'/);
  assert.match(start, /status not in \('waiting', 'starting'\)/);
  assert.match(start, /p_level < 1 or p_level > 6/);
  assert.match(start, /v_player_count < 2.*not_enough_players/s);
  assert.match(start, /v_player_count > 4.*too_many_players/s);
});

test("2/3/4 aktif oyuncu kabul, 1 ve 4 uzeri reject semantigi sabittir", async () => {
  const sql = await read(MIGRATION);
  const start = functionBlock(sql, "start_memory_race_game_v1", "submit_memory_race_move_v1");
  assert.match(start, /select count\(\*\)[\s\S]*member_status = 'active'/);
  assert.doesNotMatch(start, /v_player_count = 2|v_player_count = 3|v_player_count = 4/);
  assert.match(start, /v_player_count < 2/);
  assert.match(start, /v_player_count > 4/);
});

test("start idempotent, siralama deterministik ve room playing olur", async () => {
  const sql = await read(MIGRATION);
  const start = functionBlock(sql, "start_memory_race_game_v1", "submit_memory_race_move_v1");
  assert.match(start, /select \* into v_existing[\s\S]*for update/);
  assert.match(start, /status = 'playing'.*return jsonb_build_object\('started', false/s);
  assert.match(start, /order by player\.joined_at, player\.id/);
  assert.match(start, /jsonb_object_agg\(player\.id::text, 0\)/);
  assert.match(start, /set status = 'playing'/);
});

test("hidden snapshot kapali kart emoji/pair identity sızdırmaz", () => {
  const snapshot = buildMemoryRaceSnapshot(sampleGame(), ["member-a", "member-b"]);
  assert.ok(snapshot.cards.every((card) => card.emoji === null && card.revealed === false));
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /pair-1|pair-2|🐶|🐱/);
  assert.doesNotMatch(serialized, /student_id|studentId/);
});

test("snapshot yalniz acik ve matched kartlarin emojisini gosterir", () => {
  const snapshot = buildMemoryRaceSnapshot(sampleGame({
    phase: "awaiting_second",
    first_card_index: 1,
    matched_card_indices: [0, 2],
  }), ["member-a", "member-b"]);
  assert.equal(snapshot.cards[0].emoji, "🐶");
  assert.equal(snapshot.cards[1].emoji, "🐱");
  assert.equal(snapshot.cards[2].emoji, "🐶");
  assert.equal(snapshot.cards[3].emoji, null);
});

test("snapshot winner ve beraberligi authoritative scores'tan hesaplar", () => {
  const winner = buildMemoryRaceSnapshot(sampleGame({ phase: "finished", scores: { "member-a": 4, "member-b": 2 } }), ["member-a", "member-b"]);
  assert.deepEqual(winner.winners, ["member-a"]);
  const tie = buildMemoryRaceSnapshot(sampleGame({ phase: "finished", scores: { "member-a": 3, "member-b": 3 } }), ["member-a", "member-b"]);
  assert.deepEqual(tie.winners, ["member-a", "member-b"]);
  const closed = buildMemoryRaceSnapshot(sampleGame({ phase: "closed", scores: { "member-a": 3, "member-b": 1 } }), ["member-a", "member-b"]);
  assert.deepEqual(closed.winners, []);
});

test("drop ile biten oyunda winner yalniz aktif member identifier'larindan hesaplanir", () => {
  const snapshot = buildMemoryRaceSnapshot(
    sampleGame({ phase: "finished", scores: { "member-a": 0, "member-b": 4, "member-c": 0 } }),
    ["member-a", "member-b", "member-c"],
    ["member-a"],
  );
  assert.deepEqual(snapshot.winners, ["member-a"]);

  const noActiveWinner = buildMemoryRaceSnapshot(
    sampleGame({ phase: "finished", scores: { "member-a": 4, "member-b": 4 } }),
    ["member-a", "member-b"],
    [],
  );
  assert.deepEqual(noActiveWinner.winners, []);
});

test("move kimligi session actor'dan alir; teacher impersonation ve body student id yoktur", async () => {
  const server = await read("src/lib/memory-race/multiplayerServer.ts");
  const route = await read("src/app/api/game-rooms/[roomId]/memory-race/moves/route.ts");
  assert.match(route, /resolveGameRoomActor\(request\)/);
  assert.match(server, /actor\.role !== "student"/);
  assert.match(server, /p_student_id: actor\.studentId/);
  assert.doesNotMatch(route, /studentId|playerId|emoji|score|matched|correct|currentPlayerId/);
});

test("move RPC room/game/member/turn/index/phase/matched/open validationlarini uygular", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  for (const token of ["room_not_found", "room_not_playing", "game_not_found", "player_not_in_room", "wrong_player", "invalid_card_index", "card_already_matched", "phase_not_accepting_move", "card_already_open"]) {
    assert.match(move, new RegExp(token));
  }
  assert.match(move, /member_status <> 'active'/);
  assert.match(move, /jsonb_array_length\(v_game\.board\)/);
});

test("valid ilk flip awaiting_second olur ve version bir artar", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  assert.match(move, /v_next_version := v_game\.version \+ 1/);
  assert.match(move, /phase = 'awaiting_second', first_card_index = p_card_index/);
  assert.match(move, /version = v_next_version/);
});

test("match +1 puan verir, kartlari matched yapar ve ayni oyuncuyu korur", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  assert.match(move, /v_first_pair_id = v_second_pair_id/);
  assert.match(move, /v_score := coalesce[\s\S]*\+ 1/);
  assert.match(move, /matched_card_indices = v_matched, scores = v_scores/);
  const matchBranch = move.slice(move.indexOf("if v_first_pair_id = v_second_pair_id"), move.indexOf("update public.memory_race_games\n  set phase = 'revealing_mismatch'"));
  assert.doesNotMatch(matchBranch, /current_player_id\s*=/);
});

test("mismatch server deadline uretir ve transition sonraki aktif oyuncuyu secer", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  const transition = functionBlock(sql, "transition_memory_race_game_v1", "reconcile_memory_race_current_player_v1");
  assert.match(move, /phase = 'revealing_mismatch'/);
  assert.match(move, /now\(\) \+ interval '1300 milliseconds'/);
  assert.match(transition, /now\(\) < v_game\.phase_ends_at/);
  assert.match(transition, /order by player\.joined_at, player\.id/);
  assert.match(transition, /current_player_id = v_next_player_id/);
});

test("stale, duplicate ve concurrent move row lock + expectedVersion ile guvenlidir", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  assert.match(move, /select \* into v_room[\s\S]*for update/);
  assert.match(move, /select \* into v_game[\s\S]*for update/);
  assert.match(move, /p_expected_version <> v_game\.version.*stale_version/s);
  assert.match(move, /v_game\.first_card_index = p_card_index.*card_already_open/s);
});

test("early ve duplicate transition no-op; gercek transition version artirir", async () => {
  const sql = await read(MIGRATION);
  const transition = functionBlock(sql, "transition_memory_race_game_v1", "reconcile_memory_race_current_player_v1");
  assert.match(transition, /phase not in \('revealing_match', 'revealing_mismatch'\)[\s\S]*'changed', false/);
  assert.match(transition, /now\(\) < v_game\.phase_ends_at[\s\S]*'changed', false/);
  assert.match(transition, /v_next_version := v_game\.version \+ 1/);
  assert.match(transition, /'changed', true/);
});

test("son cift oyunu ve room'u finished yapar", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  assert.match(move, /cardinality\(v_matched\) = jsonb_array_length\(v_game\.board\)/);
  assert.match(move, /set phase = 'finished'/);
  assert.match(move, /update public\.game_rooms set status = 'finished'/);
});

test("kicked veya left current player sonraki aktife gecirilir; iki oyuncudan aza dusunce kontrollu biter", async () => {
  const sql = await read(MIGRATION);
  const reconcile = functionBlock(sql, "reconcile_memory_race_current_player_v1", "manage_game_room_v1");
  const manage = functionBlock(sql, "manage_game_room_v1", "leave_game_room_v1");
  const leave = functionBlock(sql, "leave_game_room_v1");
  assert.match(manage, /p_action = 'kick'[\s\S]*reconcile_memory_race_current_player_v1/);
  assert.match(leave, /member_status = 'left'[\s\S]*reconcile_memory_race_current_player_v1/);
  assert.match(reconcile, /v_active_count < 2[\s\S]*phase = 'finished'/);
  assert.match(reconcile, /current_player_id = v_next_player_id/);
});

test("leave nonexistent room legacy false davranisini korur; reconcile yalniz degisen leave sonrasinda cagrilir", async () => {
  const sql = await read(MIGRATION);
  const leave = functionBlock(sql, "leave_game_room_v1");
  assert.doesNotMatch(leave, /raise exception 'room_not_found'/);
  assert.match(leave, /update public\.game_room_players/);
  assert.match(leave, /v_changed := found/);
  assert.match(leave, /if v_changed then perform public\.reconcile_memory_race_current_player_v1/);
});

test("finished phase finished_at tutarliligi ve distinct open card DB invariant'i var", async () => {
  const sql = await read(MIGRATION);
  assert.match(sql, /first_card_index <> second_card_index/);
  assert.match(sql, /phase <> 'finished' or finished_at is not null/);
  assert.match(sql, /matched_card_indices integer\[\] not null default '\{\}'::integer\[\]/);
});

test("RPC invariantlari client pair/emoji/score manipulationini kabul etmez", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  const server = await read("src/lib/multiplayer/server.ts");
  assert.match(move, /v_game\.board -> v_game\.first_card_index ->> 'pairId'/);
  assert.match(move, /v_game\.board -> p_card_index ->> 'pairId'/);
  assert.doesNotMatch(move, /p_pair_id|p_emoji|p_score|p_correct/);
  assert.doesNotMatch(server, /p_pair_id|p_emoji|p_score|p_correct/);
  assert.match(move, /v_score := coalesce[\s\S]*\+ 1/);
  assert.doesNotMatch(move, /- 1|p_score/);
});

test("RPC out-of-range index ve duplicate matched kart state'ini reddeder", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  assert.match(move, /p_card_index < 0 or p_card_index >= jsonb_array_length\(v_game\.board\)/);
  assert.match(move, /p_card_index = any\(v_game\.matched_card_indices\)/);
  assert.match(move, /v_game\.first_card_index = p_card_index/);
});

test("closed room move/transition reddeder ve close game state'i terminal yapar", async () => {
  const sql = await read(MIGRATION);
  const move = functionBlock(sql, "submit_memory_race_move_v1", "transition_memory_race_game_v1");
  const transition = functionBlock(sql, "transition_memory_race_game_v1", "reconcile_memory_race_current_player_v1");
  const manage = functionBlock(sql, "manage_game_room_v1", "leave_game_room_v1");
  assert.match(move, /status = 'closed'.*game_closed/s);
  assert.match(transition, /status = 'closed'.*game_closed/s);
  assert.match(manage, /p_action = 'close'[\s\S]*set phase = 'closed'/);
});

test("snapshot/move/transition API auth, UUID ve rate-limit conventionlarini izler", async () => {
  const paths = [
    "src/app/api/game-rooms/[roomId]/memory-race/route.ts",
    "src/app/api/game-rooms/[roomId]/memory-race/moves/route.ts",
    "src/app/api/game-rooms/[roomId]/memory-race/transition/route.ts",
  ];
  const sources = await Promise.all(paths.map(read));
  for (const source of sources) {
    assert.match(source, /resolveGameRoomActor\(request\)/);
    assert.match(source, /isGameRoomId\(roomId\)/);
  }
  assert.match(sources[1], /allowMultiplayerRequest\(request, "action"\)/);
  assert.match(sources[2], /allowMultiplayerRequest\(request, "action"\)/);
  assert.match(sources[0], /Cache-Control": "private, no-store"/);
});

test("Realtime invalidation action ve version gonderir, hidden board verisi gondermez", async () => {
  const server = await read("src/lib/memory-race/multiplayerServer.ts");
  const broadcast = await read("src/lib/multiplayer/server.ts");
  assert.match(server, /broadcastGameRoomChange\(roomId, action, version\)/);
  assert.match(broadcast, /httpSend\("room_changed", \{ action, version \}\)/);
  assert.doesNotMatch(server, /broadcastGameRoomChange\([^)]*(?:board|emoji|scores|studentId)/);
});

test("move ve transition authoritative snapshot ile kendi Realtime refetch'ini azaltir", async () => {
  const server = await read("src/lib/memory-race/multiplayerServer.ts");
  const client = await read("src/components/memory-race/MemoryRaceMultiplayerClient.tsx");
  assert.match(server, /const snapshot = await getMemoryRaceSnapshot\(actor, roomId\)/);
  assert.match(server, /return \{ result: data, snapshot \}/);
  assert.match(client, /setAuthoritativeGame\(result\.result\.snapshot\)/);
  assert.match(client, /authoritativeVersionRef\.current >= version/);
  assert.match(client, /expectedVersion: game\.version/);
});

test("standalone Hafiza Yarisi dosyalari Phase 1 importlarindan bagimsiz kalir", async () => {
  for (const path of [
    "src/exercise-assets/hafiza-yarisi.html",
    "src/app/egzersizler/hafiza-yarisi/page.tsx",
    "src/app/egzersizler/hafiza-yarisi/oyun/route.ts",
  ]) {
    const source = await read(path);
    assert.doesNotMatch(source, /multiplayerConfig|multiplayerServer|memory_race_games|game-rooms/);
  }
});

test("generic lobby RPC contractleri migration sonrasi korunur", async () => {
  const migration = await read(MIGRATION);
  const generic = await read("supabase/migrations/20260812130000_create_multiplayer_game_rooms.sql");
  for (const functionName of ["manage_game_room_v1", "leave_game_room_v1"]) {
    assert.match(generic, new RegExp(`create or replace function public\\.${functionName}`));
    assert.match(migration, new RegExp(`create or replace function public\\.${functionName}`));
  }
  assert.match(migration, /manage_game_room_v1\(uuid, text, text, uuid\)[\s\S]*grant execute/);
  assert.match(migration, /leave_game_room_v1\(uuid, uuid\)[\s\S]*grant execute/);
  assert.match(migration, /revoke all on function public\.manage_game_room_v1\(uuid, text, text, uuid\)/);
  assert.match(migration, /revoke all on function public\.leave_game_room_v1\(uuid, uuid\)/);
  assert.match(generic, /create or replace function public\.manage_game_room_v1\([\s\S]*p_player_id uuid/);
  assert.match(generic, /create or replace function public\.leave_game_room_v1\(p_room_id uuid, p_student_id uuid\)/);
  assert.match(migration, /create or replace function public\.manage_game_room_v1\([\s\S]*p_player_id uuid/);
  assert.match(migration, /create or replace function public\.leave_game_room_v1\(p_room_id uuid, p_student_id uuid\)/);
  assert.match(migration, /p_action = 'close'/);
  assert.match(migration, /p_action = 'kick'/);
  assert.match(migration, /p_action = 'start'/);
  assert.match(generic, /create or replace function public\.set_game_room_ready_v1/);
});
