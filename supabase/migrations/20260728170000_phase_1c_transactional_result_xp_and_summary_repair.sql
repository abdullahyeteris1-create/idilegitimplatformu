create or replace function public.record_student_result_and_award_xp_v1(
  p_student_id uuid,
  p_student_name text,
  p_username text,
  p_exercise_type text,
  p_exercise_title text,
  p_score numeric,
  p_success_rate numeric,
  p_correct_count integer,
  p_wrong_count integer,
  p_duration_seconds integer,
  p_completed_at timestamptz,
  p_submission_key text,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_name text := btrim(coalesce(p_student_name, ''));
  v_username text := btrim(coalesce(p_username, ''));
  v_exercise_type text := btrim(coalesce(p_exercise_type, ''));
  v_exercise_title text := btrim(coalesce(p_exercise_title, ''));
  v_submission_key text := btrim(coalesce(p_submission_key, ''));
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
  v_result public.exercise_results%ROWTYPE;
  v_result_row jsonb;
  v_award_result jsonb;
  v_event_type text;
  v_total_xp integer := 0;
begin
  if p_student_id is null then
    raise exception 'RESULT_AWARD_INVALID_STUDENT';
  end if;

  if v_student_name = '' then
    raise exception 'RESULT_AWARD_INVALID_STUDENT_NAME';
  end if;

  if v_username = '' then
    raise exception 'RESULT_AWARD_INVALID_USERNAME';
  end if;

  if v_exercise_type = '' then
    raise exception 'RESULT_AWARD_INVALID_EXERCISE_TYPE';
  end if;

  if length(v_exercise_type) > 64 or v_exercise_type !~ '^[a-z0-9-]+$' then
    raise exception 'RESULT_AWARD_INVALID_EXERCISE_TYPE';
  end if;

  if v_exercise_title = '' then
    raise exception 'RESULT_AWARD_INVALID_EXERCISE_TITLE';
  end if;

  if v_submission_key = '' then
    raise exception 'RESULT_AWARD_INVALID_SUBMISSION_KEY';
  end if;

  if p_score is null or p_success_rate is null or p_correct_count is null or p_wrong_count is null or p_duration_seconds is null then
    raise exception 'RESULT_AWARD_INVALID_NUMERIC';
  end if;

  if p_duration_seconds < 0 then
    raise exception 'RESULT_AWARD_INVALID_DURATION';
  end if;

  if p_completed_at is null then
    raise exception 'RESULT_AWARD_INVALID_COMPLETED_AT';
  end if;

  if jsonb_typeof(v_details) <> 'object' then
    raise exception 'RESULT_AWARD_INVALID_DETAILS';
  end if;

  select *
    into v_result
  from public.exercise_results r
  where r.student_id = p_student_id
    and r.submission_key = v_submission_key
  limit 1;

  if found then
    v_result_row := to_jsonb(v_result);

    select coalesce(s.total_xp, 0)
      into v_total_xp
    from public.student_xp_summary s
    where s.student_id = p_student_id;

    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'result_row', v_result_row,
      'xp_awarded', 0,
      'total_xp', coalesce(v_total_xp, 0)
    );
  end if;

  insert into public.exercise_results (
    student_id,
    student_name,
    username,
    exercise_type,
    exercise_title,
    correct_count,
    wrong_count,
    score,
    success_rate,
    submission_key,
    details,
    completed_at
  ) values (
    p_student_id,
    v_student_name,
    v_username,
    v_exercise_type,
    v_exercise_title,
    p_correct_count,
    p_wrong_count,
    p_score,
    p_success_rate,
    v_submission_key,
    v_details,
    p_completed_at
  )
  returning * into v_result;

  v_result_row := to_jsonb(v_result);

  case v_exercise_type
    when 'reading-comprehension' then
      v_event_type := 'reading_comprehension_completed';
    when 'reading-speed-test' then
      v_event_type := 'reading_speed_test_completed';
    else
      v_event_type := 'exercise_completed';
  end case;

  v_award_result := public.award_student_xp_v1(
    p_student_id := p_student_id,
    p_event_type := v_event_type,
    p_idempotency_key := 'result:' || v_submission_key,
    p_source_type := 'exercise',
    p_source_id := v_exercise_type,
    p_metadata := jsonb_build_object(
      'submissionKey', v_submission_key,
      'exerciseType', v_exercise_type
    )
  );

  if v_award_result is null or jsonb_typeof(v_award_result) <> 'object' then
    raise exception 'RESULT_AWARD_XP_FAILED';
  end if;

  if coalesce((v_award_result ->> 'awarded')::boolean, false) is not true then
    raise exception 'RESULT_AWARD_XP_FAILED';
  end if;

  v_total_xp := coalesce((v_award_result ->> 'total_xp')::integer, 0);

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'result_row', v_result_row,
    'xp_awarded', coalesce((v_award_result ->> 'xp_awarded')::integer, 0),
    'total_xp', v_total_xp,
    'event_id', v_award_result ->> 'event_id',
    'earned_at', v_award_result ->> 'earned_at'
  );
end;
$$;

create or replace function public.repair_student_xp_summary_v1(
  p_student_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_xp integer := 0;
  v_now timestamptz := now();
begin
  if p_student_id is null then
    raise exception 'XP_SUMMARY_REPAIR_INVALID_STUDENT';
  end if;

  select coalesce(sum(e.xp_amount), 0)
    into v_total_xp
  from public.student_xp_events e
  where e.student_id = p_student_id;

  insert into public.student_xp_summary (student_id, total_xp, updated_at)
  values (p_student_id, v_total_xp, v_now)
  on conflict (student_id) do update
    set total_xp = excluded.total_xp,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'total_xp', v_total_xp,
    'updated_at', v_now
  );
end;
$$;

revoke all on function public.record_student_result_and_award_xp_v1(uuid, text, text, text, text, numeric, numeric, integer, integer, integer, timestamptz, text, jsonb) from public;
revoke all on function public.record_student_result_and_award_xp_v1(uuid, text, text, text, text, numeric, numeric, integer, integer, integer, timestamptz, text, jsonb) from anon;
revoke all on function public.record_student_result_and_award_xp_v1(uuid, text, text, text, text, numeric, numeric, integer, integer, integer, timestamptz, text, jsonb) from authenticated;
grant execute on function public.record_student_result_and_award_xp_v1(uuid, text, text, text, text, numeric, numeric, integer, integer, integer, timestamptz, text, jsonb) to service_role;

revoke all on function public.repair_student_xp_summary_v1(uuid) from public;
revoke all on function public.repair_student_xp_summary_v1(uuid) from anon;
revoke all on function public.repair_student_xp_summary_v1(uuid) from authenticated;
grant execute on function public.repair_student_xp_summary_v1(uuid) to service_role;
