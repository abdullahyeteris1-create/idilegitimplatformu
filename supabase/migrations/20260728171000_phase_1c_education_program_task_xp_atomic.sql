create or replace function public.complete_education_program_task_v1(
  p_student_id uuid,
  p_task_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_task_status text;
  v_task_student_id uuid;
  v_program_day_id uuid;
  v_program_id uuid;
  v_order_number smallint;

  v_program_status text;
  v_program_total_days smallint;
  v_program_completed_days smallint;
  v_program_current_day_number smallint;

  v_day_status text;
  v_day_number smallint;

  v_completed_task_count integer;
  v_total_task_count integer;

  v_unlocked_task_id uuid;
  v_day_completed boolean := false;

  v_next_day_id uuid;
  v_next_day_status text;
  v_next_day_number smallint;
  v_next_day_unlocked boolean := false;
  v_next_day_first_task_id uuid;

  v_program_completed boolean := false;
  v_result_current_day_number smallint;
  v_result_completed_days smallint;

  v_xp_award_result jsonb;
  v_xp_total integer := 0;
begin
  if p_student_id is null or p_task_id is null then
    raise exception 'EDUCATION_TASK_COMPLETE_INVALID_INPUT: p_student_id and p_task_id are required.';
  end if;

  begin
    select t.status, t.student_id, t.program_day_id, t.program_id, t.order_number
    into strict v_task_status, v_task_student_id, v_program_day_id, v_program_id, v_order_number
    from public.student_education_program_tasks t
    where t.id = p_task_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_TASK_NOT_FOUND: Task not found.';
  end;

  if v_task_student_id <> p_student_id then
    raise exception 'EDUCATION_TASK_COMPLETE_STUDENT_MISMATCH: Task does not belong to this student.';
  end if;

  if v_task_status = 'completed' then
    select p.status, p.total_days, p.completed_days, p.current_day_number
    into v_program_status, v_program_total_days, v_program_completed_days, v_program_current_day_number
    from public.student_education_programs p
    where p.id = v_program_id;

    select d.status
    into v_day_status
    from public.student_education_program_days d
    where d.id = v_program_day_id;

    select coalesce(s.total_xp, 0)
      into v_xp_total
    from public.student_xp_summary s
    where s.student_id = p_student_id;

    return jsonb_build_object(
      'success', true,
      'outcome', 'already_completed',
      'already_completed', true,
      'task_id', p_task_id,
      'task_status', 'completed',
      'day_id', v_program_day_id,
      'day_status', v_day_status,
      'program_id', v_program_id,
      'program_status', v_program_status,
      'unlocked_task_id', null,
      'unlocked_day_id', null,
      'current_day_number', v_program_current_day_number,
      'completed_days', v_program_completed_days,
      'total_days', v_program_total_days,
      'program_completed', v_program_status = 'completed',
      'xp_awarded', 0,
      'total_xp', coalesce(v_xp_total, 0)
    );
  end if;

  if v_task_status <> 'in_progress' then
    raise exception 'EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS: Task is in % status, only in_progress tasks can be completed.', v_task_status;
  end if;

  begin
    select p.status, p.total_days, p.completed_days, p.current_day_number
    into strict v_program_status, v_program_total_days, v_program_completed_days, v_program_current_day_number
    from public.student_education_programs p
    where p.id = v_program_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_PROGRAM_NOT_FOUND: Program not found.';
  end;

  if v_program_status <> 'active' then
    raise exception 'EDUCATION_TASK_COMPLETE_PROGRAM_NOT_ACTIVE: Program is no longer active.';
  end if;

  begin
    select d.status, d.day_number
    into strict v_day_status, v_day_number
    from public.student_education_program_days d
    where d.id = v_program_day_id
    for update;
  exception
    when no_data_found then
      raise exception 'EDUCATION_TASK_COMPLETE_DAY_NOT_FOUND: Day not found.';
  end;

  if v_day_status not in ('available', 'in_progress') then
    raise exception 'EDUCATION_TASK_COMPLETE_DAY_NOT_AVAILABLE: Day is in % status, completion is only allowed for available or in_progress days.', v_day_status;
  end if;

  update public.student_education_program_tasks
  set status = 'completed', completed_at = now()
  where id = p_task_id;

  select
    count(*) filter (where status = 'completed'),
    count(*)
  into v_completed_task_count, v_total_task_count
  from public.student_education_program_tasks
  where program_day_id = v_program_day_id;

  if v_completed_task_count < v_total_task_count then
    select id
    into v_unlocked_task_id
    from public.student_education_program_tasks
    where program_day_id = v_program_day_id
      and order_number > v_order_number
      and status = 'locked'
    order by order_number asc
    limit 1
    for update;

    if v_unlocked_task_id is not null then
      update public.student_education_program_tasks
      set status = 'available'
      where id = v_unlocked_task_id
        and status = 'locked';
    end if;
  end if;

  if v_completed_task_count >= v_total_task_count and v_day_status <> 'completed' then
    update public.student_education_program_days
    set status = 'completed', completed_at = now()
    where id = v_program_day_id
      and status <> 'completed';

    v_day_completed := true;
  end if;

  if v_day_completed then
    select count(*)
    into v_result_completed_days
    from public.student_education_program_days
    where program_id = v_program_id
      and status = 'completed';

    update public.student_education_programs
    set completed_days = v_result_completed_days
    where id = v_program_id;

    if v_day_number >= v_program_total_days then
      update public.student_education_programs
      set status = 'completed', completed_at = now()
      where id = v_program_id
        and status <> 'completed';

      v_program_completed := true;
      v_result_current_day_number := v_program_current_day_number;
    else
      begin
        select id, status, day_number
        into strict v_next_day_id, v_next_day_status, v_next_day_number
        from public.student_education_program_days
        where program_id = v_program_id
          and day_number > v_day_number
        order by day_number asc
        limit 1
        for update;
      exception
        when no_data_found then
          raise exception 'EDUCATION_TASK_COMPLETE_NEXT_DAY_NOT_FOUND: Expected next day after day % could not be found.', v_day_number;
      end;

      if v_next_day_status = 'locked' then
        update public.student_education_program_days
        set status = 'available', available_at = now()
        where id = v_next_day_id
          and status = 'locked';

        select id
        into v_next_day_first_task_id
        from public.student_education_program_tasks
        where program_day_id = v_next_day_id
          and order_number = 1
        for update;

        if v_next_day_first_task_id is not null then
          update public.student_education_program_tasks
          set status = 'available'
          where id = v_next_day_first_task_id
            and status = 'locked';
        end if;

        v_next_day_unlocked := true;
      end if;

      update public.student_education_programs
      set current_day_number = v_next_day_number
      where id = v_program_id
        and current_day_number < v_next_day_number;

      v_result_current_day_number := v_next_day_number;
    end if;
  else
    v_result_completed_days := v_program_completed_days;
    v_result_current_day_number := v_program_current_day_number;
  end if;

  v_xp_award_result := public.award_student_xp_v1(
    p_student_id := p_student_id,
    p_event_type := 'education_program_task_completed',
    p_idempotency_key := 'program-task:' || p_task_id::text,
    p_source_type := 'education_program_task',
    p_source_id := p_task_id::text,
    p_metadata := jsonb_build_object(
      'taskId', p_task_id,
      'programId', v_program_id,
      'dayId', v_program_day_id,
      'orderNumber', v_order_number
    )
  );

  if v_xp_award_result is null or jsonb_typeof(v_xp_award_result) <> 'object' then
    raise exception 'EDUCATION_TASK_COMPLETE_XP_FAILED';
  end if;

  if coalesce((v_xp_award_result ->> 'awarded')::boolean, false) is not true then
    raise exception 'EDUCATION_TASK_COMPLETE_XP_FAILED';
  end if;

  v_xp_total := coalesce((v_xp_award_result ->> 'total_xp')::integer, 0);

  return jsonb_build_object(
    'success', true,
    'outcome', case
      when v_program_completed then 'program_completed'
      when v_next_day_unlocked then 'day_completed_next_day_unlocked'
      when v_day_completed then 'day_completed'
      when v_unlocked_task_id is not null then 'task_completed_next_task_unlocked'
      else 'task_completed'
    end,
    'already_completed', false,
    'task_id', p_task_id,
    'task_status', 'completed',
    'day_id', v_program_day_id,
    'day_status', case when v_day_completed then 'completed' else v_day_status end,
    'program_id', v_program_id,
    'program_status', case when v_program_completed then 'completed' else v_program_status end,
    'unlocked_task_id', coalesce(v_next_day_first_task_id, v_unlocked_task_id),
    'unlocked_day_id', v_next_day_id,
    'current_day_number', v_result_current_day_number,
    'completed_days', v_result_completed_days,
    'total_days', v_program_total_days,
    'program_completed', v_program_completed,
    'xp_awarded', coalesce((v_xp_award_result ->> 'xp_awarded')::integer, 0),
    'total_xp', v_xp_total,
    'event_id', v_xp_award_result ->> 'event_id',
    'earned_at', v_xp_award_result ->> 'earned_at'
  );
end;
$$;

revoke all on function public.complete_education_program_task_v1(uuid, uuid) from public;
revoke all on function public.complete_education_program_task_v1(uuid, uuid) from anon;
revoke all on function public.complete_education_program_task_v1(uuid, uuid) from authenticated;
grant execute on function public.complete_education_program_task_v1(uuid, uuid) to service_role;
