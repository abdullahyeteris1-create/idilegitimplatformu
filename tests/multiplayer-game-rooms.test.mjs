import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const migrationPath = "supabase/migrations/20260812130000_create_multiplayer_game_rooms.sql";
const serverPath = "src/lib/multiplayer/server.ts";
const lobbyPath = "src/components/multiplayer/GameRoomLobbyClient.tsx";

test("migration oda ve uyelik modellerini, durumlari ve dort saatlik sureyi tanimlar", async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /create table if not exists public\.game_rooms/);
  assert.match(sql, /create table if not exists public\.game_room_players/);
  assert.match(sql, /status in \('waiting', 'starting', 'playing', 'finished', 'closed'\)/);
  assert.match(sql, /expires_at timestamptz not null default \(now\(\) \+ interval '4 hours'\)/);
  assert.match(sql, /max_players between 2 and 24/);
});

test("6 haneli kod sunucuda kriptografik uretilir ve aktif odalarda benzersizdir", async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /room_code ~ '\^\[1-9\]\[0-9\]\{5\}\$'/);
  assert.match(sql, /gen_random_bytes\(4\)/);
  assert.doesNotMatch(sql, /floor\(random\(\)/);
  assert.match(sql, /create unique index if not exists game_rooms_active_code_uidx/);
  assert.match(sql, /for v_attempt in 1\.\.12 loop/);
  assert.match(sql, /exception when unique_violation/);
});

test("es zamanli katilim oda satiri kilidi ve atomik kapasite kontrolu kullanir", async () => {
  const sql = await read(migrationPath);
  const join = sql.slice(sql.indexOf("create or replace function public.join_game_room_v1"), sql.indexOf("create or replace function public.set_game_room_ready_v1"));
  assert.match(join, /for update/);
  assert.match(join, /v_active_count >= v_room\.max_players/);
  assert.match(join, /room_full/);
  assert.match(sql, /unique \(room_id, student_id\)/);
});

test("yenileme idempotent, cikarilan oyuncu yeniden giremez ve baslamis odaya katilim kapanir", async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /v_room\.status <> 'waiting'.*game_already_started/s);
  assert.match(sql, /v_player\.member_status = 'kicked'.*player_kicked/s);
  assert.match(sql, /v_player\.member_status = 'active'.*'reused', true/s);
  assert.match(sql, /on conflict \(room_id, student_id\) do update/);
});

test("RLS zorunlu, tarayici rolleri yetkisiz ve RPC sadece service role icin acik", async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /alter table public\.game_rooms force row level security/);
  assert.match(sql, /alter table public\.game_room_players force row level security/);
  assert.match(sql, /revoke all on public\.game_rooms from public, anon, authenticated/);
  assert.match(sql, /revoke all on public\.game_room_players from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.manage_game_room_v1[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.manage_game_room_v1[\s\S]*to service_role/);
});

test("API kimligi body'den degil dogrulanmis teacher/student session'dan alir", async () => {
  const server = await read(serverPath);
  const createRoute = await read("src/app/api/game-rooms/route.ts");
  const joinRoute = await read("src/app/api/game-rooms/join/route.ts");
  const actionsRoute = await read("src/app/api/game-rooms/[roomId]/actions/route.ts");
  assert.match(server, /isAdminSessionValid\(request\)/);
  assert.match(server, /verifyStudentAccess\(request\)/);
  assert.match(server, /getStudentProfileById\(access\.studentId\)/);
  assert.match(server, /profile\.profile_image_url\?\.trim\(\) \|\| null/);
  assert.match(createRoute, /resolveGameRoomActor\(request\)/);
  assert.match(joinRoute, /resolveGameRoomActor\(request\)/);
  assert.match(actionsRoute, /resolveGameRoomActor\(request\)/);
  assert.doesNotMatch(`${createRoute}\n${joinRoute}\n${actionsRoute}`, /body\.(studentId|teacherId|hostSessionHash)/);
});

test("ogrenci sadece kendi hazir/ayril islemini, ogretmen ise sahiplik hash'i ile yonetimi yapar", async () => {
  const server = await read(serverPath);
  assert.match(server, /p_student_id: actor\.studentId/);
  assert.match(server, /action === "ready"[\s\S]*actor\.role !== "student"/);
  assert.match(server, /action === "leave"[\s\S]*actor\.role !== "student"/);
  assert.match(server, /actor\.role !== "teacher"[\s\S]*\["start", "close", "kick"\]/);
  assert.match(server, /p_host_session_hash: actor\.ownerHash/);
});

test("oda snapshot'i uyelik/sahiplik kontrolunden sonra PII icermeyen view dondurur", async () => {
  const server = await read(serverPath);
  assert.match(server, /room\.host_session_hash !== actor\.ownerHash/);
  assert.match(server, /membership\.member_status === "kicked"/);
  assert.match(server, /new Date\(String\(room\.expires_at\)\)\.getTime\(\) <= Date\.now\(\)/);
  const returnBlock = server.slice(server.indexOf("return {", server.indexOf("export async function getGameRoomView")), server.indexOf("export async function runGameRoomAction"));
  assert.doesNotMatch(returnBlock, /studentId:/);
  assert.doesNotMatch(returnBlock, /hostSessionHash:/);
  assert.doesNotMatch(returnBlock, /username|email|phone/);
});

test("Realtime oda UUID topic'ine sinirli invalidation broadcast ile snapshot yeniler; polling yoktur", async () => {
  const server = await read(serverPath);
  const lobby = await read(lobbyPath);
  assert.match(server, /channel\(`game-room:\$\{roomId\}`\)/);
  assert.match(server, /httpSend\("room_changed"/);
  assert.match(server, /try \{[\s\S]*broadcastGameRoomChange\(roomId, action\)[\s\S]*catch \(error\)/);
  assert.match(lobby, /client\.channel\(`game-room:\$\{roomId\}`/);
  assert.match(lobby, /\.on\("broadcast", \{ event: "room_changed" \}/);
  assert.match(lobby, /requestRoomRefresh\(\)/);
  assert.match(lobby, /client\.removeChannel\(channel\)/);
  assert.doesNotMatch(lobby, /setInterval|postgres_changes/);
});

test("Presence tamamen kaldirildi; oyuncu kartlari yalniz DB state gosterir", async () => {
  const lobby = await read(lobbyPath);
  assert.doesNotMatch(lobby, /presence|presenceKey|presenceState|channel\.track/);
  assert.match(lobby, /player\.isReady/);
  assert.match(lobby, /fetch\(`\/api\/game-rooms\/\$\{roomId\}\/actions`/);
  assert.match(lobby, /Odada kayıtlı/);
});

test("ready desired-state room lock'u ile idempotent ve start/close ile ayni oda kilidini kullanir", async () => {
  const sql = await read(migrationPath);
  const ready = sql.slice(sql.indexOf("create or replace function public.set_game_room_ready_v1"), sql.indexOf("create or replace function public.manage_game_room_v1"));
  assert.match(ready, /p_is_ready boolean/);
  assert.match(ready, /select \* into v_room[\s\S]*for update/);
  assert.match(ready, /v_room\.status <> 'waiting'/);
  assert.match(ready, /v_room\.expires_at <= now\(\)/);
  assert.match(ready, /v_player\.member_status <> 'active'/);
  assert.match(ready, /set is_ready = p_is_ready/);
  assert.doesNotMatch(ready, /is_ready = not is_ready/);
  assert.match(sql, /create or replace function public\.set_game_room_ready_v1\(p_room_id uuid, p_student_id uuid, p_is_ready boolean\)/);
});

test("client ready mevcut state'in tersini desired state olarak gonderir", async () => {
  const lobby = await read(lobbyPath);
  assert.match(lobby, /desiredReady = action === "ready" \? !\(currentPlayer\?\.isReady === true\)/);
  assert.match(lobby, /isReady: desiredReady/);
});

test("terminal 403/410, reconnect, visibility/pageshow ve expiry timer ele alinir", async () => {
  const lobby = await read(lobbyPath);
  assert.match(lobby, /error\.status === 403 \|\| error\.status === 410/);
  assert.match(lobby, /visibilitychange/);
  assert.match(lobby, /pageshow/);
  assert.match(lobby, /status === "SUBSCRIBED"[\s\S]*requestRoomRefresh/);
  assert.match(lobby, /status === "CHANNEL_ERROR"/);
  assert.match(lobby, /status === "TIMED_OUT"/);
  assert.match(lobby, /status === "CLOSED"/);
  assert.match(lobby, /setTimeout/);
  assert.match(lobby, /expiresAt/);
  assert.match(lobby, /Son alınan oda durumu korunuyor/);
});

test("room snapshot API ve action API UUID route parametresini dogrular, rate limit uygular", async () => {
  const snapshot = await read("src/app/api/game-rooms/[roomId]/route.ts");
  const actions = await read("src/app/api/game-rooms/[roomId]/actions/route.ts");
  const rateLimit = await read("src/lib/security/multiplayerRateLimit.ts");
  assert.match(snapshot, /isGameRoomId\(roomId\)/);
  assert.match(actions, /isGameRoomId\(roomId\)/);
  assert.match(rateLimit, /scope: "create" \| "join" \| "action"/);
  assert.match(rateLimit, /create: 5, join: 20, action: 60/);
});

test("public broadcast state degistiremez ve payload minimal kalir", async () => {
  const server = await read(serverPath);
  assert.match(server, /httpSend\("room_changed", \{ action \}\)/);
  assert.doesNotMatch(server, /studentId:.*httpSend|hostHash:.*httpSend|email:.*httpSend|avatar.*httpSend/);
  assert.match(server, /getGameRoomView/);
});

test("baslatma idempotent starting durumuna gecer ve gecici oyun ekrani tum istemcilere yansir", async () => {
  const sql = await read(migrationPath);
  const lobby = await read(lobbyPath);
  assert.match(sql, /if v_room\.status = 'starting' then return 'starting'/);
  assert.match(sql, /set status = 'starting', started_at = coalesce\(started_at, now\(\)\)/);
  assert.match(lobby, /room\.status === "starting"/);
  assert.match(lobby, /Oyun başlatılıyor/);
});

test("ogrenci hazir durumu toggle metni, cikis ve kapali oda ekranlari vardir", async () => {
  const lobby = await read(lobbyPath);
  assert.match(lobby, /Hazır Durumunu Kaldır/);
  assert.match(lobby, /act\("leave"\)/);
  assert.match(lobby, /act\("close"\)/);
  assert.match(lobby, /room\.status === "closed" \|\| room\.status === "finished"/);
});

test("ogretmen ve ogrenci route'lari server-side session guard kullanir", async () => {
  const teacherEntry = await read("src/app/ogretmen/idil-panel/oyun-odalari/page.tsx");
  const teacherLobby = await read("src/app/ogretmen/idil-panel/oyun-odalari/[roomId]/page.tsx");
  const studentEntry = await read("src/app/ogrenci/oyun-odalari/page.tsx");
  const studentLobby = await read("src/app/ogrenci/oyun-odalari/[roomId]/page.tsx");
  assert.match(teacherEntry, /requireTeacherSession\(\)/);
  assert.match(teacherLobby, /requireTeacherSession\(\)/);
  assert.match(studentEntry, /verifyStudentAccessToken/);
  assert.match(studentLobby, /verifyStudentAccessToken/);
  assert.match(studentEntry, /redirect\("\/giris"\)/);
  assert.match(studentLobby, /redirect\("\/giris"\)/);
});

test("panellerde Oyun Odalari girisleri ve ogrenci katilim karti bulunur", async () => {
  const teacherNav = await read("src/lib/constants/teacherNavigation.ts");
  const teacherPanel = await read("src/app/ogretmen/idil-panel/page.tsx");
  const studentNav = await read("src/components/student-panel-preview/data.ts");
  const studentPanel = await read("src/components/student-panel-preview/StudentPanelPreview.tsx");
  assert.match(teacherNav, /\/ogretmen\/idil-panel\/oyun-odalari/);
  assert.match(teacherPanel, /title: "Oyun Odaları"/);
  assert.match(studentNav, /\/ogrenci\/oyun-odalari/);
  assert.match(studentPanel, /data-game-room-card/);
  assert.match(studentPanel, /Oyun Odasına Katıl/);
});

test("istemci service-role veya oda tablosu sorgusu tasimaz", async () => {
  const entry = await read("src/components/multiplayer/GameRoomEntryClient.tsx");
  const lobby = await read(lobbyPath);
  for (const source of [entry, lobby]) {
    assert.doesNotMatch(source, /getSupabaseServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(source, /\.from\(["']game_room/);
  }
});
