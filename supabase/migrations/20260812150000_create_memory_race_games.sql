-- Server-authoritative state for the Hafiza Yarisi multiplayer mode.
-- The generic room tables remain game-agnostic; browser roles have no direct
-- table or RPC access. All mutations are serialized with row locks.

create table if not exists public.memory_race_games (
  room_id uuid primary key references public.game_rooms(id) on delete cascade,
  level smallint not null,
  board jsonb not null,
  phase text not null default 'awaiting_first',
  current_player_id uuid references public.game_room_players(id) on delete restrict,
  first_card_index smallint,
  second_card_index smallint,
  matched_card_indices integer[] not null default '{}'::integer[],
  scores jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  phase_ends_at timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint memory_race_games_level_check check (level between 1 and 6),
  constraint memory_race_games_board_array_check check (jsonb_typeof(board) = 'array'),
  constraint memory_race_games_board_size_check check (jsonb_array_length(board) between 16 and 60),
  constraint memory_race_games_phase_check check (phase in (
    'awaiting_first', 'awaiting_second', 'revealing_match',
    'revealing_mismatch', 'finished', 'closed'
  )),
  constraint memory_race_games_scores_object_check check (jsonb_typeof(scores) = 'object'),
  constraint memory_race_games_version_check check (version >= 1),
  constraint memory_race_games_first_index_check check (first_card_index is null or first_card_index >= 0),
  constraint memory_race_games_second_index_check check (second_card_index is null or second_card_index >= 0),
  constraint memory_race_games_distinct_open_cards_check check (
    first_card_index is null or second_card_index is null or first_card_index <> second_card_index
  ),
  constraint memory_race_games_finished_at_check check (
    phase <> 'finished' or finished_at is not null
  )
);

alter table public.memory_race_games enable row level security;
alter table public.memory_race_games force row level security;
revoke all on public.memory_race_games from public, anon, authenticated;

create or replace function public.set_memory_race_game_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_memory_race_game_updated_at() from public, anon, authenticated;

drop trigger if exists set_memory_race_games_updated_at on public.memory_race_games;
create trigger set_memory_race_games_updated_at
before update on public.memory_race_games
for each row execute function public.set_memory_race_game_updated_at();

create or replace function public.start_memory_race_game_v1(
  p_room_id uuid,
  p_host_session_hash text,
  p_level integer,
  p_board jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room public.game_rooms%rowtype;
  v_existing public.memory_race_games%rowtype;
  v_player_count integer;
  v_expected_cards integer;
  v_first_player_id uuid;
  v_scores jsonb;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.host_session_hash <> trim(p_host_session_hash) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if v_room.expires_at <= now() then raise exception 'room_expired' using errcode = 'P0001'; end if;
  if v_room.game_type is distinct from 'memory-race' then raise exception 'wrong_game_type' using errcode = 'P0001'; end if;

  select * into v_existing from public.memory_race_games where room_id = p_room_id for update;
  if found then
    if v_room.status = 'playing' and v_existing.phase not in ('finished', 'closed') then
      return jsonb_build_object('started', false, 'version', v_existing.version);
    end if;
    raise exception 'game_already_started' using errcode = 'P0001';
  end if;

  if v_room.status not in ('waiting', 'starting') then raise exception 'room_not_waiting' using errcode = 'P0001'; end if;
  if p_level is null or p_level < 1 or p_level > 6 then raise exception 'invalid_level' using errcode = 'P0001'; end if;
  v_expected_cards := case p_level
    when 1 then 16 when 2 then 20 when 3 then 24
    when 4 then 32 when 5 then 40 when 6 then 60
  end;
  if p_board is null or jsonb_typeof(p_board) <> 'array' then
    raise exception 'invalid_board' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_board) <> v_expected_cards then
    raise exception 'invalid_board' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_board) as card
    where jsonb_typeof(card) <> 'object'
      or coalesce(card ->> 'pairId', '') = ''
      or coalesce(card ->> 'emoji', '') = ''
  ) then raise exception 'invalid_board' using errcode = 'P0001'; end if;
  if exists (
    select 1
    from (
      select card ->> 'pairId' as pair_id, count(*) as pair_count
      from jsonb_array_elements(p_board) as card
      group by card ->> 'pairId'
    ) pairs
    where pairs.pair_count <> 2
  ) then raise exception 'invalid_board' using errcode = 'P0001'; end if;
  if (
    select count(distinct card ->> 'pairId') from jsonb_array_elements(p_board) as card
  ) <> v_expected_cards / 2 then raise exception 'invalid_board' using errcode = 'P0001'; end if;

  select count(*)
  into v_player_count
  from public.game_room_players
  where room_id = p_room_id and member_status = 'active';
  if v_player_count < 2 then raise exception 'not_enough_players' using errcode = 'P0001'; end if;
  if v_player_count > 4 then raise exception 'too_many_players' using errcode = 'P0001'; end if;

  select player.id into v_first_player_id
  from public.game_room_players player
  where player.room_id = p_room_id and player.member_status = 'active'
  order by player.joined_at, player.id
  limit 1;

  select jsonb_object_agg(player.id::text, 0) into v_scores
  from public.game_room_players player
  where player.room_id = p_room_id and player.member_status = 'active';

  insert into public.memory_race_games (
    room_id, level, board, phase, current_player_id, scores
  ) values (
    p_room_id, p_level, p_board, 'awaiting_first', v_first_player_id, coalesce(v_scores, '{}'::jsonb)
  );

  update public.game_rooms
  set status = 'playing', started_at = coalesce(started_at, now())
  where id = p_room_id;

  return jsonb_build_object('started', true, 'version', 1);
end;
$$;

create or replace function public.submit_memory_race_move_v1(
  p_room_id uuid,
  p_student_id uuid,
  p_card_index integer,
  p_expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room public.game_rooms%rowtype;
  v_game public.memory_race_games%rowtype;
  v_player public.game_room_players%rowtype;
  v_first_pair_id text;
  v_second_pair_id text;
  v_next_version bigint;
  v_score integer;
  v_scores jsonb;
  v_matched integer[];
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.status = 'closed' then raise exception 'game_closed' using errcode = 'P0001'; end if;
  if v_room.status <> 'playing' or v_room.game_type is distinct from 'memory-race' then
    raise exception 'room_not_playing' using errcode = 'P0001';
  end if;

  select * into v_game from public.memory_race_games where room_id = p_room_id for update;
  if not found then raise exception 'game_not_found' using errcode = 'P0001'; end if;
  select * into v_player
  from public.game_room_players
  where room_id = p_room_id and student_id = p_student_id
  for update;
  if not found or v_player.member_status <> 'active' then
    raise exception 'player_not_in_room' using errcode = 'P0001';
  end if;
  if v_game.current_player_id <> v_player.id then raise exception 'wrong_player' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version <> v_game.version then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;
  if p_card_index is null or p_card_index < 0 or p_card_index >= jsonb_array_length(v_game.board) then
    raise exception 'invalid_card_index' using errcode = 'P0001';
  end if;
  if p_card_index = any(v_game.matched_card_indices) then raise exception 'card_already_matched' using errcode = 'P0001'; end if;
  if v_game.phase not in ('awaiting_first', 'awaiting_second') then
    raise exception 'phase_not_accepting_move' using errcode = 'P0001';
  end if;
  if v_game.first_card_index = p_card_index then raise exception 'card_already_open' using errcode = 'P0001'; end if;

  v_next_version := v_game.version + 1;
  if v_game.phase = 'awaiting_first' then
    update public.memory_race_games
    set phase = 'awaiting_second', first_card_index = p_card_index,
        second_card_index = null, phase_ends_at = null, version = v_next_version
    where room_id = p_room_id;
    return jsonb_build_object('version', v_next_version, 'phase', 'awaiting_second');
  end if;

  v_first_pair_id := v_game.board -> v_game.first_card_index ->> 'pairId';
  v_second_pair_id := v_game.board -> p_card_index ->> 'pairId';
  if v_first_pair_id = v_second_pair_id then
    v_matched := array_append(array_append(v_game.matched_card_indices, v_game.first_card_index), p_card_index);
    v_score := coalesce((v_game.scores ->> v_player.id::text)::integer, 0) + 1;
    v_scores := jsonb_set(v_game.scores, array[v_player.id::text], to_jsonb(v_score), true);

    if cardinality(v_matched) = jsonb_array_length(v_game.board) then
      update public.memory_race_games
      set phase = 'finished', second_card_index = p_card_index,
          matched_card_indices = v_matched, scores = v_scores,
          phase_ends_at = null, finished_at = now(), version = v_next_version
      where room_id = p_room_id;
      update public.game_rooms set status = 'finished' where id = p_room_id;
      return jsonb_build_object('version', v_next_version, 'phase', 'finished', 'matched', true);
    end if;

    update public.memory_race_games
    set phase = 'revealing_match', second_card_index = p_card_index,
        matched_card_indices = v_matched, scores = v_scores,
        phase_ends_at = now() + interval '600 milliseconds', version = v_next_version
    where room_id = p_room_id;
    return jsonb_build_object('version', v_next_version, 'phase', 'revealing_match', 'matched', true);
  end if;

  update public.memory_race_games
  set phase = 'revealing_mismatch', second_card_index = p_card_index,
      phase_ends_at = now() + interval '1300 milliseconds', version = v_next_version
  where room_id = p_room_id;
  return jsonb_build_object('version', v_next_version, 'phase', 'revealing_mismatch', 'matched', false);
end;
$$;

create or replace function public.transition_memory_race_game_v1(
  p_room_id uuid,
  p_student_id uuid default null,
  p_host_session_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_room public.game_rooms%rowtype;
  v_game public.memory_race_games%rowtype;
  v_current public.game_room_players%rowtype;
  v_next_player_id uuid;
  v_member_active boolean;
  v_next_version bigint;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if p_host_session_hash is not null then
    if v_room.host_session_hash <> trim(p_host_session_hash) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  elsif p_student_id is not null then
    select exists(
      select 1 from public.game_room_players
      where room_id = p_room_id and student_id = p_student_id and member_status = 'active'
    ) into v_member_active;
    if not v_member_active then raise exception 'player_not_in_room' using errcode = 'P0001'; end if;
  else
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_game from public.memory_race_games where room_id = p_room_id for update;
  if not found then raise exception 'game_not_found' using errcode = 'P0001'; end if;
  if v_room.status = 'closed' or v_game.phase = 'closed' then raise exception 'game_closed' using errcode = 'P0001'; end if;
  if v_game.phase not in ('revealing_match', 'revealing_mismatch') then
    return jsonb_build_object('changed', false, 'version', v_game.version);
  end if;
  if v_room.status <> 'playing' then raise exception 'room_not_playing' using errcode = 'P0001'; end if;
  if v_game.phase_ends_at is null or now() < v_game.phase_ends_at then
    return jsonb_build_object('changed', false, 'version', v_game.version);
  end if;

  v_next_player_id := v_game.current_player_id;
  if v_game.phase = 'revealing_mismatch' then
    select * into v_current from public.game_room_players where id = v_game.current_player_id;
    select player.id into v_next_player_id
    from public.game_room_players player
    where player.room_id = p_room_id and player.member_status = 'active'
      and (player.joined_at, player.id) > (v_current.joined_at, v_current.id)
    order by player.joined_at, player.id
    limit 1;
    if v_next_player_id is null then
      select player.id into v_next_player_id
      from public.game_room_players player
      where player.room_id = p_room_id and player.member_status = 'active'
      order by player.joined_at, player.id
      limit 1;
    end if;
  end if;

  v_next_version := v_game.version + 1;
  update public.memory_race_games
  set phase = 'awaiting_first', current_player_id = v_next_player_id,
      first_card_index = null, second_card_index = null,
      phase_ends_at = null, version = v_next_version
  where room_id = p_room_id;
  return jsonb_build_object('changed', true, 'version', v_next_version);
end;
$$;

create or replace function public.reconcile_memory_race_current_player_v1(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_game public.memory_race_games%rowtype;
  v_current public.game_room_players%rowtype;
  v_active_count integer;
  v_next_player_id uuid;
begin
  select * into v_game from public.memory_race_games where room_id = p_room_id for update;
  if not found or v_game.phase in ('finished', 'closed') then return false; end if;
  select count(*) into v_active_count
  from public.game_room_players where room_id = p_room_id and member_status = 'active';
  if v_active_count < 2 then
    update public.memory_race_games
    set phase = 'finished', first_card_index = null, second_card_index = null,
        phase_ends_at = null, finished_at = coalesce(finished_at, now()), version = version + 1
    where room_id = p_room_id;
    update public.game_rooms set status = 'finished' where id = p_room_id and status = 'playing';
    return true;
  end if;
  if exists(
    select 1 from public.game_room_players
    where id = v_game.current_player_id and room_id = p_room_id and member_status = 'active'
  ) then return false; end if;

  select * into v_current from public.game_room_players where id = v_game.current_player_id;
  select player.id into v_next_player_id
  from public.game_room_players player
  where player.room_id = p_room_id and player.member_status = 'active'
    and (player.joined_at, player.id) > (v_current.joined_at, v_current.id)
  order by player.joined_at, player.id
  limit 1;
  if v_next_player_id is null then
    select player.id into v_next_player_id
    from public.game_room_players player
    where player.room_id = p_room_id and player.member_status = 'active'
    order by player.joined_at, player.id
    limit 1;
  end if;
  update public.memory_race_games
  set phase = 'awaiting_first', current_player_id = v_next_player_id,
      first_card_index = null, second_card_index = null,
      phase_ends_at = null, version = version + 1
  where room_id = p_room_id;
  return true;
end;
$$;

-- Preserve the generic room API while reconciling game state after close/kick.
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
    update public.memory_race_games
    set phase = 'closed', first_card_index = null, second_card_index = null,
        phase_ends_at = null, finished_at = coalesce(finished_at, now()), version = version + 1
    where room_id = p_room_id and phase not in ('finished', 'closed');
    return 'closed';
  elsif p_action = 'kick' then
    update public.game_room_players
    set member_status = 'kicked', is_ready = false, left_at = now()
    where id = p_player_id and room_id = p_room_id and member_status in ('active', 'kicked');
    if not found then raise exception 'player_not_in_room' using errcode = 'P0001'; end if;
    perform public.reconcile_memory_race_current_player_v1(p_room_id);
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
declare
  v_changed boolean;
begin
  update public.game_room_players
  set member_status = 'left', is_ready = false, left_at = now()
  where room_id = p_room_id and student_id = p_student_id and member_status = 'active';
  v_changed := found;
  if v_changed then perform public.reconcile_memory_race_current_player_v1(p_room_id); end if;
  return v_changed;
end;
$$;

revoke all on function public.start_memory_race_game_v1(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.submit_memory_race_move_v1(uuid, uuid, integer, bigint) from public, anon, authenticated;
revoke all on function public.transition_memory_race_game_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reconcile_memory_race_current_player_v1(uuid) from public, anon, authenticated;
revoke all on function public.manage_game_room_v1(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.leave_game_room_v1(uuid, uuid) from public, anon, authenticated;

grant execute on function public.start_memory_race_game_v1(uuid, text, integer, jsonb) to service_role;
grant execute on function public.submit_memory_race_move_v1(uuid, uuid, integer, bigint) to service_role;
grant execute on function public.transition_memory_race_game_v1(uuid, uuid, text) to service_role;
grant execute on function public.manage_game_room_v1(uuid, text, text, uuid) to service_role;
grant execute on function public.leave_game_room_v1(uuid, uuid) to service_role;
