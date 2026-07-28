create extension if not exists pgcrypto;

create table if not exists public.student_xp_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null,
  xp_amount integer not null,
  source_type text,
  source_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint student_xp_events_event_type_check check (btrim(event_type) <> ''),
  constraint student_xp_events_xp_amount_check check (xp_amount > 0),
  constraint student_xp_events_idempotency_key_check check (btrim(idempotency_key) <> ''),
  constraint student_xp_events_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint student_xp_events_student_id_idempotency_key_uidx unique (student_id, idempotency_key)
);

create index if not exists student_xp_events_student_earned_idx
  on public.student_xp_events (student_id, earned_at desc);

create index if not exists student_xp_events_student_event_type_idx
  on public.student_xp_events (student_id, event_type);

create table if not exists public.student_xp_summary (
  student_id uuid primary key references public.students(id) on delete cascade,
  total_xp integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint student_xp_summary_total_xp_check check (total_xp >= 0)
);

alter table public.student_xp_events enable row level security;
alter table public.student_xp_events force row level security;
alter table public.student_xp_summary enable row level security;
alter table public.student_xp_summary force row level security;

revoke all on public.student_xp_events from anon, authenticated;
revoke all on public.student_xp_summary from anon, authenticated;

grant select, insert, update, delete on public.student_xp_events to service_role;
grant select, insert, update, delete on public.student_xp_summary to service_role;

create or replace function public.award_student_xp_v1(
  p_student_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_source_type text default null,
  p_source_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_xp_amount integer;
  v_total_xp integer := 0;
  v_event_id uuid;
  v_earned_at timestamptz := now();
  v_event_type text := btrim(coalesce(p_event_type, ''));
  v_idempotency_key text := btrim(coalesce(p_idempotency_key, ''));
  v_source_type text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(btrim(coalesce(p_source_id, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_student_id is null then
    raise exception 'XP_AWARD_INVALID_STUDENT';
  end if;

  if v_event_type = '' then
    raise exception 'XP_AWARD_INVALID_EVENT_TYPE';
  end if;

  if v_idempotency_key = '' then
    raise exception 'XP_AWARD_INVALID_IDEMPOTENCY_KEY';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'XP_AWARD_INVALID_METADATA';
  end if;

  case v_event_type
    when 'login_first_of_day' then
      v_xp_amount := 10;
    else
      raise exception 'XP_AWARD_UNSUPPORTED_EVENT_TYPE';
  end case;

  begin
    insert into public.student_xp_events (
      student_id,
      event_type,
      xp_amount,
      source_type,
      source_id,
      idempotency_key,
      metadata,
      earned_at,
      created_at
    ) values (
      p_student_id,
      v_event_type,
      v_xp_amount,
      v_source_type,
      v_source_id,
      v_idempotency_key,
      v_metadata,
      v_earned_at,
      v_earned_at
    )
    returning id into v_event_id;
  exception
    when unique_violation then
      select coalesce(s.total_xp, 0)
        into v_total_xp
      from public.student_xp_summary s
      where s.student_id = p_student_id;

      return jsonb_build_object(
        'awarded', false,
        'xp_awarded', 0,
        'total_xp', coalesce(v_total_xp, 0)
      );
  end;

  insert into public.student_xp_summary (student_id, total_xp, updated_at)
  values (p_student_id, v_xp_amount, v_earned_at)
  on conflict (student_id) do update
    set total_xp = public.student_xp_summary.total_xp + excluded.total_xp,
        updated_at = excluded.updated_at
  returning total_xp into v_total_xp;

  return jsonb_build_object(
    'awarded', true,
    'xp_awarded', v_xp_amount,
    'total_xp', v_total_xp,
    'event_id', v_event_id,
    'earned_at', v_earned_at
  );
end;
$$;

revoke all on function public.award_student_xp_v1(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.award_student_xp_v1(uuid, text, text, text, text, jsonb) from anon;
revoke all on function public.award_student_xp_v1(uuid, text, text, text, text, jsonb) from authenticated;
grant execute on function public.award_student_xp_v1(uuid, text, text, text, text, jsonb) to service_role;

