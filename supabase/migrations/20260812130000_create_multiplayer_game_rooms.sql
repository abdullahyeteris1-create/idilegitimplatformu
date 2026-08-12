create extension if not exists pgcrypto;

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  host_session_hash text not null,
  host_display_name text not null default 'Öğretmen',
  status text not null default 'waiting',
  game_type text,
  max_players integer not null default 8,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  updated_at timestamptz not null default now(),
  constraint game_rooms_code_check check (room_code ~ '^[1-9][0-9]{5}$'),
  constraint game_rooms_status_check check (status in ('waiting', 'starting', 'playing', 'finished', 'closed')),
  constraint game_rooms_max_players_check check (max_players between 2 and 24),
  constraint game_rooms_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint game_rooms_host_name_length_check check (length(trim(host_display_name)) between 1 and 120),
  constraint game_rooms_game_type_length_check check (game_type is null or length(trim(game_type)) between 1 and 80),
  constraint game_rooms_settings_size_check check (octet_length(settings::text) <= 8192)
);

create table if not exists public.game_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  is_ready boolean not null default false,
  member_status text not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint game_room_players_member_status_check check (member_status in ('active', 'left', 'kicked')),
  constraint game_room_players_name_length_check check (length(trim(display_name)) between 1 and 120),
  constraint game_room_players_avatar_length_check check (avatar_url is null or length(avatar_url) <= 2048),
  constraint game_room_players_room_student_unique unique (room_id, student_id)
);

create unique index if not exists game_rooms_active_code_uidx
  on public.game_rooms (room_code)
  where status in ('waiting', 'starting', 'playing');

create index if not exists game_rooms_code_created_idx
  on public.game_rooms (room_code, created_at desc);

create index if not exists game_rooms_active_expiry_idx
  on public.game_rooms (expires_at)
  where status in ('waiting', 'starting', 'playing');

create index if not exists game_rooms_host_created_idx
  on public.game_rooms (host_session_hash, created_at desc);

create index if not exists game_room_players_room_active_idx
  on public.game_room_players (room_id, member_status, joined_at);

alter table public.game_rooms enable row level security;
alter table public.game_rooms force row level security;
alter table public.game_room_players enable row level security;
alter table public.game_room_players force row level security;

revoke all on public.game_rooms from public, anon, authenticated;
revoke all on public.game_room_players from public, anon, authenticated;

create or replace function public.set_game_room_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_game_room_updated_at() from public, anon, authenticated;

drop trigger if exists set_game_rooms_updated_at on public.game_rooms;
create trigger set_game_rooms_updated_at
before update on public.game_rooms
for each row execute function public.set_game_room_updated_at();

drop trigger if exists set_game_room_players_updated_at on public.game_room_players;
create trigger set_game_room_players_updated_at
before update on public.game_room_players
for each row execute function public.set_game_room_updated_at();

create or replace function public.create_game_room_v1(
  p_host_session_hash text,
  p_host_display_name text,
  p_max_players integer default 8,
  p_game_type text default null,
  p_settings jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room_id uuid;
  v_room_code text;
  v_attempt integer;
  v_random_bytes bytea;
begin
  if coalesce(length(trim(p_host_session_hash)), 0) < 32 then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_max_players < 2 or p_max_players > 24 then
    raise exception 'invalid_max_players' using errcode = 'P0001';
  end if;

  update public.game_rooms
  set status = 'closed', closed_at = coalesce(closed_at, now())
  where status in ('waiting', 'starting', 'playing') and expires_at <= now();

  for v_attempt in 1..12 loop
    v_random_bytes := gen_random_bytes(4);
    -- Oda kodu istemci girdisi veya tahmin edilebilir random() ile uretilmez.
    -- pgcrypto baytlari sunucuda uretilir; unique index cakismayi son savunma
    -- olarak atomik bicimde yakalar.
    v_room_code := (
      (
        get_byte(v_random_bytes, 0)::bigint * 16777216
        + get_byte(v_random_bytes, 1)::bigint * 65536
        + get_byte(v_random_bytes, 2)::bigint * 256
        + get_byte(v_random_bytes, 3)::bigint
      ) % 900000 + 100000
    )::text;
    begin
      insert into public.game_rooms (
        room_code, host_session_hash, host_display_name, max_players, game_type, settings
      ) values (
        v_room_code,
        trim(p_host_session_hash),
        coalesce(nullif(trim(p_host_display_name), ''), 'Öğretmen'),
        p_max_players,
        nullif(trim(p_game_type), ''),
        coalesce(p_settings, '{}'::jsonb)
      ) returning id into v_room_id;

      return jsonb_build_object('roomId', v_room_id, 'roomCode', v_room_code);
    exception when unique_violation then
      null;
    end;
  end loop;

  raise exception 'room_code_collision' using errcode = 'P0001';
end;
$$;

create or replace function public.join_game_room_v1(
  p_room_code text,
  p_student_id uuid,
  p_display_name text,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room public.game_rooms%rowtype;
  v_player public.game_room_players%rowtype;
  v_active_count integer;
begin
  select * into v_room
  from public.game_rooms
  where room_code = trim(p_room_code)
    and status in ('waiting', 'starting', 'playing')
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.expires_at <= now() then raise exception 'room_expired' using errcode = 'P0001'; end if;
  if v_room.status <> 'waiting' then raise exception 'game_already_started' using errcode = 'P0001'; end if;

  select * into v_player
  from public.game_room_players
  where room_id = v_room.id and student_id = p_student_id
  for update;

  if found and v_player.member_status = 'kicked' then
    raise exception 'player_kicked' using errcode = 'P0001';
  end if;
  if found and v_player.member_status = 'active' then
    return jsonb_build_object('roomId', v_room.id, 'playerId', v_player.id, 'reused', true);
  end if;

  select count(*) into v_active_count
  from public.game_room_players
  where room_id = v_room.id and member_status = 'active';
  if v_active_count >= v_room.max_players then raise exception 'room_full' using errcode = 'P0001'; end if;

  insert into public.game_room_players (room_id, student_id, display_name, avatar_url)
  values (v_room.id, p_student_id, trim(p_display_name), nullif(trim(p_avatar_url), ''))
  on conflict (room_id, student_id) do update
  set member_status = 'active', is_ready = false, left_at = null,
      display_name = excluded.display_name, avatar_url = excluded.avatar_url
  returning * into v_player;

  return jsonb_build_object('roomId', v_room.id, 'playerId', v_player.id, 'reused', false);
end;
$$;

create or replace function public.set_game_room_ready_v1(p_room_id uuid, p_student_id uuid, p_is_ready boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room public.game_rooms%rowtype;
  v_player public.game_room_players%rowtype;
begin
  if p_is_ready is null then raise exception 'invalid_ready' using errcode = 'P0001'; end if;

  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.expires_at <= now() then raise exception 'room_expired' using errcode = 'P0001'; end if;
  if v_room.status <> 'waiting' then raise exception 'room_not_waiting' using errcode = 'P0001'; end if;

  select * into v_player
  from public.game_room_players
  where room_id = p_room_id and student_id = p_student_id
  for update;
  if not found or v_player.member_status <> 'active' then
    raise exception 'player_not_in_room' using errcode = 'P0001';
  end if;

  update public.game_room_players set is_ready = p_is_ready where id = v_player.id;
  return p_is_ready;
end;
$$;

create or replace function public.manage_game_room_v1(
  p_room_id uuid,
  p_host_session_hash text,
  p_action text,
  p_player_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare v_room public.game_rooms%rowtype;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.host_session_hash <> trim(p_host_session_hash) then raise exception 'forbidden' using errcode = 'P0001'; end if;

  if p_action = 'start' then
    if v_room.expires_at <= now() then raise exception 'room_expired' using errcode = 'P0001'; end if;
    if v_room.status = 'starting' then return 'starting'; end if;
    if v_room.status <> 'waiting' then raise exception 'room_not_waiting' using errcode = 'P0001'; end if;
    update public.game_rooms set status = 'starting', started_at = coalesce(started_at, now()) where id = p_room_id;
    return 'starting';
  elsif p_action = 'close' then
    update public.game_rooms set status = 'closed', closed_at = coalesce(closed_at, now()) where id = p_room_id;
    return 'closed';
  elsif p_action = 'kick' then
    update public.game_room_players
    set member_status = 'kicked', is_ready = false, left_at = now()
    where id = p_player_id and room_id = p_room_id and member_status in ('active', 'kicked');
    if not found then raise exception 'player_not_in_room' using errcode = 'P0001'; end if;
    return 'kicked';
  end if;

  raise exception 'invalid_action' using errcode = 'P0001';
end;
$$;

create or replace function public.leave_game_room_v1(p_room_id uuid, p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.game_room_players
  set member_status = 'left', is_ready = false, left_at = now()
  where room_id = p_room_id and student_id = p_student_id and member_status = 'active';
  return found;
end;
$$;

revoke all on function public.create_game_room_v1(text, text, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.join_game_room_v1(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_game_room_ready_v1(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.manage_game_room_v1(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.leave_game_room_v1(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_game_room_v1(text, text, integer, text, jsonb) to service_role;
grant execute on function public.join_game_room_v1(text, uuid, text, text) to service_role;
grant execute on function public.set_game_room_ready_v1(uuid, uuid, boolean) to service_role;
grant execute on function public.manage_game_room_v1(uuid, text, text, uuid) to service_role;
grant execute on function public.leave_game_room_v1(uuid, uuid) to service_role;
