alter table if exists public.exercise_results
  add column if not exists submission_key text;

create unique index if not exists exercise_results_student_submission_key_uidx
  on public.exercise_results (student_id, submission_key);

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
    when 'exercise_completed' then
      v_xp_amount := 5;
    when 'education_program_task_completed' then
      v_xp_amount := 15;
    when 'reading_comprehension_completed' then
      v_xp_amount := 20;
    when 'reading_speed_test_completed' then
      v_xp_amount := 20;
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
