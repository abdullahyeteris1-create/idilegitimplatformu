-- Correct the pgcrypto function lookup inside the SECURITY DEFINER room RPC.
-- The existing function keeps its narrow search_path; only the extension
-- function call is schema-qualified.

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
    v_random_bytes := extensions.gen_random_bytes(4);
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

revoke all on function public.create_game_room_v1(text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_game_room_v1(text, text, integer, text, jsonb) to service_role;
